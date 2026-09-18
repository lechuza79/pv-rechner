/**
 * Weather points for postcodes whose area centre sits on a mountain.
 *
 * A postcode's centroid is the middle of its AREA, and in the Alps, the Black
 * Forest or along the Rhine gorge that middle is forest or summit while people
 * live in the valley: 83486 Ramsau has its centroid at 2,301 m, the village at
 * about 675 m. Weather read there is 10 K too cold and picks a mountain cell.
 *
 * The fix takes the town's own point instead — the coordinate Wikidata (CC0)
 * keeps for the municipality, which is its centre, not its area — but only
 * where that clearly helps:
 *   - the town lies LOWER than the centroid by more than 150 m. The reverse
 *     cases were read by hand (16 of them): mostly Wikidata points on a hill
 *     above the village or unpopulated forest districts, i.e. the town point
 *     was the worse one;
 *   - it is at most 15 km away, so the town still belongs to the postcode;
 *   - the municipality has exactly one coordinate on Wikidata. With two, we
 *     would be guessing which is the settlement.
 * Of the municipalities a postcode touches, the nearest is taken.
 *
 *   npm run wetter:ortspunkte -- --wikidata   Wikidata neu holen (sonst Cache)
 *   npm run era5:static -- --hoehen --punkte=scripts/.cache/era5-archive/town-points.json
 *   npm run wetter:ortspunkte                 Datei lib/plz-weather-point.json schreiben
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import plzCoordinates from '../public/plz.json';
import plzAgs from '../public/plz-ags.json';
import plzElevation from '../lib/plz-elevation.json';

const CACHE = 'scripts/.cache/era5-archive';
const CSV = `${CACHE}/wikidata-orte.csv`;
const TOWNS = `${CACHE}/town-points.json`;
const HEIGHTS = `${CACHE}/point-elevation.json`;
const OUT = 'lib/plz-weather-point.json';

const MIN_DROP_M = 150;
const MAX_DISTANCE_KM = 15;
const QUERY = 'SELECT ?ags ?coord WHERE { ?item wdt:P439 ?ags; wdt:P625 ?coord. FILTER(STRLEN(?ags)=8) }';

const key = (latitude: number, longitude: number) => `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
const km = (a: [number, number], b: [number, number]) => {
  const cos = Math.cos(((a[0] + b[0]) / 2) * (Math.PI / 180));
  return Math.hypot((a[0] - b[0]) * 111.2, (a[1] - b[1]) * 111.2 * cos);
};

async function main() {
  mkdirSync(CACHE, { recursive: true });
  if (process.argv.includes('--wikidata') || !existsSync(CSV)) {
    const response = await fetch('https://query.wikidata.org/sparql?query=' + encodeURIComponent(QUERY), {
      headers: { Accept: 'text/csv', 'User-Agent': 'solar-check.io weather points (sebastian@solar-check.io)' },
    });
    if (!response.ok) throw new Error(`Wikidata antwortet ${response.status}`);
    writeFileSync(CSV, await response.text());
  }

  // Municipality → its coordinates; more than one means we cannot tell which.
  const coords = new Map<string, [number, number][]>();
  for (const line of readFileSync(CSV, 'utf8').split('\n').slice(1)) {
    const match = /^(\d{8}),Point\(([-\d.]+) ([-\d.]+)\)/.exec(line.trim());
    if (!match) continue;
    const list = coords.get(match[1]) ?? [];
    list.push([Number(match[3]), Number(match[2])]);
    coords.set(match[1], list);
  }
  const towns = new Map<string, [number, number]>();
  for (const [ags, list] of coords) if (list.length === 1) towns.set(ags, list[0]);
  writeFileSync(TOWNS, JSON.stringify([...towns].map(([id, [latitude, longitude]]) => ({ id, latitude, longitude }))));
  console.log(`${towns.size} Gemeinden mit eindeutigem Ortspunkt, ${coords.size - towns.size} mehrdeutig verworfen.`);

  const heights = existsSync(HEIGHTS) ? (JSON.parse(readFileSync(HEIGHTS, 'utf8')).elevations as Record<string, number>) : {};
  const missing = [...towns.values()].filter(([lat, lon]) => heights[key(lat, lon)] === undefined).length;
  if (missing > 0) {
    throw new Error(`${missing} Ortspunkte ohne Höhe; zuerst: npm run era5:static -- --hoehen --punkte=${TOWNS}`);
  }

  const centroidHeight = (plzElevation as { elevations: Record<string, number> }).elevations;
  const agsOf = plzAgs as Record<string, { ags: string; ort: string }[]>;
  const points: Record<string, { latitude: number; longitude: number; elevation: number; ort: string; centroidElevation: number }> = {};
  for (const [plz, centre] of Object.entries(plzCoordinates as unknown as Record<string, [number, number]>)) {
    const own = centroidHeight[plz];
    if (own === undefined) continue;
    let best: { distance: number; point: [number, number]; ort: string } | null = null;
    for (const { ags, ort } of agsOf[plz] ?? []) {
      const point = towns.get(ags);
      if (!point) continue;
      const distance = km(centre, point);
      if (!best || distance < best.distance) best = { distance, point, ort };
    }
    if (!best || best.distance > MAX_DISTANCE_KM) continue;
    const town = heights[key(...best.point)];
    if (own - town <= MIN_DROP_M) continue;
    points[plz] = { latitude: best.point[0], longitude: best.point[1], elevation: town, ort: best.ort, centroidElevation: own };
  }

  writeFileSync(
    OUT,
    JSON.stringify({
      note:
        'Weather point for postcodes whose centroid lies more than 150 m above the municipality centre (within 15 km). ' +
        'Town coordinates from Wikidata (CC0, P439 + P625), heights from the Copernicus DEM like lib/plz-elevation.json. ' +
        'Built by scripts/plz-wetterpunkt-build.ts.',
      points,
    }),
  );
  const drops = Object.values(points).map((p) => p.centroidElevation - p.elevation).sort((a, b) => b - a);
  console.log(`${Object.keys(points).length} Postleitzahlen bekommen den Ortspunkt; größte Absenkung ${drops[0]} m, Median ${drops[drops.length >> 1]} m.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
