/**
 * Every contact stock against every other — the check that did not exist
 * until 06.10.2026 (lib/bestand-abgleich.ts has the rule and its history).
 *
 *   npx tsx scripts/bestaende-abgleich.ts              # measure only
 *   npx tsx scripts/bestaende-abgleich.ts --schreiben  # demote what an official stock holds
 *
 * Only collisions with a clear answer are written: an installer on a domain
 * the register or the municipal record names. Everything else lands in the
 * decision list (scripts/.cache/bestaende-abgleich/entscheiden.json), because
 * either side can be the wrong one. Exit code 1 when a demotion is still
 * pending, so a scheduled run notices a regression.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { abgleichen, verdraengtGrund, type Belegung } from "../lib/bestand-abgleich";
import { ladeBelegungen } from "./lib/bestand-belegung";
import { MAIN_CHECKOUT } from "./lib/contact-v2-config";

const schreiben = process.argv.includes("--schreiben");

function env(key: string): string | undefined {
  const pfad = resolve(MAIN_CHECKOUT, ".env.local");
  if (existsSync(pfad)) {
    for (const zeile of readFileSync(pfad, "utf8").split("\n")) {
      const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return process.env[key];
}

async function main() {
  const url = env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { belegungen, bericht } = await ladeBelegungen(db);
  console.log("gelesen:", JSON.stringify(bericht.gelesen), bericht.fehlt.length ? `· fehlt: ${bericht.fehlt.join(", ")}` : "");

  // Every domain claimed by more than one stock, judged from each side.
  const verdraengen: { domain: string; id: string; grund: string }[] = [];
  const entscheiden: { domain: string; eintraege: Belegung[] }[] = [];
  let geteilt = 0;
  for (const [domain, liste] of belegungen) {
    const bestaende = new Set(liste.map((b) => b.bestand));
    if (bestaende.size < 2) continue;
    let offen = false;
    for (const b of liste) {
      const u = abgleichen(domain, b.bestand, belegungen, { herkunft: b.herkunft });
      if (u.art === "verdraengt" && b.bestand === "fachbetrieb") verdraengen.push({ domain, id: b.id, grund: verdraengtGrund(u) });
      else if (u.art === "entscheiden") offen = true;
      else if (u.art === "geteilt") geteilt++;
    }
    if (offen) entscheiden.push({ domain, eintraege: liste });
  }

  const dir = resolve(MAIN_CHECKOUT, "scripts/.cache/bestaende-abgleich");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "entscheiden.json"), JSON.stringify({ stand: new Date().toISOString(), entscheiden }, null, 1));

  console.log(`verdrängt (amtliche Quelle geht vor): ${verdraengen.length}`);
  console.log(`geteilt (dieselbe Organisation in zwei Rollen): ${geteilt}`);
  console.log(`zu entscheiden (zwei Suchbestände oder zwei amtliche): ${entscheiden.length} → ${dir}/entscheiden.json`);
  for (const e of entscheiden.slice(0, 15)) console.log(`  ${e.domain.padEnd(32)} ${e.eintraege.map((b) => `${b.bestand}${b.name ? ` (${b.name})` : ""}`).join(" · ")}`);

  if (!schreiben) {
    if (verdraengen.length) {
      console.log(`\n--schreiben stuft ${verdraengen.length} Fachbetriebe zurück, z. B.:`);
      for (const v of verdraengen.slice(0, 10)) console.log(`  ${v.domain.padEnd(32)} ${v.grund}`);
      process.exitCode = 1;
    }
    return;
  }

  let geschrieben = 0;
  for (const v of verdraengen) {
    // Only rows still classified as a business; nothing else is touched.
    const { error, count } = await db.from("fachbetriebe")
      .update({ art: "kein-betrieb", art_grund: v.grund, updated_at: new Date().toISOString() }, { count: "exact" })
      .eq("domain", v.id).eq("art", "betrieb");
    if (error) throw new Error(`${v.domain}: ${error.message}`);
    geschrieben += count ?? 0;
  }
  console.log(`\n${geschrieben} Fachbetriebe zurückgestuft.`);
  if (geschrieben !== verdraengen.length) console.log(`  (${verdraengen.length - geschrieben} waren schon nicht mehr als Betrieb geführt)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
