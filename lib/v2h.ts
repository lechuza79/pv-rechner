// V2H (Vehicle-to-Home) — Wirtschaftlichkeit des bidirektionalen Ladens.
//
// Die Frage, die dieser Rechner beantwortet, ist NICHT „bringt ein Autoakku mehr
// als kein Speicher" (das ist trivial ja), sondern die echte Kaufentscheidung:
//
//        Spare ich mir den Heimspeicher, wenn das Auto den Job macht?
//
// Deshalb rechnen wir drei Szenarien mit DERSELBEN Stundensimulation und
// vergleichen die Geldströme:
//   heute     — PV, das Auto lädt nur (der heutige Normalfall)
//   v2h       — PV, das Auto puffert zusätzlich (kostet eine bidirektionale Wallbox)
//   speicher  — PV, das Auto lädt nur, dafür ein Heimspeicher (kostet den Speicher)
//
// Der ehrliche Haken, den kein Hersteller-Rechner zeigt: Beim Pendler ist das Auto
// genau dann weg, wenn die Sonne scheint. V2H bringt dort deutlich weniger als beim
// Homeoffice-Haushalt — das fällt hier als Ergebnis an, nicht als Kleingedrucktes.
//
// ─── Bewusste Abweichung von der geteilten Rechen-Basis (CLAUDE.md) ──────────
// Der PV-Rechner nimmt fürs GELD das HTW-Power-Law (calcEigenverbrauch), nicht die
// Simulation. Das Power-Law kennt aber kein Auto, das zeitweise weg ist — es ist auf
// fest installierte Heimspeicher kalibriert. Für V2H MUSS das Geld deshalb aus der
// Stundensimulation kommen; nur sie bildet Anwesenheit, Fahr-Reserve und
// Ladeleistung ab.
// Weil die Simulation bekanntermaßen leicht zum Optimismus neigt, ist jeder
// Parameter in v2h-config.ts am konservativen Rand gewählt (Wirkungsgrad 0,86 statt
// 0,91; großzügige Fahr-Reserve; Wallbox-Kosten in der oberen Markthälfte).
// Zusätzlich rechnen wir die Differenz ZWEIER Simulationsläufe — ein systematischer
// Bias hebt sich dabei weitgehend heraus, weil er in beiden Läufen gleich wirkt.

import { simulateSolarYear, monthlyFromAnnual, type CarBatteryInput } from "./balkon-sim";
import { type HouseholdProfile } from "./consumption";
import { DEFAULT_PRICES, type PriceConfig } from "./prices-config";
import { DEFAULT_FEED_IN, type FeedInRates } from "./feedin-config";
import { V2H, getProfile, type V2hProfileId } from "./v2h-config";

const ROOFTOP_ORIENTATION = "sued_flach";
const BATTERY_ROUNDTRIP = 0.90; // Heimspeicher — identisch zu lib/pv-sim.ts

export interface V2hInput {
  kwp: number;
  /** 12 × kWh/kWp aus PVGIS. Null → deutscher Schnitt. */
  monthlyYieldPerKwp: number[] | null;
  ertragKwp: number;
  /** Haushalt OHNE E-Auto — der Fahrstrom läuft über den Akku, nicht über die Last. */
  household: HouseholdProfile;
  /** Nutzbare Akkukapazität des Fahrzeugs (kWh). */
  carUsableKwh: number;
  /** Verbrauch des Fahrzeugs (kWh/100 km). */
  kwhPer100km: number;
  kmPerYear: number;
  profile: V2hProfileId;
  /** Fahr-Reserve (kWh) — editierbar im Ergebnis. */
  reserveKwh: number;
  /** Bidirektionale Wallbox inkl. Montage (€) — editierbar. */
  wallboxCost: number;
  /** Vergleichs-Heimspeicher (kWh). */
  referenceBatteryKwh: number;
  prices?: PriceConfig;
  feedIn?: FeedInRates;
}

