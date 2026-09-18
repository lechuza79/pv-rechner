/**
 * Does the radar see the rain the stations measure?
 *
 *   npm run wetter:radar-abgleich -- --stunden=12
 *
 * For every DWD station that reports "precipitation last hour", sums the twelve
 * 5-minute RADOLAN RY images of that hour at the station's position and holds
 * the two against each other. What the live scene needs is DETECTION — does it
 * rain here or not — so that is scored first; amounts come second, because RY
 * is not gauge-adjusted and is known to differ in amount.
 */
// @ts-expect-error seek-bzip ships no types
import Bunzip from 'seek-bzip';
import { DWD_STATIONS } from '../lib/dwd-stations';
import { parseRadolan, radolanValueAt, type RadolanGrid } from '../lib/dwd-radolan';
import { initWasm, LruBlockCache, OmDataType, OmHttpBackend } from '@openmeteo/file-reader';
import { ICON_D2_BASE, ICON_D2_CHUNK_HOURS, ICON_D2_GRID } from '../lib/icon-d2';
import { gridColumn, gridRow } from '../lib/regular-grid';

const arg = (key: string, fallback = '') =>
  process.argv.find((a) => a.startsWith('--' + key + '='))?.slice(key.length + 3) ?? fallback;
const HOURS = Number(arg('stunden', '12'));
const WET = 0.1; // mm per hour

const pad = (n: number) => String(n).padStart(2, '0');
function ryName(t: Date) {
  return `raa01-ry_10000-${String(t.getUTCFullYear()).slice(2)}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}-dwd---bin.bz2`;
}
async function fetchText(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  return r.ok ? new TextDecoder('latin1').decode(await r.arrayBuffer()) : null;
}

