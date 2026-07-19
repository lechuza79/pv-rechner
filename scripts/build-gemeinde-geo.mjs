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

console.log(`Fertig: ${files.length} Landkreis-Bündel in public/geo/gemeinden/`);
