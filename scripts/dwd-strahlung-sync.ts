/**
 * Erzeugt `lib/strahlungsjahre.ts`: das Gebietsmittel der Globalstrahlung über
 * Deutschland je Kalenderjahr (kWh/m²), aus den 1-km-Jahresrastern des DWD.
 *
 * Warum ein Skript und keine getippte Tabelle: Eine Datei mit dem Vermerk
 * „aus DWD-Daten" ohne Erzeuger bliebe beim Jahrgang stehen, in dem sie
 * angelegt wurde (CLAUDE.md, „AUTO-generiert ohne Generator"). Der DWD ergänzt
 * das abgeschlossene Jahr jeweils Mitte Januar.
 *
 * Aufruf: npm run strahlung:sync   (--bis <jahr> begrenzt, --trocken schreibt nicht)
 *
 * Datensatz: DWD Climate Data Center (CDC), „Rasterdaten der Jahressumme für die
 * Globalstrahlung auf die horizontale Ebene für Deutschland basierend auf
 * Boden- und Satellitenmessungen", Version V003 — ESRI-ASCII-Raster, 654 × 866
 * Zellen à 1 km, NODATA −999, Einheit kWh/m². Beschreibung:
 * https://opendata.dwd.de/climate_environment/CDC/grids_germany/annual/radiation_global/
 * Lizenz: CC BY 4.0 (Nutzungsbedingungen CDC-OpenData, Stand Mai 2024).
 *
 * Das GEBIETSMITTEL ist unsere Ableitung (ungewichtetes Mittel aller belegten
 * Zellen — bei gleich großen Zellen das Flächenmittel), deshalb trägt die Quelle
 * den Änderungshinweis. Die Rasterwerte selbst haben laut DWD eine mittlere
 * Unsicherheit von ±6 %; die Reihe ist durchgängig mit einer Methode erstellt.
 *
 * Wie beim Ember-Sync: Zurückliegende Jahre werden neu gerechnet und gegen den
 * bisherigen Stand gehalten; ein Sprung über 30 % bricht ab — eher ein Fehler
 * beim Einlesen als eine echte Revision.
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Open } from "unzipper";

const BASIS = "https://opendata.dwd.de/climate_environment/CDC/grids_germany/annual/radiation_global";
const ERSTES_JAHR = 1991;
const ZIEL = join(process.cwd(), "lib", "strahlungsjahre.ts");
const SPRUNG_MAX = 0.3;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Ungewichtetes Mittel aller Zellen ≠ NODATA aus einem ESRI-ASCII-Raster (mit DWD-Kopfblock). */
export function gebietsmittelAusRaster(text: string): { mittel: number; zellen: number } {
  const zeilen = text.split(/\r?\n/);
  const start = zeilen.findIndex((z) => /^\s*NCOLS\b/i.test(z));
  if (start < 0) throw new Error("Kein ESRI-ASCII-Kopf (NCOLS) gefunden");
  let i = start;
  let nodata = -999;
  while (i < zeilen.length && /^\s*[A-Za-z_]+\s/.test(zeilen[i])) {
    const [k, v] = zeilen[i].trim().split(/\s+/, 2);
    if (k.toUpperCase() === "NODATA_VALUE") nodata = Number(v);
    i++;
  }
  let summe = 0, n = 0;
  for (; i < zeilen.length; i++) {
    const z = zeilen[i].trim();
    if (!z) continue;
    for (const tok of z.split(/\s+/)) {
      const v = Number(tok);
      if (!Number.isFinite(v)) throw new Error(`Kein Zahlwert im Raster: „${tok}"`);
      if (v === nodata) continue;
      summe += v;
      n++;
    }
  }
  if (n === 0) throw new Error("Raster ohne belegte Zellen");
  return { mittel: summe / n, zellen: n };
}

async function jahreswert(jahr: number): Promise<{ mittel: number; zellen: number }> {
  const url = `${BASIS}/grids_germany_annual_radiation_global_${jahr}.zip`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const zip = await Open.buffer(Buffer.from(await res.arrayBuffer()));
  const asc = zip.files.find((f) => f.path.endsWith(".asc"));
  if (!asc) throw new Error(`${url}: keine .asc im Archiv`);
  return gebietsmittelAusRaster((await asc.buffer()).toString("latin1"));
}

function bisherigeWerte(): Map<number, number> {
  const out = new Map<number, number>();
  if (!existsSync(ZIEL)) return out;
  const q = readFileSync(ZIEL, "utf8");
  for (const m of q.matchAll(/\{ jahr: (\d{4}), kwhM2: ([\d.]+) \}/g)) out.set(Number(m[1]), Number(m[2]));
  return out;
}

