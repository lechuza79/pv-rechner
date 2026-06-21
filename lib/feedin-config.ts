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

// EEG feed-in rates for systems commissioned 02–07/2026. This config is the
// de-facto source: the Supabase `feed_in_rates` table is not provisioned, so the
// API always falls back here. Rates degress 1 % every half-year on a fixed
// schedule (Feb 1 / Aug 1) — re-check each cycle, see scripts/eeg-verify.md.
// Source: Bundesnetzagentur, §§ 48/49 EEG.
export const DEFAULT_FEED_IN: FeedInRates = {
  teilUnder10: 7.78,
  teilOver10: 6.73,
  vollUnder10: 12.34,
  vollOver10: 10.35,
  thresholdKwp: 10,
  validFrom: "2026-02-01",
  source: "Bundesnetzagentur, §§ 48/49 EEG (gültig 02–07/2026)",
};
