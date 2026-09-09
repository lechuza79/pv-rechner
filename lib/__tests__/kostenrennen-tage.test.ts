import { describe, it, expect } from "vitest";
import { kostenrennen, RENNEN_OHNE_MIT_PV } from "../kostenrennen";
import { tagesverlauf, tagesgewichte, tagDatum } from "../kostenrennen-tage";
import { STRAHLUNG_TAGE, STRAHLUNG_TAGE_META } from "../strahlung-tage";
import { YEARS } from "../constants";

describe("Tagesverlauf des Stromkosten-Rennens", () => {
  const r = kostenrennen(RENNEN_OHNE_MIT_PV);
  const v = tagesverlauf(r);
  const mit = r.laeufer.find((l) => l.key === "mit")!;
  const ohne = r.laeufer.find((l) => l.key === "ohne")!;

  it("die Tagesreihe ist lückenlos, plausibel und deckt das Wetterfenster", () => {
    expect(STRAHLUNG_TAGE[0].jahr).toBe(1991);
    expect(STRAHLUNG_TAGE_META.stationen).toBeGreaterThanOrEqual(20);
    for (const j of STRAHLUNG_TAGE) {
      expect(j.tage.length).toBeGreaterThanOrEqual(365);
      expect(j.tage.length).toBeLessThanOrEqual(366);
      const summe = j.tage.reduce((a, b) => a + b, 0) / 1000; // kWh/m²
      expect(summe).toBeGreaterThan(900);
      expect(summe).toBeLessThan(1350);
      // Kein Tag über dem physikalisch Möglichen in Deutschland (~9 kWh/m²).
      expect(Math.max(...j.tage)).toBeLessThan(9000);
    }
    const { von, bis } = r.wetterFenster!;
    expect(STRAHLUNG_TAGE.some((j) => j.jahr === von)).toBe(true);
    expect(STRAHLUNG_TAGE.some((j) => j.jahr === bis)).toBe(true);
  });

  it("Tagesgewichte summieren auf 1, folgen der Sonne und fallen ohne Daten auf gleich zurück", () => {
    const juni = tagesgewichte(2003, 5);
    expect(juni).toHaveLength(30);
    expect(juni.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    // Echte Tage: der sonnigste Tag wiegt deutlich mehr als der trübste.
    expect(Math.max(...juni) / Math.min(...juni)).toBeGreaterThan(2);
    const ohneDaten = tagesgewichte(1900, 1);
    expect(ohneDaten).toHaveLength(28);
    expect(new Set(ohneDaten.map((w) => w.toFixed(12))).size).toBe(1);
  });

  it("jeder Monat endet exakt auf dem Monatswert der Rechnung — die Tage verteilen nur", () => {
    expect(v.tage).toBeGreaterThanOrEqual(365 * YEARS);
    expect(v.kosten.mit[0]).toBe(mit.monatlich[0]);
    expect(v.kosten.ohne[0]).toBe(0);
    for (let k = 1; k <= 12 * YEARS; k++) {
      const letzterTag = k < 12 * YEARS ? v.ersterTag[k + 1] - 1 : v.tage;
      expect(Math.abs(v.kosten.mit[letzterTag] - mit.monatlich[k])).toBeLessThan(0.01);
      expect(Math.abs(v.kosten.ohne[letzterTag] - ohne.monatlich[k])).toBeLessThan(0.01);
      expect(v.monatVonTag[letzterTag]).toBe(k);
    }
  });

  it("innerhalb eines Monats bewegt sich die PV-Kurve von Tag zu Tag verschieden, die ohne Anlage gleichmäßig", () => {
    const start = v.ersterTag[30], ende = v.ersterTag[31]; // Juni des dritten Jahres (2003)
    // Deltas innerhalb des Monats: vom ersten bis zum letzten Junitag (der Schritt in den Juli gehört nicht dazu).
    const deltasMit = Array.from({ length: ende - start - 1 }, (_, d) => v.kosten.mit[start + d + 1] - v.kosten.mit[start + d]);
    const deltasOhne = Array.from({ length: ende - start - 1 }, (_, d) => v.kosten.ohne[start + d + 1] - v.kosten.ohne[start + d]);
    expect(Math.max(...deltasMit) - Math.min(...deltasMit)).toBeGreaterThan(1);
    expect(Math.max(...deltasOhne) - Math.min(...deltasOhne)).toBeLessThan(0.001);
  });

  it("das Datum eines Tages folgt dem Rechner-Kalender (Betriebsjahr 1 = Startjahr + 1)", () => {
    expect(tagDatum(v, 2026, 1)).toEqual({ jahr: 2027, monat: 0, tag: 1 });
    expect(tagDatum(v, 2026, 31)).toEqual({ jahr: 2027, monat: 0, tag: 31 });
    expect(tagDatum(v, 2026, 32)).toEqual({ jahr: 2027, monat: 1, tag: 1 });
    expect(tagDatum(v, 2026, v.tage)).toEqual({ jahr: 2026 + YEARS, monat: 11, tag: 31 });
  });
});
