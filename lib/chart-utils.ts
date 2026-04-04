// Shared chart utilities: color palette, formatters, scale helpers.
// Used by all Visx-based energy charts.
// Keys match Energy-Charts API response (normalizeProductionType output).

// ─── Energy Type Color Mapping (hex for Visx SVG fills) ─────────────────────

export const ENERGY_COLORS_HEX: Record<string, string> = {
  // Renewables — green shades
  solar: "#4CAF50",
  wind_onshore: "#66BB6A",
  wind_offshore: "#2E7D32",
  hydro_run_of_river: "#81C784",
  hydro_water_reservoir: "#81C784",
  hydro_pumped_storage: "#81C784",
  biomass: "#A5D6A7",
  geothermal: "#C8E6C9",
  // Fossil / other — brown/grey shades
  nuclear: "#9E9E9E",
  fossil_gas: "#BC8F6F",
  fossil_hard_coal: "#8D6E63",
  fossil_brown_coal_lignite: "#5D4037",
  fossil_oil: "#A1887F",
  fossil_coal_derived_gas: "#8D6E63",
  waste: "#BDBDBD",
  others: "#BDBDBD",
};

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

// Keys to show in stacked area chart, ordered bottom to top (renewables on top)
export const GENERATION_STACK_KEYS = [
  "fossil_brown_coal_lignite",
  "fossil_hard_coal",
  "fossil_coal_derived_gas",
  "fossil_oil",
  "fossil_gas",
  "nuclear",
  "waste",
  "others",
  "biomass",
  "geothermal",
  "hydro_run_of_river",
  "hydro_water_reservoir",
  "hydro_pumped_storage",
  "wind_offshore",
  "wind_onshore",
  "solar",
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
