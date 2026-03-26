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
  annualKwh: number;        // Total annual consumption in kWh
  tagQuote: number;         // Daytime consumption fraction (0.24–0.45)
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

// BDEW H0 typical hourly load shape (normalized, sums to 1.0)
// Derived from BDEW Standardlastprofil H0 (household)
// Night low → morning peak → midday dip → evening peak → night decline
const HOURLY_LOAD_SHAPE = [
  0.022, 0.018, 0.016, 0.015, 0.016, 0.020, // 0–5h:  Night (low)
  0.030, 0.045, 0.050, 0.045, 0.040, 0.038, // 6–11h: Morning ramp + peak
  0.042, 0.044, 0.040, 0.038, 0.040, 0.052, // 12–17h: Midday + afternoon
  0.065, 0.068, 0.060, 0.050, 0.042, 0.030, // 18–23h: Evening peak + decline
];

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

/** Current household consumption in Watts for a given hour */
export function calcCurrentConsumption(household: HouseholdProfile | null, hour: number, month: number): number {
  if (!household) return 0;
  // Seasonal factor from BDEW monthly profile (imported inline to avoid circular deps)
  const MONTHLY = [1.17, 1.05, 1.08, 0.97, 0.93, 0.84, 0.87, 0.87, 0.91, 1.00, 1.13, 1.17];
  const seasonalFactor = MONTHLY[month] || 1.0;
  // Daily kWh = annual / 365 * seasonal factor
  const dailyKwh = (household.annualKwh / 365) * seasonalFactor;
  // Apply tagQuote shift: increase daytime hours (7–19), decrease night
  const baseShape = HOURLY_LOAD_SHAPE[hour] || 0.042;
  const isDaytime = hour >= 7 && hour <= 19;
  // Shift load towards daytime based on tagQuote (0.24 = mostly away, 0.45 = always home)
  const dayShift = (household.tagQuote - 0.30) * 0.5; // neutral at 0.30
  const adjustedShape = isDaytime ? baseShape * (1 + dayShift) : baseShape * (1 - dayShift * 0.5);
  // Convert to Watts (kWh for this hour × 1000)
  const hourlyKwh = dailyKwh * adjustedShape / HOURLY_LOAD_SHAPE.reduce((a, b) => a + b, 0);
  return Math.round(hourlyKwh * 1000);
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
