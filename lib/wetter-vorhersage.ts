/**
 * The 16-day temperature forecast per postcode, as the heat-wave notice reads
 * it. Written every six hours by scripts/wetter-vorhersage.ts (DWD ICON, then
 * ECMWF IFS, then NOAA GFS — the hosted API's own chain for Germany).
 */
export const FORECAST_DAYS = 16;
export const forecastPath = (shard: string) => `vorhersage/${shard}.json`;

export type ForecastShard = {
  version: 1;
  generatedAt: string;
  /** Initialisation time of each model run used, in chain order. */
  runs: Record<'dwd_icon' | 'ecmwf_ifs025' | 'ncep_gfs013', string>;
  /** Last hour each model reached; the next in the chain takes over after it. */
  until: Record<'dwd_icon' | 'ecmwf_ifs025' | 'ncep_gfs013', string>;
  /** German calendar days, "YYYY-MM-DD", today first. */
  days: string[];
  /** Daily maximum temperature ×10, °C, per postcode, one per day. */
  points: Record<string, number[]>;
};

/**
 * Today and the days after it, from a file that may be up to a day old: days
 * before today are dropped, so an older file never presents yesterday as the
 * forecast.
 */
export function maximaFrom(shard: ForecastShard, plz: string, today: string): number[] | null {
  const values = shard.points[plz];
  if (!values) return null;
  const start = shard.days.indexOf(today);
  if (start < 0) return null;
  return values.slice(start).map((v) => v / 10);
}

export function heatwaveFrom(maxima: number[], threshold: number, minDays: number) {
  if (!maxima.length) return null;
  const maxTemp = Math.round(Math.max(...maxima));
  const hotDays = maxima.filter((t) => t >= threshold).length;
  let streak = 0;
  let best = 0;
  for (const t of maxima) {
    streak = t >= threshold ? streak + 1 : 0;
    best = Math.max(best, streak);
  }
  return { maxTemp, hotDays, active: best >= minDays };
}
