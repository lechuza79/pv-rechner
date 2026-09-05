import { YEAR, YEARS, FEED_IN_YEARS, DEGRAD, CONSUMPTION_MONTHLY, FUEL, PERSONEN, NUTZUNG, AUTARKY_X, AUTARKY_Y, AUTARKY_GRID, AUTARKY_HTW_YIELD } from "./constants";
import { calcExtraConsumption, KLIMA_DEFAULT_M2, WP_ANNUAL_KWH } from "./consumption";
import { DEFAULT_PRICES, type PriceConfig } from "./prices-config";
import { co2PriceForCalendarYear } from "./co2-config";
import { vermarktungLohnt } from "./einspeise-regime";

// ─── Fuel comparison (WP vs. Gas/Öl) ────────────────────────────────────────
// CO2-Preis pro Projektions-Offset i. Dünner Adapter: i mappt auf das absolute
// Kalenderjahr YEAR + i. Die eigentliche Jahr→Preis-Logik (gesetzlicher Korridor
// + ETS2-Forecast) liegt rollover-sicher in lib/co2-config.ts. Jährliche Prüfung:
// scripts/co2-preis-verify.md.
export function co2PriceForYear(i: number): number {
  return co2PriceForCalendarYear(YEAR + i);
}

// CO2 surcharge to add ON TOP of a present-day retail fuel price, in €/t-equivalent
// terms relative to today. Retail gas/oil prices already include the current-year
// CO2 levy, so only the projected INCREASE over today's level is added — otherwise
// the current-year CO2 component would be double-counted in year 0.
export function co2SurchargeOverToday(i: number): number {
  return Math.max(0, co2PriceForYear(i) - co2PriceForYear(0));
}

/** Generalized fuel cost over arbitrary horizon.
 *  fuelKwh = thermischer Bedarf / Kesselwirkungsgrad (bereits berechnet).
 */
export function calcFuelCost({ fuelKwh, pricePerKwh, co2PerKwh, years = YEARS, inflation = 0.02 }: {
  fuelKwh: number;
  pricePerKwh: number;
  co2PerKwh: number;
  years?: number;
  inflation?: number;
}): number {
  let total = 0;
  for (let i = 0; i < years; i++) {
    const co2Surcharge = co2PerKwh * co2SurchargeOverToday(i) / 1000; // €/kWh, increase over today
    const basePrice = pricePerKwh * Math.pow(1 + inflation, i);
    total += fuelKwh * (basePrice + co2Surcharge);
  }
  return Math.round(total);
}

/** Per-year fuel cost breakdown (for charting WP vs Gas over time). */
export function calcFuelCostPerYear({ fuelKwh, pricePerKwh, co2PerKwh, years = YEARS, inflation = 0.02 }: {
  fuelKwh: number;
  pricePerKwh: number;
  co2PerKwh: number;
  years?: number;
  inflation?: number;
}): number[] {
  const out: number[] = [];
  for (let i = 0; i < years; i++) {
    const co2Surcharge = co2PerKwh * co2SurchargeOverToday(i) / 1000;
    const basePrice = pricePerKwh * Math.pow(1 + inflation, i);
    out.push(fuelKwh * (basePrice + co2Surcharge));
  }
  return out;
}

// Brennstoffbedarf einer Referenzheizung, die dieselbe Wärme liefert wie die
// Wärmepumpe: Strom × JAZ = Wärme, Wärme / Kesselwirkungsgrad = Brennstoff.
// jaz defaults to 3,5, wird aber vom PV-Rechner mit der gebäudebasierten JAZ
// überschrieben — dieselbe Arbeitszahl, mit der wpKwhElectric hergeleitet wurde,
// sonst driften Wärmemenge und Vergleich auseinander.
// Der Kessel-Wirkungsgrad bleibt bewusst kontextabhängig (FUEL in constants.ts):
// Der PV-Rechner rechnet gegen die VORHANDENE Heizung (90 % Gas / 85 % Öl), der
// WP-Rechner lässt den Kessel wählen (neu 95 %, alt 80 %).
export function fuelKwhForWpHeat(wpKwhElectric: number, fuel: "gas" | "oil", jaz = 3.5): number {
  return (wpKwhElectric * jaz) / FUEL[fuel].efficiency;
}

