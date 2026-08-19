/**
 * URL-Suche: auf den Verwaltungs-Websites die Förderseite überhaupt erst finden.
 *
 *   npm run foerder:suche                  # nächste 60 Gemeinden
 *   npm run foerder:suche -- --limit 300
 *   npm run foerder:suche -- --stand       # nur Fortschritt zeigen
 *   npm run foerder:suche -- --funde       # gefundene Adressen auflisten
 *
 * WARUM (18.08.2026): Das Screening konnte bisher nur prüfen, was der
 * Kommunen-Outreach zufällig mitgesammelt hatte — 1.258 Gemeinden mit erfasster
 * Förderseite. Für rund 9.700 weitere kennen wir die Verwaltungs-Website, aber
 * keine Themenseite. Was diese Gemeinden auflegen, sieht niemand; das ist die
 * größte Lücke im Katalog, und keine Menge Screening kann sie schließen.
 *
 * DIE VERZAHNUNG IST DER PUNKT: Was dieser Lauf findet, schreibt er nach
 * `kommunen_kontakt.thema_foerderung_url` — genau in das Feld, aus dem sich das
 * Screening bedient. Suche füllt den Topf, Screening leert ihn, und beide laufen
 * täglich in derselben Action. Ohne diese Verbindung wäre die Suche eine Liste,
 * die jemand von Hand weiterreichen müsste.
 *
 * GEDÄCHTNIS WIE BEIM SCREENING: Jede angesehene Gemeinde wird mit Ergebnis
 * abgelegt (`funding_url_suche`), jeder Lauf macht dort weiter, wo der letzte
 * aufhörte. Ohne Ablage begänne jeder Lauf wieder bei den größten Städten und
 * käme nie in die Tiefe — und die Tiefe ist hier der ganze Zweck: Die
 * Großstädte führen wir längst.
 *
 * WAS DIESER LAUF NICHT TUT: Er liest nicht. Eine gefundene Adresse ist eine
 * Vermutung („hier könnte die Förderseite sein"), die das Screening danach
 * bewertet und ein Mensch am Ende liest. Drei Stufen, jede enger als die vorige.
 */

import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  linkKandidaten, sitemapKandidaten, sitemapIndex, istEndergebnis, SUCH_VERSION, type LinkKandidat,
} from "../lib/funding-url-suche";
import { inSchueben } from "../lib/lauf-parallel";
import { seitenSchluessel, istInterneRoute } from "../lib/funding-seiten";

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

/** Obergrenze je Gemeinde — darüber ist es Rauschen, keine Förderseite. */
const MAX_SEITEN_JE_GEMEINDE = 6;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

function zahl(name: string, standard: number): number {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : standard;
}

type SuchVerdikt =
  /** Eine Adresse gefunden, die nach Förderseite aussieht. */
  | "gefunden"
  /** Website erreichbar, aber kein verfolgenswerter Link — die Gemeinde hat
   *  vermutlich keine eigene Förderseite. Das ist ein ERGEBNIS, kein Fehlschlag. */
  | "keine-seite"
  /** Website nicht abrufbar — kommt beim nächsten Lauf wieder dran. */
  | "unerreichbar";

/** PostgREST liefert stumm höchstens 1.000 Zeilen — bei 11.219 Gemeinden fatal. */
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

