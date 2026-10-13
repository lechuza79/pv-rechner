/**
 * Filling whole missing days of an ERA5 block straight from the Copernicus
 * Climate Data Store.
 *
 * The Open-Meteo archive is our source for ERA5, and it can carry a hole: on
 * 08.10.2026 every variable of `chunk_986` was NaN for all of 25.09.2026 while
 * the archive's own end marker stood at 03.10. (open-meteo/open-meteo#2183).
 * The provider fills such a day in its hosted API from a coarser ensemble —
 * another method, so not for us. The CDS holds the same reanalysis first hand.
 *
 * Measured on 08.10.2026 against the archive on 24. and 26.09.2026, all
 * 1,435 cells and 48 hours: temperature and wind differ by at most 0.025,
 * radiation by at most 0.5 W/m² — exactly the archive's storage rounding.
 * Same grid, same hour convention (an accumulation at T covers T-1..T), same
 * units after conversion. Every fill repeats that comparison on a neighbouring
 * day that both sources hold and refuses to write if it no longer holds.
 *
 * Licence: the CDS catalogue lists the dataset under CC BY 4.0 (read
 * 08.10.2026); the attribution in `lib/data-sources.ts` already names the
 * Copernicus Climate Change Service.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ERA5_CHUNK_HOURS,
  ERA5_WINDOW,
  ERA5_WINDOW_CELLS,
  ERA5_WINDOW_COLUMNS,
  ERA5_WINDOW_ROWS,
  type Era5Variable,
} from './era5-archive';

export const CDS_DATASET = 'reanalysis-era5-single-levels';
const CDS_BASE = 'https://cds.climate.copernicus.eu/api/retrieve/v1';

type Stream = 'instant' | 'accum';
/** How each archive variable is named and scaled in the CDS product. */
export const CDS_VARIABLES: Record<
  Era5Variable,
  { request: string; netcdf: string; stream: Stream; toArchive: (value: number) => number; tolerance: number }
> = {
  temperature_2m: { request: '2m_temperature', netcdf: 't2m', stream: 'instant', toArchive: (k) => k - 273.15, tolerance: 0.1 },
  // Hourly accumulation in J/m² over the hour ending at the time stamp; the
  // archive stores the mean power of that same hour.
  shortwave_radiation: {
    request: 'surface_solar_radiation_downwards',
    netcdf: 'ssrd',
    stream: 'accum',
    toArchive: (j) => j / 3600,
    tolerance: 1,
  },
  direct_radiation: {
    request: 'total_sky_direct_solar_radiation_at_surface',
    netcdf: 'fdir',
    stream: 'accum',
    toArchive: (j) => j / 3600,
    tolerance: 1,
  },
  wind_u_component_100m: { request: '100m_u_component_of_wind', netcdf: 'u100', stream: 'instant', toArchive: (v) => v, tolerance: 0.1 },
  wind_v_component_100m: { request: '100m_v_component_of_wind', netcdf: 'v100', stream: 'instant', toArchive: (v) => v, tolerance: 0.1 },
};

/** The archive grid: row 0 at 90°S, column 0 at 180°W, 0.25° steps. */
export function cdsArea(): [number, number, number, number] {
  const lat = (row: number) => -90 + row * 0.25;
  const lon = (column: number) => -180 + column * 0.25;
  return [lat(ERA5_WINDOW.rowTo - 1), lon(ERA5_WINDOW.columnFrom), lat(ERA5_WINDOW.rowFrom), lon(ERA5_WINDOW.columnTo - 1)];
}

const dayOfHour = (hour: number) => new Date(hour * 3600000).toISOString().slice(0, 10);

/**
 * Whole UTC days of a block in which every cell is missing.
 *
 * Anything else that is missing — a single hour, a single cell — is not a hole
 * in the archive but a damaged read, and fails loudly instead of being patched.
 */
