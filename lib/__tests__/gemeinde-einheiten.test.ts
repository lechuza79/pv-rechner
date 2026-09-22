import { describe, expect, it } from "vitest";
import { energieTeile, leistungTeile, reihenMassstab } from "../gemeinde-einheiten";

// Der Anlass steht im Modul: 1.049 Orte zeigten „0 GWh" für einen Monat mit
// 20–50 MWh, 106 Orte eine Skala „0,0002 MW", und ein Dorf mit einem
// Balkonkraftwerk „0,0 MWp". Geprüft wird deshalb vor allem, dass am unteren
// Ende KEINE Null herauskommt, solange etwas da ist.
describe("Einheiten der Ortsseite", () => {
  it("nennt kleine Erträge in kWh statt als Null in GWh", () => {
    expect(energieTeile(36.7)).toEqual({ value: "36,7", unit: "MWh" });
    expect(energieTeile(0.42)).toEqual({ value: "420", unit: "kWh" });
    expect(energieTeile(1234)).toEqual({ value: "1,2", unit: "GWh" });
  });

  it("nennt kleine Leistungen in kW statt mit vier Nullen in MW", () => {
    expect(leistungTeile(0.0002)).toEqual({ value: "0,2", unit: "kW" });
    expect(leistungTeile(0.191)).toEqual({ value: "190", unit: "kW" });
    expect(leistungTeile(12.4)).toEqual({ value: "12", unit: "MW" });
  });

  it("keine Größe verschwindet zu einer Null, solange sie existiert", () => {
    for (const mwh of [0.001, 0.05, 0.9, 1, 999, 1000]) {
      expect(energieTeile(mwh).value).not.toMatch(/^0(,0+)?$/);
    }
    for (const mw of [0.00001, 0.0002, 0.5, 1, 100]) {
      expect(leistungTeile(mw).value).not.toMatch(/^0(,0+)?$/);
    }
  });

  it("eine Kennzahl-Reihe behält ihre Einheit, gewählt am heutigen Wert", () => {
    expect(reihenMassstab(0.5, "kWp", "MWp")).toEqual({ teiler: 1, unit: "kWp", digits: 1 });
    expect(reihenMassstab(240, "kWp", "MWp")).toEqual({ teiler: 1, unit: "kWp", digits: 0 });
    expect(reihenMassstab(9338, "kWp", "MWp")).toEqual({ teiler: 1000, unit: "MWp", digits: 1 });
    expect(reihenMassstab(1.92, "kWh", "MWh").unit).toBe("kWh");
  });
});
