"use client";
import {useMemo} from "react";
import {useWidgetResource} from "../components/dashboard/WidgetData";
import { DEFAULT_PRICES, type PriceConfig } from "./prices-config";

// Re-export for convenience (client consumers can import from here)
export { DEFAULT_PRICES, type PriceConfig } from "./prices-config";

// Merge stored prices with defaults — guards against stale cache from an older code
// version that didn't yet ship a field (e.g. electricityPrice). Without this, the
// missing field becomes undefined and propagates as NaN through calc().
export function mergeWithDefaults(data: Partial<PriceConfig>): PriceConfig {
  return {
    pvPriceSmall: typeof data.pvPriceSmall === "number" ? data.pvPriceSmall : DEFAULT_PRICES.pvPriceSmall,
    pvPriceLarge: typeof data.pvPriceLarge === "number" ? data.pvPriceLarge : DEFAULT_PRICES.pvPriceLarge,
    pvThresholdKwp: typeof data.pvThresholdKwp === "number" ? data.pvThresholdKwp : DEFAULT_PRICES.pvThresholdKwp,
    batteryBase: typeof data.batteryBase === "number" ? data.batteryBase : DEFAULT_PRICES.batteryBase,
    batteryPerKwh: typeof data.batteryPerKwh === "number" ? data.batteryPerKwh : DEFAULT_PRICES.batteryPerKwh,
    electricityPrice: typeof data.electricityPrice === "number" ? data.electricityPrice : DEFAULT_PRICES.electricityPrice,
    electricityIncrease: DEFAULT_PRICES.electricityIncrease,
    validFrom: typeof data.validFrom === "string" ? data.validFrom : DEFAULT_PRICES.validFrom,
    source: data.source ?? DEFAULT_PRICES.source,
  };
}

// ─── Client Hook ──────────────────────────────────────────────────────────────

export function usePrices(): PriceConfig {
  const {data} = useWidgetResource<Partial<PriceConfig>>("/api/prices", DEFAULT_PRICES, 60*60_000);
  return useMemo(()=>mergeWithDefaults(data),[data]);
}
