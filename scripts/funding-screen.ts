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
    "region_id, verdict, screen_version, techniken",
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

  const rest = offenIds.filter((id) => !erledigt(id));
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
  const zeilen = await alleZeilen<CoverageZeile>("funding_coverage", "region_id, verdict, screen_version, techniken");
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

  const alle = await alleZeilen<{ region_id: string; url: string; evidence: string | null; techniken: string | null }>(
    "funding_coverage",
    "region_id, url, evidence, techniken",
    (q) => q.eq("verdict", "treffer"),
  );
  const rows = nurTechnik ? alle.filter((r) => (r.techniken ?? "").split(",").includes(nurTechnik)) : alle;
  if (!rows.length) return console.log("Noch keine Treffer.");

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
  console.log(`Treffer: ${sortiert.length} Seiten (für ${rows.length} Gemeinden), größte zuerst:\n`);
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

async function main(): Promise<void> {
  if (process.argv.includes("--stand")) return stand();
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
        const res = await fetch(k.url, {
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
