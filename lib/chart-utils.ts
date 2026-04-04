// Shared chart utilities: color palette, formatters, scale helpers.
// Used by all Visx-based energy charts.
// Keys match Energy-Charts API response (normalizeProductionType output).

import { tokens } from "./theme";

// ─── Energy Type Color Mapping (hex for Visx SVG fills) ─────────────────────
// Sourced from theme tokens — single source of truth

export const ENERGY_COLORS_HEX: Record<string, string> = {
  // Renewables — green shades
  solar: tokens["--color-energy-solar"],
  wind_onshore: tokens["--color-energy-wind"],
  wind_offshore: tokens["--color-energy-wind-offshore"],
  hydro_run_of_river: tokens["--color-energy-hydro"],
  hydro_water_reservoir: tokens["--color-energy-hydro"],
  hydro_pumped_storage: tokens["--color-energy-hydro"],
  biomass: tokens["--color-energy-biomass"],
  geothermal: tokens["--color-energy-geothermal"],
  // Fossil — brown shades
  fossil_gas: tokens["--color-energy-gas"],
  fossil_hard_coal: tokens["--color-energy-coal"],
  fossil_brown_coal_lignite: tokens["--color-energy-lignite"],
  fossil_oil: tokens["--color-energy-oil"],
  fossil_coal_derived_gas: tokens["--color-energy-coal-gas"],
  // Sonstige
  waste: tokens["--color-energy-other"],
  others: tokens["--color-energy-other"],
};

// Category summary colors (for legend, tooltip headers)
export const CATEGORY_COLORS = {
  renewable: tokens["--color-energy-cat-renewable"],
  fossil: tokens["--color-energy-cat-fossil"],
  other: tokens["--color-energy-cat-other"],
  nuclearImport: tokens["--color-energy-nuclear-import"],
} as const;

// Display names (German)
export const ENERGY_LABELS: Record<string, string> = {
  solar: "Solar",
  wind_onshore: "Wind Onshore",
  wind_offshore: "Wind Offshore",
  hydro_run_of_river: "Wasserkraft",
  hydro_water_reservoir: "Wasserkraft",
  hydro_pumped_storage: "Pumpspeicher",
  biomass: "Biomasse",
  nuclear: "Kernenergie",
  fossil_gas: "Erdgas",
  fossil_hard_coal: "Steinkohle",
  fossil_brown_coal_lignite: "Braunkohle",
  fossil_oil: "Öl",
  fossil_coal_derived_gas: "Grubengas",
  geothermal: "Geothermie",
  waste: "Abfall",
  others: "Sonstige",
};

// Keys to show in stacked area chart, ordered bottom to top
// Within each group: dark colors at bottom → light colors at top
export const GENERATION_STACK_KEYS = [
  // Fossil (dark brown → light brown)
  "fossil_brown_coal_lignite",
  "fossil_hard_coal",
  "fossil_coal_derived_gas",
  "fossil_oil",
  "fossil_gas",
  // Neutral
  "waste",
  "others",
  // Renewables (dark green → light green)
  "wind_offshore",
  "solar",
  "wind_onshore",
  "hydro_run_of_river",
  "hydro_water_reservoir",
  "hydro_pumped_storage",
  "biomass",
  "geothermal",
];

// Fossil keys for calculating fossil share
export const FOSSIL_KEYS = [
  "fossil_brown_coal_lignite",
  "fossil_hard_coal",
  "fossil_coal_derived_gas",
  "fossil_oil",
  "fossil_gas",
];

// Renewable keys for calculating EE share
export const RENEWABLE_KEYS = [
  "solar",
  "wind_onshore",
  "wind_offshore",
  "hydro_run_of_river",
  "hydro_water_reservoir",
  "biomass",
  "geothermal",
];

// Sonstige keys (waste, others — neither renewable nor fossil)
export const SONSTIGE_KEYS = ["waste", "others"];

// Meta keys (not generation types, but included in API response)
export const META_KEYS = [
  "load",
  "residual_load",
  "renewable_share_of_load",
  "renewable_share_of_generation",
  "hydro_pumped_storage_consumption",
  "cross_border_electricity_trading",
];

// ─── Formatters ──────────────────────────────────────────────────────────────

export function formatMW(mw: number): string {
  if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`;
  return `${Math.round(mw)} MW`;
}

export function formatGWh(gwh: number): string {
  if (gwh >= 10000) return `${(gwh / 1000).toFixed(0)} TWh`;
  if (gwh >= 1000) return `${(gwh / 1000).toFixed(1)} TWh`;
  if (gwh >= 10) return `${gwh.toFixed(0)} GWh`;
  return `${gwh.toFixed(1)} GWh`;
}

export function formatEurMWh(eur: number): string {
  return `${(eur / 10).toFixed(1)} ct/kWh`;
}

export function formatPercent(pct: number): string {
  return `${Math.round(pct)} %`;
}

export function formatTime(iso: string, mode: "time" | "date" | "datetime" = "time"): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions =
    mode === "time" ? { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" } :
    mode === "date" ? { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" } :
    { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" };
  return d.toLocaleString("de-DE", opts);
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

interface DataPoint {
  ts: string;
  [key: string]: number | string | null;
}

/** Calculate energy totals over a time period (MW × 0.25h intervals → MWh → GWh) */
export function calcPeriodStats(data: DataPoint[]) {
  if (data.length < 2) return null;

  // Detect interval (usually 15 min = 900s)
  const t0 = new Date(data[0].ts).getTime();
  const t1 = new Date(data[1].ts).getTime();
  const intervalHours = (t1 - t0) / (1000 * 60 * 60);

  let totalGenerationMWh = 0;
  let renewableMWh = 0;
  let loadMWh = 0;

  for (const d of data) {
    // Sum generation
    for (const key of GENERATION_STACK_KEYS) {
      const val = d[key];
      if (typeof val === "number" && val > 0) {
        totalGenerationMWh += val * intervalHours;
        if (RENEWABLE_KEYS.includes(key)) {
          renewableMWh += val * intervalHours;
        }
      }
    }

    // Sum load (consumption)
    const load = d.load;
    if (typeof load === "number" && load > 0) {
      loadMWh += load * intervalHours;
    }
  }

  const totalGenerationGWh = totalGenerationMWh / 1000;
  const renewableGWh = renewableMWh / 1000;
  const loadGWh = loadMWh / 1000;
  const eeSharePct = totalGenerationMWh > 0 ? (renewableMWh / totalGenerationMWh) * 100 : 0;

  // Net import/export: load - generation (positive = import, negative = export)
  const netImportGWh = loadGWh - totalGenerationGWh;

  return {
    totalGenerationGWh,
    renewableGWh,
    loadGWh,
    eeSharePct,
    netImportGWh,
  };
}

// ─── Chart Dimensions ────────────────────────────────────────────────────────

export const CHART_MARGIN = { top: 12, right: 16, bottom: 40, left: 56 };
export const CHART_HEIGHT = 300;
