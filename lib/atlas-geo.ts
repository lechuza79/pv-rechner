import path from "node:path";
import fs from "node:fs/promises";
import DATEN from "./ags-nachfolger-daten.json";
import { aktuellerGemeindeschluessel } from "./ags-nachfolger";

// Die Atlas-Datenschicht kennt Gemeinden nur über ihren AGS (8-stellig), keine
// Koordinate. Für den Standort-Ertrag (PVGIS) braucht die Detailseite aber eine
// Lage. Dieser Server-Helper leitet aus der AGS eine repräsentative PLZ und
// daraus lat/lon ab — indem er die vorhandene PLZ→AGS-Tabelle einmal umdreht.
// Keine Nutzer-PLZ, nichts geloggt (die AGS kommt aus der Route, nicht vom
// Besucher).

export type PlzEntry = { ort: string; ags: string; kreis: string; land: string };

let agsToPlz: Map<string, string> | null = null;
let plzTabelle: Record<string, PlzEntry[]> | null = null;

async function loadPlzTabelle(): Promise<Record<string, PlzEntry[]>> {
  if (plzTabelle) return plzTabelle;
  const file = path.join(process.cwd(), "public", "plz-ags.json");
  plzTabelle = JSON.parse(await fs.readFile(file, "utf-8")) as Record<string, PlzEntry[]>;
  return plzTabelle;
}

/** The Gemeinden a postcode belongs to (one postcode can span several). */
export async function gemeindenZurPlz(plz: string): Promise<PlzEntry[]> {
  return (await loadPlzTabelle())[plz] ?? [];
}
let coords: Record<string, [number, number]> | null = null;

/** PLZ→AGS einmal umdrehen; je Gemeinde die kleinste PLZ als stabile Vertreterin. */
async function loadAgsToPlz(): Promise<Map<string, string>> {
  if (agsToPlz) return agsToPlz;
  const table = await loadPlzTabelle();
  const map = new Map<string, string>();
  for (const [plz, entries] of Object.entries(table)) {
    for (const e of entries) {
      const cur = map.get(e.ags);
      if (!cur || plz < cur) map.set(e.ags, plz);
    }
  }
  agsToPlz = map;
  return map;
}

async function loadCoords(): Promise<Record<string, [number, number]>> {
  if (coords) return coords;
  const file = path.join(process.cwd(), "public", "plz.json");
  coords = JSON.parse(await fs.readFile(file, "utf-8")) as Record<string, [number, number]>;
  return coords;
}

/**
 * Repräsentative Lage einer Gemeinde. `lat`/`lon` können NaN sein, wenn die PLZ
 * bekannt ist, aber keine Koordinate hat — der Ertrag fällt dann sauber auf den
 * Bundesland-Wert zurück (PLZ-Präfix reicht). Null nur, wenn zur AGS gar keine
 * PLZ existiert.
 */
export async function gemeindeGeo(
  ags: string,
): Promise<{ plz: string; lat: number; lon: number } | null> {
  const map = await loadAgsToPlz();
  const plz = map.get(ags) ?? null;
  if (!plz) return null;
  const c = (await loadCoords())[plz];
  return { plz, lat: c?.[0] ?? NaN, lon: c?.[1] ?? NaN };
}

type Ring = [number, number][];
type GemeindeFeature = { properties: { id: string }; geometry: { type: "Polygon" | "MultiPolygon"; coordinates: Ring[] | Ring[][] } };
const grenzen = new Map<string, Promise<GemeindeFeature[]>>();
function kreisGrenzen(kreis: string): Promise<GemeindeFeature[]> {
  let g = grenzen.get(kreis);
  if (!g) {
    const file = path.join(process.cwd(), "public", "geo", "gemeinden", `${kreis}.geo.json`);
    g = fs.readFile(file, "utf-8").then((t) => (JSON.parse(t) as { features: GemeindeFeature[] }).features).catch(() => []);
    grenzen.set(kreis, g);
  }
  return g;
}

