import { YEAR, YEARS, DEGRAD, CONSUMPTION_MONTHLY, FUEL, PERSONEN, NUTZUNG } from "./constants";
import { calcExtraConsumption } from "./consumption";
import { DEFAULT_PRICES, type PriceConfig } from "./prices-config";

// ─── Fuel comparison (WP vs. Gas/Öl) ────────────────────────────────────────
// CO2-Preis: 55€/t 2025, 65€/t 2026, ab 2027 EU ETS2 marktbasiert (konservativ +8€/Jahr)
// Quelle: BEHG + EU ETS2 (Agora/dena-Prognose)
export function co2PriceForYear(i: number): number {
  return i === 0 ? 55 : i === 1 ? 65 : 65 + (i - 1) * 8;
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
    const co2Surcharge = co2PerKwh * co2PriceForYear(i) / 1000; // €/kWh
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
    const co2Surcharge = co2PerKwh * co2PriceForYear(i) / 1000;
    const basePrice = pricePerKwh * Math.pow(1 + inflation, i);
    out.push(fuelKwh * (basePrice + co2Surcharge));
  }
  return out;
}

// Legacy wrapper — used by PV-Rechner (25 years, assumes COP 3.5 to derive thermal from electric)
export function calcFuelCost25(wpKwhElectric: number, fuel: "gas" | "oil"): number {
  const f = FUEL[fuel];
  const thermalKwh = wpKwhElectric * 3.5; // COP 3.5
  const fuelKwh = thermalKwh / f.efficiency;
  return calcFuelCost({ fuelKwh, pricePerKwh: f.price, co2PerKwh: f.co2PerKwh, years: YEARS, inflation: 0.02 });
}

export function calcWpGridCost25(wpKwh: number, autarky: number, strompreis: number, stromSteigerung: number): number {
  let total = 0;
  const gridFraction = 1 - autarky;
  for (let i = 0; i < YEARS; i++) {
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
// Ein Heimspeicher hält ~13 Jahre (Garantie/Zyklenlebensdauer LFP), danach
// fällig: Ersatz. Über den 25-Jahre-Horizont fällt also genau ein Akku-Tausch
// an. Ohne diesen Posten rechnet sich jede Speichergröße scheinbar, weil der
// Akku „25 Jahre gratis weiterläuft" — das überdimensioniert die Empfehlung.
export const BATTERY_LIFETIME_YEARS = 13;
// Ersatzakku in ~13 Jahren ist günstiger als heute (Preisverfall ~-3 %/Jahr).
export const BATTERY_REPLACE_PRICE_FACTOR = 0.7;

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
// amortisiert. Default 12 Jahre = typische Heimspeicher-Lebensdauer; ein
// Speicher, der sich nicht in seiner Lebenszeit rechnet, ist eine Fehlinvestition.
export const MAX_MARGINAL_PAYBACK_YEARS = 12;

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
export function calcEigenverbrauch({ personenIdx, nutzungIdx, speicherKwh, wp, ea, eaKm, kwp, ertragKwp }: { personenIdx: number; nutzungIdx: number; speicherKwh: number; wp: string; ea: string; eaKm: number; kwp: number; ertragKwp: number }): number {
  const jahresertrag = kwp * ertragKwp;
  const grundverbrauch = PERSONEN[personenIdx].verbrauch;
  const tagQuote = NUTZUNG[nutzungIdx].tagQuote;
  const extra = calcExtraConsumption(wp, ea, eaKm);
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
    const wpKwh = extra > 0 ? Math.min(WP_ANNUAL_KWH_CONST, extra) : 0;
    const wpAnteil = wpKwh / gesamt;
    evBoost *= (1 - wpAnteil * 0.30);
  }
  // Physikalische Grenze: max. Eigenverbrauch = Gesamtverbrauch / Jahresertrag
  const evMax = gesamt / jahresertrag;
  const ev = Math.round(Math.min(evBase + evBoost, evMax, 0.90) * 100);
  return Math.max(10, Math.min(ev, 90));
}
const WP_ANNUAL_KWH_CONST = 3500;

// ─── Amortisation (25 Jahre, monatlich wenn PVGIS-Profil vorhanden) ─────────
export function calc({ kwp, kosten, strompreis, eigenverbrauch, einspeisung, stromSteigerung, ertragKwp, monthly, batteryReplace = 0 }: { kwp: number; kosten: number; strompreis: number; eigenverbrauch: number; einspeisung: number; stromSteigerung: number; ertragKwp: number; monthly: number[] | null; batteryReplace?: number }) {
  const years = [];
  let kum = -kosten;
  // Monatliche Berechnung wenn PVGIS-Profil vorhanden
  const fracs = monthly ? monthly.map(m => m / monthly.reduce((a, b) => a + b, 0)) : null;
  for (let i = 0; i <= YEARS; i++) {
    let j = 0;
    if (i > 0) {
      const deg = Math.pow(1 - DEGRAD, i);
      const sp = strompreis * Math.pow(1 + stromSteigerung, i);
      if (fracs) {
        // Monatlich: EV% variiert saisonal (Winter höher, Sommer niedriger)
        for (let m = 0; m < 12; m++) {
          const mProd = kwp * ertragKwp * fracs[m] * deg;
          // EV% pro Monat: skaliert mit Verbrauch (BDEW H0) und inversem Ertrag
          const mEv = Math.min(eigenverbrauch * CONSUMPTION_MONTHLY[m] / (fracs[m] * 12), 95) / 100;
          j += mProd * mEv * sp + mProd * (1 - mEv) * (einspeisung / 100);
        }
      } else {
        // Jährlich (Fallback ohne Monatsprofil)
        const ertrag = kwp * ertragKwp * deg;
        j = ertrag * (eigenverbrauch / 100) * sp + ertrag * (1 - eigenverbrauch / 100) * (einspeisung / 100);
      }
    }
    // Akku-Tausch nach Ablauf der Speicher-Lebensdauer (einmalig im Horizont)
    if (i === BATTERY_LIFETIME_YEARS) j -= batteryReplace;
    kum += j;
    years.push({ year: YEAR + i, i, kum: Math.round(kum), j: Math.round(j) });
  }
  const be = years.find((y, idx) => idx > 0 && y.kum >= 0);
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

export function paramStr(params: Record<string, string | string[] | undefined> | undefined, key: string, fallback: string, allowed: string[]): string {
  const v = params?.[key];
  if (typeof v === "string" && allowed.includes(v)) return v;
  return fallback;
}
