import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Wächter gegen ungeschützte Adress-Entschlüsselung.
 *
 * `decodeURIComponent` WIRFT bei einem einzelnen kaputten Prozentzeichen —
 * „/balkon%zz" genügt. Fremde Websites enthalten solche Links, und ein
 * Erhebungslauf, der Tausende davon liest, trifft irgendwann einen.
 *
 * ZWEIMAL EINEN LAUF ABGERISSEN: am 28.08.2026 nach 450 von 1.254 Domains, am
 * 29.08.2026 nach 2.400 von 2.850. **Beim zweiten Mal existierte die
 * Absicherung bereits** — als try/catch an genau der Stelle, an der es beim
 * ersten Mal passiert war. Zwei neue Aufrufer bekamen sie nicht mit.
 *
 * Deshalb dieser Test. Er verbietet nicht den Fehler, sondern die Bauweise, die
 * ihn ermöglicht: den direkten Aufruf ohne Schutz. Eine Vorsichtsmaßnahme, an
 * die sich jeder Aufrufer erinnern muss, ist keine.
 *
 * ERLAUBT ist der Aufruf nur INNERHALB einer Funktion, die ihn abfängt — die
 * Ausnahmen unten sind namentlich genannt und tragen ihren Grund.
 */

const ROOT = join(__dirname, "..", "..");
const ORDNER = ["lib", "scripts", "app", "components"];

/**
 * Die Stellen, an denen der Aufruf stehen DARF: Schutzfunktionen, die ihn
 * abfangen und im Fehlerfall die rohe Adresse liefern.
 *
 * Zwei Einträge, und dass es zwei sind, ist Absicht: Beide Bereiche lesen
 * fremde Websites, teilen sonst aber keinen Code. Ein drittes Modul ist ein
 * Anlass nachzudenken, ob die Funktion nicht doch gemeinsam gehört — nicht,
 * die Liste zu verlängern.
 */
const SCHUTZFUNKTIONEN = [
  "lib/fachbetrieb-extrakt.ts",
  // Der Förderbereich liest ebenfalls fremde Adressen und hat dieselbe
  // Absicherung unabhängig gebaut, mit eigenem Kommentar zum selben Fehlerbild.
  "lib/funding-url-suche.ts",
];

function dateien(ordner: string): string[] {
  const out: string[] = [];
  const lauf = (p: string) => {
    let eintraege: string[];
    try {
      eintraege = readdirSync(p);
    } catch {
      return;
    }
    for (const e of eintraege) {
      if (e === "node_modules" || e === ".next" || e === ".next-dev") continue;
      const voll = join(p, e);
      if (statSync(voll).isDirectory()) lauf(voll);
      else if (/\.(ts|tsx)$/.test(e) && !voll.includes("__tests__")) out.push(voll);
    }
  };
  lauf(join(ROOT, ordner));
  return out;
}

describe("Adress-Entschlüsselung: nie ungeschützt", () => {
  it("ruft decodeURIComponent nur in benannten Schutzfunktionen auf", () => {
    const verstoesse: string[] = [];
    for (const ordner of ORDNER)
      for (const datei of dateien(ordner)) {
        const rel = relative(ROOT, datei);
        if (SCHUTZFUNKTIONEN.includes(rel)) continue;
        const inhalt = readFileSync(datei, "utf8");
        for (const [i, zeile] of inhalt.split("\n").entries())
          if (/\bdecodeURIComponent\s*\(/.test(zeile)) verstoesse.push(`${rel}:${i + 1}`);
      }
    expect(
      verstoesse,
      "decodeURIComponent wirft bei kaputten Adressen und hat zweimal einen Lauf " +
        "abgerissen. Nimm die Schutzfunktion (adresseLesbar) statt des direkten Aufrufs.",
    ).toEqual([]);
  });

  it("fängt in den Schutzfunktionen wirklich ab — try/catch, nicht nur ein Kommentar", () => {
    // Ein Wächter, der nur Aufrufstellen zählt, ließe eine Schutzfunktion
    // durchgehen, die gar nicht schützt.
    for (const rel of SCHUTZFUNKTIONEN) {
      const inhalt = readFileSync(join(ROOT, rel), "utf8");
      const stellen = [...inhalt.matchAll(/\bdecodeURIComponent\s*\(/g)];
      expect(stellen.length, `${rel}: kein Aufruf gefunden — Eintrag veraltet?`).toBeGreaterThan(0);
      for (const m of stellen) {
        // 400 Zeichen vor dem Aufruf müssen ein `try {` enthalten, und danach
        // muss ein `catch` folgen.
        const davor = inhalt.slice(Math.max(0, m.index! - 400), m.index!);
        const danach = inhalt.slice(m.index!, m.index! + 400);
        expect(davor, `${rel}: Aufruf ohne try`).toMatch(/try\s*\{/);
        expect(danach, `${rel}: try ohne catch`).toMatch(/catch/);
      }
    }
  });
});