// Netzstrom-Kosten der Wärmepumpe über einen Horizont — der Teil, den die PV nicht
// deckt. `years` ist ein Parameter, weil der Heizungsvergleich über die Lebensdauer
// der HEIZUNG läuft (HEATING_YEARS), nicht über die 25 Jahre der PV-Module.
export function calcWpGridCost(wpKwh: number, autarky: number, strompreis: number, stromSteigerung: number, years = YEARS): number {
  let total = 0;
  const gridFraction = 1 - autarky;
  for (let i = 0; i < years; i++) {
    const sp = strompreis * Math.pow(1 + stromSteigerung, i);
    total += wpKwh * gridFraction * sp;
  }
  return Math.round(total);
}

// ─── Gewichtete Einspeisevergütung (EEG: ≤10 kWp / >10 kWp) ────────────────
export function calcWeightedFeedIn(kwp: number, rateUnder: number, rateOver: number, threshold = 10): number {
  if (kwp <= threshold) return rateUnder;
  return Math.round((threshold * rateUnder + (kwp - threshold) * rateOver) / kwp * 100) / 100;
}

// ─── PV-Vollnutzen über einen Horizont (für den WP-Rechner) ──────────────────
// Bewertet eine (geplante/vorhandene) PV-Anlage mit ihrem GESAMTEN Nutzen —
// nicht nur der WP-Strom-Deckung. Selbst verbrauchter Solarstrom spart je nach
// dem, was er verdrängt, zwei verschiedene Preise:
//   • verdrängt er WP-Strom → günstiger WP-Tarif (§14a, ~0,24 €)
//   • verdrängt er Haushaltsstrom → voller Haushaltspreis (~0,31 €)
// Eingespeister Überschuss bringt die (feste, nicht steigende) EEG-Vergütung,
// nur die ersten FEED_IN_YEARS. Produktion degradiert jährlich (DEGRAD), die
// selbst gedeckten Preise steigen mit priceIncrease. Reine Funktion, damit sie
// gegen den PV-Rechner testbar bleibt.
export function calcPvBenefitPerYear(params: {
  wpSelfKwh: number;      // jährlich selbst verbrauchter Solarstrom, der WP-Strom verdrängt (Jahr 0)
  houseSelfKwh: number;   // jährlich selbst verbrauchter Solarstrom, der Haushaltsstrom verdrängt (Jahr 0)
  feedKwh: number;        // jährlich eingespeister Überschuss (Jahr 0)
  wpPrice: number;        // €/kWh WP-Tarif (Jahr 0)
  housePrice: number;     // €/kWh Haushaltspreis (Jahr 0)
  feedInEur: number;      // €/kWh EEG-Vergütung (fest, Jahr 0..feedInYears)
  years: number;
  priceIncrease: number;
  feedInYears?: number;
}): number[] {
  const { wpSelfKwh, houseSelfKwh, feedKwh, wpPrice, housePrice, feedInEur, years, priceIncrease, feedInYears = FEED_IN_YEARS } = params;
  const out: number[] = [];
  for (let i = 0; i < years; i++) {
    const deg = Math.pow(1 - DEGRAD, i);
    const escal = Math.pow(1 + priceIncrease, i);
    const selfSavings = (wpSelfKwh * wpPrice + houseSelfKwh * housePrice) * deg * escal;
    const feedRevenue = i < feedInYears ? feedKwh * feedInEur * deg : 0;
    out.push(selfSavings + feedRevenue);
  }
  return out;
}

/** Summe von calcPvBenefitPerYear über den Horizont (gerundet). */
export function calcPvBenefitOverHorizon(params: Parameters<typeof calcPvBenefitPerYear>[0]): number {
  return Math.round(calcPvBenefitPerYear(params).reduce((a, b) => a + b, 0));
}

// ─── Kostenschätzung ─────────────────────────────────────────────────────────
export function estimateCost(kwp: number, spKwh: number, prices?: PriceConfig): number {
  const p = prices ?? DEFAULT_PRICES;
  const pv = kwp <= p.pvThresholdKwp
    ? kwp * p.pvPriceSmall
    : p.pvThresholdKwp * p.pvPriceSmall + (kwp - p.pvThresholdKwp) * p.pvPriceLarge;
  const sp = spKwh > 0 ? p.batteryBase + spKwh * p.batteryPerKwh : 0;
  return Math.round((pv + sp) / 500) * 500;
}

