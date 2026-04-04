"use client";
import { useState, useEffect } from "react";

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
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

const CACHE_PREFIX = "sc-energy-";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function useCachedFetch<T>(endpoint: string, cacheKey: string, defaultValue: T): {
  data: T;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    // Check sessionStorage
    try {
      const cached = sessionStorage.getItem(CACHE_PREFIX + cacheKey);
      if (cached) {
        const { data: d, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setData(d);
          setLoading(false);
          return;
        }
      }
    } catch { /* ignore */ }

    // No cache hit — show loading state immediately
    setLoading(true);

    fetch(endpoint)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d: T) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
        try {
          sessionStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify({ data: d, ts: Date.now() }));
        } catch { /* ignore */ }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [endpoint, cacheKey]);

  return { data, loading, error };
}

/** Current electricity generation mix (last N hours or absolute date range) */
export function useGenerationMix(country = "de", hours = 24, dateRange?: { start: string; end: string }) {
  const endpoint = dateRange
    ? `/api/energy/generation?country=${country}&start=${dateRange.start}&end=${dateRange.end}`
    : `/api/energy/generation?country=${country}&hours=${hours}`;
  const key = dateRange
    ? `gen-${country}-${dateRange.start}-${dateRange.end}`
    : `gen-${country}-${hours}`;
  return useCachedFetch<GenerationData>(endpoint, key, { data: [], source: "", license: "", country });
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
}

/** Calculated nuclear import from neighboring countries */
export function useNuclearImport(hours = 24, dateRange?: { start: string; end: string }) {
  const endpoint = dateRange
    ? `/api/energy/nuclear-import?start=${dateRange.start}&end=${dateRange.end}`
    : `/api/energy/nuclear-import?hours=${hours}`;
  const key = dateRange
    ? `nuclear-${dateRange.start}-${dateRange.end}`
    : `nuclear-${hours}`;
  return useCachedFetch<NuclearImportData>(endpoint, key, { data: [], avg_gw: 0, avg_share_pct: 0, source: "", license: "" });
}
