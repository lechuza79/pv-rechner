import { describe, it, expect } from "vitest";
import { heuteInBerlin, berlinOffset, wochentagInBerlin, tagInBerlin } from "../zeit";

// Ein Kalendertag ist nicht dasselbe wie ein UTC-Tag. Zwischen Mitternacht und
// zwei Uhr deutscher Sommerzeit liegt das UTC-Datum einen Tag zurück — und
// genau in diesem Fenster sieht niemand hin.
describe("Deutscher Kalendertag", () => {
  it("nimmt den deutschen Tag, nicht den von UTC", () => {
    // 19.08.2026, 00:30 deutscher Sommerzeit = 18.08. 22:30 UTC.
    const nachts = new Date("2026-08-18T22:30:00Z");
    expect(heuteInBerlin(nachts)).toBe("2026-08-19");
    expect(nachts.toISOString().slice(0, 10)).toBe("2026-08-18");
  });

  it("kennt den Versatz zu beiden Jahreszeiten", () => {
    expect(berlinOffset(new Date("2026-08-19T10:00:00Z"))).toBe("+02:00");
    expect(berlinOffset(new Date("2026-01-19T10:00:00Z"))).toBe("+01:00");
  });

  // Ein Zeitstempel ohne Versatz gilt in Postgres als UTC — der „Tagesbeginn"
  // wäre damit zwei Stunden zu spät, und die ersten Mails eines Tages zählten
  // nicht mit.
  it("ergibt zusammen einen eindeutigen Tagesbeginn", () => {
    const jetzt = new Date("2026-08-19T10:00:00Z");
    const beginn = `${heuteInBerlin(jetzt)}T00:00:00${berlinOffset(jetzt)}`;
    expect(beginn).toBe("2026-08-19T00:00:00+02:00");
    expect(new Date(beginn).toISOString()).toBe("2026-08-18T22:00:00.000Z");
  });

  it("liest den Wochentag deutsch", () => {
    expect(wochentagInBerlin(new Date("2026-08-19T10:00:00Z"))).toBe(3); // Mittwoch
    // Sonntagabend UTC ist in Deutschland schon Montag.
    expect(wochentagInBerlin(new Date("2026-08-16T23:30:00Z"))).toBe(1);
  });
});

describe("Zeitpunkt oder gemeinter Tag — tagInBerlin unterscheidet beides", () => {
  // Die Funktion hat zwei Aufgaben, und die zweite geht leicht verloren: Ein
  // ZEITPUNKT muss in den deutschen Kalendertag umgerechnet werden, ein bereits
  // gemeinter TAG darf es NICHT — er ist schon der Tag.
  //
  // Warum das hier gepinnt wird und nicht nur bei den Aufrufern: Für ein bloßes
  // „2027-02-01" liefern beide Bauweisen dasselbe (UTC-Mitternacht liegt in
  // Deutschland am selben Tag), eine Verwechslung fällt dort also NICHT auf.
  // Gemessen: Ein absichtlicher Rückbau auf `heuteInBerlin(new Date(wann))`
  // ließ am 08.09.2026 sämtliche Stichtags-Tests grün. Auseinander gehen die
  // beiden erst bei einem String MIT Uhrzeit — und den reicht irgendwann jemand
  // herein, weil nichts ihn daran hindert.

  it("rechnet einen Zeitpunkt in den deutschen Kalendertag um", () => {
    expect(tagInBerlin(new Date("2026-07-31T22:30:00Z"))).toBe("2026-08-01"); // 00:30 Ortszeit
    expect(tagInBerlin(new Date("2026-07-31T21:30:00Z"))).toBe("2026-07-31"); // 23:30 Ortszeit
  });

  it("lässt einen gemeinten Tag unverändert — auch mit Uhrzeit daran", () => {
    expect(tagInBerlin("2026-08-01")).toBe("2026-08-01");
    // DER FALL, DER DIE BAUWEISEN TRENNT: Über einen Umweg als Zeitpunkt
    // gelesen wäre das in Deutschland bereits der 02.08. — der gemeinte Tag ist
    // aber der 01.08., er steht im String.
    expect(tagInBerlin("2026-08-01T23:30:00Z")).toBe("2026-08-01");
    expect(tagInBerlin("2026-01-31T23:30:00Z")).toBe("2026-01-31"); // Winterzeit
  });
});
