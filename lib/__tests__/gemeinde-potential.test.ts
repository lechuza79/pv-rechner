import { describe, it, expect } from "vitest";
import { computeGemeindePotential } from "../gemeinde-potential";

// Höchberg-nahe Eingaben: 9,1 MW Bestand, 9.564 Einwohner, ~1.100 kWh/kWp.
const base = { totalKwp: 9100, population: 9564, annual: 1099, monthly: null };

describe("computeGemeindePotential", () => {
  it("Erzeugung = installierte Leistung × Standort-Ertrag", () => {
    const p = computeGemeindePotential(base);
    expect(p.generationKwh).toBe(9100 * 1099);
  });

  it("Haushalts-Äquivalent = Erzeugung / Haushaltsverbrauch", () => {
    const p = computeGemeindePotential(base);
    // 2-Personen-Haushalt = 2.800 kWh
    expect(p.householdEquiv).toBe(Math.round(p.generationKwh / 2800));
  });

  it("elektrisches Heizen senkt die Deckung deutlich", () => {
    const p = computeGemeindePotential(base);
    expect(p.coverageAfterHeat).toBeLessThan(p.coverageToday);
    // Heizen ist der größere Brocken: mehr als halbiert die Deckung.
    expect(p.coverageAfterHeat).toBeLessThan(p.coverageToday * 0.6);
  });

  it("liefert positive, plausible Beispielwerte", () => {
    const p = computeGemeindePotential(base);
    expect(p.pvFiveYearBenefit).toBeGreaterThan(0);
    expect(p.wpTco20).toBeGreaterThan(0);
    expect(p.balkonSavingPerYear).toBeGreaterThan(0);
    expect(p.pvKwp).toBe(10);
  });

  it("besserer Standort-Ertrag → mehr Erzeugung und höhere Deckung", () => {
    const low = computeGemeindePotential({ ...base, annual: 950 });
    const high = computeGemeindePotential({ ...base, annual: 1200 });
    expect(high.generationKwh).toBeGreaterThan(low.generationKwh);
    expect(high.coverageToday).toBeGreaterThan(low.coverageToday);
  });

  it("yieldVsAvg ist relativ zum Bundesschnitt", () => {
    const p = computeGemeindePotential({ ...base, annual: 1050 });
    expect(Math.abs(p.yieldVsAvg)).toBeLessThan(0.01); // ~0 am Schnitt
  });
});