async function abrufen(ziel: string, timeoutMs = 15_000): Promise<string | null> {
  try {
    const res = await fetch(ziel, {
      headers: { "User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const typ = res.headers.get("content-type") ?? "";
    if (!/text\/html|xml/i.test(typ)) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Die Förderseite einer Gemeinde suchen.
 *
 * Zwei Wege, absichtlich in dieser Reihenfolge:
 *  1. Die Startseite und die besten Links daraus — der Weg, der immer geht.
 *  2. Die sitemap.xml, falls vorhanden — findet tiefer liegende Seiten, die im
 *     Menü der Startseite nicht auftauchen.
 *
 * Höchstens `TIEFE` Ebenen und `MAX_ABRUFE` Anfragen je Gemeinde. Die Grenze ist
 * kein Sparzwang, sondern Rücksicht: Das hier läuft über tausende fremde
 * Verwaltungs-Server, und ein Crawler, der sich festbeißt, ist ein Ärgernis, das
 * uns irgendwann aussperrt.
 */
const TIEFE = 2;
const MAX_ABRUFE = 6;

/**
 * ALLE Fundstellen statt nur der besten (19.08.2026).
 *
 * `beste` bleibt, was es war — der eine Fund, der nach `funding_url_suche` und
 * `kommunen_kontakt` wandert; daran hängt das Screening, und daran wird nicht
 * gerüttelt. Neu ist `funde`: jede Adresse, die für sich genommen eine
 * Förderseite ist. Vorher fiel alles außer der besten auf den Boden, und genau
 * darin steckte die Lücke — eine Stadt mit getrennter Photovoltaik- und
 * Balkonseite lieferte eine davon, die andere existierte für uns nie.
 */
async function sucheFoerderseite(startseite: string): Promise<{ beste: LinkKandidat | null; funde: LinkKandidat[]; abrufe: number; erreichbar: boolean }> {
  let abrufe = 0;
  const html = await abrufen(startseite);
  abrufe++;
  if (!html) return { beste: null, funde: [], abrufe, erreichbar: false };

  const gesehen = new Set<string>([startseite]);
  let kandidaten = linkKandidaten(html, startseite);

  // Die Sitemap ergänzt, was im Menü der Startseite fehlt.
  if (abrufe < MAX_ABRUFE) {
    const basis = new URL(startseite).origin;
    const sm = await abrufen(`${basis}/sitemap.xml`, 10_000);
    abrufe++;
    if (sm) {
      const unter = sitemapIndex(sm);
      if (unter.length && abrufe < MAX_ABRUFE) {
        // Nur die erste Unter-Sitemap — bei großen Städten sind es Dutzende, und
        // wir suchen keine Vollständigkeit, sondern einen guten Einstieg.
        const tief = await abrufen(unter[0], 10_000);
        abrufe++;
        if (tief) kandidaten = kandidaten.concat(sitemapKandidaten(tief, startseite));
      } else {
        kandidaten = kandidaten.concat(sitemapKandidaten(sm, startseite));
      }
    }
  }

  kandidaten.sort((a, b) => b.punkte - a.punkte);
  if (!kandidaten.length) return { beste: null, funde: [], abrufe, erreichbar: true };

  // Ab hier zählt der Unterschied zwischen VERFOLGEN und ANNEHMEN. Verfolgt wird
  // der beste Link überhaupt — auch eine reine Themenseite („Klimaschutz und
  // Energie"), denn die ist oft der Weg zur Förderseite. Angenommen wird nur,
  // was von Geld UND vom Thema spricht.
  let spur = kandidaten[0];
  let ergebnis: LinkKandidat | null = kandidaten.find((k) => istEndergebnis(k)) ?? null;

  // Jede Adresse, die für sich eine Förderseite ist — nicht nur die beste.
  const alleFunde = new Map<string, LinkKandidat>();
  const merken = (liste: LinkKandidat[]) => {
    for (const k of liste) {
      if (!istEndergebnis(k) || istInterneRoute(k.url)) continue;
      alleFunde.set(seitenSchluessel(k.url), k);
    }
  };
  merken(kandidaten);

  for (let ebene = 1; ebene < TIEFE && abrufe < MAX_ABRUFE; ebene++) {
    if (gesehen.has(spur.url)) break;
    gesehen.add(spur.url);
    const unterHtml = await abrufen(spur.url);
    abrufe++;
    if (!unterHtml) break;
    const tiefer = linkKandidaten(unterHtml, spur.url).filter((k) => !gesehen.has(k.url));
    if (!tiefer.length) break;

    merken(tiefer);
    const besseresErgebnis = tiefer.find((k) => istEndergebnis(k) && k.punkte > (ergebnis?.punkte ?? 0));
    if (besseresErgebnis) ergebnis = besseresErgebnis;
    if (tiefer[0].punkte <= spur.punkte) break;
    spur = tiefer[0];
  }

  // Gedeckelt: Mehr als eine Handvoll echter Förderseiten hat keine Gemeinde;
  // was darüber liegt, ist Rauschen aus einer Übersichtsseite.
  const funde = [...alleFunde.values()].sort((a, b) => b.punkte - a.punkte).slice(0, MAX_SEITEN_JE_GEMEINDE);
  return { beste: ergebnis, funde, abrufe, erreichbar: true };
}

type SuchZeile = { region_id: string; verdikt: string; such_version: number | null };

async function offeneKandidaten(limit: number) {
  const kontakte = await alleZeilen<{ region_id: string; website: string | null; thema_foerderung_url: string | null }>(
    "kommunen_kontakt",
    "region_id, website, thema_foerderung_url",
    (q) => q.not("website", "is", null),
  );
  // Bis 19.08.2026 stand hier: „Wer schon eine Förderseite hat, braucht keine
  // Suche." Das galt, solange wir ohnehin nur eine Adresse je Gemeinde halten
  // konnten — jetzt ist es genau falsch herum. Bei den Gemeinden MIT Fund liegen
  // die zweiten und dritten Seiten, die vorher auf den Boden fielen; sie zu
  // überspringen hieße, den Umbau bei denen nicht wirken zu lassen, über die wir
  // am meisten wissen. Wer wirklich fertig ist, fällt unten über `erledigt`
  // heraus — und zwar über den Versionsstempel, nicht über das Vorhandensein
  // einer Adresse.
  const ohneSeite = kontakte;

  const abgelegt = await alleZeilen<SuchZeile>("funding_url_suche", "region_id, verdikt, such_version");
  const zeileVon = new Map(abgelegt.map((r) => [r.region_id, r]));
  const erledigt = (id: string): boolean => {
    const z = zeileVon.get(id);
    if (!z) return false;
    if (z.verdikt === "unerreichbar") return false;
    return (z.such_version ?? 1) >= SUCH_VERSION;
  };

  const rest = ohneSeite.filter((k) => !erledigt(k.region_id));
  // Wer beim letzten Mal schon nicht erreichbar war, ist ein Wiederholungsversuch
  // — sein Fehlschlag sagt nichts über unsere Verbindung.
  const schonUnerreichbar = new Set(abgelegt.filter((z) => z.verdikt === "unerreichbar").map((z) => z.region_id));
  const pop = new Map<string, number>();
  const ids = rest.map((r) => r.region_id);
  for (let i = 0; i < ids.length; i += 500) {
    const { data: reg } = await sb.from("mastr_regions").select("region_id, population").in("region_id", ids.slice(i, i + 500));
    for (const r of (reg ?? []) as { region_id: string; population: number | null }[]) pop.set(r.region_id, r.population ?? 0);
  }

  return {
    gesamt: ohneSeite.length,
    erledigt: ohneSeite.length - rest.length,
    naechste: rest
      .sort((a, b) => (pop.get(b.region_id) ?? 0) - (pop.get(a.region_id) ?? 0))
      .slice(0, limit)
      .map((r) => ({ region_id: r.region_id, website: r.website! })),
    schonUnerreichbar,
  };
}

async function stand(): Promise<void> {
  const { gesamt, erledigt } = await offeneKandidaten(1);
  const zeilen = await alleZeilen<SuchZeile>("funding_url_suche", "region_id, verdikt, such_version");
  const z = new Map<string, number>();
  for (const r of zeilen) z.set(r.verdikt, (z.get(r.verdikt) ?? 0) + 1);
  const prozent = gesamt ? Math.round((erledigt / gesamt) * 100) : 0;
  console.log(`URL-Suche: ${erledigt} von ${gesamt} Gemeinden ohne erfasste Förderseite durchsucht (${prozent} %).`);
  for (const [v, n] of [...z].sort((a, b) => b[1] - a[1])) console.log(`   ${v}: ${n}`);
}

async function funde(): Promise<void> {
  const rows = await alleZeilen<{ region_id: string; gefunden_url: string | null; punkte: number | null }>(
    "funding_url_suche",
    "region_id, gefunden_url, punkte",
    (q) => q.eq("verdikt", "gefunden"),
  );
  if (!rows.length) return console.log("Noch keine Funde.");
  const { data: reg } = await sb.from("mastr_regions").select("region_id, name").in("region_id", rows.slice(0, 500).map((r) => r.region_id));
  const name = new Map(((reg ?? []) as any[]).map((r) => [r.region_id, r.name as string]));
  console.log(`${rows.length} gefundene Adressen (beste Bewertung zuerst):\n`);
  for (const r of rows.sort((a, b) => (b.punkte ?? 0) - (a.punkte ?? 0)).slice(0, 60)) {
    console.log(`  ${name.get(r.region_id) ?? r.region_id}  (${r.punkte} Punkte)`);
    console.log(`     ${r.gefunden_url}`);
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--stand")) return stand();
  if (process.argv.includes("--funde")) return funde();

  const limit = zahl("limit", 60);
  const { gesamt, erledigt, naechste, schonUnerreichbar } = await offeneKandidaten(limit);
  console.log(`Durchsucht vorher: ${erledigt} von ${gesamt}. Nehme mir jetzt ${naechste.length} vor.\n`);

  const zaehler = new Map<SuchVerdikt, number>();
  let unerreichbarInFolge = 0;
  let abgebrochen = false;
  let fertig = 0;

  await inSchueben(naechste, zahl("gleichzeitig", 6), async (k) => {
    if (abgebrochen) return;
    const { beste, funde, erreichbar } = await sucheFoerderseite(k.website);
    const verdikt: SuchVerdikt = !erreichbar ? "unerreichbar" : beste ? "gefunden" : "keine-seite";
    zaehler.set(verdikt, (zaehler.get(verdikt) ?? 0) + 1);

    // Reißleine: Häufen sich die Fehlschläge, liegt es fast nie an den Gemeinden,
    // sondern an uns — kein Netz, gesperrte Adresse, abgestürzter Resolver. Dann
    // weiterzulaufen stempelt hunderte erreichbare Websites als unerreichbar ab.
    // Die Reißleine misst UNSERE Verbindung, nicht die Hartnäckigkeit der
    // Gemeinden. Sobald die Warteschlange überwiegend aus Wiederholungsversuchen
    // besteht — und genau dahin läuft sie mit der Zeit —, sind 15 Fehlschläge in
    // Folge der Normalfall und die Bremse feuert bei jedem Lauf. Gemessen am
    // 19.08.2026: Der erste Lauf nach dem Umbau brach nach 18 Versuchen ab,
    // obwohl das Netz in Ordnung war; in der Warteschlange standen nur noch die
    // 556 zuvor unerreichbaren. Deshalb zählen nur FRISCHE Fehlschläge.
    const frischerFehlschlag = !erreichbar && !schonUnerreichbar.has(k.region_id);
    unerreichbarInFolge = frischerFehlschlag ? unerreichbarInFolge + 1 : erreichbar ? 0 : unerreichbarInFolge;
    if (unerreichbarInFolge >= 15 && !abgebrochen) {
      abgebrochen = true;
      console.error("\n15 Websites in Folge nicht erreichbar — Lauf abgebrochen. Erst die eigene Verbindung prüfen.");
      return;
    }

    await sb.from("funding_url_suche").upsert({
      region_id: k.region_id,
      website: k.website,
      verdikt,
      gefunden_url: beste?.url ?? null,
      linktext: beste?.text || null,
      punkte: beste?.punkte ?? null,
      // Wie beim Screening: Der Versionsstempel steht NUR für einen echten
      // Durchgang. Eine unerreichbare Website hat die Suche nicht gesehen.
      such_version: erreichbar ? SUCH_VERSION : 1,
      checked_at: new Date().toISOString(),
    });

    // Der Fund wandert ins Feld, aus dem sich das Screening bedient — aber nur,
    // wenn dort nichts steht. Eine von Hand erfasste Adresse ist immer besser
    // als eine erratene und wird nie überschrieben.
    if (beste) {
      await sb
        .from("kommunen_kontakt")
        .update({ thema_foerderung_url: beste.url })
        .eq("region_id", k.region_id)
        .is("thema_foerderung_url", null);
    }

    // Und ALLE Funde in die Seiten-Tabelle. Das ist die Stelle, an der die
    // Erfassung mehr als eine Seite je Gemeinde behalten kann — `upsert` mit
    // dem Schlüssel (Gemeinde × Adresse) macht den Lauf idempotent und
    // überschreibt kein Leseergebnis, weil nur die Fund-Spalten geschrieben werden.
    if (funde.length) {
      await sb.from("funding_seiten").upsert(
        funde.map((f) => ({
          region_id: k.region_id,
          url: seitenSchluessel(f.url),
          quelle: "suche",
          zustand: "erreichbar",
        })),
        { onConflict: "region_id,url", ignoreDuplicates: true },
      );
    }

    if (++fertig % 100 === 0) console.log(`   … ${fertig} von ${naechste.length}`);
  });

  console.log("Ergebnis dieses Laufs:");
  for (const [v, n] of [...zaehler].sort((a, b) => b[1] - a[1])) console.log(`   ${v}: ${n}`);
  console.log("");
  await stand();
  console.log("\nFunde ansehen:   npm run foerder:suche -- --funde");
  console.log("Danach screenen: npm run foerder:screen");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
