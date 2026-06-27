import { YEAR, YEARS, DEGRAD, CONSUMPTION_MONTHLY, FUEL, PERSONEN, NUTZUNG } from "./constants";
import { calcExtraConsumption, KLIMA_DEFAULT_M2 } from "./consumption";
import { DEFAULT_PRICES, type PriceConfig } from "./prices-config";
import { co2PriceForCalendarYear } from "./co2-config";

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
export function calcEigenverbrauch({ personenIdx, nutzungIdx, speicherKwh, wp, ea, eaKm, klima = "nein", klimaM2 = KLIMA_DEFAULT_M2, kwp, ertragKwp, baseKwh }: { personenIdx: number; nutzungIdx: number; speicherKwh: number; wp: string; ea: string; eaKm: number; klima?: string; klimaM2?: number; kwp: number; ertragKwp: number; baseKwh?: number | null }): number {
  const jahresertrag = kwp * ertragKwp;
  // baseKwh = direkt eingegebener Haushaltsverbrauch (ohne WP/E-Auto). Fällt
  // auf die personenbasierte Schätzung zurück, wenn nicht gesetzt.
  const grundverbrauch = baseKwh ?? PERSONEN[personenIdx].verbrauch;
  const tagQuote = NUTZUNG[nutzungIdx].tagQuote;
  const extra = calcExtraConsumption(wp, ea, eaKm, klima, klimaM2);
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

export function calc({ kwp, kosten, strompreis, eigenverbrauch, einspeisung, stromSteigerung, ertragKwp, monthly, batteryReplace = 0 }: { kwp: number; kosten: number; strompreis: number; eigenverbrauch: number; einspeisung: number; stromSteigerung: number; ertragKwp: number; monthly: number[] | null; batteryReplace?: number }) {
  const years: { year: number; i: number; kum: number; j: number }[] = [];
  let kum = -kosten;
  // Monatliche Berechnung wenn PVGIS-Profil vorhanden
  const fracs = monthly ? monthly.map(m => m / monthly.reduce((a, b) => a + b, 0)) : null;
  // Seasonal self-consumption ratios that integrate back to the entered EV.
  const monthlyEv = fracs ? buildMonthlyEv(eigenverbrauch / 100, fracs) : null;
  for (let i = 0; i <= YEARS; i++) {
    let j = 0;
    if (i > 0) {
      const deg = Math.pow(1 - DEGRAD, i);
      const sp = strompreis * Math.pow(1 + stromSteigerung, i);
      if (fracs && monthlyEv) {
        // Monatlich: EV% variiert saisonal (Winter höher, Sommer niedriger),
        // bleibt aber jahresgewichtet auf dem eingegebenen Eigenverbrauch.
        for (let m = 0; m < 12; m++) {
          const mProd = kwp * ertragKwp * fracs[m] * deg;
          const mEv = monthlyEv[m];
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

export function paramStr(params: Record<string, string | string[] | undefined> | undefined, key: string, fallback: string, allowed: string[]): string {
  const v = params?.[key];
  if (typeof v === "string" && allowed.includes(v)) return v;
  return fallback;
}
