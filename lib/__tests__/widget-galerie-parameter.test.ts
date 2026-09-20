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

  it("baut den Kopier-Code nicht selbst, sondern nimmt den geteilten Baustein", () => {
    // Die Maskierung stand bis zum 05.09.2026 hier in der Galerie. Seit die
    // Karte auf der Ortsseite denselben Code anbietet, wäre eine zweite Fassung
    // genau der Fehler, gegen den diese Prüfung ursprünglich gebaut wurde: Der
    // Code landet auf einer FREMDEN Website mit unserem Namen darunter, und
    // zwei Fassungen laufen auseinander — die eine bekommt das Ziel-Attribut,
    // die andere nicht.
    //
    // Geprüft wird deshalb jetzt die ABWESENHEIT eines eigenen Codebauers und
    // die Benutzung des geteilten. Dass der maskiert, hält
    // lib/__tests__/embed-code.test.ts fest.
    expect(QUELLE).toContain('from "../../../lib/embed-code"');
    expect(QUELLE).toMatch(/const code = embedCode\(/);
    expect(QUELLE, "eigener Codebauer zurück").not.toMatch(/const attr = \(t: string\)/);
    expect(QUELLE, "eigener iframe-Zusammenbau zurück").not.toMatch(/`<iframe`/);
  });

  it("verlinkt im Einbett-Code die eigene Gemeinde, nicht das Beispiel", () => {
    // Sonst verlinkt eine Kommune unter ihrem Namen Höchberg — und genau dieser
    // Rückverweis ist der Zweck des ganzen Vorhabens.
    expect(QUELLE).toMatch(/path: zielPfad \?\? s\.attribution\.path/);
  });
});
