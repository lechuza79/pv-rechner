import { describe, it, expect } from "vitest";
import { heuteInBerlin, berlinOffset, wochentagInBerlin } from "../zeit";

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
