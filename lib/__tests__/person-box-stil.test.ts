import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { regelnMit, alsStylesheet, werkstattFarben } from "../../scripts/person-box-stil";

/**
 * Die Kontakt-Box der Ortsseite ist dieselbe wie auf der Startseite — und
 * bleibt es.
 *
 * WARUM (23.09.2026): Sie war dort nachgebaut. Die Startseite trägt 124 Regeln
 * für diese Box, in zehn Runden gewachsen; die Ortsseite hatte eine
 * handgeschriebene Kurzfassung und sah deshalb „fast" so aus — durch
 * Nachbessern nie einzuholen. Jetzt liest ein Werkzeug die Regeln aus dem
 * Design-Paket. Dieser Test hält die abgelegte Fassung dagegen: Wer das Paket
 * austauscht und den Lauf vergisst, wird rot, statt es im Browser zu merken.
 */
const QUELLEN = ["public/homepage-study/homepage.css", "public/design-lab/homepage-experiments.css"];
const ZIEL = "public/shared-person/person-box.css";

describe("Stil der Kontakt-Box", () => {
  it("ist der des Design-Pakets, nicht eine zweite Fassung", () => {
    const regeln = QUELLEN.flatMap((datei) => regelnMit(readFileSync(datei, "utf8"), "person"));
    const erwartet = alsStylesheet(regeln, werkstattFarben(readFileSync(QUELLEN[1], "utf8")));
    expect(readFileSync(ZIEL, "utf8")).toBe(erwartet);
  });

  it("trägt die Farbwerte, an denen der Knopf hängt", () => {
    // Ohne sie liest der Knopf eine Variable, die es nicht gibt, und bleibt
    // durchsichtig statt limette — genau so stand er einen Bau lang da.
    const css = readFileSync(ZIEL, "utf8");
    expect(css).toContain("--lab-accent:#d4ff24");
    expect(css).toContain("--lab-ink:#132527");
  });

  it("lässt den Schalter der Werkstatt weg", () => {
    // „body[data-lab-accent]" ist der Schalter, mit dem die Startseite läuft.
    // Bliebe er in den Selektoren, käme auf der Ortsseite keine dieser Regeln
    // an — dort steht er nicht am Dokument.
    expect(readFileSync(ZIEL, "utf8")).not.toContain("data-lab-accent]");
  });
});