// ─── Speicher-Lebensdauer & Ersatz ───────────────────────────────────────────
// KONVENTION, NICHT WÄCHTER-GEPRÜFT: die folgenden Speicher-Annahmen (Lebensdauer,
// Ersatzpreis-Faktor, Grenzrendite-Gate) sind Modell-Konstanten, keine gescrapten
// Marktdaten — kein Runbook/Wächter überwacht sie (analog zur Inflations-Konvention,
// die scripts/waermepumpe-verify.md ausdrücklich unter „Nicht prüfen" führt). Bei
// spürbaren Marktverschiebungen manuell nachziehen.
// Ein Heimspeicher hält ~15 Jahre (LFP-Marktstandard 2026: 15–20 J Garantie/
// Zyklenlebensdauer), danach fällig: Ersatz. Über den 25-Jahre-Horizont fällt
// also genau ein Akku-Tausch an. Ohne diesen Posten rechnet sich jede
// Speichergröße scheinbar, weil der Akku „25 Jahre gratis weiterläuft" — das
// überdimensioniert die Empfehlung.
export const BATTERY_LIFETIME_YEARS = 15;
// Ersatzakku in ~15 Jahren ist günstiger als heute (Preisverfall ~-3 %/Jahr →
// 0,97^15 ≈ 0,63).
export const BATTERY_REPLACE_PRICE_FACTOR = 0.63;

/** Reine Speicher-Kosten (ohne PV, ohne 500er-Rundung). */
export function batteryCost(spKwh: number, prices?: PriceConfig): number {
  const p = prices ?? DEFAULT_PRICES;
  return spKwh > 0 ? p.batteryBase + spKwh * p.batteryPerKwh : 0;
}

/** Kosten des Akku-Tauschs in Jahr BATTERY_LIFETIME_YEARS (zukünftiger Preis). */
export function batteryReplaceCost(spKwh: number, prices?: PriceConfig): number {
  return Math.round(batteryCost(spKwh, prices) * BATTERY_REPLACE_PRICE_FACTOR);
}

// ─── Grenzrendite-Gate (zentral, für Auto-Dimensionierung) ───────────────────
// Eine reine NPV-Maximierung über 25 Jahre wählt immer die Ecke des Suchraums
// (größter Speicher, vollstes Dach), weil jede zusätzliche kWh sich über den
// langen Horizont noch minimal rechnet — auch wenn die *zusätzliche*
// Investition erst nach 15+ Jahren zurückkommt. Das überdimensioniert.
//
// Dieses Gate bewertet stattdessen den Grenznutzen: ein Upgrade wird nur
// akzeptiert, wenn sich das *zusätzliche* Kapital innerhalb seiner Lebensdauer
// amortisiert. Default 13 Jahre ≈ Heimspeicher-Lebensdauer (15 J) minus Puffer;
// ein Speicher, der sich nicht in seiner Lebenszeit rechnet, ist eine Fehlinvestition.
export const MAX_MARGINAL_PAYBACK_YEARS = 13;

/** Marginale Amortisationszeit eines Upgrades in Jahren:
 *  zusätzliche Investition geteilt durch die ⌀ jährliche Mehrersparnis.
 *  npv = kumulierter Gewinn nach `years` Jahren (Investition bereits abgezogen),
 *  daher: ⌀ Jahresersparnis = (Δnpv + Δinvest) / years. */
export function marginalPaybackYears(deltaInvest: number, deltaNpv: number, years = YEARS): number {
  if (deltaInvest <= 0) return 0;
  const avgAnnualSaving = (deltaNpv + deltaInvest) / years;
  return avgAnnualSaving > 0 ? deltaInvest / avgAnnualSaving : Infinity;
}

/** Aus einer Kandidatenliste den wirtschaftlich sinnvollen Punkt wählen.
 *  Kandidaten werden nach Investition aufsteigend betrachtet; ein größerer
 *  (teurerer) Kandidat löst den bisherigen Pick nur ab, wenn (a) er mehr
 *  Gesamtgewinn bringt UND (b) die *zusätzliche* Investition gegenüber dem
 *  bisherigen Pick sich innerhalb maxPayback amortisiert.
 *  Gleich teure Kandidaten konkurrieren rein über NPV. */
