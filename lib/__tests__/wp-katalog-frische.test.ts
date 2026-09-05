import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Wie alt der Gerätekatalog ist — bei gemischten Ständen.
 *
 * Die Frischeprüfung entscheidet, ob Preise neben einem Kaufknopf erscheinen.
 * Sie las den Zeitstempel der ERSTEN gelieferten Zeile, obwohl die Abfrage
 * keine Sortierung hat. Im Normalfall fällt das nicht auf: Ein durchgelaufener
 * Auffrisch-Lauf gibt allen Zeilen denselben Wert.
 *
 * Der Fall, in dem es zählt, ist der halb durchgelaufene: Geschrieben wird in
 * Blöcken zu 500, aufgeräumt wird erst danach. Bricht der Lauf nach dem ersten
 * Block ab, stehen neue und alte Zeitstempel nebeneinander und nichts wurde
 * gelöscht. Welche Zeile Postgres dann zuerst liefert, ist nicht zugesichert —
 * trifft es eine frische, gilt der ganze Bestand als frisch, samt der alten
 * Preise. Genau das soll die Frist verhindern.
 *
 * Gefunden von einer Gegenprüfung am 05.09.2026.
 */

const LESER = path.resolve(__dirname, "..", "wp-katalog-db.ts");

/** Die Auswahlregel, nachgebaut — der Test unten hält sie an das Original. */
const aeltester = (stempel: string[]) =>
  stempel.reduce((a, z) => (z < a ? z : a), stempel[0]);

describe("Alter des Gerätekatalogs", () => {
  it("nimmt bei gemischten Ständen den ältesten", () => {
    // Ein halb durchgelaufener Lauf: erste Hälfte neu, zweite Hälfte alt.
    const gemischt = [
      "2026-09-05T04:00:00.000Z",
      "2026-09-05T04:00:00.000Z",
      "2026-08-20T04:00:00.000Z",
      "2026-08-20T04:00:00.000Z",
    ];
    expect(aeltester(gemischt)).toBe("2026-08-20T04:00:00.000Z");

    // Und in der anderen Reihenfolge dasselbe Ergebnis — das ist der Punkt:
    // Die Antwort darf nicht davon abhängen, welche Zeile zuerst kommt.
    expect(aeltester([...gemischt].reverse())).toBe("2026-08-20T04:00:00.000Z");
  });

  it("ändert am Normalfall nichts", () => {
    const einheitlich = Array(5).fill("2026-09-05T04:00:00.000Z");
    expect(aeltester(einheitlich)).toBe("2026-09-05T04:00:00.000Z");
  });

  it("liest im Katalog wirklich das Minimum, nicht die erste Zeile", () => {
    const t = fs.readFileSync(LESER, "utf-8");
    // Der Reduce über alle Zeilen …
    expect(t).toMatch(/zeilen\.reduce\(/);
    // … und der frühere Griff auf die erste Zeile ist weg.
    const ausgeliefert = t
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(ausgeliefert).not.toMatch(/const abgerufenIso = zeilen\[0\]\.abgerufen_am/);
  });

  it("ISO-Zeitstempel lassen sich als Zeichenketten vergleichen", () => {
    // Die Reduce-Regel vergleicht mit `<` statt über Date — das trägt nur,
    // solange alle Stempel dieselbe ISO-Form haben. Postgres liefert sie so.
    const frueher = "2026-08-20T04:00:00.000Z";
    const spaeter = "2026-09-05T04:00:00.000Z";
    expect(frueher < spaeter).toBe(true);
    expect(new Date(frueher).getTime()).toBeLessThan(new Date(spaeter).getTime());
  });
});
