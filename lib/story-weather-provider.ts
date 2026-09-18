/**
 * Which archive a preparation run reads its hours from.
 *
 * Two sources with the same output shape: the hosted Open-Meteo archive API,
 * and our own reads of Open-Meteo's open ERA5 archive. The second needs no
 * commercial plan, which is the whole point, but it is switched on explicitly
 * rather than by default — a silent change of source would rewrite figures that
 * are already published.
 */
import { readFileSync, existsSync } from 'node:fs';
import { era5Weather, type Era5Answer } from './era5-weather';
import { era5Orography } from './era5-orography';

export type StoryWeatherProvider = 'open-meteo' | 'era5-archive';
export const STORY_WEATHER_PROVIDERS: StoryWeatherProvider[] = ['open-meteo', 'era5-archive'];

/** Env or `--provider=`; anything else is refused rather than silently ignored. */
export function storyWeatherProvider(
  argv: readonly string[] = process.argv,
  env: Partial<Record<string, string>> = process.env,
): StoryWeatherProvider {
  const raw =
    argv.find((a) => a.startsWith('--provider='))?.slice('--provider='.length) ??
    env.STORY_WEATHER_PROVIDER ??
    'open-meteo';
  if (!STORY_WEATHER_PROVIDERS.includes(raw as StoryWeatherProvider)) {
    throw new Error(`Unbekannte Wetterquelle "${raw}"; erlaubt: ${STORY_WEATHER_PROVIDERS.join(', ')}.`);
  }
  return raw as StoryWeatherProvider;
}

/**
 * Cache directory per source.
 *
 * Separate trees on purpose: the raw Open-Meteo answers are the yardstick this
 * migration is measured against, and a shared directory would let one source
 * overwrite the other's evidence.
 */
export function storyWeatherCacheRoot(provider: StoryWeatherProvider, base = 'scripts/.cache') {
  return provider === 'era5-archive' ? `${base}/story-weather-era5` : `${base}/story-weather`;
}

const ELEVATION_FILE = 'scripts/.cache/era5-archive/point-elevation.json';
let elevations: Record<string, number> | null = null;
const elevationKey = (latitude: number, longitude: number) => `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

/**
 * Ground height of a weather point from the 90 m elevation model.
 *
 * Missing is an error, never a guess: without it the grid cell and the
 * temperature correction are both wrong, and both would look plausible.
 */
export function storyPointElevation(latitude: number, longitude: number, path = ELEVATION_FILE) {
  if (elevations === null) {
    if (!existsSync(path)) {
      throw new Error('Ortshöhen fehlen; bitte zuerst "npm run era5:static -- --hoehen" laufen lassen.');
    }
    elevations = JSON.parse(readFileSync(path, 'utf8')).elevations as Record<string, number>;
  }
  const value = elevations[elevationKey(latitude, longitude)];
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`Keine Ortshöhe für ${latitude}, ${longitude}; Rasterzelle nicht bestimmbar.`);
  }
  return value;
}

/** For tests, so a stale module-level cache cannot leak between cases. */
export function resetStoryPointElevations() {
  elevations = null;
}

export function era5StoryWeather(options: {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  wind: boolean;
}): Era5Answer {
  return era5Weather({
    ...options,
    targetElevation: storyPointElevation(options.latitude, options.longitude),
    orography: era5Orography,
  });
}
