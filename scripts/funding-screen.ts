import { municipalReviewQueue, validateMunicipalReviews, type InquiryReceipt } from "../lib/funding-municipal-review";
import municipalReviews from "../data/funding/municipal-reviews.json";
import { ABSCHLIESSENDE_ERGEBNISSE, urteilPasstZurMessung, groupedPendingFundingSources, pendingFundingSources, type ReviewSource } from "../lib/funding-source-review";
import { abschliessendesErgebnis, notizMitHerkunft } from "../lib/funding-altergebnis";
import { seitenAbrufAdressen, seitenSchluessel } from "../lib/funding-seiten";
import { FundingSourceReader, FundingSourceUnreadable, recordStage } from "./lib/funding-source-reader";
/**
 * Abdeckungs-Screening: alle Gemeinden mit Förderseite systematisch durchsehen.
 *
 *   npm run foerder:screen                 # nächste 120 offene Kandidaten
 *   npm run foerder:screen -- --limit 400
 *   npm run foerder:screen -- --stand      # nur Fortschritt zeigen
 *   npm run foerder:screen -- --treffer    # gefundene Kandidaten auflisten
 *
 * WARUM (18.08.2026): Der Katalog soll VOLLSTÄNDIG werden, nicht stichprobenhaft
 * (Vorgabe des Betreibers). 971 Gemeinden haben eine erfasste Förderseite, die
 * wir nicht führen. Ein Durchgang schafft die nie; ohne Gedächtnis begänne jeder
 * Lauf wieder bei den größten und käme nie in die Tiefe — dasselbe Problem, das
 * der Prüf-Arbeitsvorrat für die bekannten Programme schon gelöst hat.
 *
 * Deshalb: Jede geprüfte Gemeinde wird mit Ergebnis abgelegt (`funding_coverage`),
 * jeder Lauf nimmt sich die nächsten offenen vor, größte zuerst. Der Fortschritt
 * ist damit eine Zahl und keine Einschätzung.
 *
 * WAS DIESES SKRIPT ENTSCHEIDET — und was nicht: Es ruft die Seite ab und
 * sortiert grob vor. Es entscheidet NICHT, ob ein Programm in den Katalog kommt,
 * welche Sätze gelten oder ob eine Förderung noch läuft: Das braucht Lesen und
 * Urteilsvermögen und bleibt beim Wächter-Lauf. Ein `treffer` heißt „hier lohnt
 * sich das Hinsehen", nicht „hier gibt es Geld".
 *
 * DREI TECHNIKEN STATT EINER (18.08.2026): Bis hierhin suchte der Lauf nur nach
 * Photovoltaik; Wärmepumpen kannte er gar nicht, und Steckersolar lag in
 * derselben Wortliste wie Dach-PV — Balkon-Treffer waren deshalb nicht als
 * solche erkennbar und blieben liegen. Die Einordnung selbst steht jetzt in
 * `lib/funding-screen-erkennung.ts`, wo sie einen Test hat.
 *
 * Und damit das nicht folgenlos bleibt: Jede Zeile trägt die Version der
 * Erkennung, mit der sie entstand. Die knapp 900 bereits abgehakten Seiten
 * wurden mit der PV-only-Fassung geprüft und kommen von selbst wieder dran —
 * sonst stünde „95 % gescreent" da, während für zwei von drei Techniken nie
 * jemand hingesehen hat.
 */

import { resolve } from "node:path";
import { heuteInBerlin } from "../lib/zeit";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { FUNDING_PROGRAMS } from "../lib/funding-programs";
import {
  einordnen, sichtbarerText, SCREEN_VERSION,
  type ScreenVerdikt, type ScreenTechnik,
} from "../lib/funding-screen-erkennung";
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
const sources = new FundingSourceReader(sb, "screen", process.argv.includes("--dry"));

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

function zahl(name: string, standard: number): number {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : standard;
}

