// Shared utilities for energy data fetching, normalization, and caching.
// All Energy-Charts, SMARD, and Eurostat API interactions go through these helpers.

import { supabase } from "./supabase-server";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TimeseriesRow {
  source: string;
  metric: string;
  country: string;
  ts: string; // ISO 8601 UTC
  data: Record<string, number | string | null>;
}

export interface MonthlyRow {
  source: string;
  metric: string;
  country: string;
  period: string; // '2024-01' or '2024-S1'
  data: Record<string, number | string | null>;
}

export interface SourceMeta {
  id: string;
  source: string;
  metric: string;
  country: string;
  license: string;
  last_fetched_at: string | null;
  last_data_ts: string | null;
  status: string;
  error_message: string | null;
}

// ─── Timestamp Normalization ─────────────────────────────────────────────────

/** Convert unix seconds to ISO 8601 UTC string */
export function unixToISO(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

/** Convert Energy-Charts DD.MM.YYYY to ISO date */
export function ddmmyyyyToISO(s: string): string {
  const [d, m, y] = s.split(".");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00Z`;
}

/** Convert Energy-Charts MM.YYYY to period string */
export function mmyyyyToPeriod(s: string): string {
  const [m, y] = s.split(".");
  return `${y}-${m.padStart(2, "0")}`;
}

// ─── Fetch with Timeout ──────────────────────────────────────────────────────

export async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}`);
  return res;
}

// ─── Supabase Upsert Helpers ─────────────────────────────────────────────────

export async function upsertTimeseries(rows: TimeseriesRow[]): Promise<number> {
  if (!supabase || rows.length === 0) return 0;

  // Batch in chunks of 500
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase
      .from("energy_timeseries")
      .upsert(
        chunk.map(r => ({
          source: r.source,
          metric: r.metric,
          country: r.country,
          ts: r.ts,
          data: r.data,
          fetched_at: new Date().toISOString(),
        })),
        { onConflict: "source,metric,country,ts" }
      );
    if (error) {
      console.error("energy_timeseries upsert error:", error.message);
    } else {
      inserted += chunk.length;
    }
  }
  return inserted;
}

export async function upsertMonthly(rows: MonthlyRow[]): Promise<number> {
  if (!supabase || rows.length === 0) return 0;

  const { error } = await supabase
    .from("energy_monthly")
    .upsert(
      rows.map(r => ({
        source: r.source,
        metric: r.metric,
        country: r.country,
        period: r.period,
        data: r.data,
        fetched_at: new Date().toISOString(),
      })),
      { onConflict: "source,metric,country,period" }
    );

  if (error) {
    console.error("energy_monthly upsert error:", error.message);
    return 0;
  }
  return rows.length;
}

export async function updateSourceMeta(
  source: string, metric: string, country: string,
  update: { license?: string; last_data_ts?: string; status?: string; error_message?: string | null }
): Promise<void> {
  if (!supabase) return;

  const id = `${source}-${metric}-${country}`;
  await supabase
    .from("data_source_meta")
    .upsert({
      id,
      source,
      metric,
      country,
      license: update.license || "unknown",
      last_fetched_at: new Date().toISOString(),
      last_data_ts: update.last_data_ts || null,
      status: update.status || "ok",
      error_message: update.error_message || null,
    }, { onConflict: "id" });
}

// ─── Query Helpers ───────────────────────────────────────────────────────────

export async function queryTimeseries(
  metric: string, country: string, start: string, end: string, source?: string
): Promise<TimeseriesRow[]> {
  if (!supabase) return [];

  let query = supabase
    .from("energy_timeseries")
    .select("source, metric, country, ts, data")
    .eq("metric", metric)
    .eq("country", country)
    .gte("ts", start)
    .lte("ts", end)
    .order("ts", { ascending: true });

  if (source) query = query.eq("source", source);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as TimeseriesRow[];
}

