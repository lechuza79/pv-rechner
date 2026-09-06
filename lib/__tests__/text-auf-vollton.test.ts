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

// ─── WAS HIER BEWUSST NICHT STEHT: eine allgemeine Kontrastprüfung ──────────
//
// Zweimal versucht, zweimal verworfen — und beide Male aus demselben Grund:
// Ein Textmuster kann nicht sagen, welche Schriftfarbe zu welcher Fläche
// gehört.
//
//  · Über ein Zeilenfenster gepaart: 25 Befunde, die meisten Unsinn, weil es
//    Farben aus benachbarten Stilen zusammenwarf.
//  · Über saubere Stil-Blöcke, aber nur die erste Farbe je Eigenschaft: Es
//    übersah jeden aktiv/inaktiv-Fall („aktiv ? Akzent : gedämpft") — also
//    gerade den häufigsten. Bei der Gegenprobe blieb es grün.
//  · Über alle Farben je Eigenschaft: Es kombinierte den aktiven Text mit der
//    inaktiven Fläche, also Paare, die nie gleichzeitig auftreten.
//
// Die dritte Fassung hätte die Ternary-POSITIONEN einander zuordnen müssen,
// und das ist keine Mustererkennung mehr, sondern eine Auswertung des Codes.
// Ein Wächter, der zu zwei Dritteln danebenliegt, wird weggelesen — und dann
// auch dort, wo er recht hat.
//
// GEMESSEN, damit die Frage beantwortet ist und nicht offenbleibt: Die
// Token-Werte selbst tragen über alle sieben Stufen. Schrift auf Fläche liegt
// zwischen 4,5:1 und 7,3:1, auch mit dem gesetzten Overlay. Was im September
// 2026 unlesbar wirkte, war nicht die Farbe, sondern die Bauweise: gedämpfte
// Schrift bei Kleinstschrift, und Pillen, die ihre Form nur über einen Rand mit
// 1,3:1 zeigten. Beides ist behoben, indem die Elemente eine FLÄCHE bekommen
// haben statt eines Randes allein.
//
// Was ein Test hier trotzdem leistet, steht oben: die eine Fehlerklasse, die
// sich eindeutig erkennen lässt.
