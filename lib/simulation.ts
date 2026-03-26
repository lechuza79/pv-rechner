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

export interface SimulationResult {
  kwp: number;
  label: string;
  currentWatts: number;
  currentKw: number;        // rounded to 1 decimal
  capacityPercent: number;  // 0–100
}

export interface HourlyPoint {
  hour: number;   // 0–23
  kw: number;     // kW output
  label: string;  // "08:00"
}

// ─── Constants ──────────────────────────────────────────────────────────────

const NOCT = 45;          // Nominal Operating Cell Temperature (°C)
const GAMMA = -0.004;     // Temperature coefficient (%/°C for crystalline silicon)
const T_REF = 25;         // Reference temperature (STC)

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

/** Simulate all predefined configs against current weather */
export function simulateAll(weather: WeatherData): SimulationResult[] {
  return SIM_CONFIGS.map(c => {
    const watts = calcCurrentPower(c.kwp, weather.irradiance, weather.temperature);
    return {
      kwp: c.kwp,
      label: c.label,
      currentWatts: watts,
      currentKw: Math.round(watts / 100) / 10, // 1 decimal
      capacityPercent: Math.round((watts / (c.kwp * 1000)) * 100),
    };
  });
}

/** Convert hourly forecast to production curve for a given kWp */
export function calcHourlyProduction(kwp: number, hourly: HourlyForecast): HourlyPoint[] {
  return hourly.time.map((t, i) => {
    const hour = new Date(t).getHours();
    const watts = calcCurrentPower(kwp, hourly.irradiance[i], hourly.temperature[i]);
    return {
      hour,
      kw: Math.round(watts / 100) / 10,
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