export function cdsMissingDays(block: Float32Array, chunk: number): string[] {
  const missing = new Array<boolean>(ERA5_CHUNK_HOURS).fill(false);
  for (let h = 0; h < ERA5_CHUNK_HOURS; h++) {
    let gone = 0;
    for (let cell = 0; cell < ERA5_WINDOW_CELLS; cell++) {
      if (!Number.isFinite(block[cell * ERA5_CHUNK_HOURS + h])) gone++;
    }
    if (gone === ERA5_WINDOW_CELLS) missing[h] = true;
    else if (gone > 0) throw new Error(`Block ${chunk}: Stunde ${h} fehlt nur in ${gone} Zellen – kein Archivloch, wird nicht ergänzt.`);
  }
  const days: string[] = [];
  for (let h = 0; h < ERA5_CHUNK_HOURS; h += 24) {
    const day = missing.slice(h, h + 24);
    if (day.every(Boolean)) days.push(dayOfHour(chunk * ERA5_CHUNK_HOURS + h));
    else if (day.some(Boolean)) {
      throw new Error(`Block ${chunk}: ${dayOfHour(chunk * ERA5_CHUNK_HOURS + h)} fehlt nur teilweise – wird nicht ergänzt.`);
    }
  }
  return days;
}

/** A day both sources hold, next to the first missing one, for the comparison. */
export function cdsReferenceDay(missingDays: string[], chunk: number): string {
  const first = chunk * ERA5_CHUNK_HOURS;
  const all = Array.from({ length: ERA5_CHUNK_HOURS / 24 }, (_, d) => dayOfHour(first + d * 24));
  const index = all.indexOf(missingDays[0]);
  const candidates = [...all.slice(0, index).reverse(), ...all.slice(index + 1)];
  const reference = candidates.find((day) => !missingDays.includes(day));
  if (!reference) throw new Error(`Block ${chunk}: kein Vergleichstag vorhanden.`);
  return reference;
}

/**
 * Put CDS values (time × latitude descending × longitude) into the block's
 * cell-major layout at the given block hours.
 */
export function cdsIntoBlock(
  block: Float32Array,
  values: Float32Array,
  blockHours: number[],
  toArchive: (value: number) => number,
) {
  const perStep = ERA5_WINDOW_ROWS * ERA5_WINDOW_COLUMNS;
  if (values.length !== blockHours.length * perStep) {
    throw new Error(`Copernicus lieferte ${values.length} Werte statt ${blockHours.length * perStep}.`);
  }
  blockHours.forEach((h, t) => {
    for (let r = 0; r < ERA5_WINDOW_ROWS; r++) {
      const sourceRow = ERA5_WINDOW_ROWS - 1 - r; // CDS runs north to south
      for (let c = 0; c < ERA5_WINDOW_COLUMNS; c++) {
        const cell = r * ERA5_WINDOW_COLUMNS + c;
        block[cell * ERA5_CHUNK_HOURS + h] = toArchive(values[t * perStep + sourceRow * ERA5_WINDOW_COLUMNS + c]);
      }
    }
  });
}

type Job = { jobID: string; status: string };
type H5Wasm = {
  ready: Promise<unknown>;
  File: new (path: string, mode: 'r') => { get(name: string): { value: unknown }; close(): void };
};

