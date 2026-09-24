/**
 * Tagesbericht der Förder-Erfassung — was die Läufe bewegt haben.
 *
 *   npm run foerder:bericht            # messen, ablegen, ggf. melden
 *   npm run foerder:bericht -- --dry   # nur anzeigen
 *
 * WARUM (19.08.2026): Die vier Läufe der Erfassung — Suche, Seiten-Wächter,
 * Technik-Einordnung, Screening — schreiben ihre Zahlen ins Workflow-Protokoll.
 * Das liest niemand. Ein Automatismus, dessen Ergebnis nirgends ankommt, ist von
 * einem stillstehenden nicht zu unterscheiden; genau daran ist die Urlaubswoche
 * im August aufgefallen, in der fünf Tage lang kein Wächter lief und es keinem
 * auffiel.
 *
 * DIE SCHLEUSE BLEIBT, WIE SIE IST. Der Bericht geht an `/api/alert` und landet
 * damit in der Ablage (`/admin/waechter`) — zugestellt wird er nur, wenn er eine
 * ENTSCHEIDUNG enthält, die dem Betreiber gehört. Reine Fortschrittszahlen sind
 * keine: „10 Gemeinde-Technik-Kombinationen warten aufs Lesen" ist Arbeit, keine Frage an ihn.
 *
 * DER VERGLEICH KOMMT AUS DER ABLAGE, nicht aus einer Uhr: Der letzte Bericht
 * desselben Tags trägt seinen Zählerstand mit, daraus entsteht die Bewegung.
 * Ohne Vergleich ist eine Tageszahl kein Bericht, sondern ein Kontostand.
 */

import { resolve } from "node:path";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { technikenLesen, programmDecktSeite } from "../lib/funding-seiten";
import { EVIDENCE_DIR } from "./lib/funding-source-reader";
import { summarizeEvidence, type RunObservation } from "../lib/funding-run-evidence";
import { pendingFundingSources, groupedPendingFundingSources } from "../lib/funding-source-review";
import { municipalReviewQueue, validateMunicipalReviews, type InquiryReceipt } from "../lib/funding-municipal-review";
import municipalReviews from "../data/funding/municipal-reviews.json";
import type { FundingTechnik } from "../lib/funding-programs";

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
const dry = process.argv.includes("--dry");

const TAG = "foerder-erfassung";
const TECHNIKEN: FundingTechnik[] = ["pv", "balkon", "waermepumpe"];

type Zaehler = {
  seiten: number;
  eingeordnet: number;
  unerreichbar: number;
  treffer: number;
  programme: number;
  zuLesen: number;
  quellenOffen: number;
  originaleOffen: number;
  kommunenGesamt: number;
  kommunenGeklaert: number;
  kommunenStatus: Record<string, number>;
  jeTechnik: Record<string, number>;
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

async function messen(): Promise<Zaehler> {
  const seiten = await alleZeilen<any>(
    "funding_seiten",
    "region_id, url, techniken, screen_verdikt, screen_version, gelesen_am, gelesen_ergebnis, gelesen_notiz, seite_geaendert_am, zustand",
  );
  const prog = await alleZeilen<any>("funding_programs", "id, data");
  const receipts = await alleZeilen<InquiryReceipt>("funding_anfragen", "program_id,gesendet_am,beleg,antwort_am");
  const municipal = municipalReviewQueue(seiten, validateMunicipalReviews(municipalReviews), receipts, new Date().toISOString());

  const gefuehrt = (region: string, technik: string): boolean =>
    prog.some((p) => {
      const a = String(p.data?.agsCode ?? "");
      if (!a) return false;
      return programmDecktSeite(a, region) && (p.data?.foerdert ?? ["pv"]).includes(technik);
    });

  const jeTechnik: Record<string, number> = {};
  const luecken = new Set<string>();
  for (const t of TECHNIKEN) jeTechnik[t] = 0;

  const gemeindenJeTechnik: Record<string, Set<string>> = {};
  for (const t of TECHNIKEN) gemeindenJeTechnik[t] = new Set();

  for (const s of seiten) {
    if (s.screen_verdikt !== "treffer") continue;
    for (const t of technikenLesen(s.techniken)) {
      gemeindenJeTechnik[t].add(s.region_id);
      if (!s.gelesen_ergebnis && !gefuehrt(s.region_id, t)) luecken.add(`${s.region_id}|${t}`);
    }
  }
  for (const t of TECHNIKEN) jeTechnik[t] = gemeindenJeTechnik[t].size;

  return {
    seiten: seiten.length,
    quellenOffen: pendingFundingSources(seiten).length,
    originaleOffen: groupedPendingFundingSources(seiten).length,
    kommunenGesamt: municipal.totalMunicipalities,
    kommunenGeklaert: municipal.completedMunicipalities,
    kommunenStatus: municipal.counts,
    eingeordnet: seiten.filter((s) => s.screen_version).length,
    unerreichbar: seiten.filter((s) => s.zustand === "unerreichbar").length,
    treffer: seiten.filter((s) => s.screen_verdikt === "treffer").length,
    programme: prog.length,
    zuLesen: luecken.size,
    jeTechnik,
  };
}

/** Zählerstand des letzten Berichts — daraus wird die Bewegung. */
async function vorheriger(): Promise<Zaehler | null> {
  const { data, error } = await sb
    .from("waechter_reports")
    .select("details")
    .eq("tag", TAG)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error || !data?.length) return null;
  const m = String(data[0].details ?? "").match(/<!--zaehler ([\s\S]*?)-->/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as Zaehler;
  } catch {
    return null;
  }
}

