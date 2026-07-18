// "Current solar" — how much PV power is being made right now, and how much of
// what the sky could deliver is actually arriving.
//
// Two numbers come out of this, and they answer different questions on purpose:
//
//   powerPct    — honest output: % of installed capacity. This is the figure we
//                 show. A summer noon peaks near 50 %, a clear winter noon near
//                 15–20 %, because that is simply how much Germany's panels make.
//   utilisation — % of what is possible *right now* (vs. a clear sky at this sun
//                 angle). This drives the theme, so a crisp winter noon still
//                 reads as "full sun" and only real cloud dims the page.
//
// Nation-wide values are weighted by installed capacity per Bundesland: Bayern
// holds ~27 % of Germany's solar, Bremen ~0.2 %, so a plain average of sample
// points would badly misread the country.
//
// This module stays pure (no network, no Supabase) so the maths is testable;
// the route feeds it samples and weights.

import { calcCurrentPower } from "./simulation";
import { clearSkyGhi, sunElevation, utilisation, type ThemeMode } from "./theme-schedule";

/** One irradiance sample point per Bundesland, at a rough centroid. */
export const SAMPLE_POINTS: { ags: string; name: string; lat: number; lon: number }[] = [
  { ags: "01", name: "Schleswig-Holstein", lat: 54.2, lon: 9.7 },
  { ags: "02", name: "Hamburg", lat: 53.55, lon: 10.0 },
  { ags: "03", name: "Niedersachsen", lat: 52.8, lon: 9.1 },
  { ags: "04", name: "Bremen", lat: 53.08, lon: 8.8 },
  { ags: "05", name: "Nordrhein-Westfalen", lat: 51.5, lon: 7.5 },
  { ags: "06", name: "Hessen", lat: 50.6, lon: 9.0 },
  { ags: "07", name: "Rheinland-Pfalz", lat: 49.9, lon: 7.5 },
  { ags: "08", name: "Baden-Württemberg", lat: 48.6, lon: 9.0 },
  { ags: "09", name: "Bayern", lat: 48.9, lon: 11.5 },
  { ags: "10", name: "Saarland", lat: 49.4, lon: 7.0 },
  { ags: "11", name: "Berlin", lat: 52.5, lon: 13.4 },
  { ags: "12", name: "Brandenburg", lat: 52.4, lon: 13.0 },
  { ags: "13", name: "Mecklenburg-Vorpommern", lat: 53.8, lon: 12.5 },
  { ags: "14", name: "Sachsen", lat: 51.0, lon: 13.4 },
  { ags: "15", name: "Sachsen-Anhalt", lat: 51.9, lon: 11.7 },
  { ags: "16", name: "Thüringen", lat: 50.9, lon: 11.0 },
];

export type SolarSample = {
  ags: string;
  lat: number;
  lon: number;
  ghi: number;
  temp: number;
  /** Total high-cloud cover 0–100 (cirrus). Optional; absent = 0. */
  cloudHigh?: number;
};

/**
 * How much the high-cloud correction can cut irradiance, at 100 % cirrus.
 * Measured against Höchberg over a full day: with 100 % high cloud the weather
 * model applied essentially NO attenuation (its surface radiation sat on the
 * clear-sky line), yet full cirrus really cuts ~15–25 %. So this is not
 * double-counting what the model already did — it fills a gap the model leaves.
 * Low and mid cloud are left to the model, which does dampen them.
 */
export const HIGH_CLOUD_MAX_CUT = 0.2;

/**
 * The model's surface irradiance, corrected for high cloud it under-weights.
 * Gentle and bounded, so a clear sky (cloudHigh 0) is untouched and the value
 * can never collapse.
 */
export function effectiveGhi(ghi: number, cloudHighPct = 0): number {
  const cut = HIGH_CLOUD_MAX_CUT * Math.max(0, Math.min(100, cloudHighPct)) / 100;
  return ghi * (1 - cut);
}

export type SolarNow = {
  /** Output as % of installed capacity (the honest "Leistung" figure). */
  powerPct: number;
  /** Share of the clear-sky potential actually arriving (0–1), null at night. */
  utilisation: number | null;
};

/** Output of a 1 kWp system as a share of its rated power (0–1). */
export function capacityShare(ghi: number, temp: number): number {
  return calcCurrentPower(1, ghi, temp) / 1000;
}

/**
 * Capacity-weighted "solar right now" across the given samples.
 * `weightsByAgs` are installed MW per region; unknown regions weigh 0.
 * With a single sample (a user's location) it degenerates to that point.
 */
export function weightedSolarNow(
  samples: SolarSample[],
  weightsByAgs: Record<string, number>,
  date: Date,
): SolarNow {
  const doy = dayOfYearUtc(date);
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;

  let wSum = 0;
  let powerSum = 0;
  let ghiSum = 0;
  let clearSum = 0;

  for (const s of samples) {
    const w = weightsByAgs[s.ags] ?? 0;
    if (w <= 0) continue;
    // Correct for cirrus the model under-weights; both the output figure and
    // the clear-sky ratio use the same corrected irradiance so they stay in step.
    const ghi = effectiveGhi(s.ghi, s.cloudHigh);
    wSum += w;
    powerSum += w * capacityShare(ghi, s.temp);
    ghiSum += w * ghi;
    clearSum += w * clearSkyGhi(sunElevation(doy, utcHours, s.lat, s.lon));
  }

  if (wSum === 0) return { powerPct: 0, utilisation: null };

  return {
    powerPct: Math.round((powerSum / wSum) * 100),
    utilisation: utilisation(ghiSum / wSum, clearSum / wSum),
  };
}

/** Day of year from a date's UTC calendar day. */
export function dayOfYearUtc(date: Date): number {
  const y = date.getUTCFullYear();
  return Math.floor((Date.UTC(y, date.getUTCMonth(), date.getUTCDate()) - Date.UTC(y, 0, 0)) / 86_400_000);
}

/** Payload the client gets; `theme` is the conditions-adjusted suggestion. */
export type SolarNowResponse = SolarNow & {
  scope: "de" | "plz";
  plz?: string;
  asOf: string;
};

export type { ThemeMode };