/**
 * Alle Zeilen einer Tabelle — PostgREST liefert stumm höchstens 1.000.
 *
 * BLOCKER, nicht Kosmetik: Der Lauf las seinen eigenen Fortschritt bisher mit
 * einem einfachen `select` und lag mit 918 Zeilen knapp unter der Grenze. Beim
 * nächsten Schub wäre er darüber gerutscht — dann hätte er Gemeinden erneut
 * abgerufen, die längst abgehakt sind, und der Fortschrittsbalken wäre bei
 * gleichbleibend „95 %" stehengeblieben, ohne dass irgendetwas kaputt aussieht.
 * Mit der Ausweitung auf die rund 9.500 Gemeinden ohne erfasste Förderseite ist
 * das kein Randfall mehr, sondern der Normalfall.
 */
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

type CoverageZeile = {
  region_id: string;
  verdict: string;
  screen_version: number | null;
  techniken: string | null;
  gelesen_am: string | null;
  gelesen_ergebnis: string | null;
};

async function offeneKandidaten(limit: number) {
  const kk = await alleZeilen<{ region_id: string; thema_foerderung_url: string | null }>(
    "kommunen_kontakt",
    "region_id, thema_foerderung_url",
    (q) => q.not("thema_foerderung_url", "is", null),
  );

  const gefuehrt = Object.values(FUNDING_PROGRAMS)
    .map((p) => p.agsCode)
    .filter(Boolean) as string[];
  const offenIds = kk
    .filter((r) => !gefuehrt.some((a) => String(r.region_id).startsWith(a)))
    .map((r) => r.region_id);

  const abgelegt = await alleZeilen<CoverageZeile>(
    "funding_coverage",
    "region_id, verdict, screen_version, techniken, gelesen_am, gelesen_ergebnis",
  );
  const zeileVon = new Map(abgelegt.map((r) => [r.region_id, r]));

  /**
   * Ist diese Gemeinde erledigt?
   *
   * Drei Gründe, sie erneut vorzunehmen — und der dritte ist der wichtigste:
   *  1. noch nie angesehen,
   *  2. beim letzten Mal nicht erreichbar gewesen,
   *  3. mit einer ÄLTEREN Erkennung geprüft. Die knapp 900 abgehakten Seiten
   *     liefen durch eine Fassung, die Wärmepumpen nicht kannte; sie als
   *     „geprüft" zu führen hieße, für zwei von drei Techniken eine Prüfung zu
   *     behaupten, die nie stattgefunden hat.
   */
  const erledigt = (id: string): boolean => {
    const z = zeileVon.get(id);
    if (!z) return false;
    if (z.verdict === "unerreichbar") return false;
    return (z.screen_version ?? 1) >= SCREEN_VERSION;
  };

  const byId = new Map(kk.map(k => [k.region_id, k.thema_foerderung_url!]));
  const rest = offenIds.filter((id) => !erledigt(id) && sources.due(byId.get(id)!));
  const pop = new Map<string, number>();
  for (let i = 0; i < rest.length; i += 500) {
    const { data: reg } = await sb.from("mastr_regions").select("region_id, population, name").in("region_id", rest.slice(i, i + 500));
    for (const r of (reg ?? []) as { region_id: string; population: number | null; name: string }[]) {
      pop.set(r.region_id, r.population ?? 0);
    }
  }
  const urlVon = new Map(kk.map((r) => [r.region_id, r.thema_foerderung_url as string]));

  // Nie angesehene zuerst, dann die mit veralteter Erkennung — bei beiden die
  // größten voran. Eine unbekannte Seite kann JEDE Technik bringen, eine
  // veraltete nur noch die zwei, die der alte Lauf nicht kannte.
  const nieGesehen = (id: string) => !zeileVon.has(id);
  const naechste = rest
    .sort((a, b) => Number(nieGesehen(b)) - Number(nieGesehen(a)) || (pop.get(b) ?? 0) - (pop.get(a) ?? 0))
    .slice(0, limit)
    .map((id) => ({ region_id: id, url: urlVon.get(id)!, einwohner: pop.get(id) ?? 0 }));

  return {
    gesamt: offenIds.length,
    erledigt: offenIds.length - rest.length,
    nachzuholen: rest.filter((id) => zeileVon.has(id)).length,
    naechste,
  };
}

