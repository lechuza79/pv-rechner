/**
 * Carry hand-proven municipal mailboxes into the contact list AND the evidence
 * store the last send check reads (scripts/lib/handbelege.ts).
 *
 * Input: JSON Lines, one object per town:
 *   {region_id, email, rolle: "klima"|"presse"|"allgemein", verwaltung_domain,
 *    beleg_url, ok, grund, live_nicht_lesbar?}
 *
 * The proven address replaces whatever the letter would have used: a person
 * read the administration's page and chose it. The role decides the column;
 * a general mailbox is marked "handpruefung", which the send check treats as
 * proven (lib/kommunen-presse.ts).
 *
 *   npx tsx scripts/kommunen-handbelege-eintragen.ts <datei.jsonl> [--schreiben]
 */
import { loadEnvConfig } from "@next/env";
import { readFileSync } from "node:fs";
import { handbelegSchreiben } from "./lib/handbelege";
import { heuteInBerlin } from "../lib/zeit";

loadEnvConfig(process.cwd());
const U = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_KEY;
if (!U || !K) throw new Error("Supabase-Zugang fehlt");
const H = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" };
const schreiben = process.argv.includes("--schreiben");

type Zeile = {
  region_id: string;
  email: string | null;
  rolle?: string;
  verwaltung_domain?: string | null;
  beleg_url: string | null;
  ok: boolean;
  grund?: string;
  live_nicht_lesbar?: boolean;
};

async function main() {
  const datei = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!datei) throw new Error("Datei fehlt");
  let n = 0;
  let uebersprungen = 0;
  for (const l of readFileSync(datei, "utf8").split("\n").filter(Boolean)) {
    const r = JSON.parse(l) as Zeile;
    if (!r.ok || !r.email || !r.beleg_url) {
      uebersprungen++;
      continue;
    }
    const e = r.email.trim().toLowerCase();
    const patch: Record<string, unknown> =
      r.rolle === "klima"
        ? { klima_email: e, presse_kontakt_email: null }
        : r.rolle === "presse"
          ? { klima_email: null, presse_kontakt_email: e }
          : { klima_email: null, presse_kontakt_email: null, presse_email: null, rollen_email: e, rollen_email_quelle: "handpruefung" };
    patch.verwaltung_domain = r.verwaltung_domain || e.split("@")[1];
    if (!schreiben) {
      n++;
      continue;
    }
    const alt = (await (await fetch(`${U}/rest/v1/kommunen_kontakt?select=notes&region_id=eq.${r.region_id}`, { headers: H })).json()) as { notes: string | null }[];
    const notiz = `[${heuteInBerlin()}] Handprüfung: ${e} (${r.beleg_url})${r.grund ? ` — ${r.grund}` : ""}`;
    patch.notes = alt[0]?.notes ? `${alt[0].notes}\n${notiz}` : notiz;
    const res = await fetch(`${U}/rest/v1/kommunen_kontakt?region_id=eq.${r.region_id}`, { method: "PATCH", headers: H, body: JSON.stringify(patch) });
    if (!res.ok) throw new Error(`${r.region_id}: HTTP ${res.status} ${await res.text()}`);
    handbelegSchreiben(r.region_id, {
      email: e,
      url: r.beleg_url,
      quelle: "handpruefung",
      rolle: r.rolle,
      liveNichtLesbar: r.live_nicht_lesbar ?? false,
      geprueftAm: heuteInBerlin(),
    });
    n++;
  }
  console.log(JSON.stringify({ schreiben, eingetragen: n, uebersprungen }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
