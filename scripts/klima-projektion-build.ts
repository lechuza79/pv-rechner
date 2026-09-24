/**
 * Climate projection for the air-conditioning calculator: one factor per
 * 0.25° cell over Germany, "cooling-degree hours around the projection years ÷
 * cooling-degree hours over the summers the page calls today".
 *
 *   npm run klima:projektion             (schreibt lib/klima-projektion.json)
 *
 * Source: NASA NEX-GDDP-CMIP6 v2.0 (daily, bias-corrected, SSP2-4.5), eight
 * CMIP6 models, read from NASA's THREDDS server as one Germany-sized subset per
 * model, variable and year (cached under scripts/.cache/nex-gddp).
 *
 * Why a ratio and never the model's own numbers: a 25-km model cell mixes town
 * and hills — for Frankfurt it gives about 5 hot days a year where the airport
 * station measured 19 (2006–2025). The page's "today" comes from our ERA5
 * values per postcode (lib/kuehlgrad.json); the models only say by how much
 * that changes. Each model is compared with ITSELF (future ÷ its own present),
 * the ensemble is the ratio of the summed hours — mixing baselines of different
 * models is what made the previous projection place 7 % of towns cooler in
 * twenty years than today.
 *
 * The two points compared are not chosen here: "today" is the middle of the
 * summers in lib/kuehlgrad.json, "then" the middle of the years the page labels
 * (projectionYears in lib/klima-projektion.ts). Run this after every
 * `npm run klima:kuehlgrad`, or the two drift apart by a year.
 *
 * Each model's summers are not compared window against window but through a
 * straight line fitted over all TREND_YEARS: five summers of one model are
 * mostly weather — in the first build, one model showed LESS cooling in
 * 2044–48 than in 2021–25 purely by chance. The line reads the trend through
 * thirty summers and takes its value at both points.
 *
 * Licence (two legal judges, 18.09.2026): the underlying CMIP6 model data are
 * CC BY 4.0 per the CMIP6 source_id licence page, which supersedes the older
 * "CC-BY-SA 4.0" still written in the file headers; NASA's own layer is CC0.
 * Archived in docs/quellen/nex-gddp-cmip6/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { NetCDFReader } from 'netcdfjs';
import { cdhFromDailyMinMax } from '../lib/aircon';
import { DEFAULT_AIRCON_CONFIG as CFG } from '../lib/aircon-config';
import { KLIMA_MODELLE, projectionYears } from '../lib/klima-projektion';
import kuehlgrad from '../lib/kuehlgrad.json';

const OUT = 'lib/klima-projektion.json';
/** The years alone, for the page label — the table itself stays out of the browser. */
const OUT_JAHRE = 'lib/klima-projektion-jahre.json';
const CACHE = 'scripts/.cache/nex-gddp';
const THREDDS = 'https://ds.nccs.nasa.gov/thredds';
const BOX = { north: 55.1, south: 47.2, west: 5.8, east: 15.1 };
/** A cell whose models agree on almost no cooling today has no meaningful ratio. */
const MIN_PRESENT_CDH = 50;
/** Summers the trend is fitted through: the recent past and the decade around the projection. */
const TREND_YEARS = [
  ...Array.from({ length: 20 }, (_, i) => 2006 + i),
  ...Array.from({ length: 10 }, (_, i) => 2041 + i),
];

type Var = 'tasmax' | 'tasmin';

// curl, not fetch: Node's TLS stack against this server stalled for ~30 s per
// request in testing, curl answers in under one.
const get = (url: string) => execFileSync('curl', ['-s', '-f', '--retry', '3', '-m', '300', url], { maxBuffer: 64 * 1024 * 1024 });

const catalogCache = new Map<string, string>();
function catalog(path: string) {
  if (!catalogCache.has(path)) catalogCache.set(path, get(`${THREDDS}/catalog/AMES/NEX/GDDP-CMIP6/${path}/catalog.xml`).toString());
  return catalogCache.get(path)!;
}

function subset(model: string, variable: Var, year: number): Buffer {
  const file = `${CACHE}/${model}_${variable}_${year}.nc`;
  if (existsSync(file)) return readFileSync(file);
  const experiment = year <= 2014 ? 'historical' : 'ssp245';
  const member = catalog(`${model}/${experiment}`).match(/title="(r\d+i\d+p\d+f\d+)"/)?.[1];
  if (!member) throw new Error(`${model}/${experiment}: kein Lauf im Katalog`);
  // Newest file version of that year (…_v1.1.nc, …_v2.0.nc sort lexically).
  const name = [...catalog(`${model}/${experiment}/${member}/${variable}`).matchAll(/name="([^"]+\.nc)"/g)]
    .map((m) => m[1])
    .filter((n) => n.includes(`_${year}`))
    .sort()
    .at(-1);
  if (!name) throw new Error(`${model} ${variable} ${year}: keine Datei im Katalog`);
  const query = `var=${variable}&north=${BOX.north}&south=${BOX.south}&west=${BOX.west}&east=${BOX.east}&temporal=all&accept=netcdf`;
  const data = get(`${THREDDS}/ncss/grid/AMES/NEX/GDDP-CMIP6/${model}/${experiment}/${member}/${variable}/${name}?${query}`);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, data);
  return data;
}

