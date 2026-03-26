// ─── Price Configuration (shared between server + client) ─────────────────────

export interface PriceConfig {
  pvPriceSmall: number;    // €/kWp for systems ≤ threshold
  pvPriceLarge: number;    // €/kWp for systems > threshold
  pvThresholdKwp: number;  // kWp threshold for price tier
  batteryBase: number;     // € fixed cost for battery
  batteryPerKwh: number;   // €/kWh battery
  validFrom: string;       // ISO date string
  source: string | null;   // Data source description
}

// Hardcoded fallback — updated to Q1/2026 market prices
// Sources: solaranlagen-portal.com, Fraunhofer ISE
export const DEFAULT_PRICES: PriceConfig = {
  pvPriceSmall: 1400,     // €/kWp ≤ 10 kWp
  pvPriceLarge: 1250,     // €/kWp > 10 kWp
  pvThresholdKwp: 10,
  batteryBase: 0,          // Simplified: included in per-kWh price
  batteryPerKwh: 700,      // €/kWh (market range 400–1000, midpoint)
  validFrom: "2026-03-01",
  source: null,
};
