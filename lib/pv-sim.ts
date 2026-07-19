// Dach-PV Autarkie & Jahresverlauf aus der Stundensimulation.
//
// GETEILTE Rechen-Basis (CLAUDE.md): nutzt dieselbe Stunden-Jahressimulation wie
// der Balkon-Rechner (simulateSolarYear), dieselbe Verbrauchskurve
// (calcHourlyConsumption, BDEW H0 / VDI 4655 inkl. Wärmepumpen-Winterprofil) und
// dieselben PVGIS-Monatswerte wie die Wirtschaftlichkeitsrechnung.
//
// Warum überhaupt simulieren, statt Autarkie aus dem Eigenverbrauch zurückzurechnen:
// Autarkie ist ein ZEITLICHES Deckungsproblem. Eine Jahresbilanz mittelt den
// Winterausfall gegen den Sommerüberschuss weg und zeigt bei großen Anlagen
// fälschlich ~100 %. Die Stundensimulation bildet den Tag/Nacht- und Winter-
// Mismatch direkt ab — Netzbezug im Dezember fällt als Ergebnis an. Besonders für
// Wärmepumpen-Haushalte (80 % des WP-Stroms Okt–Apr, genau wenn die PV schwächelt)
// ist das der einzige ehrliche Weg; ein Kennfeld für reine Haushalte kennt die WP
// nicht. Das Geld (Eigenverbrauch → Ersparnis) bleibt bewusst am HTW-kalibrierten
// Power-Law (calcEigenverbrauch) — die Simulation liefert hier nur die Autarkie
// und den Jahresverlauf.
import { simulateSolarYear, type SolarMonth } from "./balkon-sim";
import { monthlyFromAnnual } from "./balkon-sim";
import { calcHourlyConsumption, type HouseholdProfile } from "./consumption";
import { SOLAR_YEAR_DE, referenceMonthKwh } from "./solar-year";

// Roundtrip-Wirkungsgrad Hausspeicher (Laden × Entladen). Konservativ; moderne
// LFP-Systeme liegen bei ~0,90–0,95.
const BATTERY_ROUNDTRIP = 0.90;
// Dach-Referenzausrichtung: PVGIS-Monatswerte gelten für optimale Neigung, die
// Süd-35°-Reihe liefert dazu die passende Tagesform. Der Rechner fragt (noch)
// keine Ausrichtung ab — Süd-optimal ist die richtige Default-Annahme.
const ROOFTOP_ORIENTATION = "sued_flach";

export interface PvSimInput {
  kwp: number;
  speicherKwh: number;
  /** 12 × kWh/kWp aus PVGIS (Monatsprofil des Standorts). Null → deutscher Schnitt. */
  monthlyYieldPerKwp: number[] | null;
  /** Jahresertrag pro kWp (nur als Fallback-Menge, wenn kein Monatsprofil da ist). */
  ertragKwp: number;
  household: HouseholdProfile;
}

export interface PvSimResult {
  autarky: number;          // 0–100 (%)
  selfConsumption: number;  // 0–100 (%) — Schatten-Wert, NICHT fürs Geld
  jahresertrag: number;     // kWh/a ins Haus
  gesamtVerbrauch: number;  // kWh/a (Simulationsgrundlage)
  monthly: SolarMonth[];    // 12 Monate für den Jahresverlauf
}

/** Autarkie + Jahresverlauf einer Dach-PV-Anlage aus der Stundensimulation. */
export function simulatePvYear({ kwp, speicherKwh, monthlyYieldPerKwp, ertragKwp, household }: PvSimInput): PvSimResult {
  const monthly = monthlyYieldPerKwp ?? monthlyFromAnnual(ertragKwp);
  const sim = simulateSolarYear({
    moduleKwp: kwp,
    // Dach-Wechselrichter ~ Anlagen-kWp: bei Süd-optimal liegt die Stundenspitze
    // unter 1 kW/kWp, es wird also praktisch nicht gekappt (Jahresertrag = PVGIS).
    inverterKw: kwp,
    monthlyYieldPerKwp: monthly,
    orientation: ROOFTOP_ORIENTATION,
    household,
    batteryKwh: speicherKwh,
    roundtrip: BATTERY_ROUNDTRIP,
  });

  const autarky = sim.consumptionKwh > 0
    ? Math.round((sim.selfUsedKwh / sim.consumptionKwh) * 100)
    : 0;
  const selfConsumption = sim.annualYield > 0
    ? Math.round((sim.selfUsedKwh / sim.annualYield) * 100)
    : 0;

  return {
    autarky: Math.min(autarky, 100),
    selfConsumption: Math.min(selfConsumption, 100),
    jahresertrag: sim.annualYield,
    gesamtVerbrauch: sim.consumptionKwh,
    monthly: sim.monthly,
  };
}