export function selectByMarginalReturn<T extends { investition: number; npv25: number }>(
  candidates: T[],
  maxPayback = MAX_MARGINAL_PAYBACK_YEARS,
): T | undefined {
  const sorted = [...candidates]
    .filter(c => Number.isFinite(c.npv25) && Number.isFinite(c.investition))
    .sort((a, b) => a.investition - b.investition || b.npv25 - a.npv25);
  let pick = sorted[0];
  if (!pick) return undefined;
  for (let i = 1; i < sorted.length; i++) {
    const c = sorted[i];
    if (c.investition <= pick.investition) {
      if (c.npv25 > pick.npv25) pick = c;
      continue;
    }
    if (c.npv25 <= pick.npv25) continue; // teurer aber nicht besser → nie sinnvoll
    const mp = marginalPaybackYears(c.investition - pick.investition, c.npv25 - pick.npv25);
    if (mp <= maxPayback) pick = c;
  }
  return pick;
}

// ─── Eigenverbrauch (HTW Berlin Modell) ──────────────────────────────────────
// HTW-Berlin / Quaschning-Weniger Power-Law: kalibriert an 25.000 Konfigurationen,
// 1-Min-Auflösung, VDI 4655 Lastprofil — also OHNE Wärmepumpen-Lastprofil.
// Für WP-Haushalte korrigieren wir den Speicher-Boost saisonal nach unten, weil
// ~80 % des WP-Verbrauchs Okt–Apr anfällt — genau wenn der Speicher mangels Sonne
// kaum gefüllt werden kann (PV-Ertrag in diesen Monaten: ~30 % des Jahres).
export function calcEigenverbrauch({ personenIdx, nutzungIdx, speicherKwh, wp, ea, eaKm, klima = "nein", klimaM2 = KLIMA_DEFAULT_M2, klimaKwh = null, wpKwh = null, kwp, ertragKwp, baseKwh }: { personenIdx: number; nutzungIdx: number; speicherKwh: number; wp: string; ea: string; eaKm: number; klima?: string; klimaM2?: number; klimaKwh?: number | null; wpKwh?: number | null; kwp: number; ertragKwp: number; baseKwh?: number | null }): number {
  const jahresertrag = kwp * ertragKwp;
  // baseKwh = direkt eingegebener Haushaltsverbrauch (ohne WP/E-Auto). Fällt
  // auf die personenbasierte Schätzung zurück, wenn nicht gesetzt.
  const grundverbrauch = baseKwh ?? PERSONEN[personenIdx].verbrauch;
  const tagQuote = NUTZUNG[nutzungIdx].tagQuote;
  // wpKwh = WP-Jahresstrom aus Gebäudedaten (gemeinsam mit dem WP-Rechner). Fehlt
  // er, fällt calcExtraConsumption auf die Pauschale (WP_ANNUAL_KWH) zurück.
  const extra = calcExtraConsumption(wp, ea, eaKm, klima, klimaM2, klimaKwh, wpKwh);
  const gesamt = grundverbrauch + extra;
  // x = kWp pro MWh Verbrauch (Anlagengröße relativ zum Verbrauch)
  const x = kwp / (gesamt / 1000);
  // y = kWh Speicher pro MWh Verbrauch
  const y = speicherKwh / (gesamt / 1000);
  // Basis-Eigenverbrauch (HTW-Power-Law)
  const evBase = tagQuote * Math.pow(x, -0.69);
  // Speicher-Boost mit Saturation
  let evBoost = speicherKwh > 0
    ? 0.61 * Math.pow(x, -0.72) * (1 - Math.exp(-0.6 * y))
    : 0;
  // Saisonkorrektur: Speicher kann WP-Strom kaum decken (Winter-Sonnenmangel).
  // Korrekturfaktor = 1 − wpAnteil × 0.30 (empirisch aus PV-/WP-Saisonprofilen).
  if (speicherKwh > 0 && wp !== "nein") {
    // WP-Anteil am Gesamtverbrauch: realer Gebäude-Wert wenn vorhanden, sonst
    // die Pauschale. min(., extra) kappt gegen den Fall dass nur WP zum Extra beiträgt.
    const wpAnnual = Math.min(wpKwh ?? WP_ANNUAL_KWH, extra);
    const wpAnteil = wpAnnual / gesamt;
    evBoost *= (1 - wpAnteil * 0.30);
  }
  // Obergrenze aus zwei Schranken. Die Jahresbilanz (Verbrauch / Ertrag) ist
  // die harte physikalische Grenze — sie unterstellt aber, dass JEDE erzeugte
  // Kilowattstunde bis zur Verbrauchsmenge selbst genutzt wird, also 100 %
  // Autarkie. Real deckt ein Haushalt dieser Größe nach dem HTW-Kennfeld nur
  // 71–91 % seines Verbrauchs aus der Anlage (calcAutarkie, dieselbe Quelle wie
  // das Power-Law). Bis 05.09.2026 galt nur die Bilanz: Mit Speicher lief das
  // Power-Law in die Kappe und rechnete 99–101 % Autarkie ins Geld — 10 kWp /
  // 10 kWh / 3–4 Personen: EV 36 % statt 31 %, 5.648 € über 25 Jahre
  // (Rechenmodell-Council, Betreiber-Entscheidung 05.09.2026: HTW gegen HTW).
  // Identität: selbst genutzte kWh = Autarkie × Verbrauch = EV × Ertrag.
  const evMaxBilanz = gesamt / jahresertrag;
  const autarkieHtw = calcAutarkie({ kwp, speicherKwh, gesamtVerbrauch: gesamt, ertragKwp }) / 100;
  const evMax = autarkieHtw > 0 ? Math.min(evMaxBilanz, autarkieHtw * evMaxBilanz) : evMaxBilanz;
  const ev = Math.round(Math.min(evBase + evBoost, evMax, 0.90) * 100);
  // 10 %-Untergrenze als Sanity-Floor — aber NIE über das physikalische Maximum:
  // bei kleinem Haushalt auf großem Dach (evMax < 10 %) kann man nicht 10 %
  // selbst verbrauchen. Sonst würden überdimensionierte Anlagen künstlich
  // schöngerechnet und die Empfehlung zu groß dimensioniert.
  const floorPct = Math.min(10, Math.round(evMax * 100));
  return Math.max(floorPct, Math.min(ev, 90));
}

