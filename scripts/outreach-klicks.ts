/**
 * Wie viele der angeschriebenen Gemeinden haben den Brief geöffnet?
 *
 * Bis zum 02.09.2026 war zwischen „verschickt" und „veröffentlicht" nichts zu
 * sehen. Lägerdorf kam nur ans Licht, weil der Betreiber zufällig in die
 * Besucherstatistik sah. Ohne diese Zahl ist jede Änderung am Brief geraten:
 * Man kann nicht unterscheiden, ob er nicht überzeugt oder ob er nicht gelesen
 * wird.
 *
 * DER SCHLÜSSEL IST DIE ADRESSE, KEIN MERKMAL AM LINK. Jede Gemeinde hat ihre
 * eigene Seite, die Statistik zählt je Adresse — die Zuordnung entsteht also
 * aus dem, was ohnehin da ist. Es wird nichts an den Brief gehängt, kein
 * Kennzeichen, kein zusätzliches Ereignis.
 *
 *   npm run kommunen:klicks
 *   npm run kommunen:klicks -- --seit=2026-08-19
 *
 * DREI GRENZEN, und sie gehören in jede Zahl, die von hier weitergegeben wird:
 *
 *   1. Ein Aufruf ist nicht der Empfänger. Die Seite ist öffentlich; wer über
 *      eine Suchmaschine kommt, zählt genauso. Die Ereignisse aus dem Brief
 *      (`brief_aufruf_direkt` / `_verweis`) sind die schärfere Zahl — dafür
 *      sagen sie nicht, WELCHE Gemeinde es war.
 *   2. Die Statistik läuft im Browser. Wer Skripte blockt, ist unsichtbar; in
 *      einer Verwaltung ist das keine Randerscheinung. Jede Zahl hier ist eine
 *      UNTERGRENZE.
 *   3. Vor dem 04.08.2026 gibt es nichts. Das ist nicht „null Aufrufe",
 *      sondern „nicht gemessen" — der erste Schub vom 20.08. liegt danach, ein
 *      früherer läge davor.
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { aufrufeJeSeite, ereignisseJeName, ANALYTICS_SEIT } from "../lib/web-analytics";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(): void {
  const envPath = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function makeClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

type RegionZeile = { region_id: string; name: string; slug: string | null; parent_region_id: string | null };

/**
 * Atlas-Adresse je Gemeinde, aus der Elternkette gebaut — dieselbe Regel wie
 * in lib/atlas.ts. Ohne Kürzel irgendwo in der Kette gibt es keine Adresse;
 * diese Gemeinden werden gezählt und benannt statt stillschweigend übergangen.
 */
function adressen(regionen: Map<string, RegionZeile>, ids: string[]): Map<string, string> {
  const raus = new Map<string, string>();
  for (const id of ids) {
    const teile: string[] = [];
    let cursor: string | null = id;
    let vollstaendig = true;
    while (cursor && cursor !== "de") {
      const r: RegionZeile | undefined = regionen.get(cursor);
      if (!r?.slug) {
        vollstaendig = false;
        break;
      }
      teile.unshift(r.slug);
      cursor = r.parent_region_id;
    }
    if (vollstaendig && teile.length === 3) raus.set(id, `/solar-atlas/${teile.join("/")}`);
  }
  return raus;
}

