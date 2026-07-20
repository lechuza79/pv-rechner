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
// Sources: taptaphome.com (vormals solaranlagen-portal.com), Fraunhofer ISE, BNetzA Strompreismonitor
export const DEFAULT_PRICES: PriceConfig = {
  pvPriceSmall: 1416,     // €/kWp ≤ 10 kWp
  pvPriceLarge: 1071,     // €/kWp > 10 kWp
  pvThresholdKwp: 10,
  batteryBase: 1500,       // € fixe Installations-Basis (Wechselrichter + Montage, ~stabil)
  batteryPerKwh: 225,      // €/kWh Zell-Preis, trackt Markt (2-Quellen-Mittel Q2/2026: ~3.750 €/10 kWh all-in)
  electricityPrice: 0.312, // €/kWh Haushaltsstrom (BNetzA Strompreismonitor 06/2026)
  // Strompreis-STEIGERUNG p.a.: bewusste Modell-Konvention, KEIN gescrapter
  // Marktwert und daher NICHT wächter-überwacht (der Scraper pflegt nur das
  // Preis-Niveau). 2026er Prognosen 0,5–2 %/Jahr. Bei größeren Prognose-Shifts
  // manuell prüfen — es gibt keine Live-Quelle, die das automatisch korrigiert.
  electricityIncrease: 0.02,
  validFrom: "2026-06-16",
  source: null,
};
