/**
 * Trägt fehlende Live-Daten in die Ratgeber-Registry nach — EINMALIG, aus der
 * Historie der Hauptlinie.
 *
 * WARUM ALS SKRIPT UND NICHT ZUR LAUFZEIT: Auf dem Bauserver gibt es die
 * Historie nicht verlässlich (flache Klone), und eine Seite, die beim Rendern
 * ein Kommandozeilenwerkzeug aufruft, ist eine Zeitbombe. Das Datum ist eine
 * historische Tatsache je Ratgeber — genau wie das Änderungsdatum daneben —
 * und gehört deshalb eingecheckt, nicht bei jedem Aufruf neu erraten.
 *
 * WAS DAS DATUM WIRKLICH IST: der Tag, an dem die Seitendatei zum ersten Mal
 * auf der Hauptlinie stand. Weil dieses Projekt bei jedem Schub auf die
 * Hauptlinie automatisch ausliefert, ist das der Tag der Veröffentlichung —
 * auf Minuten genau, nicht auf die Sekunde. Für alles, wofür wir es brauchen
 * („wann ging das live, lohnt sich ein Beitrag dazu"), reicht das; als
 * sekundengenaue Angabe wäre es erfunden.
 *
 * NEUE RATGEBER TRAGEN IHR DATUM VON HAND. Dieses Skript ist die Nachholung
 * für den Bestand, kein Automatismus — ab jetzt weiß der, der die Seite
 * einstellt, den Tag ohnehin, und ein Skript, das bei jedem Lauf schreibt,
 * würde irgendwann etwas überschreiben, das jemand bewusst gesetzt hat.
 *
 * Aufruf: npx tsx scripts/ratgeber-livedatum.ts [--schreiben]
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { RATGEBER } from "../lib/ratgeber";

const REGISTRY = resolve(__dirname, "../lib/ratgeber.ts");
const schreiben = process.argv.includes("--schreiben");

/** Die Seitendatei zu einer Adresse. */
function seitenDatei(slug: string): string | null {
  const kandidat = resolve(__dirname, `../app/(site)${slug}/page.tsx`);
  return existsSync(kandidat) ? kandidat : null;
}

/** Der Tag, an dem die Datei zum ersten Mal auf der Hauptlinie stand. */
function ersterTag(datei: string): string | null {
  try {
    const aus = execFileSync(
      "git",
      ["log", "main", "--diff-filter=A", "--follow", "--format=%cs", "--", datei],
      { encoding: "utf-8" },
    ).trim();
    const zeilen = aus.split("\n").filter(Boolean);
    return zeilen.length ? zeilen[zeilen.length - 1] : null;
  } catch {
    return null;
  }
}

let quelle = readFileSync(REGISTRY, "utf-8");
let ergaenzt = 0;
const offen: string[] = [];

for (const r of RATGEBER) {
  if ((r as { live?: string }).live) continue;
  const datei = seitenDatei(r.slug);
  if (!datei) {
    offen.push(`${r.slug} — keine Seitendatei gefunden`);
    continue;
  }
  const tag = ersterTag(datei);
  if (!tag) {
    offen.push(`${r.slug} — kein Commit in der Historie`);
    continue;
  }
  if (tag > r.updated) {
    // Eine Seite kann nicht überarbeitet worden sein, bevor es sie gab. Tritt
    // das auf, stimmt eine der beiden Angaben nicht — dann lieber melden als
    // eine unmögliche Kombination einchecken.
    offen.push(`${r.slug} — live ${tag} liegt NACH updated ${r.updated}`);
    continue;
  }

  // Das Feld wird direkt neben `updated` desselben Eintrags eingesetzt.
  const marke = `    updated: "${r.updated}",`;
  const index = quelle.indexOf(`slug: "${r.slug}"`);
  if (index < 0) {
    offen.push(`${r.slug} — im Quelltext nicht gefunden`);
    continue;
  }
  const ab = quelle.indexOf(marke, index);
  if (ab < 0) {
    offen.push(`${r.slug} — Änderungsdatum im Quelltext nicht gefunden`);
    continue;
  }
  quelle = quelle.slice(0, ab) + `    live: "${tag}",\n` + quelle.slice(ab);
  ergaenzt++;
  console.log(`${r.slug}  live: ${tag}  (überarbeitet ${r.updated})`);
}

if (offen.length) {
  console.log("\nOffen:");
  for (const o of offen) console.log(`  ${o}`);
}

if (schreiben && ergaenzt) {
  writeFileSync(REGISTRY, quelle, "utf-8");
  console.log(`\n${ergaenzt} Live-Daten eingetragen.`);
} else if (ergaenzt) {
  console.log(`\n${ergaenzt} Live-Daten ermittelt. Mit --schreiben eintragen.`);
} else {
  console.log("\nNichts zu ergänzen.");
}
