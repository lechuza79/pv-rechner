// Server-side market price lookup for guide pages (ISR): latest valid row from
// Supabase `market_prices`, falling back to the config snapshot. Extracted from
// /lohnt-sich-pv-mit-speicher so every guide page reads prices the same way and
// the fetch logic cannot drift between pages.
import { supabase } from "./supabase-server";
import { DEFAULT_PRICES, type PriceConfig } from "./prices-config";

export async function fetchMarketPrices(): Promise<PriceConfig> {
  if (!supabase) return DEFAULT_PRICES;
  try {
    const { data } = await supabase
      .from("market_prices")
      .select("*")
      .neq("source", "SCRAPE_ERROR")
      .gt("pv_price_small", 0)
      .lte("valid_from", new Date().toISOString().split("T")[0])
      .order("valid_from", { ascending: false })
      .limit(1)
      .single();
    if (!data) return DEFAULT_PRICES;
    return {
      pvPriceSmall: Number(data.pv_price_small),
      pvPriceLarge: Number(data.pv_price_large),
      pvThresholdKwp: Number(data.pv_threshold_kwp),
      batteryBase: Number(data.battery_base),
      batteryPerKwh: Number(data.battery_per_kwh),
      electricityPrice: data.electricity_price != null ? Number(data.electricity_price) : DEFAULT_PRICES.electricityPrice,
      electricityIncrease: data.electricity_increase != null ? Number(data.electricity_increase) : DEFAULT_PRICES.electricityIncrease,
      validFrom: data.valid_from,
      source: data.source,
    };
  } catch {
    return DEFAULT_PRICES;
  }
}

/** "Juli 2026" from an ISO date — shared date label for guide pages. */
export function formatPriceDate(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}
