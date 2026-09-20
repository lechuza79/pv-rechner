import { describe, it, expect } from "vitest";
import { teilenBefund, vorschaubildAus } from "../../scripts/health-check";

/**
 * Der Gesundheitscheck ist die einzige Stelle, die das CDN der Produktion
 * wirklich sieht — die Browser-Tests laufen ohne. Hier steht, dass sein Urteil
 * die Faelle auch faellt, um die es geht.
 */
const gut = { status: 200, cache: "MISS", bild: "https://solar-check.io/api/og?a=0&s=0" };
const gutB = { status: 200, cache: "MISS", bild: "https://solar-check.io/api/og?a=3&s=3" };

describe("Gesundheitscheck: geteilte Rechnungen", () => {
  it("zwei getrennte Rechnungen sind in Ordnung", () => {
    expect(teilenBefund(gut, gutB).ok).toBe(true);
  });

  it("DASSELBE Vorschaubild fuer zwei verschiedene Links ist ein Befund", () => {
    expect(teilenBefund(gut, { ...gutB, bild: gut.bild }).ok).toBe(false);
  });

  it("eine geteilte Rechnung aus dem Zwischenspeicher ist ein Befund", () => {
    // Der teure Fall: Diese Antwort wird an den naechsten Besucher weitergereicht.
    expect(teilenBefund({ ...gut, cache: "HIT" }, gutB).ok).toBe(false);
    expect(teilenBefund(gut, { ...gutB, cache: "PRERENDER" }).ok).toBe(false);
  });

  it("ein Vorschaubild ohne die eigenen Parameter ist ein Befund", () => {
    expect(teilenBefund({ ...gut, bild: "https://solar-check.io/api/og?view=brand" }, gutB).ok).toBe(false);
  });

  it("ein fehlgeschlagener Abruf ist ein Befund, kein stilles Gutachten", () => {
    expect(teilenBefund({ status: 0, cache: "fetch failed", bild: "" }, gutB).ok).toBe(false);
  });

  it("liest das Vorschaubild aus dem ausgelieferten HTML, samt maskierter Und-Zeichen", () => {
    const html = '<meta property="og:image" content="https://solar-check.io/api/og?a=0&amp;s=0"/>';
    expect(vorschaubildAus(html)).toBe("https://solar-check.io/api/og?a=0&s=0");
    expect(vorschaubildAus("<html></html>")).toBe("");
  });
});