// ─── Autarkiegrad-REFERENZ (HTW-Kennfeld) ────────────────────────────────────
// HINWEIS: Der Rechner nutzt für die Autarkie inzwischen die eigene Stunden-
// Jahressimulation (lib/pv-sim.ts → simulatePvYear) — die bildet Standort,
// Wärmepumpe und E-Auto mit ab, was ein Durchschnitts-Kennfeld nicht kann.
// calcAutarkie bleibt als VALIDIERUNGS-REFERENZ im Code: das HTW-Autarkie-Kennfeld
// (AUTARKY_GRID) ist HTWs eigenes 1-Min-Simulationsergebnis für einen
// Standardhaushalt (~40 % Tagverbrauch). Der Test lib/__tests__/pv-sim.test.ts
// nagelt fest, dass die Simulation dieses Kennfeld bei gleichem Tagverbrauch auf
// ±3 pp trifft — ohne diese Referenz im Repo bräuchte man dafür externe Dateien.
//
// Anteil des Jahresverbrauchs, der aus Anlage + Speicher gedeckt wird. NICHT aus
// dem Eigenverbrauch zurückrechnen (Jahresbilanz → fälschlich 100 % bei großen
// Anlagen). Sättigt physikalisch bei ~90 %. Achsen:
//   x = kWp pro 1000 kWh Verbrauch, auf den Standort-Ertrag skaliert (HTW-Ref
//       1024 kWh/kWp). y = Speicher-kWh pro 1000 kWh Verbrauch.
function interpAxis(grid: number[][], xi0: number, xi1: number, tx: number, yi: number): number {
  const a = grid[yi][xi0], b = grid[yi][xi1];
  return a + (b - a) * tx;
}