export interface V2hScenario {
  /** Aus dem Netz bezogen: Haushalt + Auto (kWh/a). */
  gridKwh: number;
  /** Ins Netz eingespeist (kWh/a). */
  feedInKwh: number;
  /** Jahreskosten: Netzbezug minus Einspeiseerlös (€). */
  annualCost: number;
  /** Anteil des Gesamtbedarfs, der ohne Netz gedeckt wird (0–100 %). */
  autarky: number;
  /** Anteil des Fahrstroms aus eigener Sonne (0–100 %). */
  carSolarShare: number;
  /** Investition dieses Szenarios (€) — Wallbox bzw. Heimspeicher. */
  invest: number;
}

export interface V2hResult {
  heute: V2hScenario;
  v2h: V2hScenario;
  speicher: V2hScenario;
  /** Ersparnis pro Jahr gegenüber „Auto lädt nur" (€). */
  savingVsHeute: number;
  /** DIE Kernzahl: Vorsprung pro Jahr gegenüber „Heimspeicher kaufen" (€).
   *  Negativ = der Heimspeicher ist die bessere Wahl. */
  savingVsSpeicher: number;
  /** Mehrkosten der Wallbox gegenüber dem Heimspeicher (€). Negativ = billiger. */
  extraInvest: number;
  /** Jahre bis sich der Mehrpreis rechnet. Null = rechnet sich nicht. */
  paybackVsSpeicher: number | null;
  /** Gewinn über die Lebensdauer gegenüber „Heimspeicher kaufen" (€). */
  lifetimeVsSpeicher: number;
  /** Autarkie-Gewinn durch das Auto (Prozentpunkte gegenüber „lädt nur"). */
  autarkyGain: number;
  /** true, wenn das Auto tagsüber überwiegend weg ist — dann ist V2H schwach. */
  pendlerCaveat: boolean;
}

function feedInRate(kwp: number, rates: FeedInRates): number {
  return (kwp <= rates.thresholdKwp ? rates.teilUnder10 : rates.teilOver10) / 100;
}

/** Monatsform aus PVGIS auf den (evtl. editierten) Jahresertrag normieren —
 *  identisch zu lib/pv-sim.ts, damit beide Rechner dieselbe Menge sehen. */
function monthlyScaledTo(monthly: number[] | null, ertragKwp: number): number[] {
  const raw = monthly ?? monthlyFromAnnual(ertragKwp);
  const sum = raw.reduce((a, b) => a + b, 0);
  return sum > 0 ? raw.map(m => (m * ertragKwp) / sum) : raw;
}

function runScenario(
  input: V2hInput,
  opts: { batteryKwh: number; bidirectional: boolean; invest: number },
  prices: PriceConfig,
  rates: FeedInRates,
): V2hScenario {
  const profile = getProfile(input.profile);
  const car: CarBatteryInput = {
    usableKwh: input.carUsableKwh,
    wallboxKw: V2H.wallboxKw,
    roundtrip: V2H.carRoundtrip,
    minReserveKwh: Math.min(input.reserveKwh, input.carUsableKwh * 0.9),
    availabilityByHour: profile.availabilityByHour,
    availabilityWeekend: profile.availabilityWeekend,
    drivingKwhPerDay: (input.kmPerYear * input.kwhPer100km) / 100 / 365,
    bidirectional: opts.bidirectional,
  };

  const sim = simulateSolarYear({
    moduleKwp: input.kwp,
    inverterKw: input.kwp,
    monthlyYieldPerKwp: monthlyScaledTo(input.monthlyYieldPerKwp, input.ertragKwp),
    orientation: ROOFTOP_ORIENTATION,
    // eaActive bewusst false: Das Auto ist hier Speicher, nicht Verbraucher.
    // Stünde es zusätzlich in der Haushaltslast, zählte der Fahrstrom doppelt.
    household: { ...input.household, eaActive: false },
    batteryKwh: opts.batteryKwh,
    roundtrip: BATTERY_ROUNDTRIP,
    car,
  });

  // Netzbezug = ungedeckte Haushaltslast + Strom, der fürs Fahren zugekauft wurde.
  const houseGrid = Math.max(0, sim.consumptionKwh - sim.selfUsedKwh);
  const gridKwh = houseGrid + sim.carFromGridKwh;
  const annualCost =
    gridKwh * prices.electricityPrice - sim.feedInKwh * feedInRate(input.kwp, rates);

  const totalNeed = sim.consumptionKwh + sim.carDrivingKwh;
  const autarky = totalNeed > 0
    ? Math.round(((totalNeed - gridKwh) / totalNeed) * 100)
    : 0;
  const carSolarShare = sim.carDrivingKwh > 0
    ? Math.round((sim.carFromPvKwh / sim.carDrivingKwh) * 100)
    : 0;

  return {
    gridKwh: Math.round(gridKwh),
    feedInKwh: sim.feedInKwh,
    annualCost: Math.round(annualCost),
    autarky: Math.max(0, Math.min(autarky, 100)),
    carSolarShare: Math.max(0, Math.min(carSolarShare, 100)),
    invest: opts.invest,
  };
}

