/**
 * Seiten-Wächter je EINZELNER Förderseite — nicht mehr eine je Gemeinde.
 *
 *   npm run foerder:seiten-alle                 # alle bekannten Seiten abgleichen
 *   npm run foerder:seiten-alle -- --limit 500
 *   npm run foerder:seiten-alle -- --dry        # nur messen, nichts schreiben
 *
 * WARUM (19.08.2026): Der Betreiber verlangt, dass der Status jeder Förderseite
 * aktuell ist — je Technik, für Photovoltaik, Wärmepumpe und Balkonkraftwerk.
 * Der bisherige Abgleich (`funding-coverage-watch`) konnte das nicht leisten,
 * weil seine Tabelle je Gemeinde nur EINE Adresse kennt: Eine Stadt mit
 * getrennter Photovoltaik- und Balkonseite bekam eine davon geprüft und die
 * andere nie. „Status ist aktuell" stimmte damit immer nur für eine Seite pro
 * Ort — eine Aussage, die genau dort bricht, wo sie gebraucht wird.
 *
 * Er erfindet nichts Neues: derselbe Fingerabdruck wie bei den geführten
 * Programmen (`lib/funding-fingerprint.ts`), dieselbe Trennung zwischen „hat
 * sich bewegt" und „kam nicht durch". Neu ist allein, dass der Schlüssel
 * (Gemeinde × Adresse) heißt statt nur Gemeinde.
 *
 * DER ZUSTAND WIRD MITGESCHRIEBEN, und das ist der zweite Zweck: Eine Seite, die
 * nicht mehr antwortet, ist kein stiller Ausfall, sondern ein Befund. Ohne dieses
 * Feld stünde eine tote Adresse unbegrenzt als gültige Fundstelle im Bestand und
 * niemand käme je darauf, sie zu ersetzen.
 *
 * WAS ER NICHT LEISTET — dieselbe Grenze wie bei seinen Geschwistern: Er weiß,
 * DASS sich etwas bewegt hat, nie WAS. Das Einordnen macht das Screening, das
 * Lesen ein Mensch. Ein grüner Lauf heißt „nichts hat sich bewegt", nicht
 * „alles ist korrekt".
 */

import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { fingerprintOf, markiert } from "../lib/funding-fingerprint";
import { inSchueben } from "../lib/lauf-parallel";

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen.");
  process.exit(1);
}
const sb = createClient(url, key);

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

const dry = process.argv.includes("--dry");

function zahl(name: string, standard: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return standard;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? n : standard;
}

type Zeile = {
  region_id: string;
  url: string;
  fingerprint: string | null;
  seite_gesehen_am: string | null;
  zustand: string | null;
};

async function alleZeilen<T>(tabelle: string, spalten: string): Promise<T[]> {
  const raus: T[] = [];
  for (let von = 0; ; von += 1000) {
    const { data, error } = await sb.from(tabelle).select(spalten).range(von, von + 999);
    if (error) throw new Error(`${tabelle}: ${error.message}`);
    if (!data || data.length === 0) break;
    raus.push(...(data as T[]));
    if (data.length < 1000) break;
  }
  return raus;
}

async function main(): Promise<void> {
  const limit = zahl("limit", 3000);
  const zeilen = await alleZeilen<Zeile>(
    "funding_seiten",
    "region_id, url, fingerprint, seite_gesehen_am, zustand",
  );

  // Am längsten nicht gesehene zuerst — so kommt jede Seite reihum dran, auch
  // wenn der Schub kleiner ist als der Bestand.
  const dran = zeilen
    .sort((a, b) => (a.seite_gesehen_am ?? "").localeCompare(b.seite_gesehen_am ?? ""))
    .slice(0, limit);

  const jeGemeinde = new Set(zeilen.map((z) => z.region_id));
  console.log(
    `${zeilen.length} Förderseiten in ${jeGemeinde.size} Gemeinden bekannt, ich gleiche ${dran.length} ab.` +
      (dry ? " (Trockenlauf)" : "") + "\n",
  );

  let geaendert = 0, unveraendert = 0, unerreichbar = 0, neu = 0, wiederDa = 0;
  const bewegt: string[] = [];
  const jetzt = new Date().toISOString();

  const schreibe = async (z: Zeile, felder: Record<string, unknown>) => {
    if (dry) return;
    const { error } = await sb
      .from("funding_seiten")
      .update(felder)
      .eq("region_id", z.region_id)
      .eq("url", z.url);
    if (error) console.error(`  Schreiben ${z.region_id} ${z.url}: ${error.message}`);
  };

  await inSchueben(dran, zahl("gleichzeitig", 8), async (z) => {
    let html: string | null = null;
    try {
      const res = await fetch(z.url.startsWith("http") ? z.url : `https://${z.url}`, {
        headers: { "User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9" },
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) html = await res.text();
    } catch {
      /* unerreichbar */
    }

    if (!html) {
      // Ein gescheiterter Abruf ist KEINE Änderung. Eine unerreichbare Seite als
      // „bewegt" auszuweisen behauptet eine Beobachtung, die es nicht gab —
      // dieselbe Trennung wie beim Wächter der geführten Programme. Der Zustand
      // wird trotzdem festgehalten, sonst bliebe eine tote Adresse unbegrenzt
      // als gültige Fundstelle stehen.
      unerreichbar++;
      await schreibe(z, { zustand: "unerreichbar" });
      return;
    }

    // Nur ein LIVE gelesener Abruf bestätigt eine Seite.
    const fp = markiert("live", fingerprintOf(html));
    if (z.zustand === "unerreichbar") wiederDa++;

    if (!z.fingerprint) {
      neu++;
      await schreibe(z, { fingerprint: fp, seite_gesehen_am: jetzt, zustand: "erreichbar" });
      return;
    }
    if (fp === z.fingerprint) {
      unveraendert++;
      await schreibe(z, { seite_gesehen_am: jetzt, zustand: "erreichbar" });
      return;
    }

    geaendert++;
    if (bewegt.length < 40) bewegt.push(`${z.region_id} ${z.url}`);
    await schreibe(z, {
      fingerprint: fp,
      seite_gesehen_am: jetzt,
      seite_geaendert_am: jetzt,
      zustand: "erreichbar",
    });
  });

  console.log("Ergebnis:");
  console.log(`   unverändert:      ${unveraendert}`);
  console.log(`   BEWEGT:           ${geaendert}`);
  console.log(`   erstmals erfasst: ${neu}`);
  console.log(`   unerreichbar:     ${unerreichbar}`);
  if (wiederDa) console.log(`   wieder erreichbar: ${wiederDa}`);
  if (bewegt.length) {
    console.log(`\nDiese Seiten gehören noch einmal gelesen:\n   ${bewegt.join("\n   ")}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