// ─── Beispieltag (24-Stunden-Detail) ──────────────────────────────────────────
// Zeigt, warum selbst eine große Anlage im Winter Netzstrom zieht: mittags viel
// mehr Sonne als Bedarf (Überschuss → Speicher + Einspeisung), abends/nachts kein
// Solar (→ erst Speicher, dann Netz). Genau dieser Innerhalb-des-Tages-Mismatch
// verschwindet in einer Monatsbilanz — deshalb der Tagesblick.
//
// Datengrundlage: echte PVGIS-Tagestypen aus SOLAR_YEAR_DE (je Monat 6 Typen vom
// trübsten bis zum sonnigsten Tag). Ein „sonniger Dezembertag" ist also ein realer
// Tagesverlauf, kein erfundener. Annahme: Speicher startet morgens leer (über Nacht
// entladen) — für einen isolierten Beispieltag die ehrliche, konservative Wahl.

export interface DayHour {
  h: number;         // Stunde 0–23
  prod: number;      // Erzeugung (kWh)
  cons: number;      // Verbrauch (kWh)
  direct: number;    // direkt gedeckt
  discharge: number; // aus dem Speicher gedeckt
  grid: number;      // aus dem Netz
  charge: number;    // in den Speicher geladen
  feedIn: number;    // eingespeist
  soc: number;       // Speicher-Ladestand am Stundenende (kWh)
}

export interface ExampleDayResult {
  hours: DayHour[];
  prod: number;   // Tagessumme Erzeugung
  cons: number;   // Tagessumme Verbrauch
  grid: number;   // Tagessumme Netzbezug
  feedIn: number; // Tagessumme Einspeisung
}

/** Vordefinierte Beispieltage (Monat + Tagestyp-Index 0=trübste … 5=sonnigste). */
export const EXAMPLE_DAYS = [
  { key: "winter-sunny", label: "Sonniger Wintertag", month: 11, dayType: 5 },
  { key: "winter-dull", label: "Trüber Wintertag", month: 11, dayType: 1 },
  { key: "summer", label: "Sommertag", month: 5, dayType: 4 },
] as const;

/** Stündlicher Energiefluss eines Beispieltags (Speicher startet leer). */
export function simulateExampleDay(
  { kwp, speicherKwh, monthlyYieldPerKwp, ertragKwp, household }: PvSimInput,
  month: number,
  dayTypeIndex: number,
): ExampleDayResult {
  const monthly = monthlyYieldPerKwp ?? monthlyFromAnnual(ertragKwp);
  const series = SOLAR_YEAR_DE[ROOFTOP_ORIENTATION][month];
  const dayType = series[Math.min(dayTypeIndex, series.length - 1)];
  const refOptimal = referenceMonthKwh(ROOFTOP_ORIENTATION, month);
  const locationScale = refOptimal > 0 ? monthly[month] / refOptimal : 0;
  const scale = locationScale * kwp;

  let soc = 0, pSum = 0, cSum = 0, gSum = 0, fSum = 0;
  const hours: DayHour[] = [];
  for (let h = 0; h < 24; h++) {
    const prod = Math.min((dayType.w[h] / 1000) * scale, kwp); // Wechselrichter-Deckel = kWp
    const cons = calcHourlyConsumption(household, h, month) / 1000;
    const direct = Math.min(prod, cons);
    let surplus = prod - direct;
    const deficit = cons - direct;
    let charge = 0;
    if (surplus > 0 && speicherKwh > 0) { charge = Math.min(surplus, speicherKwh - soc); soc += charge; surplus -= charge; }
    const feedIn = surplus;
    let discharge = 0, grid = deficit;
    if (deficit > 0 && soc > 0) {
      const taken = Math.min(deficit / BATTERY_ROUNDTRIP, soc);
      soc -= taken;
      discharge = taken * BATTERY_ROUNDTRIP;
      grid = deficit - discharge;
    }
    hours.push({ h, prod, cons, direct, discharge, grid, charge, feedIn, soc });
    pSum += prod; cSum += cons; gSum += grid; fSum += feedIn;
  }
  return { hours, prod: Math.round(pSum), cons: Math.round(cSum), grid: Math.round(gSum), feedIn: Math.round(fSum) };
}