async function main() {
  loadEnvFile();
  const args = process.argv.slice(2);
  const seit = args.find((a) => a.startsWith("--seit="))?.split("=")[1] ?? ANALYTICS_SEIT;
  // MORGEN, NICHT HEUTE: Vercel liest ein Datum als Tagesgrenze, „bis heute"
  // schneidet den heutigen Tag also vollständig ab. Gemessen am 02.09.2026 —
  // mit „bis heute" fehlte ein Ereignis, das es an diesem Tag gab, und das sah
  // aus wie „gab es nicht" statt wie „nicht gefragt".
  const morgen = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const bis = args.find((a) => a.startsWith("--bis="))?.split("=")[1] ?? morgen;

  const db = await makeClient();

  // Angeschriebene Gemeinden. Unzustellbare bleiben drin und werden getrennt
  // ausgewiesen: Sie sind der Nenner, den man abziehen muss, nicht ein Fall,
  // den man verschweigt.
  const { data: kontakte, error } = await db
    .from("kommunen_kontakt")
    .select("region_id, kampagne, contacted_at, outreach_status")
    .not("contacted_at", "is", null)
    .order("contacted_at");
  if (error) throw new Error(error.message);
  const zeilen = (kontakte ?? []) as { region_id: string; kampagne: string | null; contacted_at: string; outreach_status: string }[];

  // Regionen samt Eltern, für die Adressen. SEITENWEISE: Eine Abfrage ohne
  // Bereich liefert stumm nur die ersten 1.000 Zeilen — bei rund 11.000
  // Regionen hätte fast jede Gemeinde dann „keine Adresse", und das sähe wie
  // ein Befund aus statt wie ein abgeschnittener Lesevorgang.
  const regionen = new Map<string, RegionZeile>();
  for (let von = 0; ; von += 1000) {
    const { data, error: regFehler } = await db
      .from("mastr_regions")
      .select("region_id, name, slug, parent_region_id")
      .order("region_id")
      .range(von, von + 999);
    if (regFehler) throw new Error(regFehler.message);
    if (!data?.length) break;
    for (const r of data as RegionZeile[]) regionen.set(r.region_id, r);
    if (data.length < 1000) break;
  }

  const pfade = adressen(regionen, zeilen.map((z) => z.region_id));

  // Besuche je Atlas-Adresse.
  //
  // JE BUNDESLAND GEFRAGT, NICHT IN EINEM ZUG: Vercel liefert höchstens 100
  // verschiedene Adressen und wirft den ganzen Rest in einen Sammelposten
  // („Others"). Über den Atlas in einer Abfrage lagen darin 195 Besucher —
  // also gerade die Gemeinden mit wenigen Aufrufen, die hier interessieren.
  // Ein Land für sich bleibt unter der Grenze, und was trotzdem übrig bleibt,
  // wird unten benannt statt weggerundet.
  const zeitraum = { seit, bis };
  const laender = [...new Set([...pfade.values()].map((p) => p.split("/")[2]))].sort();
  const besucher = new Map<string, number>();
  const abgeschnitten: { land: string; besucher: number }[] = [];
  for (const land of laender) {
    for (const gruppe of await aufrufeJeSeite(`/solar-atlas/${land}/`, zeitraum, 100)) {
      const pfad = String(gruppe.requestPath ?? "");
      const b = Number(gruppe.visitors ?? 0);
      if (pfad === "Others") {
        if (b > 0) abgeschnitten.push({ land, besucher: b });
        continue;
      }
      besucher.set(pfad, b);
    }
  }

  const zugestellt = zeilen.filter((z) => z.outreach_status !== "bounce");
  const jeSchub = new Map<string, { verschickt: number; gesehen: number; besucher: number; ohneAdresse: number }>();
  const treffer: { name: string; schub: string; tag: string; besucher: number }[] = [];

  for (const z of zugestellt) {
    const schub = z.kampagne ?? "ohne Schub";
    const s = jeSchub.get(schub) ?? { verschickt: 0, gesehen: 0, besucher: 0, ohneAdresse: 0 };
    s.verschickt++;
    const pfad = pfade.get(z.region_id);
    if (!pfad) {
      s.ohneAdresse++;
    } else {
      const b = besucher.get(pfad) ?? 0;
      if (b > 0) {
        s.gesehen++;
        s.besucher += b;
        treffer.push({
          name: regionen.get(z.region_id)?.name ?? z.region_id,
          schub,
          tag: z.contacted_at.slice(0, 10),
          besucher: b,
        });
      }
    }
    jeSchub.set(schub, s);
  }

  const unzustellbar = zeilen.length - zugestellt.length;
  console.log(`Zeitraum ${seit} bis ${bis} · ${zeilen.length} angeschrieben, davon ${unzustellbar} unzustellbar\n`);

  console.log("Je Schub (zugestellt / Seite aufgerufen / Besucher auf diesen Seiten):");
  for (const [schub, s] of [...jeSchub].sort((a, b) => b[1].verschickt - a[1].verschickt)) {
    const quote = s.verschickt ? Math.round((1000 * s.gesehen) / s.verschickt) / 10 : 0;
    const fehlt = s.ohneAdresse ? ` · ${s.ohneAdresse} ohne Atlas-Adresse` : "";
    console.log(`  ${schub}: ${s.verschickt} / ${s.gesehen} (${quote} %) / ${s.besucher}${fehlt}`);
  }

  console.log("\nAngeschriebene Gemeinden mit Besuchern auf ihrer Seite (Besucher, nicht Empfänger):");
  for (const t of treffer.sort((a, b) => b.besucher - a.besucher)) {
    console.log(`  ${String(t.besucher).padStart(3)}  ${t.name} (${t.schub}, ${t.tag})`);
  }
  if (abgeschnitten.length) {
    const summe = abgeschnitten.reduce((n, a) => n + a.besucher, 0);
    console.log(`\n! ${summe} Besucher stecken in Vercels Sammelposten für die Adressen jenseits der 100 meistbesuchten:`);
    for (const a of abgeschnitten) console.log(`  ${a.land}: ${a.besucher}`);
    console.log("  Gemeinden mit sehr wenigen Aufrufen können darin verschwinden; die Quoten oben sind Untergrenzen.");
  }

  // Die schärfere Zahl, und die kleinere: Sie zählt nur Aufrufe, die die
  // Herkunftskennung des Briefes tragen. Erst seit dem 27.08.2026 verlässlich
  // — davor feuerte die Meldung vor dem Start der Messbibliothek und war
  // stillschweigend weg.
  console.log("\nAufrufe mit der Herkunftskennung des Briefes (ohne Gemeinde, erst ab 27.08.2026 verlässlich):");
  for (const e of await ereignisseJeName(zeitraum)) {
    const name = String(e.eventName ?? "");
    if (name.startsWith("brief_aufruf") || name === "abo_anmeldung") {
      console.log(`  ${name}: ${e.count} (${e.visitors} Besucher)`);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
