"use client";
import { useState, useEffect } from "react";
import { DEFAULT_PRICES, type PriceConfig } from "./prices-config";
import { DEFAULT_HEATPUMP_PRICES, type HeatpumpPriceConfig } from "./heatpump-prices";
import { cacheStorage } from "./embed-context";

// Re-export for convenience (client consumers can import from here)
export { DEFAULT_PRICES, type PriceConfig } from "./prices-config";

const CACHE_KEY = "solar-check-prices";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

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

// ─── Wärmepumpen-Grundpreis (Luft/Wasser), live ────────────────────────────
// Reads the wp fields from the same /api/prices endpoint (own session cache key).
// Falls back to the config snapshot when the API/DB is unavailable. Consumers
// merge it into the heat-pump config: { ...DEFAULT_HEATPUMP_CONFIG, investLwwpBase,
// investLwwpPerKw }.
const HP_CACHE_KEY = "solar-check-hp-prices";

export function useHeatpumpPrices(): HeatpumpPriceConfig {
  const [hp, setHp] = useState<HeatpumpPriceConfig>(DEFAULT_HEATPUMP_PRICES);

  useEffect(() => {
    const store = cacheStorage("session");
    try {
      const cached = store?.getItem(HP_CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL && typeof data?.investLwwpBase === "number") {
          setHp(data);
          return;
        }
      }
    } catch { /* ignore */ }

    fetch("/api/prices")
      .then(res => res.ok ? res.json() : null)
      .then((data: { wpLwwpBase?: number; wpLwwpPerKw?: number; validFrom?: string; source?: string | null } | null) => {
        if (data && typeof data.wpLwwpBase === "number" && data.wpLwwpBase > 0) {
          const merged: HeatpumpPriceConfig = {
            investLwwpBase: data.wpLwwpBase,
            investLwwpPerKw: typeof data.wpLwwpPerKw === "number" && data.wpLwwpPerKw > 0 ? data.wpLwwpPerKw : DEFAULT_HEATPUMP_PRICES.investLwwpPerKw,
            validFrom: typeof data.validFrom === "string" ? data.validFrom : DEFAULT_HEATPUMP_PRICES.validFrom,
            source: data.source ?? DEFAULT_HEATPUMP_PRICES.source,
          };
          setHp(merged);
          try { store?.setItem(HP_CACHE_KEY, JSON.stringify({ data: merged, ts: Date.now() })); } catch { /* ignore */ }
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  return hp;
}

export function usePrices(): PriceConfig {
  const [prices, setPrices] = useState<PriceConfig>(DEFAULT_PRICES);

  useEffect(() => {
    // Embed widgets get an in-memory fallback instead of Web Storage (§ 25
    // TDDDG, see lib/embed-context.ts).
    const store = cacheStorage("session");

    // Check cache first
    try {
      const cached = store?.getItem(CACHE_KEY);
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
            store?.setItem(CACHE_KEY, JSON.stringify({ data: merged, ts: Date.now() }));
          } catch { /* ignore */ }
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  return prices;
}
