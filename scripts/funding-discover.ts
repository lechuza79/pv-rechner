import { walkFundingSources, qualifiedFundingSources, type FundingLead } from "../lib/funding-navigation";
import { discoveryDue, type DiscoveryRecord } from "../lib/funding-source-policy";
import { FundingSourceReader, recordStage } from "./lib/funding-source-reader";
/**
 * URL-Suche: auf den Verwaltungs-Websites die Förderseite überhaupt erst finden.
 *
 *   npm run foerder:suche                  # nächste 60 Gemeinden
 *   npm run foerder:suche -- --limit 300
 *   npm run foerder:suche -- --schub mail-nrw   # nur die noch offenen Briefe
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
  linkKandidaten, sitemapKandidaten, sitemapIndex, istEndergebnis, SUCH_VERSION,
  suchFormular, suchAdresse, suchseitenLink, SUCH_BEGRIFFE, SUCHSEITEN_PFADE,
  sitemapIndexReihenfolge,
  type LinkKandidat,
} from "../lib/funding-url-suche";
import { inSchueben } from "../lib/lauf-parallel";
import { seitenSchluessel, istInterneRoute, istVorlagenRest } from "../lib/funding-seiten";

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
let sources = new FundingSourceReader(sb, "discovery", process.argv.includes("--dry"));

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
  | "unerreichbar"
  | "unvollstaendig";

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

/**
 * Wie `abrufen`, liefert aber zusätzlich die Adresse NACH allen Umleitungen.
 *
 * BLOCKER (25.08.2026): Der Host-Filter in `linkKandidaten` und
 * `sitemapKandidaten` wirft jede Adresse weg, die nicht zum Host der
 * übergebenen Basis gehört — das ist richtig so, es hält KfW, BAFA und L-Bank
 * heraus. Nur war die Basis bisher die ERFASSTE Adresse, nicht die
 * tatsächliche: Steht eine Gemeinde ohne „www" in unserem Bestand und leitet
 * ihre Domain auf „www" um, ist jeder Link und jeder Sitemap-Eintrag ein
 * Fremdhost. Ergebnis: null Kandidaten, kein Fehler, keine Meldung — die
 * Gemeinde gilt als erreichbar und ergebnislos. Nachgestellt an nidda.de: mit
 * `https://nidda.de/` als Basis liefern beide Funktionen 0 Treffer, mit
 * `https://www.nidda.de/` findet die Sitemap 45 Kandidaten, darunter die
 * Förderseite.
 *
 * Die Umleitung wurde immer schon verfolgt (`redirect: "follow"`), das Ergebnis
 * nur weggeworfen. Genau daran ist der Fehler unsichtbar: Die Seite kommt an,
 * sie ist nur ab da unter falschem Namen gemessen.
 */
