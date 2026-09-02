/**
 * Wohnungsbestand je Gemeinde aus dem Zensus 2022.
 *
 * Holt die Regionaltabelle "Gebäude und Wohnungen" des Statistischen
 * Bundesamts und legt je Gemeinde ab, wie viele Wohnungen es dort gibt und in
 * welchen Gebäudegrößen sie liegen.
 *
 * WOFÜR: Das Anlagenregister kennt Anlagen, nicht Gebäude. Ohne den Nenner
 * "wie viele Dächer gibt es überhaupt" lässt sich nicht unterscheiden, ob in
 * einer Gemeinde wenig gebaut wird oder ob dort schlicht kaum jemand ein
 * eigenes Dach hat. Das ist der Kern der Mehrfamilienhaus-Geschichte: Auf
 * Gebäuden mit vielen Wohnungen steht praktisch nichts, und in einer Stadt
 * liegt die Mehrheit der Wohnungen genau dort.
 *
 * LIZENZ: dl-de/by-2-0 (Datenlizenz Deutschland Namensnennung 2.0) — dieselbe
 * offene Behördenlizenz wie beim Anlagenregister. Sie verlangt die
 * Quellenangabe, sonst nichts.
 *
 *   npx tsx scripts/zensus-wohnungen-import.ts            # laden und schreiben
 *   npx tsx scripts/zensus-wohnungen-import.ts --trocken  # nur rechnen
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(SCRIPT_DIR, ".cache", "zensus");
const QUELLE =
  "https://www.destatis.de/static/DE/zensus/gitterdaten/Regionaltabelle_Gebaeude_Wohnungen.xlsx";
const STICHTAG = "2022-05-15";

/**
 * Die fünf Größenklassen der Quelle, in der Reihenfolge, in der sie dort
 * stehen. Die Spalten heißen dort ZAHLWOHNGN_HHG__1 bis __5.
 */
const KLASSEN = ["w_1", "w_2", "w_3_6", "w_7_12", "w_13plus"] as const;

type Zeile = {
  region_id: string;
  stichtag: string;
  wohnungen: number;
  w_1: number;
  w_2: number;
  w_3_6: number;
  w_7_12: number;
  w_13plus: number;
};

/**
 * Der amtliche Regionalschlüssel der Quelle ist ZWÖLFSTELLIG, unserer
 * ACHTSTELLIG — und die Umrechnung ist kein Abschneiden.
 *
 * Zwölf Stellen: Land(2) Regierungsbezirk(1) Kreis(2) Verbandsgemeinde(4)
 * Gemeinde(3). Acht Stellen lassen die Verbandsgemeinde weg. Wer stattdessen
 * die ersten acht Zeichen nimmt, bekommt einen gültig aussehenden Schlüssel,
 * der auf einen ganz anderen Ort zeigt — genau die Fehlerklasse, gegen die es
 * den täglichen Melderegister-Abgleich gibt.
 */
function arsZuAgs(ars: string): string | null {
  const s = ars.trim();
  if (s.length !== 12 || !/^\d+$/.test(s)) return null;
  return s.slice(0, 5) + s.slice(9, 12);
}

function zahl(v: unknown): number {
  if (typeof v === "number") return Math.round(v);
  const s = String(v ?? "").trim();
  if (!s || s === "-" || s === ".") return 0;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * Das Tabellenblatt als Zeilen. Statt eine Tabellenbibliothek in die
 * Abhängigkeiten zu holen, geht das über das Python, das auf dieser Maschine
 * ohnehin läuft — der Import ist ein einmaliger Lauf, kein Teil der Anwendung.
 */
function leseBlatt(pfad: string, blatt: string): string[][] {
  const py = `
import json, sys, openpyxl
wb = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)
ws = wb[sys.argv[2]]
out = []
for row in ws.iter_rows(values_only=True):
    out.append(["" if v is None else str(v) for v in row])
json.dump(out, sys.stdout)
`;
  const roh = execFileSync("python3", ["-c", py, pfad, blatt], {
    maxBuffer: 512 * 1024 * 1024,
    encoding: "utf8",
  });
  return JSON.parse(roh) as string[][];
}

async function laden(): Promise<string> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const ziel = resolve(CACHE_DIR, "Regionaltabelle_Gebaeude_Wohnungen.xlsx");
  if (existsSync(ziel)) {
    console.log(`Aus dem Zwischenspeicher: ${ziel}`);
    return ziel;
  }
  console.log(`Lade ${QUELLE} …`);
  const res = await fetch(QUELLE);
  if (!res.ok) throw new Error(`Abruf fehlgeschlagen: ${res.status}`);
  writeFileSync(ziel, Buffer.from(await res.arrayBuffer()));
  console.log(`Abgelegt: ${ziel}`);
  return ziel;
}

