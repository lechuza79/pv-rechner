"use client";
import { useState, useEffect } from "react";
import { DEFAULT_PRICES, type PriceConfig } from "./prices-config";
import { isEmbedContext } from "./embed-context";

// Re-export for convenience (client consumers can import from here)
export { DEFAULT_PRICES, type PriceConfig } from "./prices-config";

const CACHE_KEY = "solar-check-prices";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// In-embed-context fallback cache (no browser storage inside a third-party
// page's iframe — see lib/embed-context.ts).
const memoryCache = new Map<string, { data: unknown; ts: number }>();

// Merge stored prices with defaults — guards against stale cache from an older code
// version that didn't yet ship a field (e.g. electricityPrice). Without this, the
// missing field becomes undefined and propagates as NaN through calc().
function mergeWithDefaults(data: Partial<PriceConfig>): PriceConfig {
  return {
    pvPriceSmall: typeof data.pvPriceSmall === "number" ? data.pvPriceSmall : DEFAULT_PRICES.pvPriceSmall,
    pvPriceLarge: typeof data.pvPriceLarge === "number" ? data.pvPriceLarge : DEFAULT_PRICES.pvPriceLarge,
    pvThresholdKwp: typeof data.pvThresholdKwp === "number" ? data.pvThresholdKwp : DEFAULT_PRICES.pvThresholdKwp,
    batteryBase: typeof data.batteryBase === "number" ? data.batteryBase : DEFAULT_PRICES.batteryBase,
    batteryPerKwh: typeof data.batteryPerKwh === "number" ? data.batteryPerKwh : DEFAULT_PRICES.batteryPerKwh,
    electricityPrice: typeof data.electricityPrice === "number" ? data.electricityPrice : DEFAULT_PRICES.electricityPrice,
    electricityIncrease: typeof data.electricityIncrease === "number" ? data.electricityIncrease : DEFAULT_PRICES.electricityIncrease,
    validFrom: typeof data.validFrom === "string" ? data.validFrom : DEFAULT_PRICES.validFrom,
    source: data.source ?? DEFAULT_PRICES.source,
  };
}

// ─── Client Hook ──────────────────────────────────────────────────────────────

export function usePrices(): PriceConfig {
  const [prices, setPrices] = useState<PriceConfig>(DEFAULT_PRICES);

  useEffect(() => {
    // Embed widgets must not write to the visitor's browser storage (§ 25
    // TDDDG) — fall back to an in-memory cache there.
    const inEmbed = isEmbedContext();
    const store = inEmbed ? null : sessionStorage;

    // Check cache first
    try {
      const cached = store ? store.getItem(CACHE_KEY) : memoryCache.has(CACHE_KEY) ? JSON.stringify(memoryCache.get(CACHE_KEY)) : null;
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setPrices(mergeWithDefaults(data));
          return;
        }
      }
    } catch { /* ignore */ }

    // Fetch from API
    fetch("/api/prices")
      .then(res => res.ok ? res.json() : null)
      .then((data: Partial<PriceConfig> | null) => {
        if (data && typeof data.pvPriceSmall === "number" && data.pvPriceSmall > 0) {
          const merged = mergeWithDefaults(data);
          setPrices(merged);
          try {
            if (store) {
              store.setItem(CACHE_KEY, JSON.stringify({ data: merged, ts: Date.now() }));
            } else {
              memoryCache.set(CACHE_KEY, { data: merged, ts: Date.now() });
            }
          } catch { /* ignore */ }
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  return prices;
}
