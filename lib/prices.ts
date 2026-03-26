"use client";
import { useState, useEffect } from "react";
import { DEFAULT_PRICES, type PriceConfig } from "./prices-config";

// Re-export for convenience (client consumers can import from here)
export { DEFAULT_PRICES, type PriceConfig } from "./prices-config";

const CACHE_KEY = "solar-check-prices";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ─── Client Hook ──────────────────────────────────────────────────────────────

export function usePrices(): PriceConfig {
  const [prices, setPrices] = useState<PriceConfig>(DEFAULT_PRICES);

  useEffect(() => {
    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setPrices(data);
          return;
        }
      }
    } catch { /* ignore */ }

    // Fetch from API
    fetch("/api/prices")
      .then(res => res.ok ? res.json() : null)
      .then((data: PriceConfig | null) => {
        if (data && data.pvPriceSmall > 0) {
          setPrices(data);
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
          } catch { /* ignore */ }
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  return prices;
}
