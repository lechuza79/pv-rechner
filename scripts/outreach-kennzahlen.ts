/**
 * One row per sending: delivered mails, place pages opened, links on us —
 * in fair windows (2, 7, 28 days after the send day, plus "bisher").
 *
 *   npm run outreach:kennzahlen
 *
 * Reads only. Rules and attribution: lib/aussand-kennzahlen.ts.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { ladeAussandKennzahlen } from "../lib/aussand-kennzahlen-server";
import { linkText, zelleText, type AussendungsZeile } from "../lib/aussand-kennzahlen";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(): void {
  const p = resolve(SCRIPT_DIR, "..", ".env.local");
  if (!existsSync(p)) return;
  for (const zeile of readFileSync(p, "utf8").split("\n")) {
    const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main(): Promise<void> {
  loadEnvFile();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_KEY fehlt");
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const k = await ladeAussandKennzahlen(db);

  const kopf = ["Aussendung", "Mails", "Seite 2 T", "bisher", "Links 2 T", "7 T", "28 T", "bisher"];
  const zeile = (z: AussendungsZeile) => [
    z.label,
    String(z.mails),
    ...(["2", "bisher"] as const).map((w) => (z.seite ? zelleText(z.seite[w === "bisher" ? "bisher" : 2]) : "–")),
    ...(["2", "7", "28", "bisher"] as const).map((w) => linkText(z.links[w === "bisher" ? "bisher" : (Number(w) as 2 | 7 | 28)])),
  ];
  const tabelle = [kopf, ...k.zeilen.map(zeile)];
  const breiten = kopf.map((_, i) => Math.max(...tabelle.map((r) => r[i].length)));
  console.log(`Je Aussendung (Stand ${k.heute}; Fenster = Tage nach dem Versandtag)\n`);
  for (const [n, r] of tabelle.entries()) {
    console.log(r.map((c, i) => (i === 0 ? c.padEnd(breiten[i]) : c.padStart(breiten[i]))).join("  "));
    if (n === 0) console.log(breiten.map((b) => "─".repeat(b)).join("  "));
  }
  console.log(
    "\nSeite aufgerufen = Besuch der Ortsseite eines zugestellten Empfängers, ohne Suchmaschinen, Mail-Prüfdienste und" +
      "\neigene Aufrufe — kein Beleg, dass der Empfänger selbst geklickt hat. Presse: nicht je Mail messbar (–)." +
      "\nLinks = belegte Veröffentlichungen mit Link, der frühesten Aussendung zugeordnet, die den Ort vorher erreicht hat.",
  );
  const ohneSeite = k.zeilen.filter((z) => z.ohneSeite > 0);
  if (ohneSeite.length) console.log(`! Ohne Atlas-Seite (nie als geöffnet zählbar): ${ohneSeite.map((z) => `${z.label} ${z.ohneSeite}`).join(", ")}`);
  if (k.ohneZuordnung.length) {
    console.log(`! ${k.ohneZuordnung.length} Link(s) ohne vorherige Aussendung an den Ort:`);
    for (const o of k.ohneZuordnung) console.log(`  ${o.regionId}  ${o.url}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
