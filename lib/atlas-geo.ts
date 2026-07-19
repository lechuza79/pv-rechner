import path from "node:path";
import fs from "node:fs/promises";

// Die Atlas-Datenschicht kennt Gemeinden nur über ihren AGS (8-stellig), keine
// Koordinate. Für den Standort-Ertrag (PVGIS) braucht die Detailseite aber eine
// Lage. Dieser Server-Helper leitet aus der AGS eine repräsentative PLZ und
// daraus lat/lon ab — indem er die vorhandene PLZ→AGS-Tabelle einmal umdreht.
// Keine Nutzer-PLZ, nichts geloggt (die AGS kommt aus der Route, nicht vom
// Besucher).

type PlzEntry = { ort: string; ags: string; kreis: string; land: string };

let agsToPlz: Map<string, string> | null = null;
let coords: Record<string, [number, number]> | null = null;

/** PLZ→AGS einmal umdrehen; je Gemeinde die kleinste PLZ als stabile Vertreterin. */
async function loadAgsToPlz(): Promise<Map<string, string>> {
  if (agsToPlz) return agsToPlz;
  const file = path.join(process.cwd(), "public", "plz-ags.json");
  const table = JSON.parse(await fs.readFile(file, "utf-8")) as Record<string, PlzEntry[]>;
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
