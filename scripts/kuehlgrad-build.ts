/**
 * Cooling-degree hours per postcode from our own ERA5 archive, once a year.
 *
 *   npm run klima:kuehlgrad             (schreibt lib/kuehlgrad.json)
 *   npm run klima:kuehlgrad -- --jahr=2026   (so tun, als sei es dieses Jahr)
 *
 * The air-conditioning calculator shows the mean of the last five complete
 * summers (May to September, German local time) and the last summer alone.
 * Both used to be fetched from the free Open-Meteo API on the first visit of a
 * coordinate; now they are computed here from the ERA5 blocks already kept for
 * the municipal charts, with the same cell choice and height correction the
 * API uses, and read by the page from one committed file.
 *
 * Needs the temperature blocks of those five summers:
 *   npm run era5:sync -- --year=JJJJ   (je Sommer)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { cdhFromHourly } from '../lib/aircon';
import { DEFAULT_AIRCON_CONFIG as CFG } from '../lib/aircon-config';
import { ERA5_CHUNK_HOURS, era5WindowIndex, ERA5_WINDOW_CELLS } from '../lib/era5-archive';
import { era5SelectCell, era5TemperatureOffset } from '../lib/era5-grid';
import { era5Orography } from '../lib/era5-orography';
import { era5BlockPaths, era5BlockReady } from '../lib/era5-store';
import { berlinTagesgrenzen } from '../lib/zeit';
import plzCoordinates from '../public/plz.json';
import plzElevation from '../lib/plz-elevation.json';
import plzWeatherPoint from '../lib/plz-weather-point.json';

const OUT = 'lib/kuehlgrad.json';
const arg = (key: string) => process.argv.find((a) => a.startsWith(`--${key}=`))?.slice(key.length + 3);

function main() {
  const thisYear = Number(arg('jahr') ?? new Date().getFullYear());
  // The last N COMPLETE summers, newest first — as the page has always shown.
  const years = Array.from({ length: CFG.avgYears }, (_, i) => thisYear - 1 - i);

  // Each summer as whole UTC hours: 1 May 00:00 to 1 October 00:00 German time.
  const spans = years.map((year) => {
    const [from] = berlinTagesgrenzen(new Date(`${year}-05-01T12:00:00Z`));
    const [to] = berlinTagesgrenzen(new Date(`${year}-10-01T12:00:00Z`));
    return { year, from: from / 3600000, to: to / 3600000 };
  });

  // Blocks are read once each and kept; a summer touches about eight.
  const blocks = new Map<number, Float32Array>();
  const block = (chunk: number) => {
    if (!blocks.has(chunk)) {
      if (!era5BlockReady('temperature_2m', chunk)) {
        throw new Error(`Temperatur-Block ${chunk} fehlt; zuerst npm run era5:sync -- --year=… für die fünf Sommer.`);
      }
      const buffer = readFileSync(era5BlockPaths('temperature_2m', chunk).data);
      if (buffer.byteLength !== ERA5_WINDOW_CELLS * ERA5_CHUNK_HOURS * 4) throw new Error(`Block ${chunk} unvollständig.`);
      blocks.set(chunk, new Float32Array(buffer.buffer, buffer.byteOffset, ERA5_WINDOW_CELLS * ERA5_CHUNK_HOURS));
    }
    return blocks.get(chunk)!;
  };

  const coordinates = plzCoordinates as unknown as Record<string, [number, number]>;
  const elevations = (plzElevation as { elevations: Record<string, number> }).elevations;
  const townPoints = (plzWeatherPoint as { points: Record<string, { latitude: number; longitude: number; elevation: number }> }).points;
  const points: Record<string, [number, number]> = {};
  let skipped = 0;
  for (const [plz, centroid] of Object.entries(coordinates)) {
    const town = townPoints[plz];
    const [latitude, longitude] = town ? [town.latitude, town.longitude] : centroid;
    const elevation = town ? town.elevation : elevations[plz];
    if (elevation === undefined) { skipped++; continue; }
    const cell = era5SelectCell(latitude, longitude, elevation, era5Orography);
    const offset = era5TemperatureOffset(cell, elevation);
    const cellIndex = era5WindowIndex(cell.row, cell.column);
    const perYear = spans.map(({ from, to }) => {
      const temps: number[] = [];
      for (let hour = from; hour < to; hour++) {
        const chunk = Math.floor(hour / ERA5_CHUNK_HOURS);
        const raw = block(chunk)[cellIndex * ERA5_CHUNK_HOURS + (hour - chunk * ERA5_CHUNK_HOURS)];
        if (!Number.isFinite(raw)) throw new Error(`Lücke bei ${plz}, Stunde ${new Date(hour * 3600000).toISOString()}`);
        // Rounded to 0.1 like the API answer the page used to read.
        temps.push(Math.round((raw + offset) * 10) / 10);
      }
      return cdhFromHourly(temps, CFG.coolBaseTemp);
    });
    const avg5 = Math.round(perYear.reduce((a, b) => a + b, 0) / perYear.length);
    points[plz] = [avg5, Math.round(perYear[0])];
  }

  writeFileSync(
    OUT,
    JSON.stringify({
      note:
        `Cooling-degree hours above ${CFG.coolBaseTemp} °C, May to September German time, per postcode: ` +
        `[mean of ${years.at(-1)}–${years[0]}, ${years[0]} alone]. ERA5 (Copernicus) via Open-Meteo open data, ` +
        'cell and height as the API chooses them. Built by scripts/kuehlgrad-build.ts.',
      summers: years,
      points,
    }),
  );
  const values = Object.values(points).map(([a]) => a).sort((a, b) => a - b);
  console.log(
    `${values.length} Postleitzahlen (${skipped} ohne Höhe), Sommer ${years.at(-1)}–${years[0]}; ` +
      `Mittel je Ort: Median ${values[values.length >> 1]}, Spanne ${values[0]}–${values.at(-1)} Kh.`,
  );
}
main();
