import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Die Förder-Route prüft die Eingabe, BEVOR sie die Datenbank liest.
 *
 * WARUM (20.08.2026, Fehler-Triage): Die Route ist öffentlich und braucht keine
 * Anmeldung. Bis zu diesem Tag stand die Prüfung der fünf Ziffern UNTERHALB des
 * Katalog-Reads — jede Anfrage ohne brauchbare PLZ las also erst den gesamten
 * Förderkatalog aus der Datenbank und warf ihn dann weg, um mit 400 zu
 * antworten.
 *
 * Aufgefallen ist es an 326 abgewiesenen Anfragen innerhalb eines Tages
 * (19.08.2026, Vercel-Logs, alle auf dieser einen Adresse). Keine davon kam aus
 * unserer eigenen Oberfläche: Beide Aufrufer im Code — der geteilte Hook
 * `lib/use-foerderung.ts` und der Empfehlungs-Flow — prüfen die fünf Ziffern
 * selbst, bevor sie überhaupt abrufen (am Code nachgesehen, nicht angenommen).
 * Es war also Fremdverkehr, und der konnte über eine offene Route
 * Datenbankarbeit auslösen.
 *
 * DER ZWISCHENSPEICHER IST KEIN ERSATZ FÜR DIE PRÜFUNG. `getFundingPrograms()`
 * hält den Katalog zehn Minuten je warmer Instanz vor und hat den Großteil der
 * 326 Anfragen abgefangen. Das ist ein Dämpfer, keine Grenze: Nach jedem Deploy,
 * nach jedem Kaltstart und bei genügend Abstand zwischen den Anfragen liegt der
 * Read wieder frei. Sich auf einen Cache zu verlassen, den man nicht kontrolliert,
 * ist dieselbe Sorte Annahme, gegen die das Wächter-Gate sonst schützt.
 *
 * WARUM ALS STRUKTUR-TEST UND NICHT ALS AUFRUF: Gemessen werden müsste, dass ein
 * Datenbank-Read NICHT stattfindet — ein ausbleibender Seiteneffekt. Die
 * Reihenfolge im Quelltext ist die Sache, die tatsächlich schützt, und genau die
 * kippt beim nächsten Umbau still zurück. Sie ist hier festgenagelt.
 */

const ROUTE = resolve(__dirname, "../../app/api/funding/route.ts");

describe("Förder-Route: Eingangsprüfung", () => {
  const quelle = readFileSync(ROUTE, "utf-8");

  it("weist eine ungültige PLZ ab, bevor der Katalog gelesen wird", () => {
    const pruefung = quelle.indexOf('{ error: "invalid plz" }');
    const read = quelle.indexOf("await getFundingPrograms()");

    expect(pruefung, "Die 400-Antwort für eine ungültige PLZ fehlt in der Route").toBeGreaterThan(-1);
    expect(read, "Der Katalog-Read fehlt in der Route").toBeGreaterThan(-1);
    expect(
      pruefung,
      "Die PLZ-Prüfung steht wieder unterhalb des Katalog-Reads — dann löst jede " +
        "ungültige Anfrage erneut Datenbankarbeit aus (siehe Kopf dieser Datei).",
    ).toBeLessThan(read);
  });

  it("lässt eine Anfrage mit Programm-Kennung durch, auch ohne PLZ", () => {
    // `foe` (Vorbelegung über einen Link von einer Stadt- oder Förderseite)
    // trägt keine PLZ und darf von der Eingangsprüfung nicht abgewiesen werden.
    // Ohne diese Ausnahme wäre der Fix eine Funktionsregression statt einer
    // Härtung — die Vorbelegung fiele stumm aus.
    expect(
      /if\s*\(\s*!foe\s*&&\s*!\/\^\\d\{5\}\$\/\.test\(plz\)\s*\)/.test(quelle),
      "Die Eingangsprüfung nimmt Anfragen mit Programm-Kennung nicht mehr aus",
    ).toBe(true);
  });
});
