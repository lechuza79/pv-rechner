// ─── Live PV Simulation — Pure Functions ────────────────────────────────────
// Estimates real-time PV output from current weather data (irradiance + temperature).
// Formula: P = P_peak × (GHI/1000) × (1 + γ × (T_cell - 25))
// Source: IEC 61853, Sandia NOCT model

export interface WeatherData {
  temperature: number;    // °C ambient
  irradiance: number;     // W/m² GHI (shortwave_radiation)
  cloudCover: number;     // 0–100 %
  isDay: boolean;
  time: string;           // ISO timestamp
}

export interface HourlyForecast {
  time: string[];         // ISO timestamps
  irradiance: number[];   // W/m² per hour
  temperature: number[];  // °C per hour
}

export interface HouseholdProfile {
  baseKwh: number;          // Base household consumption (kWh/a, excl. WP/EA)
  tagQuote: number;         // Daytime consumption fraction (0.24–0.45)
  wpActive: boolean;        // Heat pump active
  eaActive: boolean;        // E-car active
}

export interface SimulationResult {
  kwp: number;
  label: string;
  currentWatts: number;
  currentKw: number;        // rounded to 1 decimal
  capacityPercent: number;  // 0–100
  selfUseKw: number;        // kW self-consumed right now
  selfUsePercent: number;   // % of production self-consumed (0–100)
  surplusKw: number;        // kW fed to grid
}

export interface HourlyPoint {
  hour: number;   // 0–23
  kw: number;     // kW production
  consumptionKw: number; // kW consumption
  selfUseKw: number;     // kW self-consumed (min of production, consumption)
  label: string;  // "08:00"
}

// ─── Constants ──────────────────────────────────────────────────────────────

const NOCT = 45;          // Nominal Operating Cell Temperature (°C)
const GAMMA = -0.004;     // Temperature coefficient (%/°C for crystalline silicon)
const T_REF = 25;         // Reference temperature (STC)

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
// Some midday charging for home workers (handled via tagQuote boost)
const EA_SHAPE = [
  0.06, 0.06, 0.06, 0.05, 0.02, 0.01, // 0–5h
  0.01, 0.01, 0.01, 0.02, 0.02, 0.02, // 6–11h
  0.02, 0.02, 0.02, 0.02, 0.03, 0.05, // 12–17h
  0.08, 0.10, 0.10, 0.09, 0.08, 0.07, // 18–23h
]; // sum = 1.0

export const SIM_CONFIGS = [
  { kwp: 5,  label: "5 kWp" },
  { kwp: 8,  label: "8 kWp" },
  { kwp: 10, label: "10 kWp" },
  { kwp: 15, label: "15 kWp" },
] as const;

// ─── Core calculations ─────────────────────────────────────────────────────

/** Cell temperature from ambient temp and irradiance (Sandia NOCT model) */
export function calcCellTemp(ambientTemp: number, ghi: number): number {
  return ambientTemp + (NOCT - T_REF) * (ghi / 800);
}

/** Instantaneous PV output in Watts */
export function calcCurrentPower(kwp: number, ghi: number, ambientTemp: number): number {
  if (ghi <= 0 || kwp <= 0) return 0;
  const tCell = calcCellTemp(ambientTemp, ghi);
  const tempFactor = 1 + GAMMA * (tCell - T_REF);
  const watts = kwp * 1000 * (ghi / 1000) * tempFactor;
  return Math.max(0, Math.round(watts));
}

/** Current household consumption in Watts for a given hour.
 *
 * Three independent load components, each with their own hourly + seasonal profile:
 * 1. Base household (BDEW H0): tagQuote splits day vs night directly
 * 2. Heat pump (VDI 4655): strong seasonal pattern (winter ×1.8, summer ×0.15)
 * 3. E-car charging: evening/night concentrated
 */
export function calcCurrentConsumption(household: HouseholdProfile | null, hour: number, month: number): number {
  if (!household) return 0;

  // BDEW seasonal factor for base household consumption
  const BASE_MONTHLY = [1.17, 1.05, 1.08, 0.97, 0.93, 0.84, 0.87, 0.87, 0.91, 1.00, 1.13, 1.17];

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

  // 2. Heat pump: 3500 kWh/a with own hourly + strong seasonal profile
  if (household.wpActive) {
    const wpDailyKwh = (3500 / 365) * (WP_MONTHLY[month] || 1.0);
    totalWatts += wpDailyKwh * (WP_SHAPE[hour] || 1 / 24) * 1000;
  }

  // 3. E-car: 2700 kWh/a (15000 km × 0.18 kWh/km), no strong seasonal pattern
  if (household.eaActive) {
    const eaDailyKwh = (15000 * 0.18) / 365; // ~7.4 kWh/day
    totalWatts += eaDailyKwh * (EA_SHAPE[hour] || 1 / 24) * 1000;
  }

  return Math.round(totalWatts);
}

/** Simulate all predefined configs against current weather + optional consumption */
export function simulateAll(weather: WeatherData, household: HouseholdProfile | null): SimulationResult[] {
  const now = new Date(weather.time || new Date().toISOString());
  const hour = now.getHours();
  const month = now.getMonth();
  const consumptionW = calcCurrentConsumption(household, hour, month);

  return SIM_CONFIGS.map(c => {
    const watts = calcCurrentPower(c.kwp, weather.irradiance, weather.temperature);
    const selfUseW = household ? Math.min(watts, consumptionW) : 0;
    const surplusW = Math.max(0, watts - selfUseW);
    return {
      kwp: c.kwp,
      label: c.label,
      currentWatts: watts,
      currentKw: Math.round(watts / 100) / 10,
      capacityPercent: Math.round((watts / (c.kwp * 1000)) * 100),
      selfUseKw: Math.round(selfUseW / 100) / 10,
      selfUsePercent: watts > 0 ? Math.round((selfUseW / watts) * 100) : 0,
      surplusKw: Math.round(surplusW / 100) / 10,
    };
  });
}

/** Convert hourly forecast to production + consumption curves */
export function calcHourlyProduction(kwp: number, hourly: HourlyForecast, household: HouseholdProfile | null): HourlyPoint[] {
  return hourly.time.map((t, i) => {
    const dt = new Date(t);
    const hour = dt.getHours();
    const month = dt.getMonth();
    const watts = calcCurrentPower(kwp, hourly.irradiance[i], hourly.temperature[i]);
    const consW = calcCurrentConsumption(household, hour, month);
    const selfW = household ? Math.min(watts, consW) : 0;
    return {
      hour,
      kw: Math.round(watts / 100) / 10,
      consumptionKw: Math.round(consW / 100) / 10,
      selfUseKw: Math.round(selfW / 100) / 10,
      label: `${hour.toString().padStart(2, "0")}:00`,
    };
  });
}

/** Estimate daily production from hourly data (sum of hourly kW → kWh) */
export function calcDailyEstimate(kwp: number, hourly: HourlyForecast): number {
  let totalWh = 0;
  for (let i = 0; i < hourly.irradiance.length; i++) {
    totalWh += calcCurrentPower(kwp, hourly.irradiance[i], hourly.temperature[i]);
  }
  // Each hourly value represents 1 hour → Wh = W × 1h
  return Math.round(totalWh / 100) / 10; // kWh, 1 decimal
}
