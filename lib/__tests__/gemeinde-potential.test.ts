import { describe, it, expect } from "vitest";
import { computeGemeindePotential } from "../gemeinde-potential";

// Höchberg-naher Standort-Ertrag ~1.100 kWh/kWp.
const base = { annual: 1099, monthly: null };

describe("computeGemeindePotential", () => {
  it("gibt den Standort-Ertrag unverändert zurück", () => {
    const p = computeGemeindePotential(base);
    expect(p.yieldKwhKwp).toBe(1099);
    expect(p.pvKwp).toBe(10);
  });

  it("liefert positive, plausible Beispielwerte", () => {
    const p = computeGemeindePotential(base);
    expect(p.pvFiveYearBenefit).toBeGreaterThan(0);
    expect(p.wpTco20).toBeGreaterThan(0);
    expect(p.balkonSavingPerYear).toBeGreaterThan(0);
    expect(p.balkonAmortYears).toBeGreaterThan(0);
  });

  it("besserer Standort-Ertrag → höherer PV-Nutzen", () => {
    const low = computeGemeindePotential({ ...base, annual: 950 });
    const high = computeGemeindePotential({ ...base, annual: 1200 });
    expect(high.pvFiveYearBenefit).toBeGreaterThan(low.pvFiveYearBenefit);
  });
});
