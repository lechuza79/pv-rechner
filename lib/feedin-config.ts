// ─── Feed-In Tariff Configuration (shared between server + client) ───────────

export interface FeedInRates {
  teilUnder10: number;   // ct/kWh, Teileinspeisung ≤10 kWp
  teilOver10: number;    // ct/kWh, Teileinspeisung >10 kWp
  vollUnder10: number;   // ct/kWh, Volleinspeisung ≤10 kWp
  vollOver10: number;    // ct/kWh, Volleinspeisung >10 kWp
  thresholdKwp: number;  // kWp threshold (EEG: 10)
  validFrom: string;     // ISO date string
  source: string | null;
  /**
   * Visible provenance caveat, rendered on /datenstand while it is set. Only
   * used when a period's rates are derived from the statute before the
   * Bundesnetzagentur has published its (declaratory) list. Cleared again once
   * the official table is out — see scripts/eeg-verify.md.
   */
  note?: string | null;
}

/**
 * EEG feed-in rates by commissioning period. This config is the de-facto
 * source: the Supabase `feed_in_rates` table is not provisioned, so the API
 * always falls back here.
 *
 * The rates drop by a fixed 1 % every half-year (Feb 1 / Aug 1, § 49 Abs. 1 EEG
 * 2023) — that is a schedule, not an event. Keeping the periods side by side
 * means the switch happens on its own at the cutoff instead of depending on
 * someone deploying that morning (same reasoning as the absolute calendar years
 * in lib/co2-config.ts).
 *
 * DERIVATION (the rule, so no one has to guess a value again):
 *   anzulegender Wert  = Basiswert × 0,99^n, gerundet auf 2 Nachkommastellen
 *   Einspeisevergütung = anzulegender Wert − 0,40 ct/kWh (§ 53 Abs. 1 EEG)
 *   Basiswerte (§ 48 Abs. 2 / Abs. 2a EEG 2023, Gebäude):
 *     Teileinspeisung 8,60 (≤10 kWp) / 7,50 (≤40 kWp)
 *     Volleinspeisung 13,40 (≤10 kWp) / 11,30 (≤40 kWp)
 *   n = Zahl der Halbjahresschritte seit 2024-02-01 (n = 1 für 02/2024).
 *
 * Critical: § 49 Abs. 1 Satz 2 requires the UNROUNDED value to be carried
 * forward. Degressing the already-rounded published rate instead drifts and
 * misses 11 of the officially published cells — e.g. Teileinspeisung ≤40 kWp in
 * 02/2026 (7,13 amtlich vs. 7,15 verdriftet). That same shortcut produces the
 * 10,25 that circulates for Volleinspeisung ≤40 kWp ab 08/2026; the statutory
 * chain gives 10,24. lib/__tests__/feedin-config.test.ts pins this down against
 * every published half-year.
 */
export const FEED_IN_SCHEDULE: FeedInRates[] = [
  {
    teilUnder10: 7.78,
    teilOver10: 6.73,
    vollUnder10: 12.34,
    vollOver10: 10.35,
    thresholdKwp: 10,
    validFrom: "2026-02-01",
    source: "Bundesnetzagentur, §§ 48/49 EEG (gültig 02–07/2026)",
  },
  {
    teilUnder10: 7.7,
    teilOver10: 6.66,
    vollUnder10: 12.22,
    vollOver10: 10.24,
    thresholdKwp: 10,
    validFrom: "2026-08-01",
    source: "Bundesnetzagentur, §§ 48/49 EEG (gültig 08/2026–01/2027)",
  },
];

/**
 * The rates for a given day — the last period whose start date has been
 * reached. Server surfaces that must flip at the cutoff without waiting for a
 * deploy (the /api/feedin route the calculator reads) call this per request;
 * everything else uses DEFAULT_FEED_IN below.
 */
export function feedInRatesFor(now: Date = new Date()): FeedInRates {
  const today = now.toISOString().slice(0, 10);
  let current = FEED_IN_SCHEDULE[0];
  for (const period of FEED_IN_SCHEDULE) {
    if (period.validFrom <= today) current = period;
  }
  return current;
}

export const DEFAULT_FEED_IN: FeedInRates = feedInRatesFor();