async function main() {
  const lastFullHour = Math.floor(Date.now() / 3600000) - 1; // stations report ~45 min late
  const hours = Array.from({ length: HOURS }, (_, i) => lastFullHour - i);
  const images = new Map<number, RadolanGrid | null>();
  const times = hours.flatMap((h) => Array.from({ length: 12 }, (_, k) => h * 3600000 - k * 300000));
  let cursor = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (cursor < times.length) {
      const t = times[cursor++];
      const r = await fetch('https://opendata.dwd.de/weather/radar/radolan/ry/' + ryName(new Date(t)), { signal: AbortSignal.timeout(30000) });
      images.set(t, r.ok ? parseRadolan(Bunzip.decode(Buffer.from(await r.arrayBuffer()))) : null);
    }
  }));
  const missingImages = Array.from(images.values()).filter((g) => !g).length;

  // Model precipitation (preceding hour) at the nearest ICON-D2 cell, for the
  // same hours: the question is not "is the radar perfect" but "which source
  // is right more often, and when".
  await initWasm();
  const cache = new LruBlockCache(1024 * 1024, 1024);
  const modelAt = new Map<string, number>();
  const chunks = Array.from(new Set(hours.map((h) => Math.floor(h / ICON_D2_CHUNK_HOURS))));
  for (const chunk of chunks) {
    const reader = await new OmHttpBackend({ url: `${ICON_D2_BASE}precipitation/chunk_${chunk}.om`, eTagValidation: false }).asCachedReader(cache);
    for (const station of DWD_STATIONS) {
      const row = gridRow(ICON_D2_GRID, station.latitude), column = gridColumn(ICON_D2_GRID, station.longitude);
      const values = await reader.read({ type: OmDataType.FloatArray, ranges: [{ start: row, end: row + 1 }, { start: column, end: column + 1 }, { start: 0, end: ICON_D2_CHUNK_HOURS }] });
      for (const h of hours) if (Math.floor(h / ICON_D2_CHUNK_HOURS) === chunk) modelAt.set(station.id + ':' + h, values[h - chunk * ICON_D2_CHUNK_HOURS]);
    }
  }

  type Pair = { station: string; hour: number; gauge: number; radar: number | null; model: number | null };
  const pairs: Pair[] = [];
  for (const station of DWD_STATIONS) {
    const text = await fetchText(`https://opendata.dwd.de/weather/weather_reports/poi/${station.id}-BEOB.csv`);
    if (!text) continue;
    const rows = text.split('\n').map((l) => l.split(';'));
    const col = rows[0].findIndex((n) => n.startsWith('precipitation_amount_last_hour'));
    if (col < 0) continue;
    for (const row of rows.slice(3)) {
      if (row.length <= col || row[col] === '---' || !row[col]) continue;
      const [d, m, y] = row[0].split('.').map(Number);
      const [hh, mm] = row[1].split(':').map(Number);
      const hour = Date.UTC(2000 + y, m - 1, d, hh, mm) / 3600000;
      if (!hours.includes(hour)) continue;
      let sum = 0, seen = true;
      for (let k = 0; k < 12; k++) {
        const g = images.get(hour * 3600000 - k * 300000);
        const v = g ? radolanValueAt(g, station.latitude, station.longitude) : null;
        if (v === null) { seen = false; break; }
        sum += v;
      }
      const model = modelAt.get(station.id + ':' + hour);
      pairs.push({ station: station.name, hour, gauge: Number(row[col].replace(',', '.')), radar: seen ? sum : null, model: model === undefined || !Number.isFinite(model) ? null : model });
    }
  }
  const seen = pairs.filter((p) => p.radar !== null);
  const both = seen.filter((p) => p.gauge >= WET && p.radar! >= WET).length;
  const gaugeOnly = seen.filter((p) => p.gauge >= WET && p.radar! < WET);
  const radarOnly = seen.filter((p) => p.gauge < WET && p.radar! >= WET);
  const dry = seen.filter((p) => p.gauge < WET && p.radar! < WET).length;
  const wetGauge = both + gaugeOnly.length;
  console.log(`${HOURS} Stunden, ${images.size - missingImages}/${images.size} Radarbilder, ${pairs.length} Stationsstunden, davon ${pairs.length - seen.length} ohne Radarsicht.`);
  console.log(`Regen an der Station:  ${wetGauge} Stunden — Radar sah ihn in ${both} (${wetGauge ? ((both / wetGauge) * 100).toFixed(0) : '–'} %)`);
  console.log(`Trocken an der Station: ${dry + radarOnly.length} Stunden — Radar meldete trotzdem Regen in ${radarOnly.length}`);
  const amounts = seen.filter((p) => p.gauge >= 0.5 && p.radar! >= WET).map((p) => p.radar! / p.gauge).sort((a, b) => a - b);
  if (amounts.length) console.log(`Menge (Radar/Station, ab 0,5 mm): Median ${amounts[amounts.length >> 1].toFixed(2)}, ${amounts.length} Fälle`);
  // Same scoring for the model and for combinations, on the hours all three have.
  const all3 = seen.filter((p) => p.model !== null);
  const score = (label: string, wet: (p: Pair) => boolean) => {
    const hit = all3.filter((p) => p.gauge >= WET && wet(p)).length;
    const wetN = all3.filter((p) => p.gauge >= WET).length;
    const falseN = all3.filter((p) => p.gauge < WET && wet(p)).length;
    const dryN = all3.length - wetN;
    console.log(`  ${label.padEnd(34)} erkennt ${hit}/${wetN} (${((hit / wetN) * 100).toFixed(0)} %), Fehlalarm ${falseN}/${dryN} (${((falseN / dryN) * 100).toFixed(1)} %)`);
  };
  console.log(`Vergleich auf ${all3.length} Stationsstunden mit Radar und Modell:`);
  score('nur Radar', (p) => p.radar! >= WET);
  score('nur Modell', (p) => p.model! >= WET);
  score('Radar ODER Modell', (p) => p.radar! >= WET || p.model! >= WET);
  score('Radar, Modell nur ab 0,5 mm', (p) => p.radar! >= WET || p.model! >= 0.5);
  score('Radar, Modell wenn Radar > 0', (p) => p.radar! >= WET || (p.model! >= WET && p.radar! > 0));

  const miss = gaugeOnly.sort((a, b) => b.gauge - a.gauge).slice(0, 8);
  if (miss.length) console.log('Größte Fehlstellen (Station nass, Radar trocken):', miss.map((p) => `${p.station} ${new Date(p.hour * 3600000).toISOString().slice(11, 16)} ${p.gauge} mm / Radar ${p.radar!.toFixed(2)}`).join(' · '));
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
