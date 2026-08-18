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
 */

import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { FUNDING_PROGRAMS } from "../lib/funding-programs";

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
 * Die Einordnung einer Seite. Bewusst grob und nachvollziehbar — ein Verdikt,
 * das niemand nachrechnen kann, taugt nicht als Arbeitsgrundlage.
 */
type Verdikt =
  /** PV/Solar UND ein Förder-Signal (Zuschuss, Betrag) — lohnt das Hinsehen. */
  | "treffer"
  /** Spricht über PV, aber erkennbar als beendet/ausgelaufen. */
  | "ausgelaufen"
  /** Förderseite ohne jeden PV-Bezug (Fassaden, Innenstadt, Wohnraum …). */
  | "kein-pv"
  /** Seite nicht abrufbar — kommt beim nächsten Lauf wieder dran. */
  | "unerreichbar";

function sichtbarerText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const PV = /(photovoltaik|solaranlage|solarstrom|solarthermie|balkonkraftwerk|stecker-?pv|batteriespeicher|stromspeicher)/;
const GELD = /(zuschuss|förderung|gefördert|fördersatz|förderhöhe|€|euro)/;
const BEENDET = /(beendet|eingestellt|ausgelaufen|ausgeschöpft|keine anträge|nicht mehr möglich|geschlossen|außer kraft)/;

function einordnen(text: string): { verdikt: Verdikt; beleg: string } {
  if (!PV.test(text)) return { verdikt: "kein-pv", beleg: "" };

  const treffer = text.match(PV);
  const stelle = treffer?.index ?? 0;
  const umfeld = text.slice(Math.max(0, stelle - 220), stelle + 320).trim();

  // "Beendet" nur werten, wenn es NAH am PV-Treffer steht — sonst schlägt jeder
  // Hinweis auf ein anderes ausgelaufenes Programm auf der Seite durch.
  if (BEENDET.test(umfeld)) return { verdikt: "ausgelaufen", beleg: umfeld.slice(0, 400) };
  if (GELD.test(umfeld)) return { verdikt: "treffer", beleg: umfeld.slice(0, 400) };
  return { verdikt: "kein-pv", beleg: umfeld.slice(0, 200) };
}

async function offeneKandidaten(limit: number) {
  const { data: kk, error } = await sb
    .from("kommunen_kontakt")
    .select("region_id, thema_foerderung_url")
    .not("thema_foerderung_url", "is", null);
  if (error) throw new Error(`Kontaktdaten nicht lesbar: ${error.message}`);

  const gefuehrt = Object.values(FUNDING_PROGRAMS)
    .map((p) => p.agsCode)
    .filter(Boolean) as string[];
  const offenIds = (kk ?? [])
    .filter((r) => !gefuehrt.some((a) => String(r.region_id).startsWith(a)))
    .map((r) => r.region_id as string);

  const { data: schon } = await sb.from("funding_coverage").select("region_id");
  const geprueft = new Set((schon ?? []).map((r) => r.region_id as string));

  // Unerreichbare kommen wieder dran, alles andere gilt als erledigt.
  const { data: retry } = await sb.from("funding_coverage").select("region_id").eq("verdict", "unerreichbar");
  for (const r of retry ?? []) geprueft.delete(r.region_id as string);

  const rest = offenIds.filter((id) => !geprueft.has(id));
  const pop = new Map<string, number>();
  for (let i = 0; i < rest.length; i += 500) {
    const { data: reg } = await sb.from("mastr_regions").select("region_id, population, name").in("region_id", rest.slice(i, i + 500));
    for (const r of (reg ?? []) as { region_id: string; population: number | null; name: string }[]) {
      pop.set(r.region_id, r.population ?? 0);
    }
  }
  const urlVon = new Map((kk ?? []).map((r) => [r.region_id as string, r.thema_foerderung_url as string]));
  return {
    gesamt: offenIds.length,
    erledigt: offenIds.length - rest.length,
    naechste: rest
      .sort((a, b) => (pop.get(b) ?? 0) - (pop.get(a) ?? 0))
      .slice(0, limit)
      .map((id) => ({ region_id: id, url: urlVon.get(id)!, einwohner: pop.get(id) ?? 0 })),
  };
}

async function stand(): Promise<void> {
  const { gesamt, erledigt } = await offeneKandidaten(1);
  const { data } = await sb.from("funding_coverage").select("verdict");
  const z = new Map<string, number>();
  for (const r of (data ?? []) as { verdict: string }[]) z.set(r.verdict, (z.get(r.verdict) ?? 0) + 1);
  const prozent = gesamt ? Math.round((erledigt / gesamt) * 100) : 0;
  console.log(`Abdeckung: ${erledigt} von ${gesamt} Gemeinden mit Förderseite gescreent (${prozent} %).`);
  for (const [v, n] of [...z].sort((a, b) => b[1] - a[1])) console.log(`   ${v}: ${n}`);
}

async function treffer(): Promise<void> {
  const { data } = await sb
    .from("funding_coverage")
    .select("region_id, url, evidence")
    .eq("verdict", "treffer")
    .order("checked_at", { ascending: false });
  const rows = (data ?? []) as { region_id: string; url: string; evidence: string | null }[];
  if (!rows.length) return console.log("Noch keine Treffer.");
  const { data: reg } = await sb.from("mastr_regions").select("region_id, name, population").in("region_id", rows.map((r) => r.region_id));
  const namen = new Map(((reg ?? []) as any[]).map((r) => [r.region_id, `${r.name} (${r.population ?? "?"} Einw.)`]));
  console.log(`Treffer, die noch niemand gelesen hat: ${rows.length}\n`);
  for (const r of rows) {
    console.log(`  ${namen.get(r.region_id) ?? r.region_id}`);
    console.log(`     ${r.url}`);
    if (r.evidence) console.log(`     „…${r.evidence.slice(0, 200)}…"`);
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--stand")) return stand();
  if (process.argv.includes("--treffer")) return treffer();

  const limit = zahl("limit", 120);
  const { gesamt, erledigt, naechste } = await offeneKandidaten(limit);
  console.log(`Abdeckung vorher: ${erledigt} von ${gesamt}. Nehme mir jetzt ${naechste.length} vor.\n`);

  const zaehler = new Map<Verdikt, number>();
  for (const k of naechste) {
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

    const { verdikt, beleg } = html ? einordnen(sichtbarerText(html)) : { verdikt: "unerreichbar" as Verdikt, beleg: "" };
    zaehler.set(verdikt, (zaehler.get(verdikt) ?? 0) + 1);

    await sb.from("funding_coverage").upsert({
      region_id: k.region_id,
      url: k.url,
      verdict: verdikt,
      evidence: beleg || null,
      http,
      checked_at: new Date().toISOString(),
    });
  }

  console.log("Ergebnis dieses Laufs:");
  for (const [v, n] of [...zaehler].sort((a, b) => b[1] - a[1])) console.log(`   ${v}: ${n}`);
  console.log("");
  await stand();
  console.log("\nTreffer ansehen: npm run foerder:screen -- --treffer");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
