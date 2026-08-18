import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Der Umschaltpunkt der Kopfzeile steht an ZWEI Stellen, und das ist unvermeidbar:
// Die Sichtbarkeit entscheidet eine Medienabfrage (lib/theme.ts), den
// Menü-Zustand entscheidet matchMedia (components/Header.tsx). CSS kann keinen
// Zustand setzen, JavaScript darf das Layout nicht bestimmen — also braucht es
// beide. Laufen die Werte auseinander, entsteht ein Breitenbereich, in dem beide
// Navigationen stehen oder keine.
//
// WAS DIESER TEST NICHT KANN — und was stattdessen zuständig ist:
// Er prüft Zahlen, nicht Verhalten. Ob die Kopfzeile bei einer gegebenen Breite
// tatsächlich passt, ob der Burger erscheint, ob die Seite seitlich scrollt:
// das misst e2e/header-ohne-js.spec.ts im echten Browser, mit UND ohne
// JavaScript. Eine frühere Fassung dieses Tests verglich stattdessen ganze
// CSS-Zeilen als Zeichenketten. Gemessen am 18.08.2026 war sie in beide
// Richtungen unbrauchbar: Fünf harmlose Umformatierungen (Prettier-Lauf, andere
// Anführungszeichen, umsortierte Regeln) machten sie rot, und fünf echte Fehler
// ließ sie durch — darunter ein gelöschtes .hdr-burger{display:flex}, nach dem
// es auf Mobil überhaupt keine Navigation mehr gegeben hätte.
//
// Deshalb hier nur noch das, was ein Unit-Test wirklich beantworten kann:
// Stimmen die beiden Zahlen überein, und sind alle vier Klassen geregelt?

const REPO = join(__dirname, "..", "..");
const theme = readFileSync(join(REPO, "lib", "theme.ts"), "utf8");
const header = readFileSync(join(REPO, "components", "Header.tsx"), "utf8");

/**
 * Die beiden Medienabfragen der Kopfzeile mit Grenze und Inhalt.
 *
 * Gezielt über die Klasse gesucht, die je Block als erste steht — ein
 * allgemeiner Ausdruck über alle @media-Blöcke fängt sonst die einzeiligen
 * Regeln anderer Bausteine mit ein und liest deren Grenze aus.
 */
function kopfRegeln() {
  // Erst den Abschnitt eingrenzen: von der ersten Kopfzeilen-Regel bis zur
  // nächsten fremden Klasse. Ohne diese Eingrenzung greift ein Ausdruck über
  // @media-Blöcke hinweg und liest die Grenze eines fremden Bausteins.
  const von = theme.indexOf(".hdr-nav{");
  const bis = theme.indexOf(".footer-cols{", von);
  const abschnitt = theme.slice(von, bis > von ? bis : undefined);

  return [...abschnitt.matchAll(/@media\s*\(\s*(max|min)-width:\s*(\d+)px\s*\)\s*\{([\s\S]*?)\n  \}/g)]
    .map((m) => ({ art: m[1] as "max" | "min", grenze: Number(m[2]), inhalt: m[3] }))
    .filter((r) => r.inhalt.includes(".hdr-"));
}

describe("Kopfzeile: Umschaltpunkt", () => {
  const regeln = kopfRegeln();

  it("es gibt je eine Regel für schmal und für breit", () => {
    expect(regeln.filter((r) => r.art === "max"), "keine Regel für schmale Schirme").toHaveLength(1);
    expect(regeln.filter((r) => r.art === "min"), "keine Regel für breite Schirme").toHaveLength(1);
  });

  // Der eigentliche Zweck: Die beiden Zahlen müssen lückenlos aneinanderstoßen.
  it("die Grenzen stoßen ohne Lücke und ohne Überlappung aneinander", () => {
    const schmal = regeln.find((r) => r.art === "max")!.grenze;
    const breit = regeln.find((r) => r.art === "min")!.grenze;
    expect(
      breit - schmal,
      `max-width:${schmal} und min-width:${breit} — dazwischen gilt beides oder nichts`,
    ).toBe(1);
  });

  it("matchMedia im Header nennt dieselbe Grenze", () => {
    const treffer = header.match(/matchMedia\(\s*["'`]\(min-width:\s*(\d+)px\)["'`]\s*\)/);
    expect(treffer, "matchMedia im Header nicht gefunden").not.toBeNull();
    const breit = regeln.find((r) => r.art === "min")!.grenze;
    expect(
      Number(treffer![1]),
      `Header schaltet bei ${treffer![1]}px, das Stylesheet bei ${breit}px`,
    ).toBe(breit);
  });

  // Ein gelöschtes display:flex nahm der Mobil-Ansicht ihre gesamte Navigation,
  // ohne dass irgendein Test anschlug. Jede der vier Klassen braucht in der
  // schmalen Regel eine Zuweisung.
  it.each([".hdr-nav", ".hdr-auth", ".hdr-burger", ".hdr-aktionen"])(
    "%s ist für schmale Schirme geregelt",
    (klasse) => {
      const schmal = regeln.find((r) => r.art === "max")!;
      expect(schmal.inhalt, `${klasse} fehlt in der Regel für schmale Schirme`).toContain(klasse);
    },
  );

  it("Navigation und Burger schließen einander aus", () => {
    const schmal = regeln.find((r) => r.art === "max")!.inhalt;
    expect(schmal, "die Navigation wird schmal nicht ausgeblendet").toMatch(
      /\.hdr-nav\s*\{\s*display:\s*none/,
    );
    expect(schmal, "der Burger wird schmal nicht eingeblendet").toMatch(
      /\.hdr-burger\s*\{\s*display:\s*(flex|block|inline-flex)/,
    );
    // Grundzustand (außerhalb jeder Medienabfrage): umgekehrt. Der Ausschnitt
    // reicht von der ersten Kopfzeilen-Regel bis zu ihrer Medienabfrage.
    const abHdr = theme.indexOf(".hdr-nav{");
    const bisMedia = theme.indexOf("@media", abHdr);
    const grund = theme.slice(abHdr, bisMedia);
    expect(grund, "der Burger ist im Grundzustand nicht ausgeblendet").toMatch(
      /\.hdr-burger\s*\{\s*display:\s*none/,
    );
  });

  // Der Originalfehler: Die Navigation hing am Komponenten-Zustand, der Server
  // lieferte damit auf jedem Gerät die Desktop-Fassung. Beide Schreibweisen
  // abdecken — die erste Fassung dieses Tests prüfte nur `&&` und hätte ein
  // `? :` durchgelassen.
  it("die Navigation hängt nicht am Komponenten-Zustand", () => {
    expect(
      header,
      "isDesktop entscheidet wieder über die Navigation — das Layout gehört ins Stylesheet",
    ).not.toMatch(/isDesktop\s*(&&|\?)[\s\S]{0,40}<nav/);
    expect(header, "die Navigation trägt keine CSS-Klasse mehr").toMatch(
      /<nav[^>]*className="hdr-nav"/,
    );
    expect(header, "der Burger trägt keine CSS-Klasse mehr").toMatch(
      /className="hdr-burger"/,
    );
  });
});
