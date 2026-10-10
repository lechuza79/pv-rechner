/**
 * Holt den Schweizer Anlagenbestand und legt ihn in dieselben Tabellen wie den
 * deutschen — Regionen, Aggregate je Gemeinde, Zugehörigkeit, Rollup.
 *
 *   npx tsx scripts/ch-import.ts --trocken   # nur messen, nichts schreiben
 *   npx tsx scripts/ch-import.ts --schreiben
 *
 * WAS DER LAUF BRAUCHT: Register (19 MB), Gemeindeverzeichnis (135 kB) und
 * Gemeindegrenzen samt Einwohnerzahl (37 MB). Das vollständige Gebäuderegister
 * (1,5 GB über 26 Kantone) ist BEWUSST nicht dabei — es ist das Prüfmittel der
 * Zuordnung, nicht ihre Quelle; die Begründung samt Messung steht in
 * `lib/ch-register.ts`.
 *
 * ER SCHALTET NICHTS FREI. Schweizer Ortsseiten entstehen nicht dadurch, dass
 * Daten da sind — die Freigabe einer Seitengattung ist eine eigene Entscheidung
 * mit eigenem Nachweis (siehe „Zwei Fragen vor jedem Livegang"). Der Lauf füllt
 * nur die Zahlen.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  CH_LUECKEN,
  CH_MARKT_WURZEL,
  CH_QUELLEN,
  CH_SEGMENTE,
  CH_TRAEGER,
  chBezirkSchluessel,
  chElternSchluessel,
  chGemeindeSchluessel,
  chKantonSchluessel,
} from "../lib/ch-register";
import { FlaechenIndex, flaechenAusGpkg } from "../lib/gpkg-punkt";
import { rollupSchrittweise } from "../lib/mastr-rollup-sql";

const SCHREIBEN = process.argv.includes("--schreiben");
const ARBEIT = resolve(process.env.CH_ARBEIT ?? "/tmp/ch-import");

function hole(url: string, ziel: string): string {
  const pfad = resolve(ARBEIT, ziel);
  if (existsSync(pfad)) return pfad;
  mkdirSync(ARBEIT, { recursive: true });
  execFileSync("curl", ["-sS", "-f", "-o", pfad, url], { stdio: ["ignore", "inherit", "inherit"] });
  return pfad;
}

/** Zeilen einer CSV mit Kopfzeile; Trennzeichen wird am Kopf erkannt. */
function csv(pfad: string): Array<Record<string, string>> {
  const text = readFileSync(pfad, "utf8").replace(/^﻿/, "");
  const zeilen = text.split(/\r?\n/).filter((z) => z.length > 0);
  const trenn = (zeilen[0].match(/;/g)?.length ?? 0) > (zeilen[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const kopf = zerlege(zeilen[0], trenn);
  return zeilen.slice(1).map((z) => {
    const w = zerlege(z, trenn);
    const o: Record<string, string> = {};
    kopf.forEach((k, i) => (o[k] = w[i] ?? ""));
    return o;
  });
}

/** Ein Feld kann in Anführungszeichen stehen und das Trennzeichen enthalten. */
function zerlege(zeile: string, trenn: string): string[] {
  const out: string[] = [];
  let feld = "";
  let inAnf = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (c === '"') {
      if (inAnf && zeile[i + 1] === '"') {
        feld += '"';
        i++;
      } else inAnf = !inAnf;
    } else if (c === trenn && !inAnf) {
      out.push(feld);
      feld = "";
    } else feld += c;
  }
  out.push(feld);
  return out;
}

/**
 * LV95 → WGS84, die amtliche Näherungsformel von swisstopo.
 *
 * Sie trifft auf etwa einen Meter — für den Kartenmittelpunkt einer Gemeinde
 * weit mehr als genug. Die strenge Umrechnung bräuchte ein Geoidmodell; wer
 * damit Punkte am Gebäude verorten will, nimmt sie nicht.
 */
export function lv95NachWgs84(e: number, n: number): { lat: number; lon: number } {
  const y = (e - 2_600_000) / 1_000_000;
  const x = (n - 1_200_000) / 1_000_000;
  const lon =
    2.6779094 + 4.728982 * y + 0.791484 * y * x + 0.1306 * y * x * x - 0.0436 * y * y * y;
  const lat =
    16.9023892 + 3.238272 * x - 0.270978 * y * y - 0.002528 * x * x - 0.0447 * y * y * x - 0.014 * x * x * x;
  return { lat: (lat * 100) / 36, lon: (lon * 100) / 36 };
}

/** Aus einem Ortsnamen eine Adresse machen — ohne Umlaut-Reste und Akzente. */
export function chSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/̈/g, "e") // Umlautpunkte: ü -> ue
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Region = {
  region_id: string;
  level: "de" | "bundesland" | "landkreis" | "gemeinde";
  parent_region_id: string | null;
  name: string;
  slug: string | null;
  population: number | null;
  centroid_lat: number | null;
  centroid_lon: number | null;
};

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL und SUPABASE_SERVICE_KEY fehlen.");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const sql = async (text: string) => {
    const { error } = await db.rpc("exec_sql", { sql: text });
    if (error) throw new Error(error.message);
  };

  // ── 1. Verzeichnis: die Hierarchie, ausgeschrieben ────────────────────────
  console.log("Gemeindeverzeichnis …");
  const heute = new Date();
  const datum = `${String(heute.getDate()).padStart(2, "0")}-${String(heute.getMonth() + 1).padStart(2, "0")}-${heute.getFullYear()}`;
  const verz = csv(hole(CH_QUELLEN.verzeichnis + datum, "verzeichnis.csv")).filter((r) => !r["ValidTo"]);
  // Die historische Kennung ist nur INNERHALB einer Ebene eindeutig (11 Kollisionen
  // gemessen) — nachgeschlagen wird deshalb mit Kennung UND Zielebene.
  const nachKennung = new Map<string, Record<string, string>>();
  for (const r of verz) nachKennung.set(chElternSchluessel(r["HistoricalCode"], r["Level"] as "1" | "2"), r);
  const kantone = verz.filter((r) => r["Level"] === "1");
  const bezirke = verz.filter((r) => r["Level"] === "2");
  const gemeinden = verz.filter((r) => r["Level"] === "3");
  console.log(`  ${kantone.length} Kantone · ${bezirke.length} Bezirke · ${gemeinden.length} Gemeinden`);
  if (kantone.length !== 26) throw new Error(`Verzeichnis liefert ${kantone.length} Kantone statt 26 — Lauf abgebrochen.`);

  // ── 2. Grenzen: Einwohner, Mittelpunkt und die Zuordnung der Koordinaten ──
  console.log("Gemeindegrenzen …");
  const gpkgZip = hole(CH_QUELLEN.grenzen, "grenzen.zip");
  execFileSync("unzip", ["-o", "-q", gpkgZip, "-d", ARBEIT]);
  const gpkg = resolve(
    ARBEIT,
    readdirSync(ARBEIT).find((f) => f.endsWith(".gpkg")) ?? (() => { throw new Error("kein GeoPackage im Archiv"); })(),
  );
  const flaechen = flaechenAusGpkg(gpkg, {
    tabelle: "tlm_hoheitsgebiet",
    idSpalte: "bfs_nummer",
    nameSpalte: "name",
    wo: "objektart='Gemeindegebiet'",
  });
  const index = new FlaechenIndex(flaechen);
  console.log(`  ${flaechen.length} Teilflächen`);

  const einwohner = new Map<string, number>();
  for (const zeile of execFileSync(
    "sqlite3",
    ["-separator", "\u0001", gpkg,
     "SELECT bfs_nummer, einwohnerzahl FROM tlm_hoheitsgebiet WHERE objektart='Gemeindegebiet';"],
    { encoding: "utf8", maxBuffer: 1 << 28 },
  ).split("\n")) {
    if (!zeile) continue;
    const [bfs, ew] = zeile.split("\u0001");
    if (ew && Number(ew) > 0) einwohner.set(bfs, Number(ew));
  }
  // Der Mittelpunkt kommt aus den gelesenen Rahmen, nicht aus einer SQL-Funktion:
  // Die Rahmen-Funktionen des GeoPackage-Standards (MinX, MaxX) gehören zu
  // SpatiaLite und fehlen in einem gewöhnlichen sqlite3 — gemessen, der Lauf
  // bricht dort mit „no such function" ab. Bei mehreren Teilflächen gewinnt die
  // GRÖSSTE: Eine Gemeinde mit einer Exklave hätte sonst ihren Mittelpunkt
  // irgendwo zwischen beiden, also außerhalb von sich selbst.
  const mittel = new Map<string, { lat: number; lon: number }>();
  const groesse = new Map<string, number>();
  for (const f of flaechen) {
    const a = (f.maxX - f.minX) * (f.maxY - f.minY);
    if (a <= (groesse.get(f.id) ?? -1)) continue;
    groesse.set(f.id, a);
    mittel.set(f.id, lv95NachWgs84((f.minX + f.maxX) / 2, (f.minY + f.maxY) / 2));
  }
  console.log(`  Einwohner für ${einwohner.size} Gemeinden, Summe ${[...einwohner.values()].reduce((a, b) => a + b, 0).toLocaleString("de-DE")}`);

  // ── 3. Register: Anlagen, über die Koordinate zugeordnet ──────────────────
  console.log("Anlagenregister …");
  const regZip = hole(CH_QUELLEN.register, "register.zip");
  execFileSync("unzip", ["-o", "-q", regZip, "-d", ARBEIT]);
  const anlagen = csv(resolve(ARBEIT, "ElectricityProductionPlant.csv"));
  console.log(`  ${anlagen.length} Anlagen`);

  type Zelle = { count: number; kwp: number };
  const zellen = new Map<string, Zelle>();
  const stat = { zugeordnet: 0, ohneKoordinate: 0, ausserhalb: 0, fremderTraeger: 0 };
  for (const a of anlagen) {
    const traeger = CH_TRAEGER[a["SubCategory"]];
    if (!traeger) {
      stat.fremderTraeger++;
      continue;
    }
    const x = Number(a["_x"]);
    const y = Number(a["_y"]);
    if (!a["_x"] || !a["_y"] || !Number.isFinite(x) || !Number.isFinite(y)) {
      stat.ohneKoordinate++;
      continue;
    }
    const bfs = index.finde(x, y);
    if (!bfs) {
      stat.ausserhalb++;
      continue;
    }
    stat.zugeordnet++;
    const jahr = Number(a["BeginningOfOperation"].slice(0, 4));
    const segment = CH_SEGMENTE[a["PlantCategory"]] ?? "ohne_angabe";
    const k = `${chGemeindeSchluessel(bfs)}|${traeger}|${segment}|${jahr}`;
    const z = zellen.get(k) ?? { count: 0, kwp: 0 };
    z.count += 1;
    z.kwp += Number(a["TotalPower"] || 0);
    zellen.set(k, z);
  }
  const n = stat.zugeordnet + stat.ohneKoordinate + stat.ausserhalb;
  console.log(`  zugeordnet ${stat.zugeordnet} (${((stat.zugeordnet / n) * 100).toFixed(2)} %)`);
  console.log(`  ohne Koordinate ${stat.ohneKoordinate} · außerhalb jeder Gemeinde ${stat.ausserhalb}`);
  console.log(`  andere Energieträger (nicht übernommen) ${stat.fremderTraeger}`);
  console.log(`  Zellen (Gemeinde × Träger × Segment × Jahr): ${zellen.size}`);

  // Die Lücken, die bleiben — gezählt und benannt, nie geschätzt.
  for (const l of CH_LUECKEN) console.log(`  FEHLT: ${l.was} — ${l.befund.split(".")[0]}.`);

  // ── 4. Regionen bauen ─────────────────────────────────────────────────────
  const regionen: Region[] = [
    {
      region_id: CH_MARKT_WURZEL,
      level: "de",
      parent_region_id: null,
      name: "Schweiz",
      slug: null,
      population: [...einwohner.values()].reduce((a, b) => a + b, 0),
      centroid_lat: null,
      centroid_lon: null,
    },
  ];
  for (const k of kantone) {
    regionen.push({
      region_id: chKantonSchluessel(k["BfsCode"]),
      level: "bundesland",
      parent_region_id: CH_MARKT_WURZEL,
      name: k["Name"],
      slug: chSlug(k["Name"]),
      population: null,
      centroid_lat: null,
      centroid_lon: null,
    });
  }
  for (const b of bezirke) {
    const kanton = nachKennung.get(chElternSchluessel(b["Parent"], "1"));
    if (!kanton) throw new Error(`Bezirk ${b["BfsCode"]} ${b["Name"]}: Kanton nicht auflösbar`);
    regionen.push({
      region_id: chBezirkSchluessel(b["BfsCode"]),
      level: "landkreis",
      parent_region_id: chKantonSchluessel(kanton["BfsCode"]),
      name: b["Name"],
      slug: chSlug(b["Name"]),
      population: null,
      centroid_lat: null,
      centroid_lon: null,
    });
  }
  for (const g of gemeinden) {
    const bez = nachKennung.get(chElternSchluessel(g["Parent"], "2"));
    if (!bez) throw new Error(`Gemeinde ${g["BfsCode"]} ${g["Name"]}: Bezirk nicht auflösbar`);
    const m = mittel.get(g["BfsCode"]);
    regionen.push({
      region_id: chGemeindeSchluessel(g["BfsCode"]),
      level: "gemeinde",
      parent_region_id: chBezirkSchluessel(bez["BfsCode"]),
      name: g["Name"],
      slug: chSlug(g["Name"]),
      population: einwohner.get(g["BfsCode"]) ?? null,
      centroid_lat: m?.lat ?? null,
      centroid_lon: m?.lon ?? null,
    });
  }
  console.log(`\nRegionen: ${regionen.length} (1 Land, ${kantone.length} Kantone, ${bezirke.length} Bezirke, ${gemeinden.length} Gemeinden)`);

  // Jede Zelle muss eine Region haben, sonst greift der Fremdschlüssel nicht.
  const bekannt = new Set(regionen.map((r) => r.region_id));
  const fehlend = [...new Set([...zellen.keys()].map((k) => k.split("|")[0]))].filter((g) => !bekannt.has(g));
  if (fehlend.length > 0) {
    throw new Error(
      `${fehlend.length} Gemeinden aus den Grenzen fehlen im Verzeichnis (z. B. ${fehlend.slice(0, 5).join(", ")}) — ` +
        `das sind Seeflächen oder Kommunanzen mit eigener Nummer. Sie gehören in die Landessumme, nicht auf eine Ortsseite.`,
    );
  }

  if (!SCHREIBEN) {
    console.log("\n--trocken: nichts geschrieben. Mit --schreiben wird übernommen.");
    return;
  }

  // ── 5. Schreiben ──────────────────────────────────────────────────────────
  // Erst die Regionen (der Fremdschlüssel der Aggregate zeigt darauf), dann die
  // Zahlen, dann Zugehörigkeit und Rollup. Gelöscht wird je Markt über das
  // Schlüssel-Präfix: Ein TRUNCATE nähme Deutschland mit.
  console.log("\nSchreibe Regionen …");
  await schreibeStapel(db, "mastr_regions", regionen, "region_id");
  console.log("Schreibe Anlagenzahlen …");
  await sql(`DELETE FROM mastr_aggregates_gem WHERE region_id LIKE 'ch%';`);
  const zeilen = [...zellen.entries()].map(([k, z]) => {
    const [region_id, energietraeger, segment, year] = k.split("|");
    return { region_id, energietraeger, segment, year: Number(year), count: z.count, kwp: Math.round(z.kwp * 100) / 100, kwh: 0 };
  });
  await schreibeStapel(db, "mastr_aggregates_gem", zeilen, "region_id,energietraeger,segment,year");
  console.log("Baue Zugehörigkeit und Rollup neu …");
  // Schrittweise, weil das Zeitlimit der Rolle acht Sekunden sind und sich von
  // innen nicht aufheben lässt (siehe Kopf von lib/mastr-rollup-sql.ts).
  const { data: tr } = await db.from("mastr_aggregates_gem").select("energietraeger").limit(100_000);
  const traegerListe = [...new Set((tr ?? []).map((r) => (r as { energietraeger: string }).energietraeger))].sort();
  await rollupSchrittweise((fn, args) => db.rpc(fn, args ?? {}), traegerListe);
  const { count } = await db.from("mastr_region_mitglied").select("*", { count: "exact", head: true });
  console.log(`  Mitgliederzeilen jetzt: ${count}`);
  console.log("Fertig.");
}

/**
 * Stapelweise schreiben — und ALLE Zeilen eines Stapels tragen dieselben
 * Felder.
 *
 * Wo die Feldmengen ungleich sind, baut PostgREST EINE Spaltenliste und setzt
 * bei den übrigen Zeilen NULL ein; das hat in diesem Projekt schon einmal
 * 500 Zeilen überschrieben, ohne Fehler und ohne Warnung. Hier sind die Felder
 * durch die Konstruktion gleich, und der Stapel bleibt klein genug für eine
 * Anfrage.
 */
async function schreibeStapel(
  db: SupabaseClient,
  tabelle: string,
  zeilen: Array<Record<string, unknown>>,
  konflikt: string,
): Promise<void> {
  const STAPEL = 500;
  for (let i = 0; i < zeilen.length; i += STAPEL) {
    const teil = zeilen.slice(i, i + STAPEL);
    const { error } = await db.from(tabelle).upsert(teil, { onConflict: konflikt });
    if (error) throw new Error(`${tabelle} (Zeile ${i}): ${error.message}`);
  }
  console.log(`  ${zeilen.length} Zeilen in ${tabelle}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
