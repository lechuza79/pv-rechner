// ─── Centralized Consumption Model ─────────────────────────────────────────
// All household consumption calculations in one place.
// Used by: calc.ts (EV model), recommend.ts, simulation.ts (live hourly), UI display

import { estimateAcKwhFromLivingArea } from "./aircon";
import { DEFAULT_WP_ANNUAL_KWH } from "./heatpump-core";

// ─── Constants ──────────────────────────────────────────────────────────────

// WP-Jahresstrom-Default: das Standard-Gebäude durch die exakte Methode
// (Heizwärmebedarf ÷ Arbeitszahl) — ~7.300 kWh, nicht mehr die alte 3.500-
// Pauschale. Greift überall, wo keine echten Gebäudedaten vorliegen. Der PV-
// und WP-Rechner überschreiben ihn mit den tatsächlichen Eingaben.
export const WP_ANNUAL_KWH = DEFAULT_WP_ANNUAL_KWH;
export const EA_KWH_PER_KM = 0.18;     // E-car: 18 kWh/100km average
export const EA_DEFAULT_KM = 15000;     // Default annual mileage

// ─── Klimaanlage (Kühlung, nur Sommer) ──────────────────────────────────────
// Stromverbrauch fürs Kühlen, abgeleitet aus der Wohnfläche. EINE Quelle: die
// Schätzung kommt aus demselben Wettermodell wie der Klimaanlagen-Rechner
// (lib/aircon.ts), nur auf typische Annahmen kollabiert (siehe estimateAc-
// KwhFromLivingArea). So können PV-Rechner und Klimaanlagen-Rechner nicht mehr
// auseinanderdriften. Der „~3 kWh/m²"-Kennwert ist nur die abgeleitete Kurzform.
// WICHTIG: nur Kühlung. Klimageräte können auch heizen, das modellieren wir hier
// bewusst NICHT — Heizen läuft über den separaten Wärmepumpen-Rechner.
export const KLIMA_DEFAULT_M2 = 120;    // Default-Wohnfläche
export const KLIMA_M2_PRESETS = [80, 120, 160];
// Abgeleiteter Anzeige-Kennwert (kWh Strom / m² Wohnfläche / Jahr) — driftet nicht
// frei, sondern folgt dem Wettermodell. Nur für /datenstand + Hinweistexte.
export const KLIMA_KWH_PER_M2 = Math.round((estimateAcKwhFromLivingArea(100) / 100) * 10) / 10;

// ─── Annual consumption ─────────────────────────────────────────────────────

export function calcWpAnnual(): number {
  return WP_ANNUAL_KWH;
}

export function calcEaAnnual(km: number): number {
  return Math.round(km * EA_KWH_PER_KM);
}

/** Kühlstrom einer Klimaanlage (annual kWh), abgeleitet aus der Wohnfläche.
 *  Delegiert an das gemeinsame Wettermodell (Single Source of Truth). */
export function calcKlimaAnnual(m2: number): number {
  return estimateAcKwhFromLivingArea(m2);
}

/** Calculate extra consumption from WP + E-Auto + Klimaanlage (annual kWh).
 *  klima/klimaM2 are optional so existing callers stay unchanged.
 *  klimaKwhOverride: direkter Kühlstrom (z.B. aus dem Klimaanlagen-Rechner
 *  übernommen) — hat Vorrang vor der Flächen-Schätzung.
 *  wpKwhOverride: WP-Jahresstrom aus Gebäudedaten (calcWpAnnualElectricity,
 *  gemeinsam mit dem Wärmepumpen-Rechner) — hat Vorrang vor der Pauschale. */
export function calcExtraConsumption(
  wp: string,
  ea: string,
  eaKm: number,
  klima: string = "nein",
  klimaM2: number = KLIMA_DEFAULT_M2,
  klimaKwhOverride: number | null = null,
  wpKwhOverride: number | null = null,
): number {
  let extra = 0;
  if (wp !== "nein") extra += wpKwhOverride ?? WP_ANNUAL_KWH;
  if (ea !== "nein") extra += calcEaAnnual(eaKm);
  if (klima !== "nein") extra += klimaKwhOverride ?? calcKlimaAnnual(klimaM2);
  return extra;
}

/** Total annual consumption = base household + WP + E-Auto + Klimaanlage */
export function calcTotalAnnual(
  baseKwh: number,
  wp: string,
  ea: string,
  eaKm: number,
  klima: string = "nein",
  klimaM2: number = KLIMA_DEFAULT_M2,
): number {
  return baseKwh + calcExtraConsumption(wp, ea, eaKm, klima, klimaM2);
}

// ─── Household profile (for hourly simulation) ─────────────────────────────

