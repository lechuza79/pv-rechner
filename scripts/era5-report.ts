/**
 * What the grid choice and the height correction actually do, nationwide.
 *
 * The hour-by-hour comparison can only cover the places an earlier run already
 * fetched, and that set is almost entirely northern and low-lying. This report
 * runs the same two rules over all 10,943 municipal weather points, so the
 * coastal and mountain cases are at least measured even where no provider
 * answer exists to compare against.
 *
 *   npm run era5:bericht
 */
import { readFileSync } from 'node:fs';
import { era5Column, era5Row, era5SelectCell, era5TemperatureOffset } from '../lib/era5-grid';
import { era5Orography } from '../lib/era5-orography';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const elevations = read('scripts/.cache/era5-archive/point-elevation.json').elevations as Record<string, number>;
const points = read('scripts/.cache/era5-archive/points.json') as { name: string; latitude: number; longitude: number }[];

type Row = { name: string; elevation: number; model: number | null; sea: boolean; moved: boolean; offset: number };
const rows: Row[] = [];
let unknown = 0, outside = 0;
for (const point of points) {
  const elevation = elevations[`${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`];
  if (elevation === undefined) { unknown++; continue; }
  let cell;
  try {
    cell = era5SelectCell(point.latitude, point.longitude, elevation, era5Orography);
  } catch { outside++; continue; }
  rows.push({
    name: point.name,
    elevation,
    model: cell.modelElevation,
    sea: cell.isSea,
    moved: cell.row !== era5Row(point.latitude) || cell.column !== era5Column(point.longitude),
    offset: era5TemperatureOffset(cell, elevation),
  });
}
const moved = rows.filter((row) => row.moved);
const sea = rows.filter((row) => row.sea);
console.log(`${rows.length} Orte ausgewertet (${unknown} ohne Höhe, ${outside} außerhalb des Ausschnitts).`);
console.log(`Rasterzelle gewechselt: ${moved.length} (${((moved.length / rows.length) * 100).toFixed(2)} %)`);
console.log(`Auf einer Seezelle gelandet: ${sea.length}`);

const byOffset = [...rows].sort((a, b) => Math.abs(b.offset) - Math.abs(a.offset));
console.log('\nGrößte Temperatur-Höhenkorrektur:');
for (const row of byOffset.slice(0, 10)) {
  console.log(
    `  ${row.name.slice(0, 28).padEnd(28)} Ort ${String(row.elevation).padStart(5)} m  ` +
      `Zelle ${String(row.model ?? 'See').padStart(5)}  ${row.offset >= 0 ? '+' : ''}${row.offset.toFixed(2)} K` +
      (row.moved ? '  (Zelle gewechselt)' : ''),
  );
}
// Sorted from largest, so the 95th percentile sits near the front.
const magnitudes = byOffset.map((row) => Math.abs(row.offset));
const percentile = (share: number) => magnitudes[Math.floor(magnitudes.length * (1 - share))];
console.log(
  `\nBetrag der Korrektur: Median ${percentile(0.5).toFixed(3)} K · ` +
    `p95 ${percentile(0.95).toFixed(3)} K · max ${magnitudes[0].toFixed(3)} K`,
);
console.log(`Über 1 K: ${magnitudes.filter((value) => value > 1).length} Orte · über 2 K: ${magnitudes.filter((value) => value > 2).length}`);
const high = rows.filter((row) => row.elevation >= 700).sort((a, b) => b.elevation - a.elevation);
console.log(`\nHochgelegene Orte (ab 700 m): ${high.length}, davon mit Zellwechsel ${high.filter((row) => row.moved).length}`);
for (const row of high.slice(0, 8)) {
  console.log(
    `  ${row.name.slice(0, 28).padEnd(28)} ${String(row.elevation).padStart(5)} m  Zelle ${String(row.model ?? 'See').padStart(5)} m  ` +
      `${row.offset >= 0 ? '+' : ''}${row.offset.toFixed(2)} K${row.moved ? '  (Zelle gewechselt)' : ''}`,
  );
}