async function abrufenMitZiel(ziel: string, timeoutMs = 15_000): Promise<{ html: string; startseite: string } | null> {
  try {
    const res = await sources.fetch(ziel, {
      headers: { "User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    }, true);
    if (!res.ok) return null;
    const typ = res.headers.get("content-type") ?? "";
    if (!/text\/html|xml/i.test(typ)) return null;
    return { html: await res.text(), startseite: res.url || ziel };
  } catch {
    return null;
  }
}

async function abrufenMitZielAdapted(url: string) {
  const result = await abrufenMitZiel(url);
  return result ? { html: result.html, url: result.startseite } : null;
}

async function abrufen(ziel: string, timeoutMs = 15_000): Promise<string | null> {
  try {
    const res = await sources.fetch(ziel, {
      headers: { "User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    }, true);
    if (!res.ok) return null;
    const typ = res.headers.get("content-type") ?? "";
    if (!/text\/html|xml/i.test(typ)) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Wie viele Unter-Sitemaps eines Sitemap-Index gelesen werden.
 *
 * Eigener Deckel, absichtlich NICHT gegen `MAX_ABRUFE` verrechnet: Das sind
 * statische XML-Dateien, kein aufgebauter Seiteninhalt, und die Rücksichtsregel
 * meint den teuren Fall. Ein Deckel muss es trotzdem sein — stuttgart.de führt
 * 90 Unter-Sitemaps, und die alle zu holen wäre je Gemeinde ein Vielfaches des
 * gesamten übrigen Laufs.
 */
const SITEMAP_MAX_UNTER = 10;

/**
 * Alle Unter-Sitemaps eines Index lesen, nicht nur die erste (25.08.2026).
 *
 * Vorher stand hier `unter[0]` mit der Begründung, wir suchten „keine
 * Vollständigkeit, sondern einen guten Einstieg". Das war bei einer geteilten
 * Sitemap kein Einstieg, sondern ein Zufallstreffer: Welche Datei zuerst steht,
 * entscheidet das Redaktionssystem, nicht der Inhalt. Gemessen an den elf
 * Index-Fällen einer 50er-Stichprobe: stuttgart.de lieferte **null** Funde,
 * obwohl seine Förderseite in einer der 90 Dateien steht (rekursiv: 216),
 * potsdam.de 1 statt 52. Betroffen ist rund ein Fünftel der Kommunal-Domains —
 * und zwar die einwohnerstärksten, weil nur große Websites ihre Sitemap teilen.
 *
 * Gelesen werden die Dateien mit den aussagekräftigsten NAMEN zuerst: Eine
 * `sitemap-umwelt.xml` schlägt eine `sitemap-news.xml`. Wo die Namen nichts
 * hergeben (`sitemap-1.xml`, der häufigere Fall), bleibt die Reihenfolge des
 * Index erhalten — die Sortierung ist stabil und ändert dann nichts.
 *
 * Eine Verschachtelungsebene wird mitgenommen: Ein Index, der auf weitere
 * Indizes zeigt, kommt vor. Tiefer nicht — dort hört die Ersparnis auf und die
 * Zahl der Dateien wächst multiplikativ.
 */
async function ausSitemapIndex(unter: string[], startseite: string): Promise<LinkKandidat[]> {
  const gefunden: LinkKandidat[] = [];
  const gesehen = new Set<string>();
  const warteschlange = sitemapIndexReihenfolge(unter);

  let gelesen = 0;
  let verschachtelt = false;
  while (warteschlange.length && gelesen < SITEMAP_MAX_UNTER) {
    const url = warteschlange.shift()!;
    if (gesehen.has(url)) continue;
    gesehen.add(url);
    const xml = await abrufen(url, 10_000);
    gelesen++;
    if (!xml) continue;
    const tiefer = sitemapIndex(xml);
    if (tiefer.length) {
      // Ein Index im Index — einmal, dann ist Schluss.
      if (!verschachtelt) {
        verschachtelt = true;
        warteschlange.unshift(...tiefer.filter((u) => !gesehen.has(u)));
      }
      continue;
    }
    gefunden.push(...sitemapKandidaten(xml, startseite));
  }
  return gefunden;
}

/**
 * Die Förderseite einer Gemeinde suchen.
 *
 * Drei Wege, absichtlich in dieser Reihenfolge:
 *  1. Die Startseite und die besten Links daraus — der Weg, der immer geht.
 *  2. Die sitemap.xml, falls vorhanden — findet tiefer liegende Seiten, die im
 *     Menü der Startseite nicht auftauchen.
 *  3. **Die Volltextsuche der Website selbst** — aber nur, wenn 1 und 2 nichts
 *     ergeben haben.
 *
 * Warum die Suche zuletzt und nur im Notfall (19.08.2026): Gemessen an 9.722
 * durchsuchten Gemeinden fanden Weg 1 und 2 zusammen nur bei 13 % eine
 * Förderseite; 7.863 blieben ohne Fund. Für die 13 %, bei denen es klappt,
 * ändert sich nichts — sie kosten keinen zusätzlichen Abruf. Die Mehrkosten
 * fallen genau dort an, wo bisher gar nichts herauskam, und das ist der ganze
 * Zweck.
 *
 * Höchstens `TIEFE` Ebenen und `MAX_ABRUFE` Anfragen je Gemeinde. Die Grenze ist
 * kein Sparzwang, sondern Rücksicht: Das hier läuft über tausende fremde
 * Verwaltungs-Server, und ein Crawler, der sich festbeißt, ist ein Ärgernis, das
 * uns irgendwann aussperrt. Deshalb steigt die Grenze mit der Suche nur um die
 * zwei Anfragen, die sie wirklich braucht — nicht auf Vorrat.
 */
const TIEFE = 2;
const MAX_ABRUFE = 9;

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
export function setDiscoveryReaderForAudit(reader: FundingSourceReader) { sources = reader; }

export async function sucheFoerderseite(gemeldeteAdresse: string, mode: "legacy" | "improved" = "improved", priorLeads: FundingLead[] = []): Promise<{ beste: LinkKandidat | null; funde: LinkKandidat[]; abrufe: number; erreichbar: boolean; leads?: FundingLead[]; remaining?: number }> {
  let abrufe = 0;
  const erstAbruf = await abrufenMitZiel(gemeldeteAdresse);
  abrufe++;
  if (!erstAbruf) return { beste: null, funde: [], abrufe, erreichbar: false };
  // Ab hier gilt die Adresse NACH der Umleitung, nicht die erfasste (25.08.2026).
  const { html, startseite } = erstAbruf;

  const gesehen = new Set<string>([startseite]);
  let kandidaten = linkKandidaten(html, startseite);

  // Die Sitemap ergänzt, was im Menü der Startseite fehlt.
  if (abrufe < MAX_ABRUFE) {
    const basis = new URL(startseite).origin;
    const sm = await abrufen(`${basis}/sitemap.xml`, 10_000);
    abrufe++;
    if (sm) {
      const unter = sitemapIndex(sm);
      if (unter.length) {
        kandidaten = kandidaten.concat(await ausSitemapIndex(unter, startseite));
      } else {
        kandidaten = kandidaten.concat(sitemapKandidaten(sm, startseite));
      }
    }
  }

  kandidaten.sort((a, b) => b.punkte - a.punkte);

  // Jede Adresse, die für sich eine Förderseite ist — nicht nur die beste.
  const alleFunde = new Map<string, LinkKandidat>();
  const merken = (liste: LinkKandidat[]) => {
    for (const k of liste) {
      if (!istEndergebnis(k) || istInterneRoute(k.url) || istVorlagenRest(k.url)) continue;
      alleFunde.set(seitenSchluessel(k.url), k);
    }
  };
  merken(kandidaten);

  // Ab hier zählt der Unterschied zwischen VERFOLGEN und ANNEHMEN. Verfolgt wird
  // der beste Link überhaupt — auch eine reine Themenseite („Klimaschutz und
  // Energie"), denn die ist oft der Weg zur Förderseite. Angenommen wird nur,
  // was von Geld UND vom Thema spricht.
  let ergebnis: LinkKandidat | null = kandidaten.find((k) => istEndergebnis(k)) ?? null;

  let leads: FundingLead[] = [];
  let remaining = 0;
  if (mode === "improved") {
    const walk = await walkFundingSources({ html, root: startseite, seeds: kandidaten, priorLeads, budget: Math.max(0, MAX_ABRUFE - abrufe - (ergebnis ? 0 : 2)), read: abrufenMitZielAdapted });
    abrufe += walk.requests; leads = walk.leads; remaining = walk.remaining;
    for (const [key] of walk.aliases) alleFunde.delete(key);
    for (const lead of walk.candidates) alleFunde.set(seitenSchluessel(lead.url), lead);
    ergebnis = [...alleFunde.values()].find(k => !leads.some(l => l.url === k.url && (l.relation === "published-external" || l.kind !== "page"))) ?? null;
  } else if (kandidaten.length) {
    let spur = kandidaten[0];
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
  }

  // Letzter Weg: die Volltextsuche der Website. NUR wenn bis hierhin nichts
  // herauskam — für die Gemeinden, bei denen der Crawl schon trägt, kostet sie
  // keinen Abruf.
  //
  // Das ist der eigentliche Hebel: Der Crawl sieht zwei Klicks weit und nur, was
  // verlinkt ist; die Suche der Website kennt deren ganzen Bestand. Eine
  // Förderseite unter „Bauen und Wohnen → Umwelt → Energie → Förderungen" ist
  // für den Crawl unsichtbar und für die Suche ein Treffer.
  if (!ergebnis && abrufe < MAX_ABRUFE) {
    let formular = suchFormular(html, startseite);

    // Kein Formular auf der Startseite? Dann liegt die Suche hinter einem
    // Lupen-Symbol, das sie per JavaScript einblendet — im ausgelieferten HTML
    // steht dann nichts. Die Suchseite selbst hat das Formular fast immer.
    // Gemessen am 19.08.2026 trugen nur 14 von 39 erreichbaren Startseiten ein
    // auswertbares Formular; das ist der Engpass dieses Wegs.
    if (!formular) {
      const wege: string[] = [];
      const verlinkt = suchseitenLink(html, startseite);
      if (verlinkt) wege.push(verlinkt);
      for (const p of SUCHSEITEN_PFADE) {
        const u = new URL(p, startseite).toString();
        if (!wege.includes(u)) wege.push(u);
      }
      // Höchstens zwei Versuche: der verlinkte Weg und ein geratener. Danach
      // fällt der Ertrag steil ab, die Abrufe gegen fremde Server nicht.
      for (const w of wege.slice(0, 2)) {
        if (abrufe >= MAX_ABRUFE) break;
        const seite = await abrufen(w);
        abrufe++;
        if (!seite) continue;
        formular = suchFormular(seite, w);
        if (formular) break;
      }
    }

    if (formular) {
      for (const begriff of SUCH_BEGRIFFE) {
        if (abrufe >= MAX_ABRUFE) break;
        const trefferSeite = await abrufen(suchAdresse(formular, begriff));
        abrufe++;
        if (!trefferSeite) continue;
        // Die Trefferliste läuft durch dieselbe Bewertung wie jede andere Seite.
        // Wichtig ist der Ausschluss der Suchseite selbst: Sie verlinkt sich
        // gern mit Blätter- und Sortierlinks, die alle dieselbe Adresse tragen.
        const treffer = linkKandidaten(trefferSeite, startseite).filter(
          (k) => !gesehen.has(k.url) && k.url !== formular.action,
        );
        merken(treffer);
        if (mode === "improved") for (const candidate of treffer) {
          if (!leads.some(lead => lead.url === candidate.url)) {
            leads.push({ ...candidate, referrer: suchAdresse(formular, begriff), relation: "same-site", kind: "page", depth: 1, via: "published-link" });
            remaining++;
          }
        }
        const gut = treffer.find((k) => istEndergebnis(k));
        if (gut) { ergebnis = gut; break; }
      }
    }
  }

  // Gedeckelt: Mehr als eine Handvoll echter Förderseiten hat keine Gemeinde;
  // was darüber liegt, ist Rauschen aus einer Übersichtsseite.
  const sorted = [...alleFunde.values()].sort((a, b) => b.punkte - a.punkte);
  const funde = mode === "legacy" ? sorted.slice(0, MAX_SEITEN_JE_GEMEINDE) : qualifiedFundingSources(leads);
  if (mode === "improved") ergebnis = funde.find(f => (f as FundingLead).kind === "page") ?? null;
  return { beste: ergebnis, funde, abrufe, erreichbar: true, leads, remaining };
}

type SuchZeile = DiscoveryRecord & { region_id: string };

/**
 * Nur die Gemeinden EINES Schubs, die noch keinen Brief bekommen haben.
 *
 * WOZU: Vor einem Versand ist die Frage nicht „welche Gemeinde ist die
 * größte", sondern „wissen wir bei DIESEN Briefen alles, was wir wissen
 * könnten". Ohne die Einschränkung arbeitet der Lauf seine eigene Reihenfolge
 * ab (größte zuerst) und käme an die anstehenden Briefe vielleicht nie.
 *
 * Die Reihenfolge INNERHALB bleibt unverändert — hier wird nur der Topf
 * kleiner, nicht die Regel eine andere.
 */
async function nurSchub(schub: string): Promise<Set<string>> {
  const zeilen = await alleZeilen<{ region_id: string }>(
    "kommunen_kontakt",
    "region_id",
    (q) => q.eq("kampagne", schub).is("contacted_at", null),
  );
  return new Set(zeilen.map((z) => z.region_id));
}

async function offeneKandidaten(limit: number, schub?: string) {
  const kontakte = await alleZeilen<{ region_id: string; website: string | null; thema_foerderung_url: string | null }>(
    "kommunen_kontakt",
    "region_id, website, thema_foerderung_url",
    (q) => q.not("website", "is", null),
  );
  const nur = schub ? await nurSchub(schub) : null;
  // Bis 19.08.2026 stand hier: „Wer schon eine Förderseite hat, braucht keine
  // Suche." Das galt, solange wir ohnehin nur eine Adresse je Gemeinde halten
  // konnten — jetzt ist es genau falsch herum. Bei den Gemeinden MIT Fund liegen
  // die zweiten und dritten Seiten, die vorher auf den Boden fielen; sie zu
  // überspringen hieße, den Umbau bei denen nicht wirken zu lassen, über die wir
  // am meisten wissen. Wer wirklich fertig ist, fällt unten über `erledigt`
  // heraus — über den Versionsstempel, nicht über das Vorhandensein einer Adresse.
  const ohneSeite = nur ? kontakte.filter((k) => nur.has(k.region_id)) : kontakte;

  const abgelegt = await alleZeilen<SuchZeile>("funding_url_suche", "region_id, website, verdikt, such_version, checked_at");
  const zeileVon = new Map(abgelegt.map((r) => [r.region_id, r]));
  const now = new Date().toISOString();
  const regionArg = process.argv.indexOf("--region");
  const selectedRegions = regionArg >= 0 ? new Set((process.argv[regionArg + 1] ?? "").split(",").filter(Boolean)) : null;
  if (selectedRegions && !selectedRegions.size) throw new Error("--region requires at least one municipality identifier");
  const rest = ohneSeite.filter(k => (!selectedRegions || selectedRegions.has(k.region_id)) && discoveryDue(zeileVon.get(k.region_id), k.website!, SUCH_VERSION, now) && sources.due(k.website!));
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
      .sort((a, b) => (zeileVon.get(a.region_id)?.checked_at ?? "").localeCompare(zeileVon.get(b.region_id)?.checked_at ?? "") || (pop.get(b.region_id) ?? 0) - (pop.get(a.region_id) ?? 0))
      .slice(0, limit)
      .map((r) => ({ region_id: r.region_id, website: r.website! })),
    schonUnerreichbar,
  };
}

async function stand(): Promise<void> {
  const { gesamt, erledigt } = await offeneKandidaten(1);
  const zeilen = await alleZeilen<SuchZeile>("funding_url_suche", "region_id, website, verdikt, such_version, checked_at");
  const z = new Map<string, number>();
  for (const r of zeilen) z.set(r.verdikt, (z.get(r.verdikt) ?? 0) + 1);
  const prozent = gesamt ? Math.round((erledigt / gesamt) * 100) : 0;
  console.log(`URL-Suche: ${erledigt} von ${gesamt} Gemeinden derzeit nicht zur erneuten Suche fällig (${prozent} %).`);
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

async function externeFundstellen(): Promise<void> {
  const { data, error, count } = await sb.from("funding_discovery_leads")
    .select("region_id,url,evidence", { count: "exact" })
    .eq("evidence->>relation", "published-external")
    .eq("evidence->>substantiveSignal", "true")
    .order("observed_at", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  console.log(`${count ?? 0} externe Quellen-Zuordnungen mit Textsignal; keine bestätigten kommunalen Programme. Zeige höchstens 50.`);
  for (const row of data ?? []) console.log(`${row.region_id} · ${row.url}\n  Veröffentlicht auf: ${row.evidence.referrer}`);
}

async function main(): Promise<void> {
  await sources.ready();
  if (process.argv.includes("--stand")) return stand();
  if (process.argv.includes("--funde")) return funde();
  if (process.argv.includes("--externe")) return externeFundstellen();

  const limit = zahl("limit", 60);
  const iS = process.argv.indexOf("--schub");
  const schub = iS >= 0 ? process.argv[iS + 1] : undefined;
  const { gesamt, erledigt, naechste, schonUnerreichbar } = await offeneKandidaten(limit, schub);
  console.log(
    (schub ? `Schub „${schub}", noch nicht angeschrieben. ` : "") +
      `Durchsucht vorher: ${erledigt} von ${gesamt}. Nehme mir jetzt ${naechste.length} vor.\n`,
  );

  const zaehler = new Map<SuchVerdikt, number>();
  let unerreichbarInFolge = 0;
  let abgebrochen = false;
  let fertig = 0;

  await inSchueben(naechste, zahl("gleichzeitig", 6), async (k) => {
    if (abgebrochen) return;
    const { data: carried, error: carriedError } = await sb.from("funding_discovery_leads")
      .select("evidence").eq("region_id", k.region_id).is("searched_at", null);
    if (carriedError) throw new Error(carriedError.message);
    const priorLeads = (carried ?? []).map(row => row.evidence as FundingLead).filter(lead => !lead.duplicateOf && sources.due(lead.url));
    const { value: { beste, funde, erreichbar, leads = [], remaining = 0 }, unreadable } = await sources.withEvidence(() => sucheFoerderseite(k.website, "improved", priorLeads));
    recordStage("discovery-result", { region_id: k.region_id, url: k.website, extracted: funde.length, unreadable, remaining, leads, evaluated_at: new Date().toISOString() });
    const verdikt: SuchVerdikt = !erreichbar ? "unerreichbar" : unreadable.length || remaining ? "unvollstaendig" : funde.length ? "gefunden" : "keine-seite";
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
    // zuvor unerreichbaren. Deshalb zählen nur FRISCHE Fehlschläge.
    const frischerFehlschlag = !erreichbar && !schonUnerreichbar.has(k.region_id);
    unerreichbarInFolge = frischerFehlschlag ? unerreichbarInFolge + 1 : erreichbar ? 0 : unerreichbarInFolge;
    if (unerreichbarInFolge >= 15 && !abgebrochen) {
      abgebrochen = true;
      console.error("\n15 Websites in Folge nicht erreichbar — Lauf abgebrochen. Erst die eigene Verbindung prüfen.");
      return;
    }

    const { error: saveError } = await sb.from("funding_url_suche").upsert({
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

    if (saveError) throw new Error(saveError.message);

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

    if (leads.length) {
      const rows = leads.map(lead => ({ region_id: k.region_id, url: lead.url,
        observed_at: new Date().toISOString(), evidence: lead,
        searched_at: lead.attempted ? new Date().toISOString() : null }));
      const { error } = await sb.from("funding_discovery_leads").upsert(rows,
        { onConflict: "region_id,url", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
      const attempted = rows.filter(row => row.searched_at);
      if (attempted.length) {
        const { error: attemptError } = await sb.from("funding_discovery_leads").upsert(attempted, { onConflict: "region_id,url" });
        if (attemptError) throw new Error(attemptError.message);
      }
    }

    // Und ALLE Funde in die Seiten-Tabelle. Das ist die Stelle, an der die
    // Erfassung mehr als eine Seite je Gemeinde behalten kann — `upsert` mit
    // dem Schlüssel (Gemeinde × Adresse) macht den Lauf idempotent und
    // überschreibt kein Leseergebnis, weil nur die Fund-Spalten geschrieben werden.
    if (funde.length) {
      const { error: pagesError } = await sb.from("funding_seiten").upsert(
        funde.map((f) => ({
          region_id: k.region_id,
          url: seitenSchluessel(f.url),
          quelle: "suche",
          zustand: leads.find(l => l.url === f.url)?.observed ? "erreichbar" : "unbekannt",
        })),
        { onConflict: "region_id,url", ignoreDuplicates: true },
      );
      if (pagesError) throw new Error(pagesError.message);
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

if (process.argv[1] && /funding-discover\.ts$/.test(process.argv[1])) main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
