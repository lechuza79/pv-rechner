#!/usr/bin/env node
/**
 * Build the per-Landkreis Gemeinde geometry bundles for the Solar-Atlas map.
 *
 * Source: BKG "Verwaltungsgebiete 1:250.000" (VG250), Ebene Gemeinden (GEM),
 * Datenlizenz dl-de/by-2-0. ~11.000 Gemeinde polygons. We ship them split by
 * Landkreis (one small file per Kreis, ~10-70 KB) so the map lazy-loads only the
 * Kreis a visitor drills into — never all polygons at once.
 *
 * Output: public/geo/gemeinden/<5-digit-Kreis-AGS>.geo.json
 *   Feature props: { id: 8-digit Gemeinde-AGS, name, kind, kreis }
 *   The Kreis file name matches the Landkreis ids in de-landkreise.geo.json 1:1,
 *   so the drilldown always finds the right bundle.
 *
 * Run yearly when a new Gebietsstand is published (rare — Gemeinde reforms).
 * Needs `npx mapshaper` (pulled on demand) and `unzip`.
 *
 * Usage:
 *   1) Download the current shapefile archive from
 *      https://daten.gdz.bkg.bund.de/produkte/vg/vg250_ebenen_0101/aktuell/
 *      → vg250_01-01.utm32s.shape.ebenen.zip  (~66 MB)
 *   2) unzip it and pass the path to VG250_GEM.shp:
 *      node scripts/build-gemeinde-geo.mjs /path/to/VG250_GEM.shp
 *
 * The pipeline (mapshaper):
 *   -filter 'GF == 4'      keep the land area only (drops water polygons)
 *   -proj wgs84            reproject UTM32S → lon/lat, matching the other geo files
 *   -dissolve2 AGS         merge multi-part Gemeinden (islands) into one feature
 *   -simplify 18% weighted strong simplification, keep-shapes so nothing vanishes
 *   -split kreis           one file per 5-digit AGS prefix
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// mapshaper emits RFC-7946 winding (exterior rings counter-clockwise). The map's
// d3-geo setup renders the OTHER winding (clockwise exterior — matching the
// existing de-landkreise.geo.json); with CCW rings d3 treats each polygon as
// "whole world minus this hole" and fills the entire viewport, hiding the map.
// Reversing every ring flips the winding to what d3 expects. This is the same
// fix that makes de-landkreise render correctly.
function reverseRings(geom) {
  if (geom.type === "Polygon") {
    geom.coordinates = geom.coordinates.map((r) => r.slice().reverse());
  } else if (geom.type === "MultiPolygon") {
    geom.coordinates = geom.coordinates.map((poly) => poly.map((r) => r.slice().reverse()));
  }
}

const shp = process.argv[2];
if (!shp || !existsSync(shp)) {
  console.error("Pfad zur VG250_GEM.shp fehlt oder existiert nicht. Siehe Header dieser Datei.");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "geo", "gemeinden");
const tmpDir = path.join(root, ".gemeinde-geo-tmp");

rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

console.log("mapshaper: vereinfache + splitte nach Landkreis …");
execFileSync(
  "npx",
  [
    "-y",
    "mapshaper",
    shp,
    "-filter",
    "GF == 4",
    "-proj",
    "wgs84",
    "-dissolve2",
    "AGS",
    "copy-fields=GEN,BEZ",
    "-simplify",
    "18%",
    "visvalingam",
    "weighted",
    "keep-shapes",
    "-rename-fields",
    "id=AGS,name=GEN,kind=BEZ",
    "-each",
    "kreis = id.substring(0,5); delete this.properties.GF",
    "-split",
    "kreis",
    "-o",
    "precision=0.00005",
    "format=geojson",
    tmpDir + "/",
  ],
  { stdio: "inherit" },
);

// Move <kreis>.json → public/geo/gemeinden/<kreis>.geo.json, fixing ring winding.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const files = readdirSync(tmpDir).filter((f) => f.endsWith(".json"));
for (const f of files) {
  const kreis = f.replace(/\.json$/, "");
  const geo = JSON.parse(readFileSync(path.join(tmpDir, f), "utf-8"));
  for (const ft of geo.features) reverseRings(ft.geometry);
  writeFileSync(path.join(outDir, `${kreis}.geo.json`), JSON.stringify(geo));
}
rmSync(tmpDir, { recursive: true, force: true });

// ── Eingeschlossene kreisfreie Städte: das Loch im Landkreis füllen ──
// Ein Landkreis, der eine kreisfreie Stadt umschließt (Würzburg, Bamberg,
// Regensburg …), zeigt beim Reinzoomen sonst ein Loch, wo die Stadt sitzt. Die
// Stadt ist ein EIGENER Kreis (eigenes Bündel mit genau einer Gemeinde), gehört
// also nicht zum Landkreis. Damit die Karte trotzdem vollständig aussieht, wird
// die Stadt-Geometrie zusätzlich ins Landkreis-Bündel gelegt — mit ihrer eigenen
// 8-stelligen Kennziffer (Klick → eigene Seite) und Kennzeichnung
// "Kreisfreie Stadt". Erkennung rein geometrisch: die Stadt liegt im Loch des
// Landkreis-Umrisses (dissolve aller Gemeinden je Kreis).
console.log("Ermittle eingeschlossene kreisfreie Städte …");
const outlinesFile = path.join(root, ".gemeinde-outlines-tmp.json");
execFileSync(
  "npx",
  [
    "-y",
    "mapshaper",
    shp,
    "-filter",
    "GF == 4",
    "-proj",
    "wgs84",
    "-each",
    "kreis = AGS.substring(0,5)",
    "-dissolve2",
    "kreis",
    "-simplify",
    "10%",
    "visvalingam",
    "weighted",
    "keep-shapes",
    "-o",
    "precision=0.0005",
    "format=geojson",
    outlinesFile,
  ],
  { stdio: "inherit" },
);

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function ringsOf(geom) {
  return geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
}

const outlines = JSON.parse(readFileSync(outlinesFile, "utf-8"));
// City-Kreise = Bundle mit genau einer Gemeinde (kreisfreie Stadt / Stadtkreis).
const cityBundles = readdirSync(outDir)
  .filter((f) => f.endsWith(".geo.json"))
  .map((f) => ({ kreis: f.replace(/\.geo\.json$/, ""), geo: JSON.parse(readFileSync(path.join(outDir, f), "utf-8")) }))
  .filter((b) => b.geo.features.length === 1);

const mapping = {}; // host Landkreis AGS (5-digit) → enclosed Stadt Kreis AGS (5-digit)
for (const city of cityBundles) {
  const pts = [];
  const walk = (a) => (Array.isArray(a[0]) ? a.forEach(walk) : pts.push(a));
  walk(city.geo.features[0].geometry.coordinates);
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  // Find the Landkreis whose outline has a HOLE containing the city centroid.
  const host = outlines.features.find((f) => {
    if (f.properties.kreis === city.kreis) return false;
    return ringsOf(f.geometry).some((poly) => inRing(cx, cy, poly[0]) && poly.slice(1).some((h) => inRing(cx, cy, h)));
  });
  if (!host) continue;
  const hostFile = path.join(outDir, `${host.properties.kreis}.geo.json`);
  const hostGeo = JSON.parse(readFileSync(hostFile, "utf-8"));
  const cityFeature = JSON.parse(JSON.stringify(city.geo.features[0]));
  cityFeature.properties.kind = "Kreisfreie Stadt";
  hostGeo.features.push(cityFeature);
  writeFileSync(hostFile, JSON.stringify(hostGeo));
  mapping[host.properties.kreis] = city.kreis;
}
rmSync(outlinesFile, { force: true });

// The same host→city mapping the server needs, so the choropleth for a Landkreis
// can also pull in the enclosed Stadt's value (colour + hover). One source of
// truth, regenerated together with the geometry — never hand-edited.
const sortedMap = Object.fromEntries(Object.entries(mapping).sort());
const mappingFile = path.join(root, "lib", "enclosed-cities.ts");
writeFileSync(
  mappingFile,
  `// GENERATED by scripts/build-gemeinde-geo.mjs — do not edit by hand.\n` +
    `// A Landkreis (key, 5-digit AGS) that geographically encloses a kreisfreie\n` +
    `// Stadt (value, 5-digit Kreis AGS) sitting in its hole. Used to draw the city\n` +
    `// into the Landkreis map bundle AND to add its value to that Kreis's choropleth.\n` +
    `export const ENCLOSED_CITIES: Record<string, string> = ${JSON.stringify(sortedMap, null, 2)};\n`,
);

console.log(
  `Fertig: ${files.length} Landkreis-Bündel, ${Object.keys(mapping).length} eingeschlossene Städte ergänzt (lib/enclosed-cities.ts).`,
);