async function stand(): Promise<void> {
  const { gesamt, erledigt, nachzuholen } = await offeneKandidaten(1);
  const zeilen = await alleZeilen<CoverageZeile>("funding_coverage", "region_id, verdict, screen_version, techniken, gelesen_am, gelesen_ergebnis");
  const z = new Map<string, number>();
  for (const r of zeilen) z.set(r.verdict, (z.get(r.verdict) ?? 0) + 1);
  const prozent = gesamt ? Math.round((erledigt / gesamt) * 100) : 0;
  console.log(`Abdeckung: ${erledigt} von ${gesamt} Gemeinden mit Förderseite gescreent (${prozent} %).`);
  for (const [v, n] of [...z].sort((a, b) => b[1] - a[1])) console.log(`   ${v}: ${n}`);

  // Je Technik zählen — die Gesamtzahl allein verdeckt, dass Wärmepumpen bis
  // zum 18.08.2026 überhaupt nicht gesucht wurden.
  const jeTechnik = new Map<string, number>();
  for (const r of zeilen) {
    for (const t of (r.techniken ?? "").split(",").filter(Boolean)) {
      jeTechnik.set(t, (jeTechnik.get(t) ?? 0) + 1);
    }
  }
  if (jeTechnik.size) {
    console.log("\nTreffer je Technik:");
    for (const [t, n] of [...jeTechnik].sort((a, b) => b[1] - a[1])) console.log(`   ${t}: ${n}`);
  }
  if (nachzuholen) {
    console.log(
      `\n${nachzuholen} Gemeinden wurden mit einer älteren Erkennung geprüft und stehen wieder an.\n` +
        `Bis die durch sind, sagt die Abdeckung nichts über Balkon und Wärmepumpe.`,
    );
  }
}

async function treffer(): Promise<void> {
  // --technik pv|balkon|waermepumpe grenzt die Leseliste auf einen Rechner ein.
  const i = process.argv.indexOf("--technik");
  const nurTechnik = i >= 0 ? (process.argv[i + 1] as ScreenTechnik) : null;

  const alle = await alleZeilen<{
    region_id: string; url: string; evidence: string | null; techniken: string | null;
    gelesen_am: string | null; gelesen_ergebnis: string | null;
  }>(
    "funding_coverage",
    "region_id, url, evidence, techniken, gelesen_am, gelesen_ergebnis",
    (q) => q.eq("verdict", "treffer"),
  );

  // Schon gelesene Seiten fallen raus — BLOCKER für die Brauchbarkeit der Liste.
  //
  // Der Screener stuft eine Seite bei JEDEM Lauf neu ein, und eine Seite, die
  // ein Mensch gelesen und verworfen hat, bleibt für ihn ein Treffer: Hildens
  // „PhotovoltaikCheck" ist eine Beratung, Vaterstettens PV-Position gilt
  // Planungsleistungen für Garagenhöfe — beide sehen im Text wie Förderung aus
  // und sind keine. Ohne dieses Gedächtnis stünden sie morgen wieder oben, und
  // bei mehreren hundert Fundstellen liest irgendwann niemand mehr eine Liste,
  // die zur Hälfte aus schon Abgelehntem besteht. Dasselbe Prinzip wie beim
  // Prüf-Arbeitsvorrat und beim Abdeckungs-Screening selbst.
  const mitGelesenen = process.argv.includes("--alle");
  const nachTechnik = nurTechnik ? alle.filter((r) => (r.techniken ?? "").split(",").includes(nurTechnik)) : alle;
  const rows = mitGelesenen ? nachTechnik : nachTechnik.filter((r) => !r.gelesen_am);
  const verborgen = nachTechnik.length - rows.length;
  if (!rows.length) {
    console.log(verborgen ? `Nichts Offenes — ${verborgen} Treffer sind bereits gelesen (--alle zeigt sie).` : "Noch keine Treffer.");
    return;
  }

  const { data: reg } = await sb
    .from("mastr_regions")
    .select("region_id, name, population")
    .in("region_id", rows.map((r) => r.region_id));
  const info = new Map(((reg ?? []) as any[]).map((r) => [r.region_id, { name: r.name as string, pop: (r.population ?? 0) as number }]));

  // Nach SEITE gruppieren, nicht nach Gemeinde — BLOCKER für die Brauchbarkeit.
  // Verbandsgemeinden teilen sich eine Förderseite: Die Liste zeigte 98 Treffer,
  // von denen ein Dutzend dieselbe Seite von Kirchberg (Hunsrück) war, jeweils
  // für einen 90-Seelen-Ort. Zu lesen ist die Seite einmal; die Gemeinden
  // dahinter sind nur ihr Geltungsbereich.
  const seiten = new Map<string, { orte: string[]; pop: number; beleg: string | null; techniken: Set<string> }>();
  for (const r of rows) {
    const e = seiten.get(r.url) ?? { orte: [], pop: 0, beleg: r.evidence, techniken: new Set<string>() };
    const i = info.get(r.region_id);
    e.orte.push(i?.name ?? r.region_id);
    e.pop += i?.pop ?? 0;
    for (const t of (r.techniken ?? "").split(",").filter(Boolean)) e.techniken.add(t);
    seiten.set(r.url, e);
  }

  const sortiert = [...seiten.entries()].sort((a, b) => b[1].pop - a[1].pop);
  console.log(
    `Treffer: ${sortiert.length} Seiten (für ${rows.length} Gemeinden), größte zuerst` +
      (verborgen ? ` — ${verborgen} bereits gelesene ausgeblendet` : "") + ":\n",
  );
  for (const [url, e] of sortiert) {
    const orte = e.orte.length > 3 ? `${e.orte.slice(0, 3).join(", ")} und ${e.orte.length - 3} weitere` : e.orte.join(", ");
    const tech = e.techniken.size ? `  [${[...e.techniken].join(", ")}]` : "";
    console.log(`  ${orte} — zusammen ${e.pop.toLocaleString("de-DE")} Einw.${tech}`);
    console.log(`     ${url}`);
    if (e.beleg) console.log(`     „…${e.beleg.slice(0, 180)}…"`);
  }
}

