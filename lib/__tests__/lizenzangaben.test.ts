import { describe, it, expect } from "vitest";
import { mitLizenzangaben, sourceLabel, DATA_SOURCES } from "../data-sources";

/**
 * Eine von Hand geschriebene Quellenzeile traegt trotzdem ihre Lizenz.
 *
 * DER ANLASS (23.09.2026): Der Bild-Fuss der Ortsgeschichten sagte
 * „Marktstammdatenregister · eigene Auswertung" — Name, sonst nichts. Der Fuss
 * ist der Teil, der im geteilten Bild mitreist; dort ist die Nennung Pflicht
 * (dl-de/by-2-0 verlangt Bereitsteller, Lizenz UND den Hinweis, dass wir
 * veraendert haben).
 */
describe("Lizenzangaben an einer Quellenzeile", () => {
  it("ergaenzt, was fehlt", () => {
    const zeile = mitLizenzangaben("Marktstammdatenregister · eigene Auswertung");
    expect(zeile).toContain("dl-de/by-2-0");
    expect(zeile).toContain(DATA_SOURCES.mastr.note!);
  });

  it("ergaenzt nichts doppelt", () => {
    const voll = sourceLabel(DATA_SOURCES.mastr);
    expect(mitLizenzangaben(voll)).toBe(voll);
  });

  it("laesst eigene Modelle unberuehrt", () => {
    // Einer eigenen Rechnung eine fremde Lizenz anzuhaengen waere die naechste
    // Falschangabe — genau die Richtung, gegen die diese Funktion gebaut ist.
    const zeile = "Atlas-Stromwertmodell · Stand 19. Sept. 2026";
    expect(mitLizenzangaben(zeile)).toBe(zeile);
  });

  it("nennt jede genannte Quelle", () => {
    const zeile = mitLizenzangaben("Marktstammdatenregister und Zensus 2022");
    expect(zeile).toContain("dl-de/by-2-0");
  });
});
