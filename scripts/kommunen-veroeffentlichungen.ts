/**
 * Belegte Veröffentlichungen der angeschriebenen Gemeinden — eintragen und
 * auswerten.
 *
 *   npm run kommunen:veroeffentlichungen                 Bilanz ausgeben
 *   npm run kommunen:veroeffentlichungen -- --setup      Tabelle anlegen (idempotent)
 *   npm run kommunen:veroeffentlichungen -- --eintragen <gemeindeschlüssel> <adresse> [--ohne-link] [--nicht-mehr-online] [--gesehen JJJJ-MM-TT] [--kanal <art>]
 *
 * Eingetragen wird nur, was jemand selbst angesehen hat. Ein Hinweis aus dem
 * wöchentlichen Lauf ist kein Beleg (siehe lib/kommunen-hinweise.ts). Das
 * Eintragen setzt den Status der Gemeinde auf „veröffentlicht" und schreibt die
 * Adresse in ihre Notiz — damit meldet der Hinweis-Lauf sie nicht noch einmal.
 */
import { envLaden } from "./env-laden";
envLaden();
import { createClient } from "@supabase/supabase-js";
import { heuteInBerlin } from "../lib/zeit";
import { liesNotiz } from "../lib/outreach-ruecklauf";
import {
  bilanz,
  KANAELE,
  KANAL_TEXT,
  ordneKanal,
  quoteText,
  VEROEFFENTLICHUNG_DDL,
  type Kanal,
  type Veroeffentlichung,
} from "../lib/kommunen-veroeffentlichung";

const args = process.argv.slice(2);
const wert = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  const db = createClient((process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false },
  });

  if (args.includes("--setup")) {
    const { error } = await db.rpc("exec_sql", { sql: VEROEFFENTLICHUNG_DDL });
    if (error) throw new Error(`Anlegen fehlgeschlagen: ${error.message}`);
    console.log("✓ Tabelle steht");
    return;
  }

  if (args.includes("--eintragen")) {
    const i = args.indexOf("--eintragen");
    const regionId = args[i + 1];
    const url = args[i + 2];
    if (!/^\d{5,8}$/.test(regionId ?? "") || !/^https?:\/\//.test(url ?? "")) {
      throw new Error("Aufruf: --eintragen <gemeindeschlüssel> <adresse>");
    }
    const { data: g, error } = await db
      .from("kommunen_kontakt")
      .select("website, notes, outreach_status, contacted_at")
      .eq("region_id", regionId)
      .single();
    if (error || !g) throw new Error(`Gemeinde ${regionId} nicht in der Kontaktliste`);
    if (!g.contacted_at) throw new Error(`Gemeinde ${regionId} wurde nie angeschrieben`);
    const kanalArg = wert("--kanal") as Kanal | undefined;
    if (kanalArg && !KANAELE.includes(kanalArg)) throw new Error(`Kanal muss einer sein von: ${KANAELE.join(", ")}`);
    const kanal = kanalArg ?? ordneKanal(url, g.website);
    const zeile = {
      region_id: regionId,
      url,
      kanal,
      mit_link: !args.includes("--ohne-link"),
      gesehen_ab: wert("--gesehen") ?? heuteInBerlin(),
      noch_online: !args.includes("--nicht-mehr-online"),
    };
    const { error: e } = await db.from("kommunen_veroeffentlichung").upsert(zeile, { onConflict: "region_id,url" });
    if (e) throw new Error(e.message);

    // Status und Notiz im selben Zug — gesperrt bleibt gesperrt (Widerspruch).
    const notiz = `[${heuteInBerlin()}] Veröffentlichung belegt (${KANAL_TEXT[kanal]}, ${zeile.mit_link ? "mit Link" : "ohne Link"}): ${url}`;
    const alt = g.notes ?? "";
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (!alt.includes(url)) patch.notes = alt ? `${alt}\n\n${notiz}` : notiz;
    if (g.outreach_status !== "gesperrt") patch.outreach_status = "veroeffentlicht";
    const { error: e2 } = await db.from("kommunen_kontakt").update(patch).eq("region_id", regionId);
    if (e2) throw new Error(e2.message);
    console.log(`✓ eingetragen: ${regionId} · ${KANAL_TEXT[kanal]} · ${zeile.mit_link ? "mit Link" : "ohne Link"}`);
    return;
  }

  // ─── Bilanz ─────────────────────────────────────────────────────────────────
  const { data: kontakte, error } = await db
    .from("kommunen_kontakt")
    .select("region_id, kampagne, outreach_status, notes, mastr_regions!inner(name)")
    .not("contacted_at", "is", null);
  if (error) throw new Error(error.message);
  const zugestellt = (kontakte ?? []).filter(
    (z: any) => z.outreach_status !== "bounce" && !liesNotiz(z.notes).verlauf.some((v) => v.art === "unzustellbar"),
  ) as any[];
  const { data: pubs, error: pe } = await db.from("kommunen_veroeffentlichung").select("*");
  if (pe) throw new Error(pe.message);
  const liste = (pubs ?? []) as Veroeffentlichung[];
  const b = bilanz(liste, zugestellt.length);
  const name = new Map(zugestellt.map((z) => [z.region_id, z.mastr_regions.name as string]));

  console.log(`Angeschrieben (ohne bekannten Zustellfehler): ${b.angeschrieben}`);
  console.log(`Gemeinden mit Veröffentlichung: ${b.gemeinden} — Quote ${quoteText(b.quote)}`);
  console.log(`Beiträge: ${b.beitraege}, davon mit Link ${b.mitLink} (noch erreichbar ${b.mitLinkOnline}), woanders als auf der Gemeindeseite ${b.woanders}`);
  for (const k of KANAELE) console.log(`  ${KANAL_TEXT[k]}: ${b.jeKanal[k]}`);
  console.log("\nJe Gemeinde:");
  for (const g of b.jeGemeinde) {
    console.log(`  ${(name.get(g.region_id) ?? g.region_id).padEnd(22)} ${g.beitraege} Beitr., ${g.mitLink} mit Link · ${g.kanaele.map((k) => KANAL_TEXT[k]).join(", ")}`);
  }
  console.log("\nJe Schub:");
  const schuebe = [...new Set(zugestellt.map((z) => z.kampagne as string))].sort();
  for (const s of schuebe) {
    const imSchub = zugestellt.filter((z) => z.kampagne === s);
    const mit = new Set(liste.map((v) => v.region_id));
    const n = imSchub.filter((z) => mit.has(z.region_id)).length;
    console.log(`  ${s.padEnd(16)} ${n} von ${imSchub.length} (${quoteText(imSchub.length ? n / imSchub.length : 0)})`);
  }
  console.log("\nUntergrenze: Gedrucktes und geschlossene Gruppen sieht keine unserer Quellen.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