/** Die Version, mit der diese Gemeinde zuletzt geprüft wurde (für Fehlversuche). */
async function zeileVersion(regionId: string): Promise<number | null> {
  const { data } = await sb.from("funding_coverage").select("screen_version").eq("region_id", regionId).maybeSingle();
  return (data?.screen_version as number | undefined) ?? null;
}

/** Every municipality/URL association, including additional sources hidden by coverage summaries. */
async function quellen(): Promise<void> {
  const rows = await alleZeilen<ReviewSource & { techniken: string | null; zustand: string }>(
    "funding_seiten",
    "region_id,url,techniken,zustand,gelesen_am,gelesen_ergebnis,gelesen_notiz,seite_geaendert_am",
    (q) => q.order("region_id").order("url"),
  );
  if (process.argv.includes("--kommunen")) {
    const receipts = await alleZeilen<InquiryReceipt>("funding_anfragen", "program_id,gesendet_am,beleg,antwort_am", q => q.order("id"));
    console.log(JSON.stringify(municipalReviewQueue(rows, validateMunicipalReviews(municipalReviews), receipts, new Date().toISOString()), null, 2));
    return;
  }
  const pending = pendingFundingSources(rows);
  if (process.argv.includes("--gruppiert")) {
    const groups = groupedPendingFundingSources(rows);
    console.log(JSON.stringify({ totalSources: rows.length, pendingSources: pending.length, uniquePendingSources: groups.length, groups }, null, 2));
    return;
  }
  console.log(JSON.stringify({ totalSources: rows.length, pendingSources: pending.length, sources: process.argv.includes("--alle") ? rows : pending }, null, 2));
}

/**
 * Alte Freitext-Urteile in ein abschließendes Ergebnis umdeuten.
 *
 *   npm run foerder:screen -- --altergebnisse              # nur zeigen
 *   npm run foerder:screen -- --altergebnisse --schreiben  # wirklich umdeuten
 *
 * Die Zuordnung steht in lib/funding-altergebnis.ts als exakte Tabelle und ist
 * dort von Tests festgenagelt; hier wird nichts nachformuliert. Ohne `--schreiben`
 * passiert nichts — ein versehentlicher Lauf soll nicht 267 fremde Urteile
 * umdeuten.
 */
