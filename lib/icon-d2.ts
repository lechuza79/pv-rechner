/**
 * DWD ICON-D2, the 2 km forecast model the hosted Open-Meteo API answers
 * Germany from, read from Open-Meteo's open data archive (CC BY 4.0).
 *
 * The heavy reading happens in an hourly job that writes a small snapshot per
 * postcode area; this module only describes that snapshot and interprets it,
 * so a page request never touches the archive (or the GPL-licensed reader).
 */
import type { RegularGrid } from './regular-grid';

/** `RegularGrid(nx: 1215, ny: 746, latMin: 43.18, lonMin: -3.94, dx: 0.02, dy: 0.02)`, Icon.swift. */
export const ICON_D2_GRID: RegularGrid = { nx: 1215, ny: 746, latMin: 43.18, lonMin: -3.94, dx: 0.02, dy: 0.02, searchRadius: 1 };
export const ICON_D2_BASE = 'https://openmeteo.s3.amazonaws.com/data/dwd_icon_d2/';
/** `chunk_time_length` from the archive's static/meta.json. */
export const ICON_D2_CHUNK_HOURS = 121;

/**
 * What the snapshot carries, with the integer scale each is stored at.
 * Scaled integers keep a shard small; the scale is part of the snapshot, so a
 * reader never has to know it in advance.
 */
export const ICON_D2_VARIABLES = {
  cloud_cover: 1, // %
  cloud_cover_low: 1,
  cloud_cover_mid: 1,
  cloud_cover_high: 1,
  temperature_2m: 10, // °C
  wind_u_component_10m: 10, // m/s
  wind_v_component_10m: 10,
  weather_code: 1, // WMO interpretation code
  precipitation: 10, // mm, preceding hour
  snowfall_water_equivalent: 10, // mm, preceding hour
  direct_radiation: 1, // W/m², preceding-hour mean
  diffuse_radiation: 1,
} as const;
export type IconD2Variable = keyof typeof ICON_D2_VARIABLES;
export const ICON_D2_VARIABLE_NAMES = Object.keys(ICON_D2_VARIABLES) as IconD2Variable[];

/** Hours before and after the run time the snapshot covers. */
export const SNAPSHOT_HOURS_BEFORE = 1;
export const SNAPSHOT_HOURS_AFTER = 4;

export type IconD2Point = {
  /** Grid cell centre the values belong to. */
  cell: [number, number];
  elevation: number;
  /** Scaled integers, [variable][hour]; null where the archive had no value. */
  values: (number | null)[][];
};

export type IconD2Shard = {
  version: 1;
  model: 'dwd_icon_d2';
  /** Initialisation time of the newest model run in the archive at build time. */
  runInit: string;
  generatedAt: string;
  /** UTC hour of index 0, ISO. */
  firstHour: string;
  hours: number;
  variables: IconD2Variable[];
  scale: Record<IconD2Variable, number>;
  points: Record<string, IconD2Point>;
};

/** Snapshot shards are split by the first two postcode digits. */
export const shardKey = (plz: string) => plz.slice(0, 2);
export const SNAPSHOT_BUCKET = 'wetter-modell';
export const snapshotPath = (shard: string) => `icon-d2/${shard}.json`;

export type ModelWeather = {
  validAt: string;
  runInit: string;
  cell: [number, number];
  cloudCover: number | null;
  cloudCoverLow: number | null;
  cloudCoverMid: number | null;
  cloudCoverHigh: number | null;
  temperature: number | null;
  windSpeed: number | null;
  /** Meteorological: the direction the wind comes FROM, degrees. */
  windDirection: number | null;
  weatherCode: number | null;
  /** mm per hour for the hour containing `validAt`. */
  precipitation: number | null;
  snowfall: number | null;
  shortwaveRadiation: number | null;
};

/**
 * Model weather for one point at one moment.
 *
 * Continuous fields are interpolated linearly between the two hours around the
 * moment. Hour-sums (precipitation, snow) and the preceding-hour radiation mean
 * belong to the hour that ENDS after the moment — the same convention the API
 * uses, "average of the preceding hour". The weather code is a category and
 * is not interpolated.
 */
export function modelWeatherAt(shard: IconD2Shard, plz: string, at: Date): ModelWeather | null {
  const point = shard.points[plz];
  if (!point) return null;
  const first = Date.parse(shard.firstHour);
  const position = (at.getTime() - first) / 3600000;
  if (position < 0 || position > shard.hours - 1) return null;
  const lower = Math.floor(position);
  const upper = Math.min(shard.hours - 1, lower + 1);
  const fraction = position - lower;
  const ending = Math.min(shard.hours - 1, Math.ceil(position));

  const raw = (variable: IconD2Variable, hour: number) => {
    const index = shard.variables.indexOf(variable);
    if (index < 0) return null;
    const value = point.values[index]?.[hour];
    return value === null || value === undefined ? null : value / shard.scale[variable];
  };
  const interpolate = (variable: IconD2Variable) => {
    const a = raw(variable, lower);
    const b = raw(variable, upper);
    if (a === null || b === null) return null;
    return a + (b - a) * fraction;
  };
  const u = interpolate('wind_u_component_10m');
  const v = interpolate('wind_v_component_10m');
  const direct = raw('direct_radiation', ending);
  const diffuse = raw('diffuse_radiation', ending);
  return {
    validAt: at.toISOString(),
    runInit: shard.runInit,
    cell: point.cell,
    cloudCover: interpolate('cloud_cover'),
    cloudCoverLow: interpolate('cloud_cover_low'),
    cloudCoverMid: interpolate('cloud_cover_mid'),
    cloudCoverHigh: interpolate('cloud_cover_high'),
    temperature: interpolate('temperature_2m'),
    windSpeed: u === null || v === null ? null : Math.hypot(u, v),
    // u/v point where the air goes; meteorology names where it comes from.
    windDirection: u === null || v === null ? null : (Math.atan2(-u, -v) * 180) / Math.PI + (Math.atan2(-u, -v) < 0 ? 360 : 0),
    weatherCode: raw('weather_code', Math.round(position)),
    precipitation: raw('precipitation', ending),
    snowfall: raw('snowfall_water_equivalent', ending),
    shortwaveRadiation: direct === null || diffuse === null ? null : direct + diffuse,
  };
}

/**
 * The hourly radiation and temperature of one point over a span of whole
 * hours, `fromMs` to before `toMs`. Radiation at an hour is the mean of the
 * hour ENDING there, as in the API; null where the snapshot does not reach.
 */
export function modelHours(shard: IconD2Shard, plz: string, fromMs: number, toMs: number) {
  const point = shard.points[plz];
  if (!point) return null;
  const first = Date.parse(shard.firstHour);
  const read = (variable: IconD2Variable, hour: number) => {
    const index = shard.variables.indexOf(variable);
    const value = index < 0 || hour < 0 || hour >= shard.hours ? null : point.values[index]?.[hour];
    return value === null || value === undefined ? null : value / shard.scale[variable];
  };
  const times: number[] = [];
  const shortwave: (number | null)[] = [];
  const temperature: (number | null)[] = [];
  for (let at = fromMs; at < toMs; at += 3600000) {
    const hour = Math.round((at - first) / 3600000);
    const direct = read('direct_radiation', hour);
    const diffuse = read('diffuse_radiation', hour);
    times.push(at);
    shortwave.push(direct === null || diffuse === null ? null : direct + diffuse);
    temperature.push(read('temperature_2m', hour));
  }
  return { times, shortwave, temperature };
}