function delta(neu: number, alt: number | undefined): string {
  if (alt === undefined) return "";
  const d = neu - alt;
  if (d === 0) return " (unverändert)";
  return d > 0 ? ` (+${d})` : ` (${d})`;
}

async function main(): Promise<void> {
  const jetzt = await messen();
  const vorher = await vorheriger();

  const done = [
    `Fachliche Prüfung: ${jetzt.quellenOffen} offene Quellenzuordnungen${delta(jetzt.quellenOffen, vorher?.quellenOffen)} aus ${jetzt.originaleOffen} unterschiedlichen Originaladressen. Ein vorhandenes Katalogprogramm schließt weitere Quellen nicht ab.`,
    `Kommunen mit erfassten Quellen oder Handprüfung: ${jetzt.kommunenGeklaert} von ${jetzt.kommunenGesamt} geklärt${delta(jetzt.kommunenGeklaert, vorher?.kommunenGeklaert)}; keine bundesweite Vollabdeckung. Zustände: ${JSON.stringify(jetzt.kommunenStatus)}.`,
    `${jetzt.seiten} Förderseiten erfasst${delta(jetzt.seiten, vorher?.seiten)}, davon ${jetzt.eingeordnet} eingeordnet${delta(jetzt.eingeordnet, vorher?.eingeordnet)}`,
    `Gemeinden mit Fundstelle — Photovoltaik ${jetzt.jeTechnik.pv}${delta(jetzt.jeTechnik.pv, vorher?.jeTechnik?.pv)}, ` +
      `Balkonkraftwerk ${jetzt.jeTechnik.balkon}${delta(jetzt.jeTechnik.balkon, vorher?.jeTechnik?.balkon)}, ` +
      `Wärmepumpe ${jetzt.jeTechnik.waermepumpe}${delta(jetzt.jeTechnik.waermepumpe, vorher?.jeTechnik?.waermepumpe)}`,
    `${jetzt.programme} Programme im Katalog${delta(jetzt.programme, vorher?.programme)}`,
    `${jetzt.zuLesen} Gemeinde-Technik-Kombinationen warten aufs Lesen${delta(jetzt.zuLesen, vorher?.zuLesen)}`,
    `${jetzt.unerreichbar} Seiten nicht erreichbar${delta(jetzt.unerreichbar, vorher?.unerreichbar)}`,
  ];

  const { count: pendingSources, error: pendingError } = await sb.from("funding_discovery_leads")
    .select("url", { count: "exact", head: true }).is("searched_at", null);
  if (pendingError) throw new Error(pendingError.message);
  done.push(`${pendingSources ?? 0} veröffentlichte Quellen-Zuordnungen warten auf Fortsetzung der Suche; keine zusätzlichen bestätigten Programme.`);

  const observations: RunObservation[] = existsSync(EVIDENCE_DIR) ? readdirSync(EVIDENCE_DIR).filter(f => f.endsWith(".jsonl")).flatMap(f =>
    readFileSync(resolve(EVIDENCE_DIR, f), "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line))) : [];
  const evidence = summarizeEvidence(observations);
  const steps = process.env.FUNDING_STEP_OUTCOMES ? JSON.parse(process.env.FUNDING_STEP_OUTCOMES) : null;
  done.push(`Dieser Lauf: ${evidence.attempted} Abrufversuche, ${evidence.readable} lesbare Antworten, ${evidence.extracted} Einordnungen mit Treffern, ${evidence.reviewed} einzelne Fachprüfungen.`);
  done.push(`Abrufhindernisse: ${JSON.stringify(evidence.failures)}. Keine Vollständigkeitsquote.`);
  done.push(steps ? `Schrittabschlüsse: ${JSON.stringify(steps)}` : "Schrittabschlüsse nicht übergeben; vollständiger Lauf nicht belegt.");
  // Stagnant stock counts are not evidence of a stopped process. This report
  // archives observations only and never sends mail.
  const decisions: string[] = [];
  const details =
    done.map((z) => `• ${z}`).join("\n") +
    `\n\n<!--zaehler ${JSON.stringify(jetzt)}-->\n<!--lauf ${JSON.stringify({ evidence, steps, artifact: process.env.FUNDING_RUN_ID ?? null })}-->`;

  console.log(`Förder-Erfassung — Tagesbericht\n`);
  for (const z of done) console.log(`  • ${z}`);
  if (decisions.length) console.log(`\n  ENTSCHEIDUNG: ${decisions[0]}`);
  if (dry) return;

  const { error } = await sb.from("waechter_reports").insert({ tag: TAG, subject: jetzt.quellenOffen || jetzt.kommunenGeklaert < jetzt.kommunenGesamt ? "Förder-Erfassung: Lauf beendet, fachliche Prüfung offen" : "Förder-Erfassung: Laufbericht", decisions, done, details, delivered: false, skip_reason: "evidence-only" });
  if (error) throw new Error(`Abschlussbericht nicht gespeichert: ${error.message}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