async function altergebnisse(): Promise<void> {
  const rows = await alleZeilen<ReviewSource>(
    "funding_seiten",
    "region_id,url,gelesen_am,gelesen_ergebnis,gelesen_notiz,seite_geaendert_am",
    (q) => q.order("region_id").order("url"),
  );
  const offen = pendingFundingSources(rows).filter((r) => r.gelesen_am);
  const umzudeuten: { zeile: ReviewSource; neu: string }[] = [];
  const vonHand = new Map<string, number>();
  for (const zeile of offen) {
    const neu = abschliessendesErgebnis({ ergebnis: zeile.gelesen_ergebnis, notiz: zeile.gelesen_notiz });
    if (neu) umzudeuten.push({ zeile, neu });
    else {
      const wort = (zeile.gelesen_ergebnis ?? "").trim();
      vonHand.set(wort, (vonHand.get(wort) ?? 0) + 1);
    }
  }
  const schreiben = process.argv.includes("--schreiben");
  console.log(`${offen.length} gelesene Zeilen liegen trotzdem im Vorrat.`);
  console.log(`  ${umzudeuten.length} lassen sich nach der Tabelle abhaken, ${offen.length - umzudeuten.length} bleiben.\n`);
  const nachWort = new Map<string, number>();
  for (const { neu } of umzudeuten) nachWort.set(neu, (nachWort.get(neu) ?? 0) + 1);
  for (const [wort, anzahl] of [...nachWort].sort((a, b) => b[1] - a[1])) console.log(`  → ${wort}: ${anzahl}`);
  console.log("\nBleibt liegen (von Hand oder frisch messen):");
  for (const [wort, anzahl] of [...vonHand].sort((a, b) => b[1] - a[1])) console.log(`  ${String(anzahl).padStart(4)}  ${wort}`);
  if (!schreiben) {
    console.log("\nProbelauf — nichts geschrieben. Mit --schreiben wird umgedeutet.");
    return;
  }
  let geschrieben = 0;
  for (const { zeile, neu } of umzudeuten) {
    const { error } = await sb
      .from("funding_seiten")
      .update({ gelesen_ergebnis: neu, gelesen_notiz: notizMitHerkunft(zeile.gelesen_notiz, zeile.gelesen_ergebnis ?? "") })
      .eq("region_id", zeile.region_id)
      .eq("url", zeile.url);
    if (error) throw new Error(`${zeile.region_id} ${zeile.url}: ${error.message}`);
    geschrieben += 1;
  }
  console.log(`\n${geschrieben} Zeilen umgedeutet, der alte Wortlaut steht jeweils in der Notiz.`);
}

/**
 * Eine Fundstelle als gelesen abhaken.
 *
 *   npm run foerder:screen -- --gelesen 05370020 --url https://example.de/foerderung --ergebnis aufgenommen --beleg "150 € je Anlage"
 *   npm run foerder:screen -- --gelesen 13074001 --url beispiel.de/weg --ergebnis quelle-entfernt --tot
 *   Reviews require one municipality and one currently readable source.
 *
 * `ergebnis` ist bewusst frei und nicht auf eine Auswahl festgelegt: Was beim
 * Lesen herauskommt, ist mehr als aufgenommen/verworfen — „Betrag nur im PDF"
 * und „Träger antwortet nicht" sind eigene Zustände, und eine zu enge Liste
 * drängt sie in die falsche Schublade.
 *
 * ABGEHAKT WERDEN BEIDE TABELLEN — und dass das bis zum 09.09.2026 nicht so war,
 * ist die Ursache des größten Rückstaus im Katalog. Die Seiten-Tabelle führt seit
 * ihrer Einführung ein Feld „gelesen am"; geschrieben hat es kein einziges
 * Werkzeug. Gemessen an diesem Tag: 275 als Treffer eingestufte Seiten, keine
 * davon je abgehakt, 144 als Balkonkraftwerk eingeordnet. Konstanz lag drei
 * Wochen darunter, während wir sein Programm über eine fremde Liste fanden.
 *
 * Ein Vorrat, aus dem nichts herausgenommen werden kann, wächst nur — und sieht
 * dabei aus wie ein Vorrat, an dem gearbeitet wird.
 *
 * Each review identifies one municipality and one source with a current quote.
 */
