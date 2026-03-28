// ─── Feed-In Tariff Configuration (shared between server + client) ───────────

export interface FeedInRates {
  teilUnder10: number;   // ct/kWh, Teileinspeisung ≤10 kWp
  teilOver10: number;    // ct/kWh, Teileinspeisung >10 kWp
  vollUnder10: number;   // ct/kWh, Volleinspeisung ≤10 kWp
  vollOver10: number;    // ct/kWh, Volleinspeisung >10 kWp
  thresholdKwp: number;  // kWp threshold (EEG: 10)
  validFrom: string;     // ISO date string
  source: string | null;
}

// Hardcoded fallback — EEG 2023 rates for commissioning Feb 2025
// Source: Bundesnetzagentur, §48 EEG
export const DEFAULT_FEED_IN: FeedInRates = {
  teilUnder10: 8.03,
  teilOver10: 6.95,
  vollUnder10: 12.73,
  vollOver10: 10.67,
  thresholdKwp: 10,
  validFrom: "2025-02-01",
  source: null,
};