/** Day indices of May to September, from the length of the year in that model's calendar. */
function summerDays(days: number): [number, number] {
  if (days === 360) return [120, 270];
  const leap = days === 366 ? 1 : 0;
  return [120 + leap, 273 + leap];
}

type Grid = { lat: number[]; lon: number[] };

/** May–September cooling-degree hours per cell of one model, one array per year. */
function modelCdh(model: string, years: number[]): { grid: Grid; cdh: Float64Array[] } {
  let grid: Grid | null = null;
  const perYear: Float64Array[] = [];
  for (const year of years) {
    const [mx, mn] = (['tasmax', 'tasmin'] as Var[]).map((v) => new NetCDFReader(subset(model, v, year)));
    const lat = mx.getDataVariable('lat') as number[];
    const lon = mx.getDataVariable('lon') as number[];
    const tx = mx.getDataVariable('tasmax') as number[];
    const tn = mn.getDataVariable('tasmin') as number[];
    const cells = lat.length * lon.length;
    const days = tx.length / cells;
    if (!Number.isInteger(days) || tn.length !== tx.length) throw new Error(`${model} ${year}: unerwartete Form`);
    grid ??= { lat, lon };
    const sum = new Float64Array(cells);
    const [from, to] = summerDays(days);
    for (let c = 0; c < cells; c++) {
      const hi: number[] = [];
      const lo: number[] = [];
      for (let d = from; d < to; d++) {
        hi.push(tx[d * cells + c] - 273.15);
        lo.push(tn[d * cells + c] - 273.15);
      }
      sum[c] = cdhFromDailyMinMax(hi, lo, CFG.coolBaseTemp);
    }
    perYear.push(sum);
  }
  return { grid: grid!, cdh: perYear };
}

/** Least-squares line through (year, value), evaluated at two points in time. */
function trendAt(years: number[], values: number[], t0: number, t1: number): [number, number] {
  const n = years.length;
  const mx = years.reduce((a, b) => a + b, 0) / n;
  const my = values.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (years[i] - mx) * (values[i] - my);
    sxx += (years[i] - mx) ** 2;
  }
  const slope = sxy / sxx;
  return [my + slope * (t0 - mx), my + slope * (t1 - mx)];
}

const middle = (years: number[]) => (Math.min(...years) + Math.max(...years)) / 2;

function main() {
  const today = [...(kuehlgrad as { summers: number[] }).summers].sort();
  const then = projectionYears(today.at(-1)! + 1);
  console.log(`heute: ${today.join(', ')} · Projektion: ${then.join(', ')}`);

  const t0 = middle(today);
  const t1 = middle(then);
  let grid: Grid | null = null;
  const present: Float64Array[] = [];
  const future: Float64Array[] = [];
  for (const model of KLIMA_MODELLE) {
    const m = modelCdh(model, TREND_YEARS);
    grid ??= m.grid;
    const cells = m.cdh[0].length;
    const p = new Float64Array(cells);
    const f = new Float64Array(cells);
    for (let c = 0; c < cells; c++) {
      const [a, b] = trendAt(TREND_YEARS, m.cdh.map((y) => y[c]), t0, t1);
      p[c] = Math.max(0, a);
      f[c] = Math.max(0, b);
    }
    present.push(p);
    future.push(f);
    const r = f.reduce((a, b) => a + b, 0) / p.reduce((a, b) => a + b, 0);
    console.log(`${model}: Deutschland gesamt × ${r.toFixed(2)}`);
  }

  const cells = grid!.lat.length * grid!.lon.length;
  const factor: (number | null)[] = [];
  const low: (number | null)[] = [];
  const high: (number | null)[] = [];
  for (let c = 0; c < cells; c++) {
    const p = present.reduce((a, m) => a + m[c], 0);
    const f = future.reduce((a, m) => a + m[c], 0);
    if (p / KLIMA_MODELLE.length < MIN_PRESENT_CDH) {
      factor.push(null); low.push(null); high.push(null);
      continue;
    }
    const each = present.map((m, i) => future[i][c] / m[c]).filter(Number.isFinite).sort((a, b) => a - b);
    factor.push(Math.round((f / p) * 1000) / 1000);
    low.push(Math.round(each[0] * 1000) / 1000);
    high.push(Math.round(each.at(-1)! * 1000) / 1000);
  }

  writeFileSync(
    OUT,
    JSON.stringify({
      note:
        'Cooling-degree hours above 22 °C, May–September, per 0.25° cell: each model\'s linear trend over the trend years, ' +
        'value in the middle of the projection years ÷ value in the middle of the summers of lib/kuehlgrad.json. ' +
        'Ratio of summed hours over the models listed; low/high = smallest and largest single-model ratio. ' +
        'NASA NEX-GDDP-CMIP6 v2.0, SSP2-4.5. Built by scripts/klima-projektion-build.ts.',
      today,
      then,
      trendYears: TREND_YEARS,
      models: KLIMA_MODELLE,
      lat: grid!.lat,
      lon: grid!.lon,
      factor,
      low,
      high,
    }) + '\n',
  );
  writeFileSync(OUT_JAHRE, JSON.stringify({ then }) + '\n');
  const valid = factor.filter((x): x is number => x != null).sort((a, b) => a - b);
  console.log(`${valid.length} Rasterfelder · Faktor ${valid[0]} … ${valid.at(-1)} · Median ${valid[Math.floor(valid.length / 2)]}`);
}

main();