export function calcAutarkie({ kwp, speicherKwh, gesamtVerbrauch, ertragKwp }: { kwp: number; speicherKwh: number; gesamtVerbrauch: number; ertragKwp: number }): number {
  if (gesamtVerbrauch <= 0 || kwp <= 0) return 0;
  // x auf tatsächlichen Ertrag normieren: HTW rechnet mit 1024 kWh/kWp, unser
  // Standort liefert ertragKwp — dieselbe erzeugte Energie, andere kWp-Zahl.
  const yieldScale = ertragKwp / AUTARKY_HTW_YIELD;
  const x = (kwp * yieldScale) / (gesamtVerbrauch / 1000);
  const y = speicherKwh / (gesamtVerbrauch / 1000);
  // Bilineare Interpolation im geklemmten Kennfeld
  const cx = Math.min(Math.max(x, AUTARKY_X[0]), AUTARKY_X[AUTARKY_X.length - 1]);
  const cy = Math.min(Math.max(y, AUTARKY_Y[0]), AUTARKY_Y[AUTARKY_Y.length - 1]);
  let xi = 0; while (xi < AUTARKY_X.length - 2 && cx > AUTARKY_X[xi + 1]) xi++;
  let yi = 0; while (yi < AUTARKY_Y.length - 2 && cy > AUTARKY_Y[yi + 1]) yi++;
  const tx = (cx - AUTARKY_X[xi]) / (AUTARKY_X[xi + 1] - AUTARKY_X[xi]);
  const ty = (cy - AUTARKY_Y[yi]) / (AUTARKY_Y[yi + 1] - AUTARKY_Y[yi]);
  const top = interpAxis(AUTARKY_GRID, xi, xi + 1, tx, yi);
  const bot = interpAxis(AUTARKY_GRID, xi, xi + 1, tx, yi + 1);
  const frac = top + (bot - top) * ty;
  return Math.round(frac * 100);
}

// ─── Amortisation (25 Jahre, monatlich wenn PVGIS-Profil vorhanden) ─────────
// Per-month self-consumption ratio cannot physically exceed ~95%.
const EV_MONTH_CAP = 0.95;

/**
 * Build monthly self-consumption ratios that PRESERVE the (calibrated or
 * user-entered) annual EV. The raw seasonal split scales EV up in low-yield
 * winter months and hits the 95% cap there; without compensation the
 * production-weighted annual EV drifts well below the shown value (e.g. 90% →
 * 75%). Here the capped shortfall is redistributed onto months with headroom,
 * production-weighted, so Σ mEv[m]·fracs[m] ≈ evFrac. Exported for testing.
 */
export function buildMonthlyEv(evFrac: number, fracs: number[]): number[] {
  const mEv = fracs.map((f, m) =>
    Math.min(f > 0 ? (evFrac * CONSUMPTION_MONTHLY[m]) / (f * 12) : EV_MONTH_CAP, EV_MONTH_CAP),
  );
  for (let iter = 0; iter < 12; iter++) {
    const achieved = mEv.reduce((s, e, m) => s + e * fracs[m], 0);
    const deficit = evFrac - achieved;
    if (deficit <= 1e-6) break;
    const headroomProd = fracs.reduce((s, f, m) => s + (mEv[m] < EV_MONTH_CAP ? f : 0), 0);
    if (headroomProd <= 1e-9) break; // every month capped — target unreachable
    const delta = deficit / headroomProd;
    for (let m = 0; m < 12; m++) {
      if (mEv[m] < EV_MONTH_CAP) mEv[m] = Math.min(EV_MONTH_CAP, mEv[m] + delta);
    }
  }
  return mEv;
}

/**
 * Wie die Einspeisung über die Laufzeit vergütet wird.
 *
 * Ohne dieses Feld rechnet calc() wie immer: fester Satz, 20 Jahre, danach null.
 * Mit ihm lässt sich jede andere Rechtslage abbilden, ohne die Amortisations-
 * rechnung zu duplizieren — gebaut für den Entwurf zum EEG 2027, in dem der
 * Erlös je Jahr ein anderer ist (lib/einspeise-regime.ts).
 */
export interface EinspeiseModell {
  /** Erlös je eingespeister kWh im Jahr i (1-basiert), ct/kWh. */
  satzCtImJahr: (i: number) => number;
  /**
   * Feste Kosten im Jahr i (1-basiert) in Euro — z. B. die Grundgebühr der
   * Direktvermarktung.
   *
   * JE JAHR, nicht pauschal, und der Unterschied ist der ganze Punkt: Der
   * Erlösverlauf des EEG-Entwurfs sind zwei verschiedene Fälle hintereinander.
   * Erst nimmt der NETZBETREIBER ab (befristete Übergangszahlung) — dort gibt es
   * keinen Dienstleister, der eine Grundgebühr erheben könnte —, danach
   * vermarktet einer an der Börse. Ein pauschaler Jahresbetrag zog die Gebühr
   * auch in den Übergangsjahren ab (Council 15.08.2026).
   *
   * Welches Jahr welche festen Kosten trägt, sagt einzig der Verlauf
   * (`RegimeJahr.fixkosten` in lib/einspeise-regime.ts). Wer sie im Aufrufer
   * nachbaut oder weglässt, baut den Fehler nach.
   */
  fixkostenImJahr?: (i: number) => number;
  /**
   * Anteil des Überschusses, der überhaupt eingespeist werden darf (0–1). Bildet
   * die geplante 50-%-Einspeisegrenze ab. Der Rest ist verloren: Er kann weder
   * verkauft noch verbraucht werden — Verbrauch und Speicher sind in der
   * Stundensimulation schon bedient, aus der dieser Anteil stammt.
   */
  einspeiseAnteil?: number;
}

