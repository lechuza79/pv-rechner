"use client";
import {useWidgetResource} from "../components/dashboard/WidgetData";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GenerationDataPoint {
  ts: string;
  [key: string]: number | string | null;
}

export interface GenerationData {
  data: GenerationDataPoint[];
  source: string;
  license: string;
  country: string;
  resolution?: string;
  retrievedAt?: string;
  /** Upstream down: this is our last stored copy (see lib/energy-letzter-stand.ts). */
  stale?: boolean;
  /** Energy-Charts down, numbers from SMARD (see lib/smard.ts). */
  fallback?: "smard";
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useCachedFetch<T>(endpoint: string, _cacheKey: string, defaultValue: T, historical = false, initialData?: T) {
  const resource = useWidgetResource(endpoint, initialData ?? defaultValue, historical ? 24 * 60 * 60_000 : 300_000,
    initialData ? {data: initialData, fetchedAt: Date.parse((initialData as {retrievedAt?: string}).retrievedAt ?? '') || 0} : undefined);
  return {...resource, retrievedAt: resource.fetchedAt ? new Date(resource.fetchedAt).toISOString() : (initialData as {retrievedAt?: string} | undefined)?.retrievedAt};
}

/** Check if a date range refers to a completed past period (safe to cache long-term) */
function isPastPeriod(dateRange?: { start: string; end: string }): boolean {
  if (!dateRange) return false;
  const end = new Date(dateRange.end + "T23:59:59");
  const now = new Date();
  // Consider "past" if end date is at least 2 days ago (buffer for late data)
  return end.getTime() < now.getTime() - 2 * 24 * 60 * 60 * 1000;
}

/** Current electricity generation mix (last N hours or absolute date range) */
export function useGenerationMix(country = "de", hours = 24, dateRange?: { start: string; end: string }, initialData?: GenerationData) {
  const endpoint = dateRange
    ? `/api/energy/generation?country=${country}&start=${dateRange.start}&end=${dateRange.end}`
    : `/api/energy/generation?country=${country}&hours=${hours}`;
  const key = dateRange
    ? `gen-${country}-${dateRange.start}-${dateRange.end}`
    : `gen-${country}-${hours}`;
  return useCachedFetch<GenerationData>(endpoint, key, { data: [], source: "", license: "", country }, isPastPeriod(dateRange), initialData);
}

// ─── Nuclear Import ─────────────────────────────────────────────────────────

export interface NuclearImportDataPoint {
  ts: string;
  nuclear_gw: number;
}

export interface NuclearImportData {
  data: NuclearImportDataPoint[];
  avg_gw: number;
  avg_share_pct: number;
  source: string;
  license: string;
  /** Upstream down: this is our last stored copy (see lib/energy-letzter-stand.ts). */
  stale?: boolean;
  /** Energy-Charts down, numbers from SMARD (see lib/smard.ts). */
  fallback?: "smard";
}

/** Calculated nuclear import from neighboring countries */
export function useNuclearImport(hours = 24, dateRange?: { start: string; end: string }) {
  const endpoint = dateRange
    ? `/api/energy/nuclear-import?start=${dateRange.start}&end=${dateRange.end}`
    : `/api/energy/nuclear-import?hours=${hours}`;
  const key = dateRange
    ? `nuclear-${dateRange.start}-${dateRange.end}`
    : `nuclear-${hours}`;
  return useCachedFetch<NuclearImportData>(endpoint, key, { data: [], avg_gw: 0, avg_share_pct: 0, source: "", license: "" }, isPastPeriod(dateRange));
}

/** Physical flows have their own measurement timestamp, independent of generation. */
export function usePhysicalFlows(){
 return useCachedFetch<{snapshot:import('./physical-flows').PhysicalFlowSnapshot|null}>('/api/energy/physical-flows','physical-flows-de',{snapshot:null});
}

/** Modelled attribution, kept separate from physical border measurements. */
export function useImportMix(){
 return useCachedFetch<{snapshot:import('./import-mix').TradeMixSnapshot|null}>('/api/energy/import-mix','trade-mix-de-v2',{snapshot:null});
}