export interface HouseholdProfile {
  baseKwh: number;          // Base household consumption (kWh/a, excl. WP/EA)
  tagQuote: number;         // Daytime consumption fraction (0.24–0.45)
  wpActive: boolean;        // Heat pump active
  eaActive: boolean;        // E-car active
  klimaActive?: boolean;    // Air conditioning (cooling only) active
  klimaM2?: number;         // Living area for AC sizing (m²)
  wpAnnualKwh?: number;     // WP electricity (kWh/a) from building data — falls back to WP_ANNUAL_KWH
  eaAnnualKwh?: number;     // E-car electricity (kWh/a) — falls back to EA_DEFAULT_KM × EA_KWH_PER_KM
  klimaAnnualKwh?: number;  // AC cooling electricity (kWh/a) — falls back to living-area estimate
}

// ─── Hourly load profiles ───────────────────────────────────────────────────
// Based on BDEW H0/VDI 4655 load profiles, split into day (7–18h) and night.
// tagQuote controls the day/night split directly (not as a marginal adjustment).

// Daytime sub-profile (hours 7–18, 12 values, normalized to sum=1.0)
// Morning peak (breakfast, getting ready), midday dip, afternoon activity
const DAY_SHAPE = [
  0.12, 0.13, 0.10, 0.08, 0.07, 0.08, // 7–12h
  0.08, 0.07, 0.07, 0.07, 0.08, 0.05, // 13–18h
]; // sum = 1.0

// Nighttime sub-profile (hours 19–6, 12 values, normalized to sum=1.0)
// Evening peak (cooking, TV, lighting), deep night standby, morning ramp
const NIGHT_SHAPE = [
  0.18, 0.17, 0.13, 0.10, 0.05, 0.03, // 19–0h
  0.03, 0.03, 0.03, 0.04, 0.08, 0.13, // 1–6h
]; // sum = 1.0

// BDEW seasonal factor for base household consumption
const BASE_MONTHLY = [1.17, 1.05, 1.08, 0.97, 0.93, 0.84, 0.87, 0.87, 0.91, 1.00, 1.13, 1.17];

export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Normalize an hourly shape so it sums to exactly 1.0. Applied by construction
// so hand-tuned weights can never silently drift the daily energy off (a tiny
// drift here scaled the simulated daily WP/E-car energy by a few percent).
function normalizeToSum1(shape: number[]): number[] {
  const sum = shape.reduce((a, b) => a + b, 0);
  return sum === 0 ? shape : shape.map((x) => x / sum);
}

// Normalize a monthly factor so its DAY-WEIGHTED mean is 1.0 — then summing
// daily_energy × factor[month] over a full year preserves the annual total.
function normalizeMonthly(factors: number[]): number[] {
  const totalDays = DAYS_IN_MONTH.reduce((a, b) => a + b, 0);
  const dayWeightedMean =
    factors.reduce((s, x, m) => s + x * DAYS_IN_MONTH[m], 0) / totalDays;
  return dayWeightedMean === 0 ? factors : factors.map((x) => x / dayWeightedMean);
}

// Heat pump hourly profile — heating demand concentrated morning + evening,
// minimal midday. Source: VDI 4655 + SG Ready typical profiles.
const WP_SHAPE = normalizeToSum1([
  0.04, 0.03, 0.03, 0.03, 0.04, 0.06, // 0–5h
  0.08, 0.08, 0.06, 0.04, 0.03, 0.02, // 6–11h
  0.02, 0.02, 0.02, 0.03, 0.04, 0.06, // 12–17h
  0.07, 0.07, 0.06, 0.05, 0.04, 0.03, // 18–23h
]);

// Heat pump seasonal factor (relative to average month)
// COP-weighted: winter high demand, summer near-zero (hot water only ~15%)
const WP_MONTHLY = normalizeMonthly([1.8, 1.6, 1.4, 1.0, 0.5, 0.15, 0.15, 0.15, 0.5, 1.0, 1.4, 1.8]);

// E-car charging profile — predominantly evening/night charging.
const EA_SHAPE = normalizeToSum1([
  0.06, 0.06, 0.06, 0.05, 0.02, 0.01, // 0–5h
  0.01, 0.01, 0.01, 0.02, 0.02, 0.02, // 6–11h
  0.02, 0.02, 0.02, 0.02, 0.03, 0.05, // 12–17h
  0.08, 0.10, 0.10, 0.09, 0.08, 0.07, // 18–23h
]);

// Air-conditioning hourly profile — cooling load tracks the daytime heat:
// negligible at night, ramps through the morning, peaks early afternoon when
// the building is hottest. This aligns the AC load with PV production, which is
// why cooling is a strong driver of self-consumption.
const AC_SHAPE = normalizeToSum1([
  0.01, 0.01, 0.01, 0.01, 0.01, 0.01, // 0–5h
  0.01, 0.02, 0.02, 0.03, 0.04, 0.05, // 6–11h
  0.06, 0.07, 0.08, 0.09, 0.09, 0.09, // 12–17h
  0.08, 0.07, 0.05, 0.03, 0.02, 0.01, // 18–23h
]);