async function gelesen(): Promise<void> {
  const wert = (name: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : null;
  };
  const roh = wert("gelesen");
  const ergebnis = wert("ergebnis");
  if (!roh || !ergebnis) {
    console.error(`Aufruf: --gelesen <region_id> --url <url> (--beleg <quote> | --tot) --ergebnis <${[...ABSCHLIESSENDE_ERGEBNISSE].join(" | ")}> [--notiz <text>]`);
    process.exit(1);
  }
  // EIN FREITEXT-ERGEBNIS HAKT NICHTS AB — BLOCKER (20.09.2026).
  // Eine Zeile verlässt den Vorrat nur, wenn ihr Ergebnis eines der
  // abschließenden Wörter ist (`pendingFundingSources`). Jedes andere Wort
  // schreibt zwar Datum und Beleg, lässt die Zeile aber stehen — von einer
  // NIE gelesenen Zeile ist sie danach nicht zu unterscheiden, und genau so
  // sinkt der Vorrat nicht, obwohl gearbeitet wurde.
  //   Gemessen an diesem Tag: 625 der 2.375 gelesenen Zeilen (26 %) tragen
  //   Freitext — „verworfen", „Adresse entfernt (404/410 beim Gegenlesen)" —
  //   und liegen deshalb weiter im Vorrat von 13.905. Mir selbst ist es in
  //   diesem Lauf mit drei Zeilen passiert, bevor ich es gemessen habe.
  //   Dieselbe Fehlerklasse wie der Vorrat, aus dem nichts herausgenommen
  //   werden konnte: von außen unsichtbar, weil die Zahl dabei genau so
  //   aussieht wie bei ehrlicher Arbeit.
  // Die Prosa gehört in `--notiz`; `--ergebnis` trägt das Urteil.
  if (!ABSCHLIESSENDE_ERGEBNISSE.has(ergebnis.trim().toLowerCase())) {
    console.error(
      `„${ergebnis}" ist kein abschließendes Ergebnis — die Zeile bliebe im Vorrat stehen, als wäre sie nie gelesen worden.\n` +
        `Erlaubt: ${[...ABSCHLIESSENDE_ERGEBNISSE].join(", ")}\n` +
        `Die Begründung gehört in --notiz.`,
    );
    process.exit(1);
  }
  const ids = roh.split(",").map((x) => x.trim()).filter(Boolean);
  const eintrag = {
    gelesen_am: heuteInBerlin(),
    gelesen_ergebnis: ergebnis,
    gelesen_notiz: wert("notiz"),
  };
  const sourceUrl = wert("url");
  const quote = wert("beleg");
  // EINE TOTE ADRESSE IST EIN BEFUND, KEIN HINDERNIS (20.09.2026). Bis heute
  // verlangte jedes Abhaken einen Beleg AUS der Seite — eine Adresse, die mit
  // 404 antwortet, konnte deshalb nie aus dem Vorrat heraus. Gemessen an
  // diesem Tag: 1.767 der 13.401 offenen Quellzeilen (13 %) stehen auf
  // Adressen, die der Seiten-Wächter selbst als unerreichbar führt. Ein
  // Vorrat, aus dem nichts herausgenommen werden kann, wächst nur.
  //   GEMESSEN WIRD TROTZDEM, NIE GEGLAUBT: Der abgelegte Zustand taugt dafür
  //   nicht. In einer Stichprobe von 14 solchen Adressen antworteten SECHS
  //   heute mit HTTP 200 — darunter zwei, deren Name ein Förderprogramm
  //   verspricht. Wer nach dem Zustandsfeld abhakt, wirft jede dritte lesbare
  //   Förderseite weg, ohne sie gesehen zu haben.
  //   Deshalb: `--tot` ersetzt den Beleg nicht durch eine Annahme, sondern
  //   durch eine MESSUNG im selben Augenblick. Sie muss `missing` ergeben
  //   (HTTP 404/410) — das ist die einzige Antwort, die etwas über die Quelle
  //   sagt. `blocked`, `shell`, `network` und `server` sagen etwas über
  //   unseren Versuch und lassen die Zeile stehen; antwortet die Adresse gar
  //   normal, gilt wieder die Belegpflicht.
  const tot = process.argv.includes("--tot");
  if (ids.length !== 1 || !sourceUrl || (!quote && !tot)) throw new Error("Ein Ort, --url und --beleg sind für eine Quellenprüfung erforderlich (--tot statt --beleg nur für eine nachweislich entfernte Adresse).");
  if (tot && quote) throw new Error("--tot und --beleg schließen einander aus: entweder steht der Beleg in der Seite oder die Seite ist weg.");
  const normalized = seitenSchluessel(sourceUrl);
  const { data: page, error: lookupError } = await sb.from("funding_seiten").select("url").eq("region_id", ids[0]).eq("url", normalized).maybeSingle();
  if (lookupError || !page) throw new Error(lookupError?.message ?? "Die genaue Förderseite ist nicht erfasst.");
  // Der Abgleich identifiziert sich wie der Screening-Lauf zehn Zeilen weiter
  // unten — ohne die Kennung antwortet ein Teil der Amtsseiten mit 403, und
  // ein Abhaken darf an der Kennung nicht scheitern. `verify` statt `fetch`:
  // ein gescheiterter GEGENLESE-Versuch ist keine Beobachtung über die Quelle
  // und sperrt sie deshalb nicht (siehe FundingSourceReader.verify).
  // Abgerufen wird ueber DENSELBEN Adressweg wie in den Seiten-Laeufen
  // (`seitenAbrufAdressen`): Der gespeicherte Schluessel traegt weder Schema
  // noch „www." und bei rund jeder neunten Adresse eine HTML-Maskierung
  // (`&amp;`), die ein Server als Parameter namens „amp;…" liest. Wer hier
  // die Rohadresse nimmt, laesst ein Abhaken an der Schreibweise scheitern —
  // dieselbe Klasse wie die fehlende Kennung eine Zeile weiter unten.
  let response: Response | undefined;
  let letzterFehler: unknown;
  const gruende: (string | null)[] = [];
  for (const adresse of seitenAbrufAdressen(sourceUrl)) {
    try {
      response = await sources.verify(adresse, {
        headers: { "User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9" },
        redirect: "follow",
        signal: AbortSignal.timeout(25000),
      });
      break;
    } catch (fehler) {
      letzterFehler = fehler;
      gruende.push(fehler instanceof FundingSourceUnreadable ? fehler.reason : null);
    }
  }
  // JEDE Schreibweise muss „weg" ergeben, nicht irgendeine. `seitenAbrufAdressen`
  // probiert mehrere Formen derselben Adresse; genügte eine 404 darunter, hakte
  // ein Tippfehler in der Erfassung die Zeile ab, während die richtige Form
  // die Förderseite ausliefert.
  const entfernt = !response && gruende.length > 0 && gruende.every((g) => g === "missing");
  if (tot) {
    if (response) throw new Error("Die Adresse antwortet — kein Fall für --tot, sondern für --beleg.");
    if (!entfernt) throw letzterFehler ?? new Error("Die Quelle war nicht lesbar.");
  } else {
    if (!response) throw letzterFehler ?? new Error("Die Quelle war nicht lesbar.");
    const original = await response.text();
    if (!sichtbarerText(quote!) || !sichtbarerText(original).includes(sichtbarerText(quote!))) throw new Error("Der Beleg steht nicht im aktuell gelesenen Original.");
  }
  // DAS URTEIL MUSS ZUR MESSUNG PASSEN — geprüft, NACHDEM gemessen wurde, weil
  // erst dann feststeht, ob die Adresse wirklich weg ist. Die Regel selbst
  // steht als eigene Funktion in lib/funding-source-review.
  const unpassend = urteilPasstZurMessung(ergebnis, tot);
  if (unpassend) throw new Error(unpassend);
  const nachweis = tot ? "HTTP 404/410 beim Gegenlesen am " + heuteInBerlin() : quote!;
  const { error } = await sb.from("funding_seiten").update({ ...eintrag, gelesen_notiz: JSON.stringify({ url: sourceUrl, quote: nachweis, entfernt: tot || undefined, note: wert("notiz"), reviewed_at: new Date().toISOString() }) }).eq("region_id", ids[0]).eq("url", normalized);
  if (error) throw new Error(error.message);
  recordStage("review", { region_id: ids[0], url: sourceUrl, quote: nachweis, entfernt: tot, reviewed_at: new Date().toISOString(), result: ergebnis });
  // Preserve the legacy one-page view only when it refers to this exact URL.
  const { data: coverage } = await sb.from("funding_coverage").select("url").eq("region_id", ids[0]).maybeSingle();
  if (coverage?.url && seitenSchluessel(coverage.url) === normalized) {
    const { error: coverageError } = await sb.from("funding_coverage").update({ ...eintrag, gelesen_notiz: JSON.stringify({ url: sourceUrl, quote: nachweis, entfernt: tot || undefined }) }).eq("region_id", ids[0]).eq("url", coverage.url);
    if (coverageError) throw new Error(coverageError.message);
  }
  console.log(tot ? "Eine entfernte Quelle als geprüft vermerkt (Adresse antwortet mit 404/410)." : "Eine konkrete Quelle als gelesen vermerkt.");
}

