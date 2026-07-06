"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { isEmbedContext } from "./embed-context";

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
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

const CACHE_PREFIX = "sc-energy-";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (sessionStorage)
const LONG_CACHE_TTL = Infinity; // Historical data never expires (localStorage)

const RETRY_DELAYS = [3000, 8000]; // 2 retries after 3s and 8s

// In-embed-context fallback cache: same {data, ts} shape as the localStorage/
// sessionStorage entries, but kept only in memory for the lifetime of the tab.
// Embed widgets run in a third-party page's iframe — they must not write to
// the visitor's browser storage (see lib/embed-context.ts).
const memoryCache = new Map<string, { data: unknown; ts: number }>();

function useCachedFetch<T>(endpoint: string, cacheKey: string, defaultValue: T, isHistorical = false): {
  data: T;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  refetch: () => void;
} {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(() => {
    setFetchTrigger(n => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (retryRef.current) clearTimeout(retryRef.current);

    const ttl = isHistorical ? LONG_CACHE_TTL : CACHE_TTL;
    // Historical data → localStorage (persists across sessions), live → sessionStorage.
    // Inside an embed widget: neither — an in-memory Map instead (no browser storage
    // on a third-party page, see lib/embed-context.ts).
    const inEmbed = isEmbedContext();
    const store = inEmbed ? null : isHistorical ? localStorage : sessionStorage;
    const fullKey = CACHE_PREFIX + cacheKey;

    // Check cache — show stale data immediately if available
    let hasStaleData = false;
    try {
      const cached = store ? store.getItem(fullKey) : memoryCache.has(fullKey) ? JSON.stringify(memoryCache.get(fullKey)) : null;
      if (cached) {
        const { data: d, ts } = JSON.parse(cached);
        setData(d);
        if (Date.now() - ts < ttl) {
          // Fresh cache hit — done
          setLoading(false);
          setError(null);
          setIsStale(false);
          return;
        }
        // Stale cache — show it but refetch in background
        hasStaleData = true;
        setLoading(false);
        setIsStale(true);
      }
    } catch { /* ignore */ }

    if (!hasStaleData) {
      setData(defaultValue);
      setLoading(true);
    }
    setError(null);

    const doFetch = (retryIndex: number) => {
      fetch(endpoint)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((d: T) => {
          if (cancelled) return;
          setData(d);
          setLoading(false);
          setError(null);
          setIsStale(false);
          try {
            if (store) {
              store.setItem(fullKey, JSON.stringify({ data: d, ts: Date.now() }));
            } else {
              memoryCache.set(fullKey, { data: d, ts: Date.now() });
            }
          } catch { /* ignore */ }
        })
        .catch((e) => {
          if (cancelled) return;
          // Auto-retry
          if (retryIndex < RETRY_DELAYS.length) {
            retryRef.current = setTimeout(() => {
              if (!cancelled) doFetch(retryIndex + 1);
            }, RETRY_DELAYS[retryIndex]);
            return;
          }
          // All retries exhausted
          setError(e.message);
          setLoading(false);
          // Keep stale data visible if we have it
          if (hasStaleData) {
            setIsStale(true);
          }
        });
    };

    doFetch(0);

    return () => {
      cancelled = true;
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [endpoint, cacheKey, fetchTrigger]);

  return { data, loading, error, isStale, refetch };
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
export function useGenerationMix(country = "de", hours = 24, dateRange?: { start: string; end: string }) {
  const endpoint = dateRange
    ? `/api/energy/generation?country=${country}&start=${dateRange.start}&end=${dateRange.end}`
    : `/api/energy/generation?country=${country}&hours=${hours}`;
  const key = dateRange
    ? `gen-${country}-${dateRange.start}-${dateRange.end}`
    : `gen-${country}-${hours}`;
  return useCachedFetch<GenerationData>(endpoint, key, { data: [], source: "", license: "", country }, isPastPeriod(dateRange));
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
  return useCachedFetch<NuclearImportData>(endpoint, key, { data: [], avg_gw: 0, avg_share_pct: 0, source: "", license: "" }, isPastPeriod(dateRange));
}
