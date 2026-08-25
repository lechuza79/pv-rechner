/**
 * Reparatur-Lauf für die Versorger, deren Website nicht erreichbar war.
 *
 * Gemessen 24.08.2026 über alle 910: 97 nicht erreicht — 64 Verbindungsfehler,
 * 23 Bot-Sperren, 7 falsche Pfade. Bei den Verbindungsfehlern liegt der
 * Verdacht auf der GESPEICHERTEN Adresse, nicht auf der Website: falsches
 * Schema, `www` zu viel oder zu wenig, ein Pfad, den es nicht mehr gibt.
 *
 * Der Lauf probiert die naheliegenden Schreibweisen durch und schreibt die
 * Adresse um, die wirklich antwortet. Er ändert NICHTS anderes — die Erhebung
 * selbst läuft danach normal über die reparierten Adressen.
 *
 * Was er ausdrücklich NICHT tut: sich als Browser ausgeben, um eine Bot-Sperre
 * zu umgehen. Eine Sperre ist eine Entscheidung des Betreibers dieser Website;
 * sie zu umgehen wäre dieselbe Sorte Trick, die das Projekt bei den
 * Förder-Trägern abgelehnt hat. Gesperrte Versorger bleiben gesperrt und werden
 * als solche vermerkt.
 *
 * Nutzung:
 *   tsx scripts/versorger-adressen-reparieren.ts            # nur messen
 *   tsx scripts/versorger-adressen-reparieren.ts --schreiben
 */

import { dirname, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PARALLEL, holeSeite, inHaeppchen } from "../lib/website-abruf";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function log(msg = "", level: "info" | "ok" | "err" = "info"): void {
  const prefix = level === "ok" ? "✓ " : level === "err" ? "✗ " : "  ";
  // eslint-disable-next-line no-console
  console.log(msg ? prefix + msg : "");
}

function loadEnvFile(): void {
  const envPath = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

async function makeClient(): Promise<SupabaseLike> {
  loadEnvFile();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt in .env.local");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Die naheliegenden Schreibweisen einer Adresse, beste zuerst.
 *
 * Bewusst nur Varianten der VORHANDENEN Adresse — kein Raten neuer Domains.
 * Ein geratener Hostname trifft im Zweifel eine fremde Firma, und das wäre ein
 * stiller Fehler: Die Seite antwortet, sie gehört nur jemand anderem.
 */
export function schreibweisen(roh: string): string[] {
  let u: URL;
  try {
    u = new URL(roh.startsWith("http") ? roh : `https://${roh}`);
  } catch {
    return [];
  }
  const host = u.hostname.replace(/^www\./i, "");
  const aus = new Set<string>();
  // Erst die Wurzel: Ein gespeicherter Pfad ist der haeufigste Grund fuer 404.
  for (const h of [`www.${host}`, host]) {
    for (const schema of ["https", "http"]) {
      aus.add(`${schema}://${h}/`);
    }
  }
  return [...aus];
}

async function main(): Promise<void> {
  const schreiben = process.argv.includes("--schreiben");
  const db = await makeClient();

  const alle: { id: string; name: string; website: string | null; erhebung_fehler: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("utilities")
      .select("id,name,website,erhebung_fehler")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    alle.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const kaputt = alle.filter((r) => !!r.erhebung_fehler && !!r.website);
  log(`${kaputt.length} Versorger mit vermerktem Fehlgrund`);
  log(schreiben ? "Modus: messen UND schreiben" : "Modus: nur messen");
  log();

  const ergebnisse = await inHaeppchen(kaputt, PARALLEL, async (r) => {
    for (const kandidat of schreibweisen(r.website!)) {
      if (kandidat === r.website) continue;
      const seite = await holeSeite(kandidat);
      if ("html" in seite) {
        log(`${r.name}\n     ${r.website}  →  ${kandidat}`, "ok");
        return { r, neu: kandidat };
      }
    }
    return { r, neu: null };
  });

  const repariert = ergebnisse.filter((e) => e.neu);
  log();
  log(`repariert: ${repariert.length} von ${kaputt.length}`);
  const rest = ergebnisse.filter((e) => !e.neu);
  log(`bleibt unerreichbar: ${rest.length}`);
  for (const e of rest.slice(0, 15)) log(`  ${e.r.name} — ${e.r.erhebung_fehler}`);

  if (!schreiben) {
    log();
    log("Nichts geschrieben. Mit --schreiben übernehmen.");
    return;
  }
  for (const e of repariert) {
    await db.from("utilities").update({ website: e.neu, erhebung_fehler: null }).eq("id", e.r.id);
  }
  log();
  log(`${repariert.length} Adressen umgeschrieben.`, "ok");
}

main().catch((e) => {
  log(e instanceof Error ? e.message : String(e), "err");
  process.exit(1);
});
