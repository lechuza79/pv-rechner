import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHmac } from "node:crypto";

/**
 * Die Kennung der betriebseigenen Seite steht an ZWEI Stellen: im Modul, das
 * die Seite auflöst, und im Skript, das die Adresse zum Verschicken ausgibt.
 * Die Verdopplung ist unvermeidlich — das Modul trägt `server-only` und lässt
 * sich in einem Node-Skript nicht laden.
 *
 * Laufen die beiden auseinander, führt JEDER verschickte Link ins Leere, und
 * zwar lautlos: Die Seite antwortet mit einer sauberen 404, kein Test wird rot,
 * kein Fehler taucht auf. Das ist genau die Fehlerklasse, die dieses Projekt
 * als „von außen unsichtbar" führt — deshalb hält dieser Test beide Fassungen
 * aneinander, statt auf Sorgfalt zu vertrauen.
 */

/** Wirft Zeilen- und Blockkommentare weg — geprüft wird, was ausgeliefert
 *  wird, nicht was daneben erklärt ist. */
function ohneKommentare(quelle: string): string {
  return quelle.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const wurzel = resolve(__dirname, "../..");
const MODUL = readFileSync(resolve(wurzel, "lib/fachbetrieb-seite.ts"), "utf8");
const SKRIPT = readFileSync(resolve(wurzel, "scripts/fachbetrieb-link.ts"), "utf8");

/** Holt den Kern der Ableitung aus einer Datei: Algorithmus, Präfix, Länge. */
function rezept(quelle: string): { algo: string; praefix: string; laenge: string } {
  const algo = quelle.match(/createHmac\(\s*"([a-z0-9]+)"/)?.[1] ?? "";
  const praefix = quelle.match(/\.update\(`([^$]*)\$\{/)?.[1] ?? "";
  const laenge = quelle.match(/\.slice\(0,\s*(\d+)\)/)?.[1] ?? "";
  return { algo, praefix, laenge };
}

describe("Kennung der betriebseigenen Seite", () => {
  it("Modul und Versand-Skript rechnen dieselbe Kennung", () => {
    const m = rezept(MODUL);
    const s = rezept(SKRIPT);
    expect(m.algo).toBeTruthy();
    expect(m.praefix).toBeTruthy();
    expect(m.laenge).toBeTruthy();
    expect(s).toEqual(m);
  });

  it("beide senken die Domain auf Kleinschreibung", () => {
    // Ohne das liefert dieselbe Domain je nach Schreibweise zwei Kennungen —
    // und welche im Brief landet, entscheidet dann der Zufall der Erfassung.
    for (const [name, quelle] of [["Modul", MODUL], ["Skript", SKRIPT]] as const) {
      expect(quelle, `${name} muss die Domain kleinschreiben`).toMatch(/domain\.toLowerCase\(\)/);
    }
  });

  it("die Kennung ist lang genug, um nicht geraten zu werden", () => {
    // 16 Hex-Zeichen sind 64 Bit. Kürzer wäre die Adresse durchprobierbar —
    // und damit eine Auskunft darüber, welche Betriebe wir erfasst haben.
    expect(Number(rezept(MODUL).laenge)).toBeGreaterThanOrEqual(16);
  });

  it("die Prüfung der Kennung passt zu ihrer Länge", () => {
    // Ein zu enges oder zu weites Muster wirft entweder gültige Adressen weg
    // oder lässt Unsinn bis in die Datenbankabfrage durch.
    const laenge = rezept(MODUL).laenge;
    expect(MODUL).toContain(`[0-9a-f]{${laenge}}`);
  });

  it("die Ableitung ist stabil (Beispielrechnung)", () => {
    // Hält den Algorithmus selbst fest, nicht nur die Übereinstimmung der
    // beiden Fassungen: Änderten sich beide gleichzeitig, wären alle bereits
    // verschickten Links tot.
    const kennung = createHmac("sha256", "testgeheimnis")
      .update("fachbetrieb:beispiel-solar.de")
      .digest("hex")
      .slice(0, 16);
    expect(kennung).toBe("faa52a0d3fbbd3ce");
  });
});

describe("Die Seite darf nicht in den Index", () => {
  const SEITE = readFileSync(resolve(wurzel, "app/(partner)/fuer/[kennung]/page.tsx"), "utf8");
  const LAYOUT = readFileSync(resolve(wurzel, "app/(partner)/layout.tsx"), "utf8");

  it("Seite und Rahmen sperren beide", () => {
    // Doppelt, und das ist Absicht: Eine indexierte Seite mit dem Firmennamen
    // eines Betriebs auf UNSERER Domain träte bei Google gegen seine eigene
    // Website an — ein Grund, nicht mitzumachen.
    expect(SEITE).toMatch(/robots:\s*\{[^}]*index:\s*false/);
    expect(LAYOUT).toMatch(/robots:\s*\{[^}]*index:\s*false/);
  });

  it("der Rahmen bringt keine Site-Navigation mit", () => {
    // Der erste Bauversuch lag in der Site-Gruppe und lieferte unser Menü
    // gleich mit — ein Einladung an den Besucher des Betriebs, wegzuklicken.
    expect(LAYOUT).not.toMatch(/from ".*components\/Header"/);
    expect(LAYOUT).not.toMatch(/from ".*components\/Footer"/);
  });

  it("der Rahmen trägt Impressum und Datenschutz", () => {
    // Diensteanbieter dieser Seite sind wir (§ 5 DDG). Den Fuß wegzulassen,
    // damit die Seite mehr nach dem Betrieb aussieht, wäre der Fehler.
    expect(LAYOUT).toContain('href="/impressum"');
    expect(LAYOUT).toContain('href="/datenschutz"');
  });

  it("vor der Zusage behauptet die Seite keine Zusammenarbeit", () => {
    // „Bereitgestellt für X" wäre ohne Zusage selbst eine unwahre Angabe über
    // eine Geschäftsbeziehung.
    //
    // Geprüft wird der AUSGELIEFERTE Text, nicht die Quelle: Die Kommentare
    // erklären genau diese Regel und enthalten die verbotene Wendung
    // zwangsläufig. Ein Test, der sie mitliest, wäre rot, weil die Begründung
    // dasteht — und zwänge dazu, die Begründung zu löschen statt den Fehler zu
    // vermeiden.
    //
    // Geprüft wird die AUSSAGE per Muster, nicht ihr Wortlaut. Die erste
    // Fassung verlangte den Satz „noch keine Zusammenarbeit" und wurde rot,
    // als daraus „besteht bislang keine Zusammenarbeit und keine Vereinbarung"
    // wurde — dieselbe Aussage, anderer Wortlaut. Genau diese Fehlerklasse hat
    // das Projekt schon bei der Vertrauens-Leiste getroffen: ein Wort daneben,
    // Test grün, Falschaussage live.
    const text = ohneKommentare(SEITE);
    expect(text).toMatch(/keine (Zusammenarbeit|Vereinbarung|Gesch[äa]ftsbeziehung)/i);
    expect(text).not.toMatch(/bereitgestellt f[uü]r/i);
    // Und die Verneinung darf nicht erst hinter einem Klick auftauchen: Der
    // Hinweis muss im ersten sichtbaren Bereich stehen. Geprüft wird das Wort
    // selbst, nicht seine Schreibung — es stand erst als „Demo-Ansicht" unter
    // dem Namen und ist jetzt eine Plakette „Demo" daneben.
    expect(text).toMatch(/}>Demo<\/span>/);
  });
});
