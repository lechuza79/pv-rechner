/**
 * Zeigt die persönliche Rechner-Adresse eines Fachbetriebs.
 *
 * Die Adresse trägt eine aus der Domain abgeleitete Kennung (siehe
 * `lib/fachbetrieb-seite.ts`) — sie steht nirgends in der Datenbank und lässt
 * sich nur mit dem Geheimnis erzeugen. Ohne dieses Werkzeug käme man beim
 * Versand und beim Nachsehen nicht an sie heran.
 *
 * Aufruf:
 *   npm run fachbetrieb:link -- --suche <teil des namens oder der domain>
 *   npm run fachbetrieb:link -- --erste 5
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { kennungAusGeheimnis } from "../lib/fachbetrieb-kennung";

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// Dieselbe Ableitung wie die Seite — aus EINER Quelle importiert, nicht
// nachgebaut: Eine auseinanderlaufende Kennung führte jeden verschickten Link
// lautlos ins Leere.

const SITE = "https://solar-check.io";

async function main(): Promise<void> {
  loadEnvFile();
  const geheimnis = process.env.CRON_SECRET;
  if (!geheimnis) throw new Error("CRON_SECRET fehlt (.env.local)");

  const args = process.argv.slice(2);
  const sucheIdx = args.indexOf("--suche");
  const suche = sucheIdx >= 0 ? args[sucheIdx + 1]?.toLowerCase() : null;
  const ersteIdx = args.indexOf("--erste");
  const erste = ersteIdx >= 0 ? Number(args[ersteIdx + 1]) : suche ? 50 : 5;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen");
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, key, { auth: { persistSession: false } });

  let q = db
    .from("fachbetriebe")
    .select("domain, firmenname, ort, plz")
    .eq("art", "betrieb")
    .order("domain", { ascending: true });
  if (suche) q = q.or(`domain.ilike.%${suche}%,firmenname.ilike.%${suche}%`);

  const { data, error } = await q.limit(erste);
  if (error) throw new Error(`Datenbank: ${error.message}`);
  const zeilen = (data ?? []) as { domain: string; firmenname: string | null; ort: string | null; plz: string | null }[];

  if (zeilen.length === 0) {
    console.log("Kein Betrieb gefunden.");
    return;
  }

  for (const z of zeilen) {
    const k = kennungAusGeheimnis(z.domain, geheimnis);
    const ort = [z.plz, z.ort].filter(Boolean).join(" ");
    console.log(`${z.firmenname ?? z.domain}${ort ? ` · ${ort}` : ""}`);
    console.log(`  ${SITE}/fuer/${k}`);
    console.log(`  (${z.domain})\n`);
  }
}

main().catch((e) => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