export function calc({ kwp, kosten, strompreis, eigenverbrauch, einspeisung, stromSteigerung, ertragKwp, monthly, batteryReplace = 0, einspeiseModell }: { kwp: number; kosten: number; strompreis: number; eigenverbrauch: number; einspeisung: number; stromSteigerung: number; ertragKwp: number; monthly: number[] | null; batteryReplace?: number; einspeiseModell?: EinspeiseModell }) {
  const years: { year: number; i: number; kum: number; j: number }[] = [];
  let kum = -kosten;
  // Monatliche Berechnung wenn PVGIS-Profil vorhanden
  const fracs = monthly ? monthly.map(m => m / monthly.reduce((a, b) => a + b, 0)) : null;
  // Seasonal self-consumption ratios that integrate back to the entered EV.
  const monthlyEv = fracs ? buildMonthlyEv(eigenverbrauch / 100, fracs) : null;
  for (let i = 0; i <= YEARS; i++) {
    let j = 0;
    if (i > 0) {
      // Jahr 1 ist das erste Betriebsjahr: Module neu, Strompreis von heute.
      // Bis 05.09.2026 zählte dieser Rechner ab Jahr 1 hoch (×1,02 und ×0,995
      // schon im ersten Jahr), Balkon- und Wärmepumpen-Rechner ab Jahr 0 —
      // rund 1 % Gewinnunterschied für dieselbe kWh auf derselben Ergebnisseite.
      // Angeglichen auf die Mehrheitskonvention (Betreiber-Entscheidung 05.09.2026).
      const deg = Math.pow(1 - DEGRAD, i - 1);
      const sp = strompreis * Math.pow(1 + stromSteigerung, i - 1);
      // EEG-Einspeisevergütung nur die ersten 20 Jahre; danach fällt die Anlage
      // aus dem EEG (Marktwert konservativ nicht angesetzt). Der Eigenverbrauch
      // spart den Strompreis auch danach weiter. Liegt ein Einspeisemodell vor,
      // bestimmt es den Satz stattdessen Jahr für Jahr.
      const feedIn = einspeiseModell
        ? einspeiseModell.satzCtImJahr(i)
        : i <= FEED_IN_YEARS ? einspeisung : 0;
      const anteil = einspeiseModell?.einspeiseAnteil ?? 1;
      // Der Einspeise-Erlös wird getrennt mitgeführt, weil die Grundgebühr des
      // Vermarkters gegen ihn abgewogen wird (siehe unten) — nicht gegen den
      // gesamten Jahresnutzen, in dem die Eigenverbrauchs-Ersparnis steckt.
      let einspeiseErloes = 0;
      if (fracs && monthlyEv) {
        // Monatlich: EV% variiert saisonal (Winter höher, Sommer niedriger),
        // bleibt aber jahresgewichtet auf dem eingegebenen Eigenverbrauch.
        for (let m = 0; m < 12; m++) {
          const mProd = kwp * ertragKwp * fracs[m] * deg;
          const mEv = monthlyEv[m];
          j += mProd * mEv * sp;
          einspeiseErloes += mProd * (1 - mEv) * anteil * (feedIn / 100);
        }
      } else {
        // Jährlich (Fallback ohne Monatsprofil)
        const ertrag = kwp * ertragKwp * deg;
        j = ertrag * (eigenverbrauch / 100) * sp;
        einspeiseErloes = ertrag * (1 - eigenverbrauch / 100) * anteil * (feedIn / 100);
      }
      const fixkosten = einspeiseModell?.fixkostenImJahr?.(i) ?? 0;
      // Vermarktet wird nur, wenn es sich trägt. Bringt der Börsenerlös eines
      // Jahres weniger ein, als der Dienstleister an Grundgebühr verlangt,
      // schließt niemand diesen Vertrag — dann gibt es weder Erlös noch Gebühr,
      // die Anlage speist schlicht unvergütet ein. Die mengenabhängige Gebühr
      // war schon so gedeckelt (lib/einspeise-regime.ts), die feste nicht:
      // Eine 3-kWp-Anlage verlor dadurch über die Laufzeit 222 €, sobald man den
      // Börsenerlös EINSCHALTETE (Council 18.08.2026) — ein Schalter, der das
      // Ergebnis verschlechtert, obwohl er einen Erlös hinzufügt.
      if (vermarktungLohnt(einspeiseErloes, fixkosten)) {
        j += einspeiseErloes - fixkosten;
      }
    }
    // Akku-Tausch nach Ablauf der Speicher-Lebensdauer (einmalig im Horizont)
    if (i === BATTERY_LIFETIME_YEARS) j -= batteryReplace;
    kum += j;
    years.push({ year: YEAR + i, i, kum: Math.round(kum), j: Math.round(j) });
  }
  // Break-even = first year from which the cumulative cashflow stays positive
  // for good. The first crossing alone can mislabel it when the one-off battery
  // replacement (year BATTERY_LIFETIME_YEARS) pushes the balance back below zero.
  const be = years.find(
    (y, idx) => idx > 0 && y.kum >= 0 && years.slice(idx).every((z) => z.kum >= 0),
  );
  return { years, be, total: years[YEARS].kum };
}

