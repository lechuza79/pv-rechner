/**
 * Aus dem Förder-Verlauf entfernen, was WIR geändert haben, nicht die Gemeinde.
 *
 *   npm run foerder:verlauf-bereinigen -- --seit 2026-08-26          # zeigt nur
 *   npm run foerder:verlauf-bereinigen -- --seit 2026-08-26 --loeschen
 *   npm run foerder:verlauf-bereinigen -- --seit 2026-08-26 --voll   # ganzer Wortlaut
 *   npm run foerder:verlauf-bereinigen -- --seit 2026-08-26 --ids 41,42
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
 *
 * DIE UMBENENNUNG WAR NUR DER ERSTE FALL (28.08.2026). Die Kategorie ist
 * größer: alles, was sich an UNSERER Aufzeichnung ändert und nicht am Programm.
 * Der zweite Fall ist die nachgetragene Bedingung — wir lesen an der Amtsseite
 * eine Voraussetzung, die dort längst stand, und schreiben sie erstmals auf.
 * Der Abgleich sieht einen neuen Satz und meldet ihn; auf Kölns Stadtseite
 * stand daraufhin live „Was sich am Klimafreundliches Wohnen & Arbeiten
 * geändert hat · Eine Änderung, die wir beim regelmäßigen Abruf der
 * Programmseite festgestellt haben · 28. August 2026 · Bedingungen neu: Die
 * Dachanlage muss mindestens 2 kWp leisten" — für eine Bedingung, die die Stadt
 * nie geändert hat. Vier Einträge dieser Art an einem Tag, alle aus der
 * Einführung der Mindestleistung und einer Antragsfrist.
 *
 * Ein Muster kann diesen Fall PRINZIPIELL nicht erkennen: „Bedingung
 * hinzugekommen" sieht bei einer Nachtragung genauso aus wie bei einer echten
 * neuen Auflage der Gemeinde. Deshalb `--ids`: Wer die Einträge gelesen hat,
 * benennt sie einzeln. Kein Muster, keine Heuristik, keine Zeitspanne — die
 * Entscheidung bleibt bei dem, der die Amtsseite daneben gelegt hat. `--voll`
 * gibt dafür den ganzen Wortlaut aus statt des Ausschnitts um die erste
 * Abweichung; an einem angehängten Satz zeigt der Ausschnitt sonst beide Seiten
 * gleich an und man sieht gerade das nicht, worum es geht.
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
  const voll = process.argv.includes("--voll");
  const nurIds = (arg("ids") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

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
    console.log(`#${z.id} ${z.program_id} · ${z.feld}`);
    if (voll) {
      console.log(`   ALT ${a}`);
      console.log(`   NEU ${n}`);
    } else {
      let i = 0;
      while (i < a.length && i < n.length && a[i] === n[i]) i++;
      console.log(`   ALT …${a.slice(Math.max(0, i - 20), i + 70)}`);
      console.log(`   NEU …${n.slice(Math.max(0, i - 20), i + 70)}`);
    }
  }

  // Von Hand benannte Einträge: nur die, keine Umbenennungs-Erkennung daneben.
  // Wer `--ids` setzt, hat sie gelesen — das Werkzeug prüft nur, dass sie
  // wirklich im abgefragten Zeitraum liegen, damit eine vertippte Nummer nicht
  // einen fremden, womöglich echten Verlaufseintrag trifft.
  if (nurIds.length) {
    const bekannt = new Set(zeilen.map((z) => z.id));
    const unbekannt = nurIds.filter((id) => !bekannt.has(id));
    if (unbekannt.length) {
      console.error(`\nNicht im Zeitraum seit ${seit}: ${unbekannt.join(", ")} — nichts entfernt.`);
      process.exit(1);
    }
    if (!loeschen) {
      console.log(`\nNichts geändert. Zum Entfernen dieser ${nurIds.length} Einträge: --loeschen anhängen.`);
      return;
    }
    const { error: e } = await sb.from("funding_history").delete().in("id", nurIds);
    if (e) throw new Error(e.message);
    console.log(`\n${nurIds.length} von Hand benannte Einträge entfernt.`);
    return;
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
