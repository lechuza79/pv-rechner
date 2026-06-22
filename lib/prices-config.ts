// ─── Price Configuration (shared between server + client) ─────────────────────

export interface PriceConfig {
  pvPriceSmall: number;          // €/kWp for systems ≤ threshold
  pvPriceLarge: number;          // €/kWp for systems > threshold
  pvThresholdKwp: number;        // kWp threshold for price tier
  batteryBase: number;           // € fixed cost for battery
  batteryPerKwh: number;         // €/kWh battery
  electricityPrice: number;      // €/kWh — Haushaltsstrom (Arbeitspreis)
  electricityIncrease: number;   // p.a. as decimal (0.03 = 3 %/Jahr)
  validFrom: string;             // ISO date string
  source: string | null;         // Data source description
}

// Hardcoded fallback — greift NUR bei Supabase-Ausfall. An den Live-Stand der
// market_prices-Tabelle angeglichen (Snapshot 2026-06-16), damit der Fallback bei
// einem Ausfall keine veralteten Preise zeigt.
// Sources: solaranlagen-portal.com, Fraunhofer ISE, BNetzA Strompreismonitor
export const DEFAULT_PRICES: PriceConfig = {
  pvPriceSmall: 1416,     // €/kWp ≤ 10 kWp
  pvPriceLarge: 1071,     // €/kWp > 10 kWp
  pvThresholdKwp: 10,
  batteryBase: 1500,       // € fixe Installations-Basis (Wechselrichter + Montage, ~stabil)
  batteryPerKwh: 225,      // €/kWh Zell-Preis, trackt Markt (2-Quellen-Mittel Q2/2026: ~3.750 €/10 kWh all-in)
  electricityPrice: 0.312, // €/kWh Haushaltsstrom (BNetzA Strompreismonitor 06/2026)
  electricityIncrease: 0.03,
  validFrom: "2026-06-16",
  source: null,
};
