/**
 * Was ist aus den angeschriebenen Gemeinden geworden?
 *
 * Bis zum 02.09.2026 war zwischen „verschickt" und „veröffentlicht" nichts zu
 * sehen. Lägerdorf kam nur ans Licht, weil der Betreiber zufällig in die
 * Besucherstatistik sah.
 *
 * ZWEI SCHLÜSSEL, BEIDE OHNE ZUTUN AM BRIEF:
 *   · Die ADRESSE sagt, WELCHE Gemeinde — jede hat ihre eigene Seite.
 *   · Der VERWEIS sagt, WAS passiert ist — ein Besucher von Facebook oder von
 *     der Website der Gemeinde bedeutet, dass jemand dort etwas veröffentlicht
 *     hat.
 *
 * DER VERWEIS SCHLÄGT DIE BACKLINK-SUCHE. Sie kannte zwei Veröffentlichungen;
 * gemessen sind vier — Aue-Bad Schlema und Urmitz haben in sozialen Netzen
 * gepostet, und ein Beitrag dort ist kein Backlink, den ein Verzeichnis
 * crawlt. Die Einordnung selbst steht in `lib/outreach-herkunft.ts`.
 *
 *   npm run kommunen:klicks
 *   npm run kommunen:klicks -- --seit=2026-08-19
 *
 * ZWEI GRENZEN, und sie gehören in jede Zahl, die von hier weitergegeben wird:
 *
 *   1. Die Statistik läuft im Browser. Wer Skripte blockt, ist unsichtbar; in
 *      einer Verwaltung ist das keine Randerscheinung. Jede Zahl hier ist eine
 *      UNTERGRENZE.
 *   2. Vor dem 04.08.2026 gibt es nichts. Das ist nicht „null Aufrufe",
 *      sondern „nicht gemessen".
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { aggregat, herkunftJeSeite, ereignisseJeName, ANALYTICS_SEIT } from "../lib/web-analytics";
import {
  ordneHerkunft,
  kanalName,
  veroeffentlichungsNotiz,
  HERKUNFT_TEXT,
  type Herkunft,
} from "../lib/outreach-herkunft";

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
  const schreiben = args.includes("--schreiben");

  const db = await makeClient();

  // Angeschriebene Gemeinden. Unzustellbare bleiben drin und werden getrennt
  // ausgewiesen: Sie sind der Nenner, den man abziehen muss, nicht ein Fall,
  // den man verschweigt. Die Website brauchen wir, um einen Verweis von der
  // eigenen Seite der Gemeinde zu erkennen.
  const { data: kontakte, error } = await db
    .from("kommunen_kontakt")
    .select("region_id, kampagne, contacted_at, outreach_status, website, notes")
    .not("contacted_at", "is", null)
    .order("contacted_at");
  if (error) throw new Error(error.message);
  const zeilen = (kontakte ?? []) as {
    region_id: string;
    kampagne: string | null;
    contacted_at: string;
    outreach_status: string;
    website: string | null;
    notes: string | null;
  }[];

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
  const gemeindeJePfad = new Map<
    string,
    {
      regionId: string;
      name: string;
      website: string | null;
      status: string;
      notes: string | null;
      kampagne: string;
      tag: string;
    }
  >();
  for (const z of zeilen) {
    const pfad = pfade.get(z.region_id);
    if (!pfad) continue;
    gemeindeJePfad.set(pfad, {
      regionId: z.region_id,
      name: regionen.get(z.region_id)?.name ?? z.region_id,
      website: z.website,
      status: z.outreach_status,
      notes: z.notes,
      kampagne: z.kampagne ?? "ohne Schub",
      tag: z.contacted_at.slice(0, 10),
    });
  }

  // Besuche je Adresse UND Verweis.
  //
  // JE BUNDESLAND GEFRAGT, NICHT IN EINEM ZUG: Vercel liefert höchstens 100
  // Zeilen und wirft den ganzen Rest in einen Sammelposten („Others"). Über
  // den Atlas in einer Abfrage lagen darin 195 Besucher — also gerade die
  // Gemeinden mit wenigen Aufrufen, um die es geht.
  const zeitraum = { seit, bis };
  const laender = [...new Set([...pfade.values()].map((p) => p.split("/")[2]))].sort();
  type Seite = { gesamt: number; je: Map<Herkunft, number>; verweise: Map<string, number> };
  const seiten = new Map<string, Seite>();
  const abgeschnitten: { land: string; besucher: number }[] = [];

  for (const land of laender) {
    for (const gruppe of await herkunftJeSeite(`/solar-atlas/${land}/`, zeitraum, 100)) {
      const pfad = String(gruppe.requestPath ?? "");
      const b = Number(gruppe.visitors ?? 0);
      if (pfad === "Others") {
        if (b > 0) abgeschnitten.push({ land, besucher: b });
        continue;
      }
      const gemeinde = gemeindeJePfad.get(pfad);
      if (!gemeinde) continue;
      const verweis = String(gruppe.referrerHostname ?? "");
      const art = ordneHerkunft(verweis, gemeinde.website);
      const s = seiten.get(pfad) ?? { gesamt: 0, je: new Map(), verweise: new Map() };
      s.gesamt += b;
      s.je.set(art, (s.je.get(art) ?? 0) + b);
      if (verweis) s.verweise.set(verweis, (s.verweise.get(verweis) ?? 0) + b);
      seiten.set(pfad, s);
    }
  }

  const zugestellt = zeilen.filter((z) => z.outreach_status !== "bounce");
  const unzustellbar = zeilen.length - zugestellt.length;
  console.log(`Zeitraum ${seit} bis ${bis} · ${zeilen.length} angeschrieben, davon ${unzustellbar} unzustellbar\n`);

  // ─── Veröffentlichungen ─────────────────────────────────────────────────────
  //
  // Die einzige Zahl, auf die es ankommt. Sie steht zuerst und nennt bei jeder
  // Gemeinde, WO veröffentlicht wurde — sonst ist sie eine Behauptung.
  const veroeffentlicht = [...seiten]
    .filter(([, s]) => (s.je.get("veroeffentlichung") ?? 0) > 0)
    .sort((a, b) => (b[1].je.get("veroeffentlichung") ?? 0) - (a[1].je.get("veroeffentlichung") ?? 0));

  // JE VERÖFFENTLICHUNG DER ERSTE TAG. Der Kanal allein sagt nicht, wann es
  // passiert ist, und ein Vermerk ohne Datum ist später nicht mehr einzuordnen.
  // Gefragt wird je Seite nach Verweis UND Tag; genommen wird der früheste Tag,
  // an dem ein Verweis dieser Art kam. Das ist der Tag, an dem WIR es gesehen
  // haben — die Veröffentlichung selbst kann früher liegen, und genau so steht
  // es auch im Vermerk.
  console.log(`Veröffentlicht: ${veroeffentlicht.length} von ${zugestellt.length} zugestellten Briefen`);
  const belege: { name: string; regionId: string; kanaele: string; erstTag: string; status: string; notes: string | null }[] = [];
  for (const [pfad, s] of veroeffentlicht) {
    const g = gemeindeJePfad.get(pfad)!;
    const kanalListe = [...s.verweise]
      .filter(([h]) => ordneHerkunft(h, g.website) === "veroeffentlichung")
      .sort((a, b) => b[1] - a[1]);
    const kanaele = kanalListe.map(([h, n]) => `${h} ${n}`).join(", ");

    let erstTag = "";
    for (const r of await aggregat({
      datensatz: "visits",
      zeitraum,
      nach: ["referrerHostname", "day"],
      filter: `requestPath eq '${pfad}'`,
      limit: 100,
    })) {
      if (ordneHerkunft(String(r.referrerHostname ?? ""), g.website) !== "veroeffentlichung") continue;
      if (Number(r.visitors ?? 0) <= 0) continue;
      const tag = String(r.timestamp ?? "").slice(0, 10);
      if (tag && (!erstTag || tag < erstTag)) erstTag = tag;
    }

    belege.push({
      name: g.name,
      regionId: g.regionId,
      kanaele: [...new Set(kanalListe.map(([h]) => kanalName(h)))].join(", "),
      erstTag,
      status: g.status,
      notes: g.notes,
    });
    console.log(
      `  ${g.name} (${g.kampagne}, Brief ${g.tag}): ${s.je.get("veroeffentlichung")} Besucher über ${kanaele}` +
        (erstTag ? ` · erstmals am ${erstTag}` : " · Tag nicht ermittelbar"),
    );
  }

  // ─── Nachtragen ─────────────────────────────────────────────────────────────
  //
  // Nur mit `--schreiben`, und nur, was noch nicht vermerkt ist. Der Vermerk
  // trägt Kanal UND Datum: „über Facebook" allein ist in vier Wochen nicht mehr
  // einzuordnen, und ein Datum ohne Kanal sagt nicht, woran wir es gesehen
  // haben.
  //
  // GESPERRT BLEIBT GESPERRT — dieselbe Einbahnstraße wie bei den Rückläufern:
  // Wer widersprochen hat, wird durch einen Besucher aus einem sozialen Netz
  // nicht wieder zum offenen Kontakt.
  if (belege.length) {
    if (!schreiben) {
      const offen = belege.filter((b) => b.status !== "veroeffentlicht");
      if (offen.length) {
        console.log(`\n${offen.length} davon noch nicht als veröffentlicht vermerkt. Zum Nachtragen: --schreiben`);
      }
    } else {
      let n = 0;
      for (const b of belege) {
        const notiz = veroeffentlichungsNotiz({
          datum: b.erstTag || new Date().toISOString().slice(0, 10),
          kanal: b.kanaele,
        });
        const zeilenBisher = (b.notes ?? "").split("\n");
        if (b.status === "veroeffentlicht" && zeilenBisher.includes(notiz)) continue;
        const { error: e } = await db
          .from("kommunen_kontakt")
          .update({
            outreach_status: "veroeffentlicht",
            notes: b.notes ? `${b.notes}\n${notiz}` : notiz,
            updated_at: new Date().toISOString(),
          })
          .eq("region_id", b.regionId)
          .neq("outreach_status", "gesperrt");
        if (e) {
          console.log(`  ! ${b.name}: ${e.message}`);
          continue;
        }
        console.log(`  ✓ ${b.name}: ${notiz}`);
        n++;
      }
      console.log(n ? `\n${n} nachgetragen.` : "\nNichts nachzutragen — alles schon vermerkt.");
    }
  }

  // WAS DIESE MESSUNG NICHT SIEHT, wird benannt statt weggelassen. Eine
  // App-Plattform schickt bewusst keinen Verweis mit — Wallertheim hat uns in
  // seiner Dorf-App verlinkt und 51 Besucher geschickt, und hier steht dazu
  // nichts. Ohne diese Zeile läse sich die Zahl oben als vollständig.
  const bekannt = zeilen.filter((z) => z.outreach_status === "veroeffentlicht");
  const gesehen = new Set(veroeffentlicht.map(([p]) => p));
  const unsichtbar = bekannt.filter((z) => {
    const p = pfade.get(z.region_id);
    return !p || !gesehen.has(p);
  });
  if (unsichtbar.length) {
    console.log("\nAls veröffentlicht vermerkt, hier aber ohne Verweis sichtbar (App-Plattform o. Ä.):");
    for (const z of unsichtbar) console.log(`  ${regionen.get(z.region_id)?.name ?? z.region_id}`);
  }

  // ─── Alles andere, nach Art getrennt ────────────────────────────────────────
  const summe = new Map<Herkunft, number>();
  for (const s of seiten.values()) for (const [art, n] of s.je) summe.set(art, (summe.get(art) ?? 0) + n);
  console.log("\nAlle Besucher auf angeschriebenen Gemeindeseiten, nach Herkunft:");
  for (const [art, n] of [...summe].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${HERKUNFT_TEXT[art]}: ${n}`);
  }

  // „andere Seite" ist kein Ergebnis, sondern Arbeitsvorrat: Dahinter kann
  // eine Veröffentlichung stecken, die wir noch nicht als solche kennen.
  const fremde = new Map<string, number>();
  for (const [pfad, s] of seiten) {
    const g = gemeindeJePfad.get(pfad)!;
    for (const [h, n] of s.verweise) {
      if (ordneHerkunft(h, g.website) === "andere") fremde.set(`${h} → ${g.name}`, n);
    }
  }
  if (fremde.size) {
    console.log("\nNoch nicht eingeordnet — bitte ansehen, ob eine Veröffentlichung dahintersteckt:");
    for (const [k, n] of [...fremde].sort((a, b) => b[1] - a[1])) console.log(`  ${n}  ${k}`);
  }

  // ─── Je Schub ───────────────────────────────────────────────────────────────
  const jeSchub = new Map<string, { verschickt: number; gesehen: number; veroeffentlicht: number; ohneAdresse: number }>();
  for (const z of zugestellt) {
    const schub = z.kampagne ?? "ohne Schub";
    const s = jeSchub.get(schub) ?? { verschickt: 0, gesehen: 0, veroeffentlicht: 0, ohneAdresse: 0 };
    s.verschickt++;
    const pfad = pfade.get(z.region_id);
    if (!pfad) s.ohneAdresse++;
    else {
      const seite = seiten.get(pfad);
      if (seite && seite.gesamt > 0) s.gesehen++;
      if (seite && (seite.je.get("veroeffentlichung") ?? 0) > 0) s.veroeffentlicht++;
    }
    jeSchub.set(schub, s);
  }
  console.log("\nJe Schub (zugestellt / Seite überhaupt aufgerufen / veröffentlicht):");
  for (const [schub, s] of [...jeSchub].sort((a, b) => b[1].verschickt - a[1].verschickt)) {
    const fehlt = s.ohneAdresse ? ` · ${s.ohneAdresse} ohne Atlas-Adresse` : "";
    console.log(`  ${schub}: ${s.verschickt} / ${s.gesehen} / ${s.veroeffentlicht}${fehlt}`);
  }

  if (abgeschnitten.length) {
    const n = abgeschnitten.reduce((a, b) => a + b.besucher, 0);
    console.log(`\n! ${n} Besucher stecken in Vercels Sammelposten jenseits der 100 meistbesuchten Zeilen je Land:`);
    for (const a of abgeschnitten) console.log(`  ${a.land}: ${a.besucher}`);
  }

  // Die schärfere Zahl für den Klick IM Brief. Erst seit dem 27.08.2026
  // verlässlich — davor feuerte die Meldung vor dem Start der Messbibliothek
  // und war stillschweigend weg.
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
