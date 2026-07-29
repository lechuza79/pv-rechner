import { describe, it, expect } from "vitest";
import { DEFAULT_FEED_IN, feedInRatesFor } from "../feedin-config";

/**
 * Realitäts-Anker für die EEG-Einspeisevergütung (Wächter-Gate, Regel 7).
 *
 * Die Sätze werden halbjährlich automatisch gepflegt. Damit kein Wert per Hand
 * "plausibel gemacht" werden kann, rechnet dieser Test die gesetzliche Kette
 * unabhängig nach und hält sie gegen die von der Bundesnetzagentur
 * VERÖFFENTLICHTEN Halbjahre. Schlägt einer dieser Vergleiche fehl, stimmt
 * entweder die Kette nicht mehr (Gesetzesänderung) oder jemand hat einen Wert
 * frei gesetzt.
 *
 * Diese Datei implementiert die Kette bewusst ein zweites Mal statt sie aus
 * feedin-config zu importieren — ein Anker, der dieselbe Funktion aufruft, die
 * er prüfen soll, prüft nichts.
 */

// § 48 Abs. 2 / Abs. 2a EEG 2023, Gebäude und Lärmschutzwände (ct/kWh).
const BASIS = {
  teilUnder10: 8.6,
  teilOver10: 7.5,
  vollUnder10: 13.4,
  vollOver10: 11.3,
} as const;

const ABZUG_53 = 0.4; // § 53 Abs. 1 EEG: Einspeisevergütung statt Marktprämie

/**
 * Kaufmännisch auf zwei Nachkommastellen. Der Umweg über toFixed fängt die
 * Binärdarstellung ab: 7,5 × 0,99 liegt knapp UNTER 7,425, ein nacktes
 * Math.round(x * 100) ergäbe dort 7,42 statt der amtlichen 7,43.
 */
const round2 = (x: number) => Math.round(Number((x * 100).toFixed(6))) / 100;

/** Anzulegender Wert nach n Halbjahresschritten (§ 49 Abs. 1: 1 %, ungerundet fortgeschrieben). */
const anzulegenderWert = (basis: number, n: number) => round2(basis * Math.pow(0.99, n));

/** Einspeisevergütung = anzulegender Wert − 0,4 ct. */
const verguetung = (basis: number, n: number) => round2(anzulegenderWert(basis, n) - ABZUG_53);

const satzFuer = (n: number) => ({
  teilUnder10: verguetung(BASIS.teilUnder10, n),
  teilOver10: verguetung(BASIS.teilOver10, n),
  vollUnder10: verguetung(BASIS.vollUnder10, n),
  vollOver10: verguetung(BASIS.vollOver10, n),
});

/**
 * Amtlich veröffentlichte Einspeisevergütung, Gebäude, je Inbetriebnahme-
 * Halbjahr — abgeschrieben aus den Tabellen der Bundesnetzagentur
 * ("Anzulegende Werte für Solaranlagen", Archiv), geprüft am 28.07.2026.
 * n = Zahl der Degressionsschritte seit dem 01.02.2024.
 */
const AMTLICH: Array<{ n: number; zeitraum: string; teilUnder10: number; teilOver10: number; vollUnder10: number; vollOver10: number }> = [
  { n: 1, zeitraum: "02–07/2024",    teilUnder10: 8.11, teilOver10: 7.03, vollUnder10: 12.87, vollOver10: 10.79 },
  { n: 2, zeitraum: "08/2024–01/25", teilUnder10: 8.03, teilOver10: 6.95, vollUnder10: 12.73, vollOver10: 10.68 },
  { n: 3, zeitraum: "02–07/2025",    teilUnder10: 7.94, teilOver10: 6.88, vollUnder10: 12.60, vollOver10: 10.56 },
  { n: 4, zeitraum: "08/2025–01/26", teilUnder10: 7.86, teilOver10: 6.80, vollUnder10: 12.47, vollOver10: 10.45 },
  { n: 5, zeitraum: "02–07/2026",    teilUnder10: 7.78, teilOver10: 6.73, vollUnder10: 12.34, vollOver10: 10.35 },
];

