import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Eine gelesene Förderseite muss abhakbar sein — in BEIDEN Tabellen.
 *
 * DER ANLASS (09.09.2026): Die Seiten-Tabelle führt seit ihrer Einführung ein
 * „gelesen am"; geschrieben hat es kein einziges Werkzeug. Gemessen: 275 als
 * Treffer eingestufte Seiten, keine je abgehakt, 144 davon als Balkonkraftwerk
 * eingeordnet. Konstanz lag drei Wochen darin, während wir sein Programm über
 * eine fremde Liste fanden.
 *
 * Ein Vorrat, aus dem nichts herausgenommen werden kann, wächst nur — und sieht
 * dabei aus wie einer, an dem gearbeitet wird. Das ist der teuerste Zustand von
 * allen: Er meldet sich nie.
 *
 * Geprüft wird die VERWENDUNG im Quelltext, nicht das Ergebnis: Der Befehl
 * schreibt in die Produktionsdatenbank, ein Test darf ihn nicht ausführen. Was
 * er hier absichert, ist die Bauform — dass beide Tabellen angefasst werden und
 * dass mehrere Schlüssel auf einmal gehen. Wer ein Dutzend Ortsgemeinden einzeln
 * abhaken muss, hakt sie nicht ab.
 */
describe("Gelesene Förderseiten abhaken", () => {
  const quelle = readFileSync(resolve(process.cwd(), "scripts/funding-screen.ts"), "utf8");

  it("schreibt BEIDE Tabellen", () => {
    // Die Gemeinde-Tabelle steuert, was der nächste Screening-Lauf sich vornimmt.
    // Die Seiten-Tabelle ist der Arbeitsvorrat, aus dem gelesen wird. Nur eine
    // von beiden zu schreiben war der Zustand, der den Rückstau erzeugt hat.
    expect(quelle).toMatch(/for \(const tabelle of \[[^\]]*"funding_coverage"[^\]]*"funding_seiten"[^\]]*\]\)/);
  });

  it("nimmt mehrere Schlüssel auf einmal", () => {
    // `.in(...)`, nicht `.eq(...)`: Eine Verbandsgemeinde deckt ein Dutzend
    // Ortsgemeinden, und der Vorrat wird nur abgebaut, wenn das in einem Zug geht.
    expect(quelle).toMatch(/\.update\(eintrag, \{ count: "exact" \}\)\.in\("region_id", ids\)/);
    expect(quelle).toMatch(/roh\.split\(","\)/);
  });

  it("verlangt ein Ergebnis, statt eines zu erfinden", () => {
    // Ohne Ergebnis abgehakt wäre die Seite aus dem Vorrat verschwunden, ohne
    // dass jemand sagen könnte, was beim Lesen herauskam — dieselbe Fehlerklasse
    // wie ein Prüfdatum ohne Prüfung.
    expect(quelle).toMatch(/if \(!roh \|\| !ergebnis\)/);
  });
});
