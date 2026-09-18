/**
 * Climate projection for the air-conditioning calculator: how much the
 * cooling-degree hours of a place change between "today" (the summers of
 * lib/kuehlgrad.json) and the years the page calls the projection.
 *
 * The factor comes from eight CMIP6 models (NASA NEX-GDDP-CMIP6, SSP2-4.5),
 * each compared only with itself; built by scripts/klima-projektion-build.ts.
 * The page multiplies OUR measured value of today by it — the models' own
 * absolute numbers are never shown (a 25-km cell is too coarse for a town).
 */
import data from './klima-projektion.json';

/** The models behind the factor. Every one of them is CC BY 4.0 on the CMIP6 licence page. */
export const KLIMA_MODELLE = [
  'MPI-ESM1-2-HR',
  'EC-Earth3',
  'MRI-ESM2-0',
  'IPSL-CM6A-LR',
  'NorESM2-MM',
  'CNRM-CM6-1',
  'ACCESS-CM2',
  'MIROC6',
] as const;

/** Model data end in 2100, the page's label has always stopped at 2050. */
export const CLIMATE_MAX_YEAR = 2050;
/** Years ahead of the current year that the page calls "in twenty years". */
export const PROJECTION_YEARS_AHEAD = { start: 18, end: 22 } as const;

/** The projection years for a given current year — one source for page label and build. */
export function projectionYears(currentYear: number): number[] {
  const start = Math.min(CLIMATE_MAX_YEAR, currentYear + PROJECTION_YEARS_AHEAD.start);
  const end = Math.min(CLIMATE_MAX_YEAR, currentYear + PROJECTION_YEARS_AHEAD.end);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

type Table = {
  today: number[];
  then: number[];
  lat: number[];
  lon: number[];
  factor: (number | null)[];
  low: (number | null)[];
  high: (number | null)[];
};

const table = data as unknown as Table;


/**
 * Factor for the nearest cell, with the spread of the single models; null
 * outside the grid or where there is almost no cooling today to scale.
 */
export function klimaProjektionFaktor(lat: number, lon: number): { factor: number; low: number; high: number } | null {
  const nearest = (axis: number[], x: number) => {
    let best = 0;
    for (let i = 1; i < axis.length; i++) if (Math.abs(axis[i] - x) < Math.abs(axis[best] - x)) best = i;
    return Math.abs(axis[best] - x) <= 0.2 ? best : -1;
  };
  const i = nearest(table.lat, lat);
  const j = nearest(table.lon, lon);
  if (i < 0 || j < 0) return null;
  const c = i * table.lon.length + j;
  const factor = table.factor[c];
  const low = table.low[c];
  const high = table.high[c];
  return factor == null || low == null || high == null ? null : { factor, low, high };
}