async function main(): Promise<void> {
  if (process.argv.includes("--quellen") || process.argv.includes("--kommunen")) return quellen();
  if (process.argv.includes("--altergebnisse")) return altergebnisse();
  await sources.ready();
  if (process.argv.includes("--stand")) return stand();
  if (process.argv.includes("--gelesen")) return gelesen();
  if (process.argv.includes("--treffer")) return treffer();

  const limit = zahl("limit", 120);
  const { gesamt, erledigt, naechste } = await offeneKandidaten(limit);
  console.log(`Abdeckung vorher: ${erledigt} von ${gesamt}. Nehme mir jetzt ${naechste.length} vor.\n`);

  const zaehler = new Map<ScreenVerdikt, number>();
  const jeTechnik = new Map<ScreenTechnik, number>();
  let fertig = 0;

  await inSchueben(naechste, zahl("gleichzeitig", 6), async (k) => {
    let html = "";
    let http = 0;
    for (const versuch of [0, 1]) {
      try {
        const res = await sources.fetch(k.url, {
          headers: { "User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9" },
          redirect: "follow",
          signal: AbortSignal.timeout(15_000 + versuch * 10_000),
        });
        http = res.status;
        if (res.ok) {
          html = await res.text();
          break;
        }
      } catch {
        http = 0;
      }
    }

    const befund = html
      ? einordnen(sichtbarerText(html))
      : { verdikt: "unerreichbar" as ScreenVerdikt, techniken: [] as ScreenTechnik[], beleg: "" };
    recordStage("screen-result", { region_id: k.region_id, url: k.url, extracted: befund.techniken.length, verdict: befund.verdikt, evaluated_at: new Date().toISOString() });
    zaehler.set(befund.verdikt, (zaehler.get(befund.verdikt) ?? 0) + 1);
    for (const t of befund.techniken) jeTechnik.set(t, (jeTechnik.get(t) ?? 0) + 1);

    await sb.from("funding_coverage").upsert({
      region_id: k.region_id,
      url: k.url,
      verdict: befund.verdikt,
      techniken: befund.techniken.join(",") || null,
      // Der Versionsstempel wird NUR bei einem echten Abruf gesetzt. Eine
      // unerreichbare Seite hat die neue Erkennung nicht gesehen — sie als
      // geprüft zu stempeln nähme sie dauerhaft aus dem Arbeitsvorrat.
      screen_version: html ? SCREEN_VERSION : ((await zeileVersion(k.region_id)) ?? 1),
      evidence: befund.beleg || null,
      http,
      checked_at: new Date().toISOString(),
    });

    if (++fertig % 100 === 0) console.log(`   … ${fertig} von ${naechste.length}`);
  });

  console.log("Ergebnis dieses Laufs:");
  for (const [v, n] of [...zaehler].sort((a, b) => b[1] - a[1])) console.log(`   ${v}: ${n}`);
  if (jeTechnik.size) {
    console.log("   davon mit Signal für:");
    for (const [t, n] of [...jeTechnik].sort((a, b) => b[1] - a[1])) console.log(`      ${t}: ${n}`);
  }
  console.log("");
  await stand();
  console.log("\nTreffer ansehen: npm run foerder:screen -- --treffer");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