function zeilenAus(tabelle: string[][]): Zeile[] {
  const kopf = tabelle[0].map((h) => h.trim());
  const spalte = (name: string) => {
    const i = kopf.indexOf(name);
    if (i < 0) throw new Error(`Spalte fehlt: ${name} (Kopf: ${kopf.slice(0, 12).join(", ")})`);
    return i;
  };
  const iAgs = spalte("_RS");
  const iEbene = spalte("Regionalebene");
  const iGesamt = spalte("GEBAEUDEART_SYS_1");
  const iKlassen = KLASSEN.map((_, n) => spalte(`ZAHLWOHNGN_HHG__${n + 1}`));

  const zeilen: Zeile[] = [];
  for (const r of tabelle.slice(1)) {
    // Die Tabelle mischt alle Ebenen. Nur die Gemeindezeilen tragen einen
    // zwölfstelligen Schlüssel; Bund, Länder und Kreise stehen daneben und
    // würden sich beim Abschneiden in gültige Gemeindeschlüssel verwandeln.
    if (r[iEbene]?.trim() !== "Gemeinde") continue;
    const ags = arsZuAgs(r[iAgs] ?? "");
    if (!ags) continue;
    const werte = iKlassen.map((i) => zahl(r[i]));
    zeilen.push({
      region_id: ags,
      stichtag: STICHTAG,
      wohnungen: zahl(r[iGesamt]),
      w_1: werte[0],
      w_2: werte[1],
      w_3_6: werte[2],
      w_7_12: werte[3],
      w_13plus: werte[4],
    });
  }
  return zeilen;
}

async function main() {
  const trocken = process.argv.includes("--trocken");
  const pfad = await laden();
  const zeilen = zeilenAus(leseBlatt(pfad, "CSV-Wohnungen"));

  // GEGENPROBE GEGEN DIE QUELLE SELBST: Die Summe über alle Gemeinden muss die
  // Bundeszahl treffen. Trifft sie sie nicht, stimmt die Spaltenzuordnung nicht
  // — und das sieht man einer plausibel aussehenden Gemeindezahl nicht an.
  const summe = zeilen.reduce((n, z) => n + z.wohnungen, 0);
  const klassenSumme = zeilen.reduce(
    (n, z) => n + z.w_1 + z.w_2 + z.w_3_6 + z.w_7_12 + z.w_13plus,
    0,
  );
  console.log(`${zeilen.length.toLocaleString("de-DE")} Gemeinden`);
  console.log(`  Wohnungen gesamt:        ${summe.toLocaleString("de-DE")}`);
  console.log(`  Summe der Größenklassen: ${klassenSumme.toLocaleString("de-DE")}`);
  const abweichung = Math.abs(summe - klassenSumme) / Math.max(1, summe);
  if (abweichung > 0.01) {
    throw new Error(
      `Größenklassen ergeben nicht die Gesamtzahl (${(abweichung * 100).toFixed(2)} % Abweichung) — Spaltenzuordnung prüfen.`,
    );
  }

  if (trocken) {
    console.log("Trockenlauf, nichts geschrieben.");
    console.log(JSON.stringify(zeilen.slice(0, 3), null, 2));
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Datenbank-Zugang fehlt");
  const db = createClient(url, key, { auth: { persistSession: false } });

  let geschrieben = 0;
  for (let i = 0; i < zeilen.length; i += 500) {
    const teil = zeilen.slice(i, i + 500);
    const { error } = await db.from("zensus_wohnungen").upsert(teil, { onConflict: "region_id" });
    if (error) throw new Error(`Schreiben fehlgeschlagen: ${error.message}`);
    geschrieben += teil.length;
    process.stderr.write(`\r  ${geschrieben.toLocaleString("de-DE")} geschrieben`);
  }
  process.stderr.write("\n");
  console.log("Fertig.");
}

main().catch((err) => {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
});
