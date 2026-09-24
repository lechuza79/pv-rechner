import { describe, expect, it } from "vitest";
import { OIL_REFERENCE, oilProjectedPricePerKwh } from "../oil-reference";
import { calcFossilReference, fossilStandingCostPerYear } from "../fossil-reference";
import { calcHeatPump, calcHeatPumpScenarios } from "../heatpump";
import { DEFAULT_HEATPUMP_CONFIG } from "../heatpump-config";
import { FUEL_PRICE, WP_FUEL_OPTIONS, YEAR } from "../constants";

const house = {
  situation: "bestand" as const, wohnflaeche: 140, insulationIdx: 1,
  personen: 5, heizsystem: "hk_neu" as const, wpType: "lwwp" as const,
  fuelKind: "oil" as const,
};

describe("Oil has its own source-backed reference", () => {
  it("uses the KWW gross oil investment, upkeep and new-boiler efficiency", () => {
    const r = calcHeatPump(house);
    expect(r.gasInvest).toBeCloseTo(25704, 8);
    expect(fossilStandingCostPerYear("oil")).toEqual({ fix: 0, wartung: 476 });
    expect(WP_FUEL_OPTIONS.find(f => f.id === "oil")?.efficiency).toBe(0.93);
    expect(r.kostenJeJahr.fossil.brennstoff[0]).toBeCloseTo(r.qGes / 0.93 * FUEL_PRICE.oil.price, 8);
  });

  it("does not inherit sabotaged gas assumptions", () => {
    const config = { ...DEFAULT_HEATPUMP_CONFIG, gasInflation: 0.8, gasPriceCtPerKwh: 90,
      gasEfficiency: 0.5, gasCo2PerKwh: 9, gasMaintenance: 9000, fossilErsatzInvest: 999999 };
    const a = calcHeatPump(house);
    const b = calcHeatPump(house, config);
    expect(b.tcoGas).toBe(a.tcoGas);
    expect(b.co2Einsparung).toBe(a.co2Einsparung);
  });

  it("retains actual quotes, including zero investment for continued operation", () => {
    const r = calcHeatPump({ ...house, override: { fossilErsatzInvest: 0 } });
    expect(r.gasInvest).toBe(0);
    expect(r.kostenJeJahr.fossil.brennstoff[0]).toBeCloseTo(r.qGes / 0.85 * FUEL_PRICE.oil.price, 8);
    expect(calcHeatPump({ ...house, override: { fossilErsatzInvest: 12345 } }).gasInvest).toBe(12345);
  });

  it("uses one oil trajectory across WP scenarios, not invented oil bands", () => {
    const rows = calcHeatPumpScenarios(house);
    expect(new Set(rows.map(r => r.gasKosten)).size).toBe(1);
    expect(new Set(rows.map(r => r.stromKosten)).size).toBe(3);
    for (const r of rows) {
      expect(r.explain).toContain("Heizöl");
      expect(r.explain).not.toMatch(/Gasnetz|Netzentgelt|Gaspreis/);
      expect(r.kostenJeJahr.fossil.brennstoff).toEqual(rows[0].kostenJeJahr.fossil.brennstoff);
    }
  });

  it("preserves entered oil prices and never adds a second CO2 or gas path", () => {
    const input = { fuelKind: "oil" as const, fuelKwh: 20000, pricePerKwh: 0.12,
      co2PerKwh: 0.266, fossilInvest: 0, years: 20 };
    const base = calcFossilReference(input);
    const sabotaged = calcFossilReference({ ...input, co2PerKwh: 20, inflation: 0.9, greenGas: true });
    expect(sabotaged.fuelPerYear).toEqual(base.fuelPerYear);
    expect(base.fuelPerYear[0]).toBeCloseTo(2400, 8);
    expect(base.fuelPerYear[19]).toBeCloseTo(2400 * oilProjectedPricePerKwh(YEAR + 19) / oilProjectedPricePerKwh(YEAR), 8);
  });

  it("reproduces the original UBA table checkpoints including VAT and deflator", () => {
    expect(oilProjectedPricePerKwh(2030)).toBeCloseTo(1.1 * 1.182 / 10, 12);
    expect(oilProjectedPricePerKwh(2045)).toBeCloseTo(1.4 * 1.56 / 10, 12);
    expect(oilProjectedPricePerKwh(2026)).toBeCloseTo(1.02 * (100 + 18.2 * 2 / 6) / 100 / 10, 12);
    expect(oilProjectedPricePerKwh(2055)).toBe(oilProjectedPricePerKwh(2050));
    expect(OIL_REFERENCE.investment).toBeCloseTo(21600 * 1.19, 8);
  });
});