export async function queryMonthly(
  metric: string, country: string, source?: string
): Promise<MonthlyRow[]> {
  if (!supabase) return [];

  let query = supabase
    .from("energy_monthly")
    .select("source, metric, country, period, data")
    .eq("metric", metric)
    .eq("country", country)
    .order("period", { ascending: true });

  if (source) query = query.eq("source", source);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as MonthlyRow[];
}

// ─── In-Memory Cache Factory ─────────────────────────────────────────────────

interface CacheEntry<T> { data: T; ts: number }

export function createCache<T>(ttlMs: number) {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | null {
      const entry = store.get(key);
      if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
      return null;
    },
    set(key: string, data: T) {
      store.set(key, { data, ts: Date.now() });
      // Evict if too large
      if (store.size > 200) {
        const now = Date.now();
        store.forEach((v, k) => {
          if (now - v.ts > ttlMs) store.delete(k);
        });
      }
    },
    invalidate(key?: string) {
      if (key) store.delete(key); else store.clear();
    },
  };
}

// ─── Energy-Charts Specific ──────────────────────────────────────────────────

const EC_BASE = "https://api.energy-charts.info";

export function ecUrl(endpoint: string, params: Record<string, string>): string {
  const url = new URL(`${EC_BASE}/${endpoint}`);
  for (const [k, val] of Object.entries(params)) url.searchParams.set(k, val);
  return url.toString();
}

/** Fetch Energy-Charts public_power and normalize to TimeseriesRow[] */
export async function fetchPublicPower(country: string, start: string, end: string): Promise<TimeseriesRow[]> {
  const url = ecUrl("public_power", { country, start, end });
  const res = await fetchWithTimeout(url, 15000);
  const json = await res.json();

  if (!json.unix_seconds || !json.production_types) return [];

  const rows: TimeseriesRow[] = [];
  const timestamps: number[] = json.unix_seconds;

  for (let i = 0; i < timestamps.length; i++) {
    const data: Record<string, number | null> = {};
    for (const pt of json.production_types) {
      const key = normalizeProductionType(pt.name);
      data[key] = pt.data[i] ?? null;
    }
    rows.push({
      source: "energy-charts",
      metric: "public_power",
      country,
      ts: unixToISO(timestamps[i]),
      data,
    });
  }

  return rows;
}

/** Fetch Energy-Charts spot prices */
export async function fetchSpotPrices(bzn: string, start: string, end: string): Promise<TimeseriesRow[]> {
  const url = ecUrl("price", { bzn, start, end });
  const res = await fetchWithTimeout(url, 10000);
  const json = await res.json();

  if (!json.unix_seconds || !json.price) return [];

  return json.unix_seconds.map((ts: number, i: number) => ({
    source: "energy-charts",
    metric: "price",
    country: bzn.toLowerCase(),
    ts: unixToISO(ts),
    data: { price_eur_mwh: json.price[i] ?? null },
  }));
}

/** Fetch Energy-Charts cross-border physical flows */
export async function fetchCrossBorderFlows(country: string, start: string, end: string): Promise<TimeseriesRow[]> {
  const url = ecUrl("cbpf", { country, start, end });
  const res = await fetchWithTimeout(url, 10000);
  const json = await res.json();

  if (!json.unix_seconds || !json.countries) return [];

  const rows: TimeseriesRow[] = [];
  for (let i = 0; i < json.unix_seconds.length; i++) {
    const data: Record<string, number | null> = {};
    for (const c of json.countries) {
      if (c.name === "sum") {
        data.net = c.data[i] ?? null;
      } else {
        data[c.name.toLowerCase().replace(/\s+/g, "_")] = c.data[i] ?? null;
      }
    }
    rows.push({
      source: "energy-charts",
      metric: "cbpf",
      country,
      ts: unixToISO(json.unix_seconds[i]),
      data,
    });
  }

  return rows;
}

