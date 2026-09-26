import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Das Hilfe-Zeichen gibt es EINMAL.
 *
 * WARUM (Betreiber, 23.09.2026: „immer Vorhandenes nutzen"): Die Ortsseite
 * setzte für ihre beiden „?" ein Schriftzeichen in einen gezeichneten Kreis —
 * eine zweite Gestalt neben dem Kreis-Fragezeichen, das die übrige Site aus
 * ihrem Icon-Satz nimmt. Jetzt liegt dasselbe Zeichen zusätzlich als Datei,
 * weil ein Stylesheet keine React-Komponente laden kann.
 *
 * Zwei Dateien für eine Form sind eine Kopie — dieser Test hält sie
 * aneinander. Wer die Linienführung in einer ändert, wird hier rot, statt es
 * irgendwann im Browser zu bemerken.
 */
const pfadAus = (text: string) => /\sd="([^"]+)"/.exec(text)?.[1];

describe("Das Hilfe-Zeichen", () => {
  it("ist in der Datei dieselbe Form wie im Icon-Satz", () => {
    const icons = readFileSync("components/Icons.tsx", "utf8");
    const ab = icons.indexOf("export function IconHelpCircle");
    expect(ab, "IconHelpCircle nicht gefunden").toBeGreaterThan(-1);
    const ausIcons = pfadAus(icons.slice(ab, ab + 900));
    const ausDatei = pfadAus(readFileSync("public/design-system/icon-help-circle.svg", "utf8"));
    expect(ausDatei).toBe(ausIcons);
  });

  it("wird von der Ortsseite als Maske benutzt, nicht neu gezeichnet", () => {
    // Eine Kopie des Pfades im Stylesheet wäre eine dritte Fassung, die kein
    // Test halten kann — sie stünde als Zeichenkette in einer Bildadresse.
    const css = readFileSync("public/gemeinde/seite.css", "utf8");
    expect(css).toContain("/design-system/icon-help-circle.svg");
    expect(css, "Pfad im Stylesheet nachgezeichnet").not.toContain("M6.06 6a2 2");
  });
});
