/**
 * Every contact stock against every other — the check that did not exist
 * until 06.10.2026 (lib/bestand-abgleich.ts has the rule and its history).
 *
 *   npx tsx scripts/bestaende-abgleich.ts              # measure only
 *   npx tsx scripts/bestaende-abgleich.ts --schreiben  # demote what an official stock or a decision rules out
 *   npx tsx scripts/bestaende-abgleich.ts --entscheiden <domain> --falsch=fachbetrieb[,presse] --notiz="<why>"
 *
 * A decision is stored and from then on applied by every collection run of
 * either stock (bestand_entscheidungen), not only here.
 *
 * Only collisions with a clear answer are written: an installer on a domain
 * the register or the municipal record names. Everything else lands in the
 * decision list (scripts/.cache/bestaende-abgleich/entscheiden.json), because
 * either side can be the wrong one. Exit code 1 when a demotion is still
 * pending, so a scheduled run notices a regression.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { abgleichen, verdraengtGrund, type Belegung, type Bestand } from "../lib/bestand-abgleich";
import { ENTSCHEIDUNGEN_SQL, ladeBelegungen, ladeEntscheidungen } from "./lib/bestand-belegung";
import { heuteInBerlin } from "../lib/zeit";
import { MAIN_CHECKOUT } from "./lib/contact-v2-config";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const entscheidenFuer = process.argv.includes("--entscheiden") ? process.argv[process.argv.indexOf("--entscheiden") + 1] : null;
const schreiben = process.argv.includes("--schreiben") || !!entscheidenFuer;
const BESTAENDE: Bestand[] = ["gemeinde", "versorger", "windbetreiber", "presse", "fachbetrieb"];

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

  if (entscheidenFuer) {
    const falsch = (arg("falsch") ?? "").split(",").filter(Boolean) as Bestand[];
    const notiz = (arg("notiz") ?? "").trim();
    if (!falsch.length || falsch.some((f) => !BESTAENDE.includes(f))) throw new Error(`--falsch=${BESTAENDE.join("|")} (mehrere mit Komma)`);
    if (notiz.length < 10) throw new Error('--notiz="<woran es zu erkennen war>" (mindestens ein halber Satz)');
    const setup = await db.rpc("exec_sql", { sql: ENTSCHEIDUNGEN_SQL });
    if (setup.error) throw new Error(setup.error.message);
    await new Promise((r) => setTimeout(r, 2000));
    const { error } = await db.from("bestand_entscheidungen").upsert({ domain: entscheidenFuer, falsch, notiz, entschieden_am: heuteInBerlin(), updated_at: new Date().toISOString() }, { onConflict: "domain" });
    if (error) throw new Error(error.message);
    console.log(`${entscheidenFuer}: ${falsch.join(" und ")} führt die Domain zu Unrecht — gespeichert, wird angewendet`);
  }

  const { belegungen, bericht } = await ladeBelegungen(db);
  const entscheidungen = await ladeEntscheidungen(db);
  console.log("gelesen:", JSON.stringify(bericht.gelesen), bericht.fehlt.length ? `· fehlt: ${bericht.fehlt.join(", ")}` : "");

  // Every domain claimed by more than one stock, judged from each side.
  const verdraengen: { domain: string; id: string; grund: string; bestand: Bestand }[] = [];
  const entscheiden: { domain: string; eintraege: Belegung[] }[] = [];
  let geteilt = 0;
  for (const [domain, liste] of belegungen) {
    const bestaende = new Set(liste.map((b) => b.bestand));
    // A decision applies even where only one stock claims the domain today —
    // enercity.de stood only among the installers when it was decided.
    if (bestaende.size < 2 && !entscheidungen.has(domain)) continue;
    let offen = false;
    for (const b of liste) {
      const u = abgleichen(domain, b.bestand, belegungen, { herkunft: b.herkunft, entscheidungen });
      if (u.art === "verdraengt" && (b.bestand === "fachbetrieb" || b.bestand === "presse")) verdraengen.push({ domain, id: b.id, grund: verdraengtGrund(u), bestand: b.bestand });
      else if (u.art === "entscheiden") offen = true;
      else if (u.art === "geteilt") geteilt++;
    }
    if (offen) entscheiden.push({ domain, eintraege: liste });
  }

  // A wind operator's website that collided is never assigned, so it never
  // shows up among the claims above — it would wait forever. It goes on the
  // same list; once decided, the operator is checked again.
  const { data: konflikte, error: kErr } = await db.from("windbetreiber_kandidaten").select("mastr_nr, domain, grund").eq("ergebnis", "konflikt").order("domain");
  if (kErr && !/does not exist|schema cache/i.test(kErr.message)) throw new Error(kErr.message);
  const bekannt = new Set(entscheiden.map((e) => e.domain));
  for (const k of (konflikte ?? []) as { mastr_nr: string; domain: string; grund: string }[]) {
    const u = abgleichen(k.domain, "windbetreiber", belegungen, { herkunft: "suche", entscheidungen });
    if (u.art !== "entscheiden" || bekannt.has(k.domain)) continue;
    bekannt.add(k.domain);
    entscheiden.push({ domain: k.domain, eintraege: [...(belegungen.get(k.domain) ?? []), { bestand: "windbetreiber", id: k.mastr_nr, name: `Kandidat für Betreiber ${k.mastr_nr}` }] });
  }

  const dir = resolve(MAIN_CHECKOUT, "scripts/.cache/bestaende-abgleich");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "entscheiden.json"), JSON.stringify({ stand: new Date().toISOString(), entscheiden }, null, 1));

  console.log(`verdrängt (amtliche Quelle geht vor): ${verdraengen.length}`);
  console.log(`geteilt (dieselbe Organisation in zwei Rollen): ${geteilt}`);
  console.log(`zu entscheiden (zwei Suchbestände, zwei amtliche oder ein blockierter Windbetreiber): ${entscheiden.length} → ${dir}/entscheiden.json`);
  if (entscheiden.length) process.exitCode = 1;
  for (const e of entscheiden.slice(0, 15)) console.log(`  ${e.domain.padEnd(32)} ${e.eintraege.map((b) => `${b.bestand}${b.name ? ` (${b.name})` : ""}`).join(" · ")}`);

  if (!schreiben) {
    if (verdraengen.length) {
      console.log(`\n--schreiben stuft ${verdraengen.length} Einträge zurück, z. B.:`);
      for (const v of verdraengen.slice(0, 10)) console.log(`  ${v.domain.padEnd(32)} ${v.grund}`);
      process.exitCode = 1;
    }
    return;
  }

  let geschrieben = 0;
  for (const v of verdraengen) {
    // Only rows that still claim the role; nothing else is touched.
    const { error, count } = v.bestand === "fachbetrieb"
      ? await db.from("fachbetriebe").update({ art: "kein-betrieb", art_grund: v.grund, updated_at: new Date().toISOString() }, { count: "exact" }).eq("domain", v.id).eq("art", "betrieb")
      : await db.from("presse_medien").update({ ist_medium: "kein-medium", medium_grund: v.grund }, { count: "exact" }).eq("domain", v.id).neq("ist_medium", "kein-medium");
    if (error) throw new Error(`${v.domain}: ${error.message}`);
    geschrieben += count ?? 0;
  }
  console.log(`\n${geschrieben} Einträge zurückgestuft (Fachbetriebe und Presse).`);
  if (geschrieben !== verdraengen.length) console.log(`  (${verdraengen.length - geschrieben} waren schon nicht mehr als Betrieb geführt)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