async function main() {
  const trocken = process.argv.includes("--trocken");
  const bis = Number(arg("--bis") ?? new Date().getFullYear() - 1);
  const bisher = bisherigeWerte();
  const reihe: { jahr: number; kwhM2: number; zellen: number }[] = [];
  for (let jahr = ERSTES_JAHR; jahr <= bis; jahr++) {
    let w: { mittel: number; zellen: number };
    try {
      w = await jahreswert(jahr);
    } catch (e) {
      // Das laufende bzw. gerade abgeschlossene Jahr liegt Mitte Januar noch nicht vor.
      if (jahr === bis) { console.log(`${jahr}: noch nicht veröffentlicht (${(e as Error).message})`); break; }
      throw e;
    }
    const kwhM2 = Math.round(w.mittel * 10) / 10;
    const alt = bisher.get(jahr);
    if (alt !== undefined && Math.abs(kwhM2 - alt) / alt > SPRUNG_MAX) {
      throw new Error(`${jahr}: ${alt} → ${kwhM2} kWh/m² ist ein Sprung über 30 % — Einlesen prüfen, nicht überschreiben`);
    }
    if (alt !== undefined && kwhM2 !== alt) console.log(`${jahr}: revidiert ${alt} → ${kwhM2}`);
    reihe.push({ jahr, kwhM2, zellen: w.zellen });
    console.log(`${jahr}: ${kwhM2} kWh/m² (${w.zellen} Zellen)`);
  }
  if (reihe.length === 0) throw new Error("Keine Jahre gelesen");
  const zellen = new Set(reihe.map((r) => r.zellen));
  if (zellen.size !== 1) throw new Error(`Zellenzahl schwankt (${[...zellen].join(", ")}) — die Raster sind nicht deckungsgleich`);

  const heute = new Date().toISOString().slice(0, 10);
  const datei = `// AUTO-generiert aus den DWD-Jahresrastern der Globalstrahlung (CC BY 4.0) —
// erzeugt von scripts/dwd-strahlung-sync.ts, nicht von Hand pflegen.
//
// Gebietsmittel Deutschland je Kalenderjahr, kWh/m² auf die horizontale Ebene:
// ungewichtetes Mittel aller ${[...zellen][0].toLocaleString("de-DE")} belegten 1-km-Zellen des Rasters
// (unsere Ableitung — der DWD liefert das Raster, nicht den Mittelwert).
// Quelle: DWD Climate Data Center (CDC), Rasterdaten der Jahressumme für die
// Globalstrahlung auf die horizontale Ebene für Deutschland basierend auf
// Boden- und Satellitenmessungen, Version V003. Unsicherheit der Rasterwerte
// laut DWD ±6 %; Satelliten-Eingangsdaten ab 2015 aus CM SAF, ab 2018 neue
// Version — die Reihe ist laut Datensatzbeschreibung durchgängig mit einer
// Methode erstellt.
//
// Wofür: das „Wetterjahr" im Stromkosten-Rennen (lib/kostenrennen-varianten.ts)
// — wie stark ein gutes Solarjahr über einem schlechten liegt. Nur RELATIV zu
// verwenden (Jahr ÷ Mittel eines Zeitraums): Welche Strahlung unserem
// Referenzertrag von 1.050 kWh/kWp entspricht, ist damit NICHT belegt.

export const STRAHLUNG_META = {
  quelle: "DWD Climate Data Center (CDC), Jahresraster Globalstrahlung V003",
  einheit: "kWh/m²",
  erzeugt: "${heute}",
  ersteJahr: ${reihe[0].jahr},
  letztesJahr: ${reihe[reihe.length - 1].jahr},
} as const;

export const STRAHLUNG_JAHRE: { jahr: number; kwhM2: number }[] = [
${reihe.map((r) => `  { jahr: ${r.jahr}, kwhM2: ${r.kwhM2} },`).join("\n")}
];

/** Gebietsmittel eines Jahres oder undefined, wenn es nicht in der Reihe steht. */
export function strahlungImJahr(jahr: number): number | undefined {
  return STRAHLUNG_JAHRE.find((r) => r.jahr === jahr)?.kwhM2;
}
`;
  if (trocken) { console.log("(trocken — nichts geschrieben)"); return; }
  writeFileSync(ZIEL, datei);
  console.log(`geschrieben: ${ZIEL} (${reihe[0].jahr}–${reihe[reihe.length - 1].jahr})`);
}

if (process.argv[1] && /dwd-strahlung-sync/.test(process.argv[1])) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
