"use client";
import { useState, useEffect } from "react";
import { DEFAULT_FEED_IN, type FeedInRates } from "./feedin-config";
import { isEmbedContext } from "./embed-context";

export { DEFAULT_FEED_IN, type FeedInRates } from "./feedin-config";

const CACHE_KEY = "solar-check-feedin";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// In-embed-context fallback cache (no browser storage inside a third-party
// page's iframe — see lib/embed-context.ts).
const memoryCache = new Map<string, { data: unknown; ts: number }>();

export function useFeedInRates(): FeedInRates {
  const [rates, setRates] = useState<FeedInRates>(DEFAULT_FEED_IN);

  useEffect(() => {
    // Embed widgets must not write to the visitor's browser storage (§ 25
    // TDDDG) — fall back to an in-memory cache there.
    const inEmbed = isEmbedContext();
    const store = inEmbed ? null : sessionStorage;

    try {
      const cached = store ? store.getItem(CACHE_KEY) : memoryCache.has(CACHE_KEY) ? JSON.stringify(memoryCache.get(CACHE_KEY)) : null;
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setRates(data);
          return;
        }
      }
    } catch { /* ignore */ }

    fetch("/api/feedin")
      .then(res => res.ok ? res.json() : null)
      .then((data: FeedInRates | null) => {
        if (data && data.teilUnder10 > 0) {
          setRates(data);
          try {
            if (store) {
              store.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
            } else {
              memoryCache.set(CACHE_KEY, { data, ts: Date.now() });
            }
          } catch { /* ignore */ }
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  return rates;
}
