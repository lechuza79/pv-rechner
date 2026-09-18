/**
 * Destatis territorial changes → lib/ags-nachfolger-daten.json.
 *
 * The plant register keeps outdated Gemeindeschlüssel; both MaStR importers map
 * them to today's key through lib/ags-nachfolger.ts. This script produces the
 * mapping from the official yearly lists ("Namens-, Grenz- und
 * Schlüsselnummernänderungen bei Gemeinden") plus the running list of the
 * current year, whose file name carries the month (2026-09.xlsx) and is
 * therefore read from the overview page, not guessed.
 *
 *   npm run destatis:gebietsaenderungen            # download, build, write JSON
 *   npm run destatis:gebietsaenderungen -- --trocken  # build and report only
 *
 * Needs python3 with openpyxl (same as the Zensus import) — a one-off local run,
 * not part of the app or the monthly import.
 *
 * Source: Statistisches Bundesamt (Destatis), Gemeindeverzeichnis. Same terms
 * as the GV100AD in destatis-gemeinden.ts: reproduction with source reference.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { nachfolgerAusAenderungen, type Gebietsaenderung } from "../lib/ags-nachfolger";
import { jahrInBerlin } from "../lib/zeit";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ZIEL = resolve(SCRIPT_DIR, "../lib/ags-nachfolger-daten.json");
const CACHE_DIR = resolve(SCRIPT_DIR, ".cache/destatis-gebietsaenderungen");

const BASIS = "https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Namens-Grenz-Aenderung";
const UEBERSICHT = `${BASIS}/namens-grenz-aenderung.html`;
/**
 * First year that matters: the register's bulk export starts in 2019, but units
 * keep the key they were registered under years earlier (EEG plants since 2000
 * were migrated with their old keys). 2008 is the oldest list Destatis offers
 * as a spreadsheet; 2009 is published only as HTML and is skipped with a note.
 */
const ERSTES_JAHR = 2008;
const UA = "Mozilla/5.0 (compatible; solar-check.io data import)";

async function laden(name: string): Promise<string | null> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const ziel = resolve(CACHE_DIR, `${name}.xlsx`);
  const res = await fetch(`${BASIS}/${name}.xlsx?__blob=publicationFile`, { headers: { "User-Agent": UA } });
  const typ = res.headers.get("content-type") ?? "";
  if (!res.ok || !typ.includes("spreadsheetml")) return null;
  writeFileSync(ziel, Buffer.from(await res.arrayBuffer()));
  return ziel;
}

/** The running list of the current year, e.g. "2026-09" — its name comes from the overview page. */
async function laufendeListe(jahr: number): Promise<string | null> {
  const res = await fetch(UEBERSICHT, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Übersichtsseite nicht erreichbar: HTTP ${res.status}`);
  const html = await res.text();
  const treffer = [...html.matchAll(new RegExp(`Namens-Grenz-Aenderung/(${jahr}-\\d{2})\\.html`, "g"))].map((m) => m[1]);
  return treffer.sort().at(-1) ?? null;
}

function datum(v: string): string {
  // "01.01.2026" or "2026-01-01 00:00:00" (the older lists store real dates)
  const de = v.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (de) return `${de[3]}-${de[2]}-${de[1]}`;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  return "";
}

function zahl(v: string): number {
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function zeilen(pfad: string): Gebietsaenderung[] {
  const py = `
import json, sys, openpyxl
wb = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)
ws = wb[wb.sheetnames[-1]]
out = []
for row in ws.iter_rows(values_only=True):
    out.append(["" if v is None else str(v) for v in row][:13])
json.dump(out, sys.stdout)
`;
  const roh = JSON.parse(execFileSync("python3", ["-c", py, pfad], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 })) as string[][];
  // Column layout is stable across 2008–2026 (checked by hand on 2008, 2019, 2025, 2026-09):
  // 0 Kennziffer · 1 Regionaleinheit · 3 AGS alt · 5 Änderungsart · 6 Fläche qm ·
  // 7 Einwohner · 9 AGS neu · 12 statistisch wirksam
  const out: Gebietsaenderung[] = [];
  for (const r of roh) {
    if ((r[1] ?? "").trim() !== "Gemeinde") continue;
    const seit = datum((r[12] || r[11] || "").trim());
    if (!seit) continue;
    out.push({
      kennziffer: (r[0] ?? "").trim(),
      alt: (r[3] ?? "").trim(),
      neu: (r[9] ?? "").trim(),
      art: (r[5] ?? "").trim(),
      flaecheQm: zahl(r[6] ?? "0"),
      einwohner: zahl(r[7] ?? "0"),
      seit,
    });
  }
  return out;
}

async function main() {
  const trocken = process.argv.includes("--trocken");
  const jahrJetzt = jahrInBerlin();
  const namen: string[] = [];
  for (let j = ERSTES_JAHR; j < jahrJetzt; j++) namen.push(String(j));
  const laufend = await laufendeListe(jahrJetzt);
  if (laufend) namen.push(laufend);
  else console.log(`Keine laufende Liste für ${jahrJetzt} gefunden — nur abgeschlossene Jahre.`);

  const alle: Gebietsaenderung[] = [];
  const fehlend: string[] = [];
  for (const name of namen) {
    const pfad = await laden(name);
    if (!pfad || !existsSync(pfad)) {
      fehlend.push(name);
      continue;
    }
    const z = zeilen(pfad);
    alle.push(...z);
    console.log(`${name}: ${z.length} Gemeinde-Zeilen`);
  }
  if (fehlend.length) console.log(`Nicht als Tabelle verfügbar: ${fehlend.join(", ")}`);
  // A list that suddenly parses to nothing is a changed layout, not a quiet year.
  if (alle.length < 1000) throw new Error(`Nur ${alle.length} Zeilen gelesen — hat sich das Tabellenformat geändert?`);

  const nachfolger = nachfolgerAusAenderungen(alle);
  const anzahl = Object.keys(nachfolger).length;
  const aufgeteilt = Object.values(nachfolger).filter((n) => n.aufgeteilt).length;
  console.log(`${anzahl} alte Schlüssel mit Nachfolger, davon ${aufgeteilt} aufgeteilt.`);

  if (trocken) return;
  const sortiert = Object.fromEntries(Object.entries(nachfolger).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    ZIEL,
    JSON.stringify(
      {
        _hinweis: "Generated by scripts/destatis-gebietsaenderungen.ts from the Destatis lists of territorial changes. Do not edit by hand.",
        quellen: namen.filter((n) => !fehlend.includes(n)),
        nachfolger: sortiert,
      },
      null,
      1,
    ) + "\n",
  );
  console.log(`Geschrieben: ${ZIEL}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