// Air-conditioning seasonal factor — cooling is concentrated in the summer
// months, near-zero the rest of the year (German climate). normalizeMonthly
// preserves the entered annual cooling energy regardless of the shape.
const AC_MONTHLY = normalizeMonthly([0, 0, 0, 0, 0.3, 1.5, 3.0, 3.0, 1.0, 0.1, 0, 0]);

// ─── Hourly consumption calculation ─────────────────────────────────────────

/** Heat-pump-only load in Watts for a given hour/month (0 if no WP).
 *  Own hourly (VDI 4655) + strong seasonal profile (winter ×1.8, summer ×0.15).
 *  Exposed so the WP portion of the load can be read back out of the same source
 *  the full-load simulation uses — needed for the seasonally honest WP-specific
 *  PV coverage (a heat pump draws ~80 % of its power in the dark winter half,
 *  exactly when PV is weakest, so the annual household autarky overstates it). */
export function wpHourlyWatts(household: HouseholdProfile | null, hour: number, month: number): number {
  if (!household?.wpActive) return 0;
  const wpAnnual = household.wpAnnualKwh ?? WP_ANNUAL_KWH;
  const wpDailyKwh = (wpAnnual / 365) * (WP_MONTHLY[month] || 1.0);
  return wpDailyKwh * (WP_SHAPE[hour] || 1 / 24) * 1000;
}

/** Current household consumption in Watts for a given hour.
 *
 * Four independent load components, each with their own hourly + seasonal profile:
 * 1. Base household (BDEW H0): tagQuote splits day vs night directly
 * 2. Heat pump (VDI 4655): strong seasonal pattern (winter x1.8, summer x0.15)
 * 3. E-car charging: evening/night concentrated
 * 4. Air conditioning (cooling only): summer + early-afternoon concentrated
 */
export function calcHourlyConsumption(household: HouseholdProfile | null, hour: number, month: number): number {
  if (!household) return 0;

  let totalWatts = 0;

  // 1. Base household consumption — tagQuote as direct day/night split
  const baseDailyKwh = (household.baseKwh / 365) * (BASE_MONTHLY[month] || 1.0);
  const isDaytime = hour >= 7 && hour <= 18; // 7–18h = 12 daytime hours
  if (isDaytime) {
    const dayIdx = hour - 7;
    const hourFraction = DAY_SHAPE[dayIdx] || (1 / 12);
    totalWatts += baseDailyKwh * household.tagQuote * hourFraction * 1000;
  } else {
    // Map hour to night index: 19→0, 20→1, ..., 0→5, 1→6, ..., 6→11
    const nightIdx = hour >= 19 ? hour - 19 : hour + 5;
    const hourFraction = NIGHT_SHAPE[nightIdx] || (1 / 12);
    totalWatts += baseDailyKwh * (1 - household.tagQuote) * hourFraction * 1000;
  }

  // 2. Heat pump: building-based annual (or WP_ANNUAL_KWH default) with own
  //    hourly + strong seasonal profile (see wpHourlyWatts — single source, so
  //    the WP-only load can be read back out for the WP-specific PV coverage).
  totalWatts += wpHourlyWatts(household, hour, month);

  // 3. E-car: actual annual kWh if given (PV-Rechner), else EA_DEFAULT_KM ×
  //    EA_KWH_PER_KM. No strong seasonal pattern.
  if (household.eaActive) {
    const eaAnnual = household.eaAnnualKwh ?? calcEaAnnual(EA_DEFAULT_KM);
    const eaDailyKwh = eaAnnual / 365;
    totalWatts += eaDailyKwh * (EA_SHAPE[hour] || 1 / 24) * 1000;
  }

  // 4. Air conditioning: actual cooling kWh if given, else estimate from living
  // area; summer + afternoon peak. Nullish coalescing (not ||) on AC_MONTHLY:
  // winter months are a legit 0 and must stay 0 — a falsy-|| fallback would leak
  // cooling into January.
  if (household.klimaActive) {
    const klimaAnnual = household.klimaAnnualKwh ?? calcKlimaAnnual(household.klimaM2 ?? KLIMA_DEFAULT_M2);
    const klimaDailyKwh = (klimaAnnual / 365) * (AC_MONTHLY[month] ?? 1.0);
    totalWatts += klimaDailyKwh * (AC_SHAPE[hour] ?? 1 / 24) * 1000;
  }

  return Math.round(totalWatts);
}
