import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const WURZEL = join(__dirname, "..", "..");

// Text auf einer Vollton-Fläche darf nicht die Hintergrundfarbe der Seite sein.
//
// DER FEHLER (Betreiber, 06.09.2026: „nutze unsere Tokens damit alles auch bei
// jeder Helligkeitseinstellung sichtbar ist"): Die Seite hat sieben
// Tagesstufen, und `--color-bg` dreht mit ihnen — nachts ist er dunkel. Die
// Akzentfarbe dreht NICHT mit. Wer beides kombiniert, schreibt auf den hellen
// Stufen weiß auf blau und auf den dunklen dunkelgrau auf blau.
//
// Gefunden an zwei eigenen Stellen und einer im Bestand (dem Punkt auf der
// Zubau-Zeitleiste). Von außen unsichtbar, solange man tagsüber arbeitet.
//
// NICHT BETROFFEN ist die Umkehrung: Ein Tooltip mit `--color-text-primary` als
// Fläche und `--color-bg` als Schrift ist richtig, weil BEIDE mit der Stufe
// drehen — sie bleiben immer gegensätzlich. Die Regel gilt nur für Flächen mit
// fester Farbe.

/** Flächenfarben, die NICHT mit der Tagesstufe drehen. */
const VOLLTON = [
  "--color-accent",
  "--color-accent-dark",
  "--color-positive",
  "--color-negative",
  "--color-highlight",
  "--color-awareness",
  "--color-brand",
  "--color-brand-deep",
];

/** Wie nah beieinander Fläche und Schrift stehen müssen, um als ein Stil zu gelten. */
const FENSTER = 12;

function dateien(ordner: string, treffer: string[] = []): string[] {
  for (const eintrag of readdirSync(join(WURZEL, ordner))) {
    if (eintrag === "node_modules" || eintrag.startsWith(".")) continue;
    const pfad = join(ordner, eintrag);
    if (statSync(join(WURZEL, pfad)).isDirectory()) dateien(pfad, treffer);
    else if (/\.tsx?$/.test(eintrag) && !eintrag.includes(".test.")) treffer.push(pfad);
  }
  return treffer;
}

describe("Sichtbar auf jeder Tagesstufe", () => {
  it("kein Text in Seitenhintergrund-Farbe auf einer Vollton-Fläche", () => {
    const befunde: string[] = [];
    for (const datei of [...dateien("components"), ...dateien("app")]) {
      const zeilen = readFileSync(join(WURZEL, datei), "utf8").split("\n");
      zeilen.forEach((zeile, i) => {
        if (!/color:\s*v\("--color-bg"\)/.test(zeile)) return;
        // Die Fläche steht üblicherweise direkt darüber oder darunter.
        const umfeld = zeilen.slice(Math.max(0, i - FENSTER), i + FENSTER).join("\n");
        const flaeche = VOLLTON.find((t) =>
          new RegExp(`background(Color)?:[^;\\n]*v\\("${t}"\\)`).test(umfeld),
        );
        if (flaeche) befunde.push(`${datei}:${i + 1} — Schrift „--color-bg" auf „${flaeche}"`);
      });
    }
    expect(
      befunde,
      `Auf den dunklen Tagesstufen steht hier dunkle Schrift auf farbiger Fläche. ` +
        `Für Text auf Vollton gibt es „--color-text-on-accent".\n${befunde.join("\n")}`,
    ).toEqual([]);
  });
});
