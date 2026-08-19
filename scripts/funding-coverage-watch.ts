/**
 * Seiten-Abgleich für die ABDECKUNG: Hat sich eine Förderseite bewegt, die wir
 * kennen, aber (noch) nicht führen?
 *
 *   npm run foerder:seiten                 # alle gescreenten Seiten abgleichen
 *   npm run foerder:seiten -- --limit 500
 *
 * WARUM (18.08.2026): Der Abdeckungs-Lauf sah eine Seite einmal an und nie
 * wieder. Für eine Gemeinde, die HEUTE nichts fördert, hieß das: nie wieder —
 * dabei entsteht genau dort das nächste Programm, denn kommunale Zuschüsse
 * werden mit dem Haushalt beschlossen.
 *
 * Die erste Fassung setzte dagegen ein festes Vierteljahr an. Der Betreiber hat
 * das zurückgewiesen, und zwar mit demselben Argument, das schon die
 * 180-Tage-Frist beim Beleg-Verfall gekippt hatte: „ein Förderprogramm das 89
 * Tage den falschen Status hat wäre dumm." Die richtige Größe ist nicht das
 * Alter, sondern ob die Seite sich BEWEGT hat.
 *
 * Deshalb dieser Lauf, und er erfindet nichts Neues: Er benutzt denselben
 * Fingerabdruck wie der Wächter der geführten Programme
 * (`lib/funding-fingerprint.ts`) und dieselbe Normalisierung, die Beträge und
 * Fachwörter behält und Buchstabensalat wegwirft. Bewegt sich ein Abdruck, fällt
 * die Seite aus dem „erledigt" heraus und steht im nächsten Screening-Lauf
 * wieder oben — am nächsten Tag, nicht im nächsten Quartal.
 *
 * WAS ER NICHT LEISTET, und das ist dieselbe Grenze wie beim großen Bruder: Er
 * weiß, DASS sich etwas bewegt hat, nie WAS. Das Einordnen macht der
 * Screening-Lauf, das Lesen der Wächter-Lauf.
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

function zahl(name: string, standard: number): number {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : standard;
}

async function alleZeilen<T>(tabelle: string, spalten: string, filter?: (q: any) => any): Promise<T[]> {
  const out: T[] = [];
  const schritt = 1000;
  for (let von = 0; ; von += schritt) {
    let q = sb.from(tabelle).select(spalten).range(von, von + schritt - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${tabelle}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < schritt) break;
  }
  return out;
}

type Zeile = {
  region_id: string;
  url: string | null;
  fingerprint: string | null;
  seite_gesehen_am: string | null;
};

async function main(): Promise<void> {
  const limit = zahl("limit", 3000);
  const zeilen = (
    await alleZeilen<Zeile>("funding_coverage", "region_id, url, fingerprint, seite_gesehen_am")
  ).filter((z) => z.url);

  // Am längsten nicht gesehene zuerst — so kommt jede Seite reihum dran, auch
  // wenn der Schub kleiner ist als der Bestand.
  const dran = zeilen
    .sort((a, b) => (a.seite_gesehen_am ?? "").localeCompare(b.seite_gesehen_am ?? ""))
    .slice(0, limit);

  console.log(`${zeilen.length} bekannte Förderseiten, ich gleiche ${dran.length} ab.\n`);

  let geaendert = 0;
  let unveraendert = 0;
  let unerreichbar = 0;
  let neu = 0;
  const bewegt: string[] = [];
  const jetzt = new Date().toISOString();

  await inSchueben(dran, zahl("gleichzeitig", 8), async (z) => {
    let html: string | null = null;
    try {
      const res = await fetch(z.url!, {
        headers: { "User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9" },
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) html = await res.text();
    } catch {
      /* unerreichbar */
    }

    if (!html) {
      // Ein gescheiterter Abruf ist KEINE Änderung — dieselbe Trennung wie beim
      // Wächter der geführten Programme. Eine unerreichbare Seite als „bewegt"
      // zu melden behauptet eine Beobachtung, die es nicht gab.
      unerreichbar++;
      return;
    }

    const fp = markiert("live", fingerprintOf(html));
    if (!z.fingerprint) {
      neu++;
      await sb.from("funding_coverage").update({ fingerprint: fp, seite_gesehen_am: jetzt }).eq("region_id", z.region_id);
      return;
    }
    if (fp === z.fingerprint) {
      unveraendert++;
      await sb.from("funding_coverage").update({ seite_gesehen_am: jetzt }).eq("region_id", z.region_id);
      return;
    }

    geaendert++;
    if (bewegt.length < 40) bewegt.push(z.region_id);
    await sb
      .from("funding_coverage")
      .update({ fingerprint: fp, seite_gesehen_am: jetzt, seite_geaendert_am: jetzt })
      .eq("region_id", z.region_id);
  });

  console.log("Ergebnis:");
  console.log(`   unverändert:  ${unveraendert}`);
  console.log(`   BEWEGT:       ${geaendert}`);
  console.log(`   erstmals erfasst: ${neu}`);
  console.log(`   unerreichbar: ${unerreichbar}`);
  if (bewegt.length) {
    console.log(`\nDiese Gemeinden stehen im nächsten Screening-Lauf wieder oben:\n   ${bewegt.join(", ")}`);
  }
  console.log(`\nDanach einordnen: npm run foerder:screen`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
