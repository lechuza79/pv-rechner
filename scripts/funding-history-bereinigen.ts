/**
 * Umbenennungen aus dem Förder-Verlauf entfernen.
 *
 *   npm run foerder:verlauf-bereinigen -- --seit 2026-08-26          # zeigt nur
 *   npm run foerder:verlauf-bereinigen -- --seit 2026-08-26 --loeschen
 *
 * WARUM ES DAS GIBT (26.08.2026): Der Verlauf sagt „Was sich am Programm
 * geändert hat … festgestellt beim regelmäßigen Abruf der Programmseite". Das
 * ist eine Aussage über die GEMEINDE. Ändern wir unsere eigenen Beschriftungen,
 * schreibt der Abgleich sie als Änderung der Gemeinde mit — und auf der
 * Stadtseite steht dann eine Falschaussage, die von außen wie eine Tatsache
 * aussieht.
 *
 * Gemessen an genau dem Tag: Die Vereinheitlichung der 39 Bezeichnungen für
 * Balkonkraftwerke erzeugte 61 solcher Einträge. Vier davon waren echt.
 *
 * WARUM KEIN AUTOMATISCHER FILTER IM ABGLEICH: Er kann eine Umbenennung nicht
 * von einer Änderung unterscheiden — „Steckersolar: 100 €" zu „Balkonkraftwerk:
 * 100 €" ist eine, „Steckersolar: 100 €" zu „Steckersolar: 150 €" nicht, und
 * beides sieht für den Vergleich gleich aus. Wer die Entscheidung dem Vergleich
 * überließe, würde irgendwann eine echte Änderung stillschweigend verschlucken —
 * die teurere Fehlerrichtung. Deshalb ein Werkzeug, das VORSCHLÄGT und erst auf
 * ausdrückliches `--loeschen` etwas anfasst.
 *
 * ZUM VORGEHEN: Beide Seiten werden auf denselben Platzhalter gebracht. Bleibt
 * der Rest zeichengleich, war nur das Wort anders. Was übrig bleibt, gehört von
 * Hand angesehen — der Wortlaut ändert sich bei einer Umbenennung oft mit
 * („steckerfertiger PV-Anlagen" wird zu „eines Balkonkraftwerks", inklusive
 * Artikel), und diese Fälle fängt kein Muster.
 */

import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envPfad = resolve(process.cwd(), ".env.local");
if (existsSync(envPfad)) {
  for (const zeile of readFileSync(envPfad, "utf8").split("\n")) {
    const m = zeile.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY fehlen.");
  process.exit(1);
}
const sb = createClient(url, key);

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

/**
 * Wörter, die in diesem Projekt für dieselbe Sache stehen.
 *
 * Wer eine weitere Vereinheitlichung fährt, ergänzt hier — die Liste ist der
 * Beleg dafür, welche Umbenennung wann stattgefunden hat.
 */
const GLEICHBEDEUTEND =
  /Mini-?PV-Anlagen?|Mini-?PV|Mini-?Photovoltaik|Mini-Balkon-Photovoltaik|Stecker-?Solar-?Geräte?s?n?|Steckersolargeräte?s?n?|Stecker-?Solaranlagen?|Steckersolar|Stecker-?PV-Anlagen?|Stecker-?PV-Geräte?s?|Stecker-?PV|Stecker-?Solar|steckerfertige[rns]?|Balkonsolarkraftwerke?|Balkonsolaranlagen?|Balkonsolar|Balkon-Solaranlagen?|Balkon-PV-Anlagen?|Balkon-PV|Balkonmodule?n?|Balkonkraftwerke?s?|Dachanlagen?|PV-Anlage \(Dach\/Fassade\)|Solargeräte?s?/gi;

const gleich = (a: string, b: string) =>
  a.replace(GLEICHBEDEUTEND, "#").replace(/\s+/g, " ").trim() ===
  b.replace(GLEICHBEDEUTEND, "#").replace(/\s+/g, " ").trim();

async function main(): Promise<void> {
  const seit = arg("seit");
  if (!seit) {
    console.error("Bitte --seit JJJJ-MM-TT angeben (der Tag der Umbenennung).");
    process.exit(1);
  }
  const loeschen = process.argv.includes("--loeschen");

  const { data, error } = await sb
    .from("funding_history")
    .select("id, program_id, feld, alt, neu")
    .gte("observed_at", `${seit}T00:00:00Z`)
    .neq("feld", "aufnahme");
  if (error) throw new Error(error.message);

  const zeilen = (data ?? []) as { id: number; program_id: string; feld: string; alt: string | null; neu: string | null }[];
  const umbenennung = zeilen.filter((z) => gleich(String(z.alt ?? ""), String(z.neu ?? "")));
  const offen = zeilen.filter((z) => !umbenennung.includes(z));

  console.log(`Einträge seit ${seit}: ${zeilen.length}`);
  console.log(`  reine Umbenennung: ${umbenennung.length}`);
  console.log(`  von Hand ansehen:  ${offen.length}\n`);

  for (const z of offen) {
    const a = String(z.alt ?? ""), n = String(z.neu ?? "");
    let i = 0;
    while (i < a.length && i < n.length && a[i] === n[i]) i++;
    console.log(`${z.program_id} · ${z.feld}`);
    console.log(`   ALT …${a.slice(Math.max(0, i - 20), i + 70)}`);
    console.log(`   NEU …${n.slice(Math.max(0, i - 20), i + 70)}`);
  }

  if (!loeschen) {
    console.log(`\nNichts geändert. Zum Entfernen der ${umbenennung.length} Umbenennungen: --loeschen anhängen.`);
    return;
  }
  const ids = umbenennung.map((z) => z.id);
  for (let i = 0; i < ids.length; i += 100) {
    const { error: e } = await sb.from("funding_history").delete().in("id", ids.slice(i, i + 100));
    if (e) throw new Error(e.message);
  }
  console.log(`\n${ids.length} Einträge entfernt.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