// ─── URL-Parameter-Helpers ───────────────────────────────────────────────────
export function paramInt(params: Record<string, string | string[] | undefined> | undefined, key: string, fallback: number, min = 0, max = 99): number {
  const v = params?.[key];
  if (typeof v === "string") { const n = parseInt(v); if (!isNaN(n) && n >= min && n <= max) return n; }
  return fallback;
}

export function paramFloat(params: Record<string, string | string[] | undefined> | undefined, key: string, fallback: number, min = 0, max = 99999): number {
  const v = params?.[key];
  if (typeof v === "string") { const n = parseFloat(v); if (!isNaN(n) && isFinite(n) && n >= min && n <= max) return n; }
  return fallback;
}

/**
 * Wie paramFloat, aber mit zwei Unterschieden, die für „von Hand gesetzt"
 * zählen: Fehlt der Parameter, bleibt es null (es gilt die Vorgabe) — und eine
 * eingetragene 0 bleibt 0. Bis 05.09.2026 stand im Rechner
 * `paramFloat(..., "sk", 0, 0, 30) || null`: Wer den Speicher im Ergebnis auf
 * 0 kWh setzte und teilte, dessen Empfänger bekam die Flow-Vorgabe (10 kWh),
 * 4.000 € mehr Investition und 11.000 € mehr Gewinn — auf demselben Link.
 */
export function paramFloatOrNull(params: Record<string, string | string[] | undefined> | undefined, key: string, min = 0, max = 99999): number | null {
  const v = params?.[key];
  if (typeof v !== "string") return null;
  const n = parseFloat(v);
  return !isNaN(n) && isFinite(n) && n >= min && n <= max ? n : null;
}

/**
 * Volleinspeisung ist nur wählbar, wenn nichts an der Anlage hängt, das den
 * Strom selbst verbraucht — kein Großverbraucher UND kein Speicher. Ein
 * Speicher bei Volleinspeisung ist ein halber Fall: Der Rechner setzte den
 * Eigenverbrauch auf 0, rechnete aber Kaufpreis und Akkutausch mit und zeigte
 * die Autarkie eines Teileinspeisers (81 % bei 10 kWh). Gemessen 05.09.2026:
 * 6.363 € weniger Gewinn für ein Gerät, das bei 0 % Eigenverbrauch nichts tut.
 * Die Prop-Doku des Umschalters sagte diese Regel seit jeher, der Code kannte
 * nur die Großverbraucher.
 */
export function vollEinspeisungGesperrt(a: { wp: string; ea: string; speicherKwh: number }): boolean {
  return a.wp !== "nein" || a.ea !== "nein" || a.speicherKwh > 0;
}

export function paramStr(params: Record<string, string | string[] | undefined> | undefined, key: string, fallback: string, allowed: string[]): string {
  const v = params?.[key];
  if (typeof v === "string" && allowed.includes(v)) return v;
  return fallback;
}