describe("EEG-Vergütung – Realitäts-Anker", () => {
  it.each(AMTLICH)(
    "die Gesetzeskette trifft die veröffentlichten Sätze für $zeitraum",
    ({ n, teilUnder10, teilOver10, vollUnder10, vollOver10 }) => {
      expect(satzFuer(n)).toEqual({ teilUnder10, teilOver10, vollUnder10, vollOver10 });
    },
  );

  it("die hinterlegten Sätze je Stichtag stammen aus derselben Kette", () => {
    // 02–07/2026 (n=5) und ab 08/2026 (n=6) — beide Stichtage aus dem Plan.
    const juli = feedInRatesFor(new Date("2026-07-31T12:00:00Z"));
    const august = feedInRatesFor(new Date("2026-08-01T12:00:00Z"));

    expect(juli.validFrom).toBe("2026-02-01");
    expect({
      teilUnder10: juli.teilUnder10, teilOver10: juli.teilOver10,
      vollUnder10: juli.vollUnder10, vollOver10: juli.vollOver10,
    }).toEqual(satzFuer(5));

    expect(august.validFrom).toBe("2026-08-01");
    expect({
      teilUnder10: august.teilUnder10, teilOver10: august.teilOver10,
      vollUnder10: august.vollUnder10, vollOver10: august.vollOver10,
    }).toEqual(satzFuer(6));
  });

  it("schreibt NICHT den bereits gerundeten Vergütungssatz fort", () => {
    // Der verbreitete Kurzschluss (10,35 × 0,99 → 10,25) verstößt gegen § 49
    // Abs. 1 Satz 2 und verfehlt 11 der amtlich veröffentlichten Zellen. Zwei
    // Belege aus der amtlichen Reihe, an denen sich beide Wege trennen:
    expect(satzFuer(6).vollOver10).toBe(10.24);
    expect(round2(10.35 * 0.99)).toBe(10.25); // so entstünde der falsche Wert
    expect(satzFuer(5).teilOver10).toBe(6.73); // Kurzschluss aus n=4 ergäbe 6,74
  });

  it("der Stichtags-Plan liefert immer einen Satz, auch vor dem ersten Eintrag", () => {
    const frueh = feedInRatesFor(new Date("2020-01-01T12:00:00Z"));
    expect(frueh.teilUnder10).toBeGreaterThan(0);
    expect(frueh.thresholdKwp).toBe(10);
  });

  it("bleibt in einer plausiblen Spanne und behält die EEG-Staffelung", () => {
    const r = DEFAULT_FEED_IN;
    // Volleinspeisung liegt über Teileinspeisung, kleine Anlagen über großen.
    expect(r.vollUnder10).toBeGreaterThan(r.teilUnder10);
    expect(r.vollOver10).toBeGreaterThan(r.teilOver10);
    expect(r.teilUnder10).toBeGreaterThan(r.teilOver10);
    expect(r.vollUnder10).toBeGreaterThan(r.vollOver10);
    // Kein Satz kann durch die 1-%-Degression je aus diesem Korridor laufen.
    for (const wert of [r.teilUnder10, r.teilOver10, r.vollUnder10, r.vollOver10]) {
      expect(wert).toBeGreaterThan(3);
      expect(wert).toBeLessThan(15);
    }
  });

  it("kennzeichnet selbst gerechnete Sätze und schreibt sie nicht der Behörde zu", () => {
    // Solange ein Satz aus dem Gesetz abgeleitet und noch nicht in der Liste der
    // Bundesnetzagentur steht, darf die Quellenangabe sie nicht als Urheberin
    // nennen — und der Vorbehalt muss sichtbar mitgeliefert werden.
    const august = feedInRatesFor(new Date("2026-08-01T12:00:00Z"));
    expect(august.note).toBeTruthy();
    expect(august.source).not.toMatch(/Bundesnetzagentur/);
    expect(august.source).toMatch(/Eigene Berechnung/);
  });
});
