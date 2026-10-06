import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHmac } from "node:crypto";

import { kennungAusGeheimnis, kennungsSchluessel, KENNUNG_LAENGE, KENNUNG_MUSTER } from "../fachbetrieb-kennung";

/**
 * Die Kennung der betriebseigenen Seite wird an ZWEI Stellen gebraucht: im
 * Modul, das die Seite auflöst, und im Skript, das die Adresse zum Verschicken
 * ausgibt. Laufen die beiden auseinander, führt JEDER verschickte Link ins
 * Leere, und zwar lautlos (saubere 404, kein roter Test). Seit 28.09.2026
 * rechnen beide aus EINER Quelle (`lib/fachbetrieb-kennung.ts`); dieser Test
 * hält fest, dass keiner der beiden wieder eine eigene Fassung baut.
 */

/** Wirft Zeilen- und Blockkommentare weg — geprüft wird, was ausgeliefert
 *  wird, nicht was daneben erklärt ist. */
function ohneKommentare(quelle: string): string {
  return quelle.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const wurzel = resolve(__dirname, "../..");
const MODUL = readFileSync(resolve(wurzel, "lib/fachbetrieb-seite.ts"), "utf8");
const SKRIPT = readFileSync(resolve(wurzel, "scripts/fachbetrieb-link.ts"), "utf8");
const TESTBETRIEB = readFileSync(resolve(wurzel, "scripts/_testbetrieb.ts"), "utf8");

describe("Kennung der betriebseigenen Seite", () => {
  it("Modul und Skripte rechnen aus EINER Quelle, keiner baut sie nach", () => {
    for (const [name, quelle] of [["Modul", MODUL], ["Link-Skript", SKRIPT], ["Testbetrieb", TESTBETRIEB]] as const) {
      const code = ohneKommentare(quelle);
      expect(code, `${name} muss die geteilte Ableitung benutzen`).toMatch(/kennungAusGeheimnis\(/);
      expect(code, `${name} darf keine eigene HMAC-Fassung tragen`).not.toMatch(/createHmac/);
    }
  });

  it("der Schlüssel ist ABGELEITET, nicht der Cron-Schlüssel selbst", () => {
    // Derselbe Schlüssel für Cron-Zugang und öffentliche Kennungen vermischte
    // zwei Zwecke. Die alte Rechnung (Cron-Schlüssel direkt) darf nicht mehr
    // herauskommen.
    const alt = createHmac("sha256", "testgeheimnis").update("fachbetrieb:beispiel-solar.de").digest("hex").slice(0, 16);
    expect(kennungAusGeheimnis("beispiel-solar.de", "testgeheimnis")).not.toBe(alt);
    expect(kennungsSchluessel("testgeheimnis").equals(Buffer.from("testgeheimnis"))).toBe(false);
  });

  it("die Domain wird kleingeschrieben", () => {
    // Sonst liefert dieselbe Domain je nach Schreibweise zwei Kennungen.
    expect(kennungAusGeheimnis("Beispiel-Solar.DE", "g")).toBe(kennungAusGeheimnis("beispiel-solar.de", "g"));
  });

  it("die Kennung ist lang genug, um nicht geraten zu werden", () => {
    // 16 Hex-Zeichen sind 64 Bit. Kürzer wäre die Adresse durchprobierbar —
    // und damit eine Auskunft darüber, welche Betriebe wir erfasst haben.
    expect(KENNUNG_LAENGE).toBeGreaterThanOrEqual(16);
    expect(kennungAusGeheimnis("x.de", "g")).toHaveLength(KENNUNG_LAENGE);
  });

  it("die Prüfung der Kennung passt zu ihrer Länge und wird benutzt", () => {
    expect(KENNUNG_MUSTER.test(kennungAusGeheimnis("x.de", "g"))).toBe(true);
    expect(KENNUNG_MUSTER.test("0".repeat(KENNUNG_LAENGE + 1))).toBe(false);
    expect(ohneKommentare(MODUL)).toMatch(/KENNUNG_MUSTER\.test\(kennung\)/);
  });

  it("die Ableitung ist stabil (Beispielrechnung)", () => {
    // Hält den Algorithmus selbst fest: Änderte er sich, wären alle bereits
    // verschickten Links tot. Der Wert hat sich am 28.09.2026 mit dem
    // abgeleiteten Schlüssel einmal bewusst geändert — damals war noch keine
    // Partner-Adresse verschickt.
    expect(kennungAusGeheimnis("beispiel-solar.de", "testgeheimnis")).toBe("d616bf54335003a2");
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
