import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Der Umschaltpunkt der Kopfzeile steht an ZWEI Stellen, und das ist unvermeidbar:
// Die Sichtbarkeit entscheidet eine Medienabfrage (lib/theme.ts), den
// Menü-Zustand und ein paar Innenabstände entscheidet matchMedia
// (components/Header.tsx). CSS kann den Zustand nicht setzen, JavaScript darf
// das Layout nicht bestimmen — also braucht es beide.
//
// Was dabei schiefgehen kann, ist leise: Verschieben sich die Werte
// gegeneinander, entsteht ein Breitenbereich, in dem beide Navigationen stehen
// oder keine. Das trifft einen schmalen Streifen, den im Alltag fast niemand
// hat — gemeldet wird es also nicht, gesehen erst recht nicht.

const REPO = join(__dirname, "..", "..");

describe("Kopfzeile: Umschaltpunkt", () => {
  const theme = readFileSync(join(REPO, "lib", "theme.ts"), "utf8");
  const header = readFileSync(join(REPO, "components", "Header.tsx"), "utf8");

  it("die Medienabfragen in theme.ts nennen 999/1000", () => {
    expect(theme, "Regel für schmale Schirme fehlt").toContain(
      "@media (max-width:999px){\n    .hdr-nav{display:none}",
    );
    expect(theme, "Regel für breite Schirme fehlt").toContain(
      "@media (min-width:1000px){\n    .hdr-menu{display:none}",
    );
  });

  it("matchMedia im Header nennt denselben Wert", () => {
    const treffer = header.match(/matchMedia\("\(min-width:\s*(\d+)px\)"\)/);
    expect(treffer, "matchMedia im Header nicht gefunden").not.toBeNull();
    expect(
      Number(treffer![1]),
      "Der Umschaltpunkt in Header.tsx weicht von der Medienabfrage in theme.ts ab — dazwischen steht beides oder nichts",
    ).toBe(1000);
  });

  // Der eigentliche Fix: Die Navigation hängt nicht mehr am Zustand. Käme das
  // zurück, wäre das Server-HTML wieder auf jedem Gerät die Desktop-Fassung.
  it("die Navigation hängt nicht am Komponenten-Zustand", () => {
    expect(
      header,
      "isDesktop entscheidet wieder über die Navigation — das Layout gehört ins Stylesheet",
    ).not.toMatch(/\{isDesktop && \(\s*<nav/);
    expect(header, "die Navigation trägt keine CSS-Klasse mehr").toContain('className="hdr-nav"');
    expect(header, "der Burger trägt keine CSS-Klasse mehr").toContain('className="hdr-burger"');
  });
});
