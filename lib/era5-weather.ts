/**
 * Turning stored ERA5 blocks into the hourly weather shape the story code reads.
 *
 * The shape is the one the Open-Meteo archive API returns, because every
 * consumer downstream — the monthly solar chart, the annual energy profile and
 * the per-unit valuation — already reads it and none of them should have to
 * change for a new source. What does change is the provenance: these answers
 * say where they really come from and which cell and height they used.
 */
import {
  ERA5_CHUNK_HOURS,
  era5ChunkOf,
  era5ChunksFor,
  era5HourOf,
  era5IsoOf,
  type Era5Variable,
} from './era5-archive';
import {
  era5SelectCell,
  era5TemperatureOffset,
  type Era5Cell,
  type Era5Orography,
} from './era5-grid';
import { era5BlockReady, era5ReadCellBlock, era5ReadManifest, ERA5_STORE_ROOT } from './era5-store';
import { tiltedIrradiance } from './solar-tilt';

/** Rounding of the hosted API, matched so shared links keep reading the same. */
const roundTemperature = (value: number) => Math.round(value * 10) / 10;
const roundWind = (value: number) => Math.round(value * 100) / 100;

export type Era5Provenance = {
  provider: 'open-meteo-open-data';
  dataset: 'copernicus_era5';
  model: 'ERA5';
  resolution: '0.25°';
  licence: 'CC-BY-4.0';
  attribution: string;
  /** How the place was mapped onto a grid cell, so a later change is visible. */
  cellSelection: 'land-terrain-optimised';
  temperatureLapseRatePerM: number;
  requestedLatitude: number;
  requestedLongitude: number;
  targetElevation: number;
  cellLatitude: number;
  cellLongitude: number;
  modelElevation: number | null;
  temperatureOffsetK: number;
  blocks: { variable: Era5Variable; chunk: number; sourceUrl: string; sourceLastModified: string | null; retrievedAt: string }[];
};

export type Era5Weather = {
  latitude: number;
  longitude: number;
  elevation: number;
  utc_offset_seconds: 0;
  timezone: 'GMT';
  timezone_abbreviation: 'GMT';
  hourly_units: Record<string, string>;
  hourly: {
    time: string[];
    temperature_2m: number[];
    shortwave_radiation: number[];
    wind_speed_100m?: number[];
    global_tilted_irradiance?: number[];
  };
};

export type Era5Answer = {
  sourceUrl: string;
  retrievedAt: string;
  provenance: Era5Provenance;
  weather: Era5Weather;
};

export const ERA5_ATTRIBUTION =
  'ERA5 (Copernicus Climate Change Service) über das offene Datenarchiv von Open-Meteo, CC BY 4.0';

/** Reads one variable over an arbitrary hour range out of the local blocks. */
function readRange(variable: Era5Variable, cell: Era5Cell, fromHour: number, hours: number, storeRoot: string) {
  const out = new Float64Array(hours);
  const seen: { variable: Era5Variable; chunk: number; sourceUrl: string; sourceLastModified: string | null; retrievedAt: string }[] = [];
  for (const chunk of era5ChunksFor(fromHour, fromHour + hours)) {
    if (!era5BlockReady(variable, chunk, storeRoot)) {
      throw new Error(`ERA5-Block ${variable}/${chunk} fehlt; bitte zuerst die Wetterdaten holen.`);
    }
    const block = era5ReadCellBlock(variable, chunk, cell.row, cell.column, storeRoot);
    const manifest = era5ReadManifest(variable, chunk, storeRoot);
    seen.push({ variable, chunk, sourceUrl: manifest.sourceUrl, sourceLastModified: manifest.sourceLastModified, retrievedAt: manifest.retrievedAt });
    const base = chunk * ERA5_CHUNK_HOURS;
    const from = Math.max(0, fromHour - base);
    const to = Math.min(ERA5_CHUNK_HOURS, fromHour + hours - base);
    for (let index = from; index < to; index++) out[base + index - fromHour] = block[index];
  }
  for (let index = 0; index < hours; index++) {
    if (!Number.isFinite(out[index])) {
      throw new Error(`Fehlender ${variable}-Wert zur Stunde ${era5IsoOf(fromHour + index)}.`);
    }
  }
  return { values: out, blocks: seen };
}

/**
 * Hourly weather for one place between two dates, both inclusive.
 *
 * `targetElevation` is the height of the place from the 90 m elevation model,
 * the same input the hosted API uses. Without it the grid cell and the
 * temperature would both be off, so it is required rather than guessed.
 */
