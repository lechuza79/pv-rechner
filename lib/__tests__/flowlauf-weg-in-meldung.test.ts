import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { weiterMeldung, wahlMeldung } from "../../e2e/flows";

/**
 * WARUM ES DIESEN TEST GIBT (gemessen 23.09.2026)
 *
 * Der nächtliche Flow-Läufer war am 21. und 22.09.2026 zweimal in Folge rot,
 * beide Male mit derselben Meldung: „Weiter kam nicht durch: Der Schritt
 * wechselte 20 s lang nicht (Weiter-Knopf frei)." Und beide Male ohne einen
 * einzigen Hinweis darauf, WELCHE der rund 1.700 Kombinationen gerade lief.
 *
 * DAS IST DER EIGENTLICHE DEFEKT, NICHT DER ROTE LAUF. Gesammelte Befunde
 * (`erg.fehler`) tragen ihren Weg seit jeher; die beiden Helfer `waehle` und
 * `weiterKlicken` WERFEN aber, und eine geworfene Meldung reißt den Test ab.
 * Nach gut drei Stunden Laufzeit steht dann ein Fehler da, den niemand
 * nachstellen kann — und was sich nicht nachstellen lässt, lässt sich weder
 * beheben noch als Maschinen-Last abtun. Der Kommentar in `waehle` benannte
 * die Lücke sogar wörtlich („noch auf welchem Weg"); geschlossen war sie nie.
 *
 * DER KONTEXT NENNT BEIDES: Zielkombination und Klemmstelle. Nur das Ziel sagt
 * nicht, welcher Schritt hängt; nur die Stelle nicht, welcher Weg gerade lief.
 * Erst zusammen trennen sie einen echten Produktfehler von einem Runner, der
 * beim 500. Nachspielen desselben Prefixes ins Stocken gerät.
 *
 * GEPRÜFT WIRD DIE VERWENDUNG, NICHT DAS VORHANDENSEIN: Die Meldungen sind
 * eigene, exportierte Funktionen, die dieser Test AUFRUFT. Eine Suche nach dem
 * Parameternamen im Quelltext bliebe grün, sobald jemand ihn entgegennimmt und
 * in der Meldung vergisst — also bei genau dem Rückfall, den es zu verhindern
 * gilt.
 */

const WURZEL = resolve(__dirname, "..", "..");
const LAEUFER = readFileSync(resolve(WURZEL, "e2e/flows.spec.ts"), "utf8");

/** Der Rumpf der Funktion, die den Kombinationsbaum abgeht. */
function geheRumpf(): string {
  const start = LAEUFER.indexOf("async function gehe(");
  expect(start, "Die Funktion `gehe` im Flow-Läufer nicht gefunden").toBeGreaterThan(-1);
  const ende = LAEUFER.indexOf("\nfor (const flow of FLOWS)", start);
  expect(ende, "Ende von `gehe` nicht gefunden").toBeGreaterThan(start);
  return LAEUFER.slice(start, ende);
}

describe("Der Flow-Läufer nennt bei einem Abbruch den Weg", () => {
  it("nimmt den Weg in die Weiter-Meldung auf", () => {
    const mitWeg = weiterMeldung("Dach → Speicher: ja", false);
    expect(mitWeg).toContain("Dach → Speicher: ja");
    expect(mitWeg).toContain("Weiter kam nicht durch");
  });

  it("nimmt den Weg in die Options-Meldung auf", () => {
    const mitWeg = wahlMeldung("Dach → Speicher: ja", "5 kWh", { pressed: null });
    expect(mitWeg).toContain("Dach → Speicher: ja");
    expect(mitWeg).toContain("5 kWh");
  });

  it("bleibt ohne Weg unverändert lesbar — die übrigen Aufrufer gehen feste, kurze Wege", () => {
    expect(weiterMeldung(undefined, true).startsWith("Weiter kam nicht durch")).toBe(true);
    expect(wahlMeldung(undefined, "5 kWh", null).startsWith("Option „5 kWh")).toBe(true);
    // Kein leeres Klammerpaar, wenn nichts übergeben wurde.
    expect(weiterMeldung(undefined, true)).not.toContain("[]");
    expect(wahlMeldung(undefined, "5 kWh", null)).not.toContain("[]");
  });

  it("unterscheidet gesperrten und freien Weiter-Knopf weiterhin", () => {
    expect(weiterMeldung("w", true)).toContain("gesperrt");
    expect(weiterMeldung("w", false)).toContain("frei");
  });

  it("gibt an JEDER Stelle des Kombinationsbaums einen Kontext mit", () => {
    const rumpf = geheRumpf();
    const ohneKontext: string[] = [];
    // `waehle(page, x)` und `weiterKlicken(page)` ohne weiteres Argument.
    for (const m of rumpf.matchAll(/\bwaehle\(page,\s*[^,)]+\)/g)) ohneKontext.push(m[0]);
    for (const m of rumpf.matchAll(/\bweiterKlicken\(page\)/g)) ohneKontext.push(m[0]);
    expect(
      ohneKontext,
      "Diese Aufrufe im Kombinationsbaum werfen ohne Angabe des Wegs — bei rund 1.700 " +
        "Kombinationen ist die Meldung dann nicht nachstellbar.",
    ).toEqual([]);
  });

  it("nennt im Kontext die Zielkombination UND die Klemmstelle", () => {
    const rumpf = geheRumpf();
    expect(rumpf, "Die Zielkombination fehlt im Kontext.").toMatch(/const ziel = \[\.\.\.pfad, wahl\]/);
    expect(rumpf, "Die Klemmstelle beim Nachspielen fehlt im Kontext.").toMatch(
      /Ziel \$\{ziel\}[^`]*Nachspielen/,
    );
  });
});