export function calcV2h(input: V2hInput): V2hResult {
  const prices = input.prices ?? DEFAULT_PRICES;
  const rates = input.feedIn ?? DEFAULT_FEED_IN;

  const batteryCost = Math.round(
    prices.batteryBase + prices.batteryPerKwh * input.referenceBatteryKwh,
  );

  // Drei Läufe derselben Simulation — nur Speicher, Rückspeisung und Investition
  // unterscheiden sich.
  const heute = runScenario(input, { batteryKwh: 0, bidirectional: false, invest: 0 }, prices, rates);
  const v2h = runScenario(input, { batteryKwh: 0, bidirectional: true, invest: input.wallboxCost }, prices, rates);
  const speicher = runScenario(
    input,
    { batteryKwh: input.referenceBatteryKwh, bidirectional: false, invest: batteryCost },
    prices, rates,
  );

  const savingVsHeute = heute.annualCost - v2h.annualCost;
  const savingVsSpeicher = speicher.annualCost - v2h.annualCost;
  const extraInvest = input.wallboxCost - batteryCost;

  // Amortisation nur, wenn der Mehrpreis auch wirklich wieder hereinkommt.
  // Ist die Wallbox billiger als der Speicher (extraInvest < 0) UND spart mehr,
  // lohnt sie sich sofort — dann 0 Jahre statt einer sinnlosen Negativzahl.
  let paybackVsSpeicher: number | null = null;
  if (extraInvest <= 0 && savingVsSpeicher >= 0) {
    paybackVsSpeicher = 0;
  } else if (savingVsSpeicher > 0) {
    const years = extraInvest / savingVsSpeicher;
    paybackVsSpeicher = years <= V2H.lifeYears ? Math.round(years * 10) / 10 : null;
  }

  const lifetimeVsSpeicher = Math.round(savingVsSpeicher * V2H.lifeYears - extraInvest);

  // Pendler-Caveat: Ist das Auto in der Kernsonnenzeit (10–15 Uhr) überwiegend weg,
  // kann es den Mittagsüberschuss nicht aufnehmen — dann trägt V2H wenig.
  const avail = getProfile(input.profile).availabilityByHour;
  const sunHours = avail.slice(10, 16);
  const pendlerCaveat = sunHours.reduce((s, a) => s + a, 0) / sunHours.length < 0.5;

  return {
    heute,
    v2h,
    speicher,
    savingVsHeute: Math.round(savingVsHeute),
    savingVsSpeicher: Math.round(savingVsSpeicher),
    extraInvest: Math.round(extraInvest),
    paybackVsSpeicher,
    lifetimeVsSpeicher,
    autarkyGain: v2h.autarky - heute.autarky,
    pendlerCaveat,
  };
}
