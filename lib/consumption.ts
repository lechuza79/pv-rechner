// ─── Centralized Consumption Model ─────────────────────────────────────────
// All household consumption calculations in one place.
// Used by: calc.ts (EV model), recommend.ts, simulation.ts (live hourly), UI display

// ─── Constants ──────────────────────────────────────────────────────────────

export const WP_ANNUAL_KWH = 3500;     // Heat pump: ~3500 kWh electric/year (COP 3.5)
export const EA_KWH_PER_KM = 0.18;     // E-car: 18 kWh/100km average
export const EA_DEFAULT_KM = 15000;     // Default annual mileage

// ─── Annual consumption ─────────────────────────────────────────────────────

export function calcWpAnnual(): number {
  return WP_ANNUAL_KWH;
}

export function calcEaAnnual(km: number): number {
  return Math.round(km * EA_KWH_PER_KM);
}

/** Calculate extra consumption from WP + E-Auto (annual kWh) */
export function calcExtraConsumption(wp: string, ea: string, eaKm: number): number {
  let extra = 0;
  if (wp !== "nein") extra += WP_ANNUAL_KWH;
  if (ea !== "nein") extra += calcEaAnnual(eaKm);
  return extra;
}

/** Total annual consumption = base household + WP + E-Auto */
export function calcTotalAnnual(baseKwh: number, wp: string, ea: string, eaKm: number): number {
  return baseKwh + calcExtraConsumption(wp, ea, eaKm);
}

// ─── Household profile (for hourly simulation) ─────────────────────────────

export interface HouseholdProfile {
  baseKwh: number;          // Base household consumption (kWh/a, excl. WP/EA)
  tagQuote: number;         // Daytime consumption fraction (0.24–0.45)
  wpActive: boolean;        // Heat pump active
  eaActive: boolean;        // E-car active
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

// Heat pump hourly profile (normalized to sum=1.0)
// Heating demand concentrated in morning + evening, minimal midday
// Source: VDI 4655 + SG Ready typical profiles
const WP_SHAPE = [
  0.04, 0.03, 0.03, 0.03, 0.04, 0.06, // 0–5h
  0.08, 0.08, 0.06, 0.04, 0.03, 0.02, // 6–11h
  0.02, 0.02, 0.02, 0.03, 0.04, 0.06, // 12–17h
  0.07, 0.07, 0.06, 0.05, 0.04, 0.03, // 18–23h
]; // sum = 1.0

// Heat pump seasonal factor (relative to average month)
// COP-weighted: winter high demand, summer near-zero (hot water only ~15%)
const WP_MONTHLY = [1.8, 1.6, 1.4, 1.0, 0.5, 0.15, 0.15, 0.15, 0.5, 1.0, 1.4, 1.8];

// E-car charging profile (normalized to sum=1.0)
// Predominantly evening/night charging (after work, overnight)
const EA_SHAPE = [
  0.06, 0.06, 0.06, 0.05, 0.02, 0.01, // 0–5h
  0.01, 0.01, 0.01, 0.02, 0.02, 0.02, // 6–11h
  0.02, 0.02, 0.02, 0.02, 0.03, 0.05, // 12–17h
  0.08, 0.10, 0.10, 0.09, 0.08, 0.07, // 18–23h
]; // sum = 1.0

// ─── Hourly consumption calculation ─────────────────────────────────────────

/** Current household consumption in Watts for a given hour.
 *
 * Three independent load components, each with their own hourly + seasonal profile:
 * 1. Base household (BDEW H0): tagQuote splits day vs night directly
 * 2. Heat pump (VDI 4655): strong seasonal pattern (winter x1.8, summer x0.15)
 * 3. E-car charging: evening/night concentrated
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

  // 2. Heat pump: WP_ANNUAL_KWH with own hourly + strong seasonal profile
  if (household.wpActive) {
    const wpDailyKwh = (WP_ANNUAL_KWH / 365) * (WP_MONTHLY[month] || 1.0);
    totalWatts += wpDailyKwh * (WP_SHAPE[hour] || 1 / 24) * 1000;
  }

  // 3. E-car: EA_DEFAULT_KM * EA_KWH_PER_KM per year, no strong seasonal pattern
  if (household.eaActive) {
    const eaDailyKwh = calcEaAnnual(EA_DEFAULT_KM) / 365;
    totalWatts += eaDailyKwh * (EA_SHAPE[hour] || 1 / 24) * 1000;
  }

  return Math.round(totalWatts);
}