async function cdsRequest(key: string, inputs: Record<string, unknown>): Promise<string> {
  const headers = { 'PRIVATE-TOKEN': key, 'Content-Type': 'application/json' };
  const response = await fetch(`${CDS_BASE}/processes/${CDS_DATASET}/execution`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ inputs }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Copernicus lehnt die Anfrage ab: HTTP ${response.status} ${await response.text()}`);
  const job = (await response.json()) as Job;
  // The CDS queues requests; small ones take a minute, busy days much longer.
  const deadline = Date.now() + 2 * 3600000;
  for (;;) {
    const state = (await (await fetch(`${CDS_BASE}/jobs/${job.jobID}`, { headers })).json()) as Job;
    if (state.status === 'successful') break;
    if (state.status === 'failed' || state.status === 'dismissed') {
      throw new Error(`Copernicus-Auftrag ${job.jobID}: ${state.status}`);
    }
    if (Date.now() > deadline) throw new Error(`Copernicus-Auftrag ${job.jobID}: nach zwei Stunden nicht fertig.`);
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }
  const results = (await (await fetch(`${CDS_BASE}/jobs/${job.jobID}/results`, { headers })).json()) as {
    asset: { value: { href: string; type: string } };
  };
  return results.asset.value.href;
}

/**
 * Hourly values for some days, one variable group per request.
 *
 * Instant and accumulated fields come back as separate files; asking for one
 * group at a time keeps each answer a single NetCDF instead of a zip.
 */
async function cdsFetchDays(key: string, variables: Era5Variable[], days: string[]) {
  // The package publishes its Node build only as an `exports` subpath, which
  // this project's module resolution cannot see; the shape we use is small.
  const specifier = 'h5wasm/node';
  const h5wasm = (await import(specifier)).default as H5Wasm;
  await h5wasm.ready;
  const result = new Map<Era5Variable, { hours: number[]; values: Float32Array }>();
  for (const stream of ['instant', 'accum'] as const) {
    const group = variables.filter((v) => CDS_VARIABLES[v].stream === stream);
    if (!group.length) continue;
    const months = [...new Set(days.map((d) => d.slice(0, 7)))];
    for (const month of months) {
      const inMonth = days.filter((d) => d.startsWith(month));
      const href = await cdsRequest(key, {
        product_type: ['reanalysis'],
        variable: group.map((v) => CDS_VARIABLES[v].request),
        year: [month.slice(0, 4)],
        month: [month.slice(5, 7)],
        day: inMonth.map((d) => d.slice(8, 10)),
        time: Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`),
        area: cdsArea(),
        data_format: 'netcdf',
        download_format: 'unarchived',
      });
      const response = await fetch(href, { signal: AbortSignal.timeout(300000) });
      if (!response.ok) throw new Error(`Copernicus-Datei nicht abrufbar: HTTP ${response.status}`);
      const dir = mkdtempSync(join(tmpdir(), 'era5-cds-'));
      try {
        const path = join(dir, 'data.nc');
        writeFileSync(path, Buffer.from(await response.arrayBuffer()));
        const file = new h5wasm.File(path, 'r');
        try {
          const times = Array.from(file.get('valid_time').value as BigInt64Array, (s) => Number(s) / 3600);
          for (const v of group) {
            const values = Float32Array.from(file.get(CDS_VARIABLES[v].netcdf).value as Float32Array);
            const previous = result.get(v);
            result.set(
              v,
              previous
                ? { hours: [...previous.hours, ...times], values: Float32Array.from([...previous.values, ...values]) }
                : { hours: times, values },
            );
          }
        } finally {
          file.close();
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  }
  return result;
}

export type CdsFill = { source: string; days: string[]; referenceDay: string; maxDifference: number };

/**
 * Fill the missing days of one block in place, after checking a reference day.
 * Returns what was filled, for the block manifest.
 */
export async function cdsFillBlock(
  variable: Era5Variable,
  chunk: number,
  block: Float32Array,
  key: string,
): Promise<CdsFill | null> {
  const days = cdsMissingDays(block, chunk);
  if (!days.length) return null;
  const referenceDay = cdsReferenceDay(days, chunk);
  const fetched = (await cdsFetchDays(key, [variable], [referenceDay, ...days].sort())).get(variable);
  if (!fetched) throw new Error(`Copernicus lieferte nichts für ${variable}.`);
  const spec = CDS_VARIABLES[variable];
  const first = chunk * ERA5_CHUNK_HOURS;
  const blockHours = fetched.hours.map((hour) => hour - first);
  if (blockHours.some((h) => !Number.isInteger(h) || h < 0 || h >= ERA5_CHUNK_HOURS)) {
    throw new Error(`Copernicus lieferte Stunden außerhalb von Block ${chunk}.`);
  }
  const candidate = block.slice();
  cdsIntoBlock(candidate, fetched.values, blockHours, spec.toArchive);
  // The reference day must come out as the archive has it, or nothing is written.
  let maxDifference = 0;
  for (const h of blockHours) {
    if (dayOfHour(first + h) !== referenceDay) continue;
    for (let cell = 0; cell < ERA5_WINDOW_CELLS; cell++) {
      const index = cell * ERA5_CHUNK_HOURS + h;
      maxDifference = Math.max(maxDifference, Math.abs(candidate[index] - block[index]));
    }
  }
  if (!(maxDifference <= spec.tolerance)) {
    throw new Error(
      `${variable}/${chunk}: Copernicus weicht am Vergleichstag ${referenceDay} um ${maxDifference.toFixed(3)} ab ` +
        `(erlaubt ${spec.tolerance}) – nichts ergänzt.`,
    );
  }
  for (const h of blockHours) {
    if (dayOfHour(first + h) === referenceDay) continue;
    for (let cell = 0; cell < ERA5_WINDOW_CELLS; cell++) {
      const index = cell * ERA5_CHUNK_HOURS + h;
      block[index] = candidate[index];
    }
  }
  return { source: `Copernicus CDS ${CDS_DATASET}`, days, referenceDay, maxDifference };
}
