"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { isEmbedContext } from "./embed-context";

// Generic cached-fetch hook with stale-while-revalidate semantics, auto-retry,
// and sessionStorage/localStorage persistence. Same behaviour the energy-data
// hooks in lib/energy.ts use — extracted here so mastr-hero and any future
// widgets can share it.

const CACHE_PREFIX = "sc-fetch-";
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const LONG_TTL = Infinity; // historical / quarterly-updated data
const RETRY_DELAYS = [3000, 8000];

// In-embed-context fallback cache (no browser storage inside a third-party
// page's iframe — see lib/embed-context.ts).
const memoryCache = new Map<string, { data: unknown; ts: number }>();

export type CachedFetchState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  refetch: () => void;
};

export type CachedFetchOptions = {
  /** If true, persist in localStorage (Infinity TTL). Else sessionStorage (5 min TTL). */
  longLived?: boolean;
  /** Override cache key prefix (useful for preventing collisions). */
  keyPrefix?: string;
};

export function useCachedFetch<T>(
  endpoint: string | null,
  cacheKey: string,
  defaultValue: T,
  options: CachedFetchOptions = {},
): CachedFetchState<T> {
  const { longLived = false, keyPrefix = CACHE_PREFIX } = options;
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(() => setFetchTrigger((n) => n + 1), []);

  useEffect(() => {
    if (endpoint === null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    if (retryRef.current) clearTimeout(retryRef.current);

    const ttl = longLived ? LONG_TTL : DEFAULT_TTL;
    const inEmbed = isEmbedContext();
    const store = typeof window === "undefined" || inEmbed ? null : longLived ? window.localStorage : window.sessionStorage;
    const fullKey = keyPrefix + cacheKey;

    let hasStaleData = false;
    try {
      const cached = store ? store.getItem(fullKey) : memoryCache.has(fullKey) ? JSON.stringify(memoryCache.get(fullKey)) : null;
      if (cached) {
        const parsed = JSON.parse(cached) as { data: T; ts: number };
        setData(parsed.data);
        if (Date.now() - parsed.ts < ttl) {
          setLoading(false);
          setError(null);
          setIsStale(false);
          return;
        }
        hasStaleData = true;
        setLoading(false);
        setIsStale(true);
      }
    } catch {
      /* ignore corrupt cache entries */
    }

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
        .then((payload: T) => {
          if (cancelled) return;
          setData(payload);
          setLoading(false);
          setError(null);
          setIsStale(false);
          try {
            if (store) {
              store.setItem(fullKey, JSON.stringify({ data: payload, ts: Date.now() }));
            } else {
              memoryCache.set(fullKey, { data: payload, ts: Date.now() });
            }
          } catch {
            /* quota etc. */
          }
        })
        .catch((e: Error) => {
          if (cancelled) return;
          if (retryIndex < RETRY_DELAYS.length) {
            retryRef.current = setTimeout(() => {
              if (!cancelled) doFetch(retryIndex + 1);
            }, RETRY_DELAYS[retryIndex]);
            return;
          }
          setError(e.message);
          setLoading(false);
          if (hasStaleData) setIsStale(true);
        });
    };

    doFetch(0);

    return () => {
      cancelled = true;
      if (retryRef.current) clearTimeout(retryRef.current);
    };
    // defaultValue intentionally not in deps — it's a per-component constant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, cacheKey, fetchTrigger, longLived, keyPrefix]);

  return { data, loading, error, isStale, refetch };
}