export function era5Weather(options: {
  latitude: number;
  longitude: number;
  targetElevation: number;
  startDate: string;
  endDate: string;
  wind: boolean;
  orography: Era5Orography;
  /**
   * A module plane (degrees; azimuth 0 = south, −90 = east). With it the answer
   * also carries `global_tilted_irradiance`, computed the way the hosted API
   * computes it, so the same request keeps giving the same number.
   */
  tilted?: { tilt: number; azimuth: number };
  /** Where the blocks live; only tests and side-by-side checks pass another. */
  storeRoot?: string;
}): Era5Answer {
  const { latitude, longitude, targetElevation, startDate, endDate, wind, orography } = options;
  const storeRoot = options.storeRoot ?? ERA5_STORE_ROOT;
  if (!Number.isFinite(targetElevation)) throw new Error('Ortshöhe fehlt; Rasterzelle nicht bestimmbar.');
  const cell = era5SelectCell(latitude, longitude, targetElevation, orography);
  const fromHour = era5HourOf(startDate + 'T00:00:00Z');
  const hours = era5HourOf(endDate + 'T00:00:00Z') - fromHour + 24;
  if (hours <= 0) throw new Error('Leerer Zeitraum.');

  const offset = era5TemperatureOffset(cell, targetElevation);
  const blocks: Era5Provenance['blocks'] = [];
  const temperature = readRange('temperature_2m', cell, fromHour, hours, storeRoot);
  const radiation = readRange('shortwave_radiation', cell, fromHour, hours, storeRoot);
  blocks.push(...temperature.blocks, ...radiation.blocks);

  const time: string[] = [];
  for (let index = 0; index < hours; index++) time.push(era5IsoOf(fromHour + index));

  const hourly: Era5Weather['hourly'] = {
    time,
    temperature_2m: Array.from(temperature.values, (value) => roundTemperature(value + offset)),
    shortwave_radiation: Array.from(radiation.values),
  };
  const hourly_units: Record<string, string> = {
    time: 'iso8601',
    temperature_2m: '°C',
    shortwave_radiation: 'W/m²',
  };
  if (wind) {
    const u = readRange('wind_u_component_100m', cell, fromHour, hours, storeRoot);
    const v = readRange('wind_v_component_100m', cell, fromHour, hours, storeRoot);
    blocks.push(...u.blocks, ...v.blocks);
    hourly.wind_speed_100m = Array.from({ length: hours }, (_, index) =>
      roundWind(Math.hypot(u.values[index], v.values[index])),
    );
    hourly_units.wind_speed_100m = 'm/s';
  }
  if (options.tilted) {
    const { tilt, azimuth } = options.tilted;
    if (!(tilt >= 0 && tilt <= 90) || !(azimuth >= -180 && azimuth <= 180)) {
      throw new Error(`Ungültige Modulebene: Neigung ${tilt}°, Azimut ${azimuth}°.`);
    }
    const direct = readRange('direct_radiation', cell, fromHour, hours, storeRoot);
    blocks.push(...direct.blocks);
    // The provider computes on the cell's coordinates, not the requested point,
    // and rounds to 0.1 W/m²; both matched (lib/__tests__/solar-tilt.test.ts).
    hourly.global_tilted_irradiance = Array.from({ length: hours }, (_, index) => {
      // The value at hour h is the mean of the hour ENDING at h.
      const endMs = (fromHour + index) * 3600e3;
      const value = tiltedIrradiance(
        direct.values[index],
        radiation.values[index] - direct.values[index],
        tilt,
        azimuth,
        cell.latitude,
        cell.longitude,
        endMs,
      );
      return Math.round(value * 10) / 10;
    });
    hourly_units.global_tilted_irradiance = 'W/m²';
  }

  const provenance: Era5Provenance = {
    provider: 'open-meteo-open-data',
    dataset: 'copernicus_era5',
    model: 'ERA5',
    resolution: '0.25°',
    licence: 'CC-BY-4.0',
    attribution: ERA5_ATTRIBUTION,
    cellSelection: 'land-terrain-optimised',
    temperatureLapseRatePerM: 0.0065,
    requestedLatitude: latitude,
    requestedLongitude: longitude,
    targetElevation,
    cellLatitude: cell.latitude,
    cellLongitude: cell.longitude,
    modelElevation: cell.modelElevation,
    temperatureOffsetK: Number(offset.toFixed(4)),
    blocks,
  };
  return {
    // Not an Open-Meteo API address, and deliberately not dressed up as one:
    // these hours were assembled here, and a link that pretends otherwise would
    // send a reader to a different number. The parameter names `latitude` and
    // `longitude` do match the API though, and carry the REQUESTED point rather
    // than the cell, because the preparation run reads them back to pin a
    // municipality to the point its saved figures were computed for. A
    // different name there would read as 0, not as absent.
    sourceUrl:
      `era5-archive://copernicus_era5?latitude=${latitude}&longitude=${longitude}` +
      `&start_date=${startDate}&end_date=${endDate}&elevation=${targetElevation}` +
      `&cell_lat=${cell.latitude}&cell_lon=${cell.longitude}&wind=${wind ? 1 : 0}` +
      (options.tilted ? `&tilt=${options.tilted.tilt}&azimuth=${options.tilted.azimuth}` : ''),
    retrievedAt: blocks.map((block) => block.retrievedAt).sort().slice(-1)[0] ?? new Date().toISOString(),
    provenance,
    weather: {
      latitude: cell.latitude,
      longitude: cell.longitude,
      elevation: targetElevation,
      utc_offset_seconds: 0,
      timezone: 'GMT',
      timezone_abbreviation: 'GMT',
      hourly_units,
      hourly,
    },
  };
}

export { era5ChunkOf };
