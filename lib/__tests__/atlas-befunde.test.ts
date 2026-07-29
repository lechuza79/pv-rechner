import { describe, it, expect } from "vitest";
import { befundeNachGroesse, speicherTrend, GROESSENKLASSEN } from "../atlas-befunde";
import type { GemeindeStats } from "../awards";

const g = (
  regionId: string,
  population: number,
  o: Partial<GemeindeStats> = {},
): GemeindeStats => ({
  regionId,
  name: regionId,
  bezeichnung: "Gemeinde",
  population,
  privatDachKwp: 1000,
  gewerbeDachKwp: 0,
  freiflaecheKwp: 0,
  balkonCount: 0,
  balkonKwp: 0,
  batteriePrivatKwh: 500,
  batterieGewerbeKwh: 0,
  windKwp: 0,
  biomasseKwp: 0,
  wasserKwp: 0,
  solarZubauKwp: 0,
  ...o,
});

/** 25 Orte je Klasse — über der Mindestzahl, damit die Mediane tragen. */
function klasse(pop: number, anzahl: number, o: Partial<GemeindeStats> = {}): GemeindeStats[] {
  return Array.from({ length: anzahl }, (_, i) => g(`${pop}-${i}`, pop, o));
}

describe("befundeNachGroesse", () => {
  it("liefert nur Klassen mit genug Orten", () => {
    const wenige = klasse(1000, 5);
    expect(befundeNachGroesse(wenige)).toHaveLength(0);
    expect(befundeNachGroesse(klasse(1000, 25))).toHaveLength(1);
  });

  it("rechnet die Speicherquote als Median", () => {
    const b = befundeNachGroesse(klasse(1000, 25, { batteriePrivatKwh: 700, privatDachKwp: 1000 }));
    expect(b[0].speicherJeKwp).toBeCloseTo(0.7, 5);
  });

  it("trennt „hat überhaupt eine“ von „wie viel“ — der Fehler, der die Freiflächen-Zahl umgedreht hätte", () => {
    // 75 Orte ohne Freifläche, 25 mit — und dort macht sie 50 % aus. Beides
    // sind verschiedene Aussagen: "ein Viertel hat eine" und "wo eine steht,
    // ist sie die Hälfte". Die Rangkorrelation vermischt genau das.
    const ohne = klasse(1000, 75);
    const mit = klasse(1000, 25, { freiflaecheKwp: 1000, privatDachKwp: 1000 }).map((s, i) => ({
      ...s,
      regionId: `mit-${i}`,
    }));
    const b = befundeNachGroesse([...ohne, ...mit])[0];
    expect(b.mitFreiflaeche).toBeCloseTo(0.25, 5);
    expect(b.freiflaecheAnteil).toBeCloseTo(0.5, 5);
  });

  it("schweigt zum Anteil, wenn zu wenige Orte überhaupt eine Freifläche haben", () => {
    const ohne = klasse(1000, 75);
    const mit = klasse(1000, 5, { freiflaecheKwp: 1000 }).map((s, i) => ({ ...s, regionId: `mit-${i}` }));
    const b = befundeNachGroesse([...ohne, ...mit])[0];
    expect(b.mitFreiflaeche).toBeCloseTo(5 / 80, 5);
    // Fünf Orte tragen keinen Median — dann steht dort nichts statt einer Zahl.
    expect(b.freiflaecheAnteil).toBeNull();
  });

  it("kennt vier Größenklassen", () => {
    expect(GROESSENKLASSEN).toHaveLength(4);
    expect(GROESSENKLASSEN[0].min).toBe(0);
    expect(GROESSENKLASSEN[3].max).toBe(Infinity);
  });
});

describe("speicherTrend", () => {
  const bau = (werte: number[]) =>
    werte.map((w, i) => ({
      label: `K${i}`,
      orte: 100,
      speicherJeKwp: w,
      mitFreiflaeche: 0,
      freiflaecheAnteil: 0,
    }));

  it("meldet den Anstieg, wenn die Reihe durchgehend steigt", () => {
    const t = speicherTrend(bau([0.56, 0.62, 0.68, 0.73]));
    expect(t).not.toBeNull();
    expect(t!.plusProzent).toBe(30);
  });

  it("schweigt, wenn die Reihe NICHT durchgehend steigt", () => {
    // Sonst stünde "steigt mit der Ortsgröße" über einer Reihe, die einbricht.
    expect(speicherTrend(bau([0.56, 0.71, 0.62, 0.73]))).toBeNull();
    expect(speicherTrend(bau([0.73, 0.68, 0.62, 0.56]))).toBeNull();
  });

  it("schweigt bei zu wenigen Klassen", () => {
    expect(speicherTrend(bau([0.6]))).toBeNull();
  });
});
