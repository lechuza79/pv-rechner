/**
 * Fetch the German window of the ERA5 archive into the local block store.
 *
 * Runs per variable and 21-day block. A block that is already complete is
 * skipped without a single request, so a repeated run costs nothing and an
 * interrupted run continues exactly where it stopped.
 *
 *   npm run era5:sync -- --month=2026-08
 *   npm run era5:sync -- --year=2025
 *   npm run era5:sync -- --month=2026-08 --pruefen   (nur nachsehen, nichts laden)
 */
import { initWasm, LruBlockCache, OmDataType, OmHttpBackend } from '@openmeteo/file-reader';
import {
  era5ArchiveEndHour,
  ERA5_CHUNK_HOURS,
  ERA5_VARIABLES,
  ERA5_WINDOW,
  ERA5_WINDOW_CELLS,
  era5ChunkUrl,
  era5ChunksFor,
  era5HourOf,
  type Era5Variable,
} from '../lib/era5-archive';
import { era5BlockReady, era5ReadManifest, era5WriteBlock, era5DropBlock } from '../lib/era5-store';

const arg = (key: string, fallback = '') =>
  process.argv.find((a) => a.startsWith('--' + key + '='))?.slice(key.length + 3) ?? fallback;
const flag = (key: string) => process.argv.includes('--' + key);

/**
 * One megabyte blocks, not the library default of 64 kB.
 *
 * Each archive file carries a chunk offset table of well over a megabyte. With
 * the default block size the reader fetches it in dozens of round trips and
 * opening one file took 52 seconds; with a megabyte it takes under three.
 */
const CACHE = new LruBlockCache(1024 * 1024, 1024);
const PARALLEL = Number(arg('parallel', '3'));
const ATTEMPTS = 4;

function hoursWanted() {
  const month = arg('month');
  const year = arg('year');
  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('--month=JJJJ-MM erwartet');
    const [y, m] = month.split('-').map(Number);
    // Starts a day early: the monthly chart assigns hours to German calendar
    // days, so the last hours of the previous day belong to this month's first.
    return {
      from: era5HourOf(iso(Date.UTC(y, m - 1, 0))),
      to: era5HourOf(iso(Date.UTC(y, m, 1))),
    };
  }
  if (year) {
    if (!/^\d{4}$/.test(year)) throw new Error('--year=JJJJ erwartet');
    const y = Number(year);
    return { from: era5HourOf(iso(Date.UTC(y, 0, 1))), to: era5HourOf(iso(Date.UTC(y + 1, 0, 1))) };
  }
  const from = arg('from'), to = arg('to');
  if (!from || !to) throw new Error('--month=, --year= oder --from=/--to= angeben');
  return { from: era5HourOf(from + 'T00:00:00Z'), to: era5HourOf(to + 'T00:00:00Z') + 24 };
}
const iso = (ms: number) => new Date(ms).toISOString();

async function lastModified(url: string) {
  const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`HEAD ${url}: HTTP ${response.status}`);
  return response.headers.get('last-modified');
}

async function fetchBlock(variable: Era5Variable, chunk: number) {
  const url = era5ChunkUrl(variable, chunk);
  const stamp = await lastModified(url);
  const reader = await new OmHttpBackend({ url, eTagValidation: false }).asCachedReader(CACHE);
  const dimensions = reader.getDimensions();
  if (dimensions.length !== 3 || Number(dimensions[2]) !== ERA5_CHUNK_HOURS) {
    throw new Error(`Unerwarteter Aufbau von ${url}: ${dimensions.join('x')}`);
  }
  const values = await reader.read({
    type: OmDataType.FloatArray,
    ranges: [
      { start: ERA5_WINDOW.rowFrom, end: ERA5_WINDOW.rowTo },
      { start: ERA5_WINDOW.columnFrom, end: ERA5_WINDOW.columnTo },
      { start: 0, end: ERA5_CHUNK_HOURS },
    ],
  });
  reader.dispose?.();
  if (values.length !== ERA5_WINDOW_CELLS * ERA5_CHUNK_HOURS) {
    throw new Error(`${url}: ${values.length} Werte statt ${ERA5_WINDOW_CELLS * ERA5_CHUNK_HOURS}.`);
  }
  return era5WriteBlock(variable, chunk, values as Float32Array, stamp);
}

/** Retry only transport failures, with growing pauses; a wrong shape is not retried. */
async function withRetry<T>(label: string, run: () => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const message = (error as Error).message ?? '';
      if (/statt|Aufbau|fehlender Wert/.test(message)) throw error;
      if (attempt === ATTEMPTS) break;
      const wait = 2000 * 2 ** (attempt - 1);
      console.log(`  ${label}: ${message} – erneuter Versuch in ${wait / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  throw lastError;
}

async function main() {
  await initWasm();
  const { from, to } = hoursWanted();
  // Refuse before downloading rather than after: a block whose later hours are
  // not published yet fails on a missing value, and that error reads like bad
  // data instead of "come back in a few days".
  const available = await era5ArchiveEndHour();
  if (to > available) {
    throw new Error(
      `Das Archiv reicht bis ${iso(available * 3600000).slice(0, 13)}, angefragt ist bis ` +
        `${iso(to * 3600000).slice(0, 13)}. ERA5 liegt rund fünf Tage zurück; später erneut laufen lassen.`,
    );
  }
  const chunks = era5ChunksFor(from, to);
  const jobs: { variable: Era5Variable; chunk: number }[] = [];
  let ready = 0;
  const revise = flag('revision');
  for (const variable of ERA5_VARIABLES) {
    for (const chunk of chunks) {
      if (era5BlockReady(variable, chunk)) {
        if (!revise) { ready++; continue; }
        const stamp = await lastModified(era5ChunkUrl(variable, chunk));
        if (stamp === era5ReadManifest(variable, chunk).sourceLastModified) { ready++; continue; }
        console.log(`  ${variable}/${chunk}: Quelle überarbeitet, wird neu geladen`);
        era5DropBlock(variable, chunk);
      }
      jobs.push({ variable, chunk });
    }
  }
  console.log(
    `Zeitraum ${iso(from * 3600000).slice(0, 13)} bis ${iso(to * 3600000).slice(0, 13)} · ` +
      `${chunks.length} Blöcke × ${ERA5_VARIABLES.length} Größen · ${ready} vorhanden, ${jobs.length} offen`,
  );
  if (flag('pruefen') || jobs.length === 0) {
    console.log(jobs.length === 0 ? 'Nichts zu tun.' : 'Nur geprüft, nichts geladen.');
    return;
  }
  let cursor = 0, done = 0;
  const started = Date.now();
  await Promise.all(
    Array.from({ length: Math.max(1, PARALLEL) }, async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++];
        const label = `${job.variable}/${job.chunk}`;
        await withRetry(label, () => fetchBlock(job.variable, job.chunk));
        done++;
        console.log(`  ${label} fertig (${done}/${jobs.length}, ${Math.round((Date.now() - started) / 1000)}s)`);
      }
    }),
  );
  console.log(`Fertig: ${done} Blöcke in ${Math.round((Date.now() - started) / 1000)}s.`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