/** Fetch Energy-Charts installed power (monthly) */
export async function fetchInstalledPower(country: string): Promise<MonthlyRow[]> {
  const url = ecUrl("installed_power", {
    country,
    time_step: "monthly",
    installation_decommission: "false",
  });
  const res = await fetchWithTimeout(url, 15000);
  const json = await res.json();

  if (!json.time || !json.production_types) return [];

  const rows: MonthlyRow[] = [];
  for (let i = 0; i < json.time.length; i++) {
    const period = mmyyyyToPeriod(json.time[i]);
    const data: Record<string, number | null> = {};
    for (const pt of json.production_types) {
      const key = normalizeProductionType(pt.name);
      data[key] = pt.data[i] ?? null;
    }
    rows.push({
      source: "energy-charts",
      metric: "installed_power",
      country,
      period,
      data,
    });
  }

  return rows;
}

/** Fetch Energy-Charts renewable share daily average */
export async function fetchRenewableShare(country: string, start: string, end: string): Promise<MonthlyRow[]> {
  const url = ecUrl("ren_share_daily_avg", { country, start, end });
  const res = await fetchWithTimeout(url, 10000);
  const json = await res.json();

  if (!json.days || !json.data) return [];

  return json.days.map((day: string, i: number) => {
    // day is DD.MM.YYYY — convert to period YYYY-MM-DD
    const [d, m, y] = day.split(".");
    return {
      source: "energy-charts",
      metric: "ren_share_daily",
      country,
      period: `${y}-${m}-${d}`,
      data: { share_pct: json.data[i] ?? null },
    };
  });
}

/** Fetch Energy-Charts signal */
export async function fetchSignal(country: string): Promise<{ share: number; signal: number; ts: string } | null> {
  const url = ecUrl("signal", { country });
  const res = await fetchWithTimeout(url, 5000);
  const json = await res.json();

  if (!json.unix_seconds || !json.signal || !json.share) return null;

  // Return the current (first) value
  const now = Date.now() / 1000;
  let idx = 0;
  for (let i = 0; i < json.unix_seconds.length; i++) {
    if (json.unix_seconds[i] <= now) idx = i;
    else break;
  }

  return {
    share: json.share[idx],
    signal: json.signal[idx],
    ts: unixToISO(json.unix_seconds[idx]),
  };
}

// ─── Eurostat ────────────────────────────────────────────────────────────────

export async function fetchHouseholdPrices(countries: string[]): Promise<MonthlyRow[]> {
  // Eurostat nrg_pc_204: household electricity prices
  // Band DC = 2500-4999 kWh (typical), DD = 5000-14999 kWh (WP/EV households)
  const bands = ["KWH2500-4999", "KWH5000-14999"];
  const rows: MonthlyRow[] = [];

  for (const band of bands) {
    const geoParam = countries.map(c => `&geo=${c.toUpperCase()}`).join("");
    const url = `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_pc_204?format=JSON&nrg_cons=${band}&unit=KWH&tax=I_TAX&currency=EUR${geoParam}`;

    const res = await fetchWithTimeout(url, 15000);
    const json = await res.json();

    if (!json.value || !json.dimension) continue;

    const timeDim = json.dimension.time?.category;
    const geoDim = json.dimension.geo?.category;
    if (!timeDim?.index || !geoDim?.index) continue;

    const times = Object.keys(timeDim.index);
    const geos = Object.keys(geoDim.index);
    const timeSize = times.length;

    // Eurostat flat index: geo varies slowest, time varies fastest
    for (let gi = 0; gi < geos.length; gi++) {
      for (let ti = 0; ti < timeSize; ti++) {
        const flatIdx = gi * timeSize + ti;
        const value = json.value[String(flatIdx)];
        if (value == null) continue;

        const geo = geos[gi];
        const time = times[ti]; // e.g. "2024-S2"
        const bandKey = band === "KWH2500-4999" ? "price_dc" : "price_dd";

        // Find existing row or create new
        const existing = rows.find(r => r.country === geo.toLowerCase() && r.period === time);
        if (existing) {
          (existing.data as Record<string, number>)[bandKey] = value;
        } else {
          rows.push({
            source: "eurostat",
            metric: "household_prices",
            country: geo.toLowerCase(),
            period: time,
            data: { [bandKey]: value },
          });
        }
      }
    }
  }

  return rows;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeProductionType(name: string): string {
  // Convert Energy-Charts production type names to snake_case keys
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
