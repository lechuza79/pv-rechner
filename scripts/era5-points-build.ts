/**
 * Write the list of municipal weather points the elevation lookup needs.
 *
 * The coordinates are chosen exactly as the story preparation chooses them —
 * centroid first, then the bounding box of the boundary, then the mean of the
 * local postcode coordinates — so the two never disagree about which point a
 * municipality has. A separate rule here would put places on other grid cells
 * than the run that uses them.
 *
 *   npm run era5:punkte -- --cache=/pfad/zu/scripts/.cache
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { boundaryWeatherPoint } from '../lib/story-weather-location';

const arg = (key: string, fallback = '') =>
  process.argv.find((a) => a.startsWith('--' + key + '='))?.slice(key.length + 3) ?? fallback;
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

const cache = arg('cache', 'scripts/.cache');
const out = arg('out', 'scripts/.cache/era5-archive/points.json');
const index = read(cache + '/story-discovery/index.json') as { regionId: string; name: string }[];
const regions = new Map<string, { centroid_lat?: number; centroid_lon?: number }>(
  read(cache + '/story-inputs/regions.json').map((row: { region_id: string }) => [row.region_id, row]),
);
const plz = read('public/plz.json') as Record<string, [number, number]>;
const ags = read('public/plz-ags.json') as Record<string, { ags: string }[]>;
const byAgs = new Map<string, [number, number][]>();
for (const [code, places] of Object.entries(ags)) {
  if (!plz[code]) continue;
  for (const place of places) {
    const list = byAgs.get(place.ags) ?? [];
    list.push(plz[code]);
    byAgs.set(place.ags, list);
  }
}

const points: { id: string; name: string; latitude: number; longitude: number; source: string }[] = [];
const missing: string[] = [];
for (const city of index) {
  const region = regions.get(city.regionId);
  const list = byAgs.get(city.regionId) ?? [];
  let boundary: { latitude: number; longitude: number } | null = null;
  const boundaryPath = 'public/geo/gemeinden/' + city.regionId.slice(0, 5) + '.geo.json';
  if (existsSync(boundaryPath)) {
    const feature = read(boundaryPath).features.find((f: { properties: { id: string } }) => f.properties.id === city.regionId);
    boundary = boundaryWeatherPoint(feature?.geometry?.coordinates);
  }
  const latitude =
    region?.centroid_lat ?? boundary?.latitude ?? (list.length ? list.reduce((sum, p) => sum + p[0], 0) / list.length : Number.NaN);
  const longitude =
    region?.centroid_lon ?? boundary?.longitude ?? (list.length ? list.reduce((sum, p) => sum + p[1], 0) / list.length : Number.NaN);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    missing.push(city.regionId);
    continue;
  }
  points.push({
    id: city.regionId,
    name: city.name,
    latitude,
    longitude,
    source: region?.centroid_lat != null ? 'centroid' : boundary ? 'boundary-box' : 'postcode-mean',
  });
}
/**
 * Points an earlier run already pinned.
 *
 * A municipality that has been prepared once keeps the exact coordinate its
 * saved figures were computed for, and that coordinate is usually not the one
 * the rule above produces today. Measured on the current corpus, a third of the
 * pinned points are not in the list otherwise — and every one of them would
 * stop a run on the new source with "no elevation for this place".
 */
const preparedRoot = arg('vorbereitet', cache + '/story-prepared');
let pinned = 0;
if (existsSync(preparedRoot)) {
  const seen = new Set(points.map((point) => `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`));
  for (const day of readdirSync(preparedRoot)) {
    const folder = preparedRoot + '/' + day;
    let entries: string[];
    try { entries = readdirSync(folder); } catch { continue; }
    for (const file of entries) {
      if (!file.endsWith('.json')) continue;
      let saved: { monthly?: { sourceUrl?: string } };
      try { saved = read(folder + '/' + file); } catch { continue; }
      const url = saved.monthly?.sourceUrl;
      if (!url) continue;
      let parsed: URL;
      try { parsed = new URL(url); } catch { continue; }
      const latitude = Number(parsed.searchParams.get('latitude'));
      const longitude = Number(parsed.searchParams.get('longitude'));
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) continue;
      const key = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      points.push({ id: file.replace('.json', '') + '@' + day, name: file.replace('.json', ''), latitude, longitude, source: 'pinned' });
      pinned++;
    }
  }
}

mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true });
writeFileSync(out + '.tmp', JSON.stringify(points));
renameSync(out + '.tmp', out);
console.log(`${points.length} Punkte geschrieben (${pinned} davon aus früheren Berechnungsständen); ohne Koordinate: ${missing.length}.`);
