import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// Die Widget-Galerie übernimmt Ortsname und Atlas-Pfad aus der Adresszeile und
// baut daraus den Code, den eine Verwaltung in ihre EIGENE Website einfügt.
// Ungeprüft wäre das ein Einfallstor: Wer einer Kommune einen präparierten Link
// schickt, bekommt fremden Code auf die Rathaus-Website — mit uns als sichtbarem
// Absender darunter.
const QUELLE = readFileSync(new URL("../../app/(site)/energie-widgets/client.tsx", import.meta.url), "utf8");

describe("Widget-Galerie: Werte aus der Adresszeile", () => {
  it("säubert den Ortsnamen, statt ihn roh zu übernehmen", () => {
    expect(QUELLE).toMatch(/function sauberterName/);
    // Erlaubt ist, was in Ortsnamen vorkommt — alles andere fällt weg.
    expect(QUELLE).toMatch(/replace\(\/\[\^\\p\{L\}\\p\{N\}/);
  });

  it("nimmt den Atlas-Pfad nur in der exakten Form an", () => {
    expect(QUELLE).toMatch(/function saubererPfad/);
    expect(QUELLE).toMatch(/\/\^\\\/solar-atlas\\\//);
  });

  it("maskiert zusätzlich beim Bau des Kopier-Codes", () => {
    // Zweite Verteidigungslinie: In ein HTML-Attribut gehört nichts Unmaskiertes,
    // auch wenn oben schon gesäubert wurde.
    expect(QUELLE).toMatch(/const attr = \(t: string\)/);
    expect(QUELLE).toContain("attr(variant.label)");
    expect(QUELLE).toContain("attr(attribution.text)");
    expect(QUELLE).toContain("attr(attribution.path)");
  });

  it("verlinkt im Einbett-Code die eigene Gemeinde, nicht das Beispiel", () => {
    // Sonst verlinkt eine Kommune unter ihrem Namen Höchberg — und genau dieser
    // Rückverweis ist der Zweck des ganzen Vorhabens.
    expect(QUELLE).toMatch(/path: zielPfad \?\? s\.attribution\.path/);
  });
});