/** Area centroid of the largest outer ring, [lat, lon]. */
function schwerpunkt(f: GemeindeFeature): [number, number] | null {
  const polys = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates) as Ring[][];
  let best: { a: number; x: number; y: number } | null = null;
  for (const [ring] of polys) {
    let a = 0, x = 0, y = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
      const c = x0 * y1 - x1 * y0;
      a += c; x += (x0 + x1) * c; y += (y0 + y1) * c;
    }
    if (a && (!best || Math.abs(a) > Math.abs(best.a))) best = { a, x: x / (3 * a), y: y / (3 * a) };
  }
  return best && Number.isFinite(best.x) && Number.isFinite(best.y) ? [best.y, best.x] : null;
}

let vorgaengerIndex: Map<string, string[]> | null = null;
/** Old keys whose current successor is `ags`, sorted. */
function vorgaenger(ags: string): string[] {
  if (!vorgaengerIndex) {
    vorgaengerIndex = new Map();
    for (const alt of Object.keys((DATEN as { nachfolger: Record<string, unknown> }).nachfolger)) {
      const neu = aktuellerGemeindeschluessel(alt);
      if (neu !== alt) vorgaengerIndex.set(neu, [...(vorgaengerIndex.get(neu) ?? []), alt].sort());
    }
  }
  return vorgaengerIndex.get(ags) ?? [];
}
async function vorgaengerMitte(ags: string): Promise<[number, number] | null> {
  for (const alt of vorgaenger(ags)) {
    const f = (await kreisGrenzen(alt.slice(0, 5))).find((x) => x.properties.id === alt);
    const m = f ? schwerpunkt(f) : null;
    if (m) return m;
  }
  return null;
}

/** Farther than this, a postcode's weather point no longer describes the municipality. */
const WETTERPUNKT_MAX_KM = 20;

/**
 * Where the weather model is read for a municipality: its own postcode when it
 * has one with coordinates (`gemeindeGeo`, unchanged), otherwise the postcode
 * point nearest to the centre of its checked-in boundary.
 *
 * WHY: the postcode table names one municipality per postcode area, so a village
 * sharing its postcode with a neighbour has none (measured 26.09.2026: 441 of
 * 10,169 municipalities with a site, 0.5 % of installed kWp). Without a location
 * a single such village made its whole district — and so its Land and Germany —
 * "unavailable" for the live curve. The weather model's cells are 2 km wide; the
 * nearest postcode point lies within the same few cells. Used by the district
 * route and the Land/Germany curves alike, so both levels read the same point.
 */
export async function gemeindeWetterpunkt(ags: string): Promise<{ plz: string; lat: number; lon: number; quelle: "plz" | "grenze" | "vorgaenger" } | null> {
  const eigen = await gemeindeGeo(ags);
  if (eigen && Number.isFinite(eigen.lat) && Number.isFinite(eigen.lon)) return { ...eigen, quelle: "plz" };
  const feature = (await kreisGrenzen(ags.slice(0, 5))).find((f) => f.properties.id === ags);
  let mitte = feature ? schwerpunkt(feature) : null;
  if (!mitte) {
    // A key renamed by a territorial change (Hanau: kreisfrei since 2026, new
    // key) is known to the postcode table and the boundaries only under its old
    // key — the official successor list says which. Its own postcode first.
    for (const alt of vorgaenger(ags)) {
      const g = await gemeindeGeo(alt);
      if (g && Number.isFinite(g.lat) && Number.isFinite(g.lon)) return { ...g, quelle: "vorgaenger" };
    }
    mitte = await vorgaengerMitte(ags);
  }
  if (!mitte) return null;
  const [lat, lon] = mitte;
  const k = Math.cos((lat * Math.PI) / 180);
  let best: { plz: string; d: number } | null = null;
  for (const [plz, [plat, plon]] of Object.entries(await loadCoords())) {
    const d = Math.hypot(plat - lat, (plon - lon) * k) * 111.2;
    if (!best || d < best.d) best = { plz, d };
  }
  return best && best.d <= WETTERPUNKT_MAX_KM ? { plz: best.plz, lat, lon, quelle: "grenze" } : null;
}
