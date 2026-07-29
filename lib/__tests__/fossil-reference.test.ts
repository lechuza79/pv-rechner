import { describe, it, expect } from "vitest";
import {
  calcFossilReference,
  greenGasApplies,
  fossilStandingCostPerYear,
  wpStandingCostPerYear,
  HEATING_YEARS,
} from "../fossil-reference";
import { calcHeatPump, type HeatPumpInputs } from "../heatpump";
import { DEFAULT_HEATPUMP_CONFIG } from "../heatpump-config";
import { fuelKwhForWpHeat } from "../calc";
import { FUEL } from "../constants";

// ─── Die fossile Referenz ist rechnerübergreifend EINE Grundlage ─────────────
// PV-Rechner (Ergebnis-Block „Heizkosten") und Wärmepumpen-Rechner beantworten
// dieselbe Teilfrage: Was kostet die fossile Heizung? Bis zum 28.07.2026 hatten sie
// dafür getrennte Rechenwege, und der PV-Block schlug den Grüngas-Aufschlag auf,
// ohne je eine Anschaffung anzusetzen — Beimischungspflicht ohne den Neueinbau, der
// sie überhaupt auslöst. Diese Tests halten beide Rechner auf einer Grundlage.

describe("Bio-Treppe greift nur bei Neueinbau (§ 43 Abs. 1 GModG)", () => {
  it("gilt für eine neu eingebaute Gasheizung", () => {
    expect(greenGasApplies({ fuelKind: "gas", fossilInvest: 15900 })).toBe(true);
  });

  it("gilt NICHT, wenn die vorhandene Heizung weiterläuft (Anschaffung 0)", () => {
    expect(greenGasApplies({ fuelKind: "gas", fossilInvest: 0 })).toBe(false);
  });

  it("gilt NICHT für Heizöl — der Preispfad bildet nur den Gas-Mix ab", () => {
    expect(greenGasApplies({ fuelKind: "oil", fossilInvest: 15900 })).toBe(false);
  });

  it("wird angefragt, aber nicht gerechnet, wenn keine Anschaffung ansteht (PV-Block)", () => {
    // Genau der Fall des PV-Rechners: greenGas gewünscht, Anschaffung 0.
    const ohne = calcFossilReference({
      fuelKind: "gas", fuelKwh: 15000, pricePerKwh: 0.11, co2PerKwh: 0.2,
      fossilInvest: 0, greenGas: true,
    });
    const flach = calcFossilReference({
      fuelKind: "gas", fuelKwh: 15000, pricePerKwh: 0.11, co2PerKwh: 0.2,
      fossilInvest: 0, greenGas: false,
    });
    expect(ohne.greenGasApplied).toBe(false);
    expect(ohne.fuel).toBe(flach.fuel);
  });

  it("verteuert den Brennstoff, sobald eine neue Gasheizung angesetzt ist", () => {
    const mit = calcFossilReference({
      fuelKind: "gas", fuelKwh: 15000, pricePerKwh: 0.11, co2PerKwh: 0.2,
      fossilInvest: 15900, greenGas: true,
    });
    const ohne = calcFossilReference({
      fuelKind: "gas", fuelKwh: 15000, pricePerKwh: 0.11, co2PerKwh: 0.2,
      fossilInvest: 15900, greenGas: false,
    });
    expect(mit.greenGasApplied).toBe(true);
    expect(mit.fuel).toBeGreaterThan(ohne.fuel);
  });
});

describe("PV-Rechner und WP-Rechner rechnen die fossile Seite identisch", () => {
  // Gleiche Annahme → gleiche Grundlage. Der PV-Block leitet den Brennstoffbedarf
  // aus WP-Strom × JAZ ab, der WP-Rechner aus dem Heizwärmebedarf — bei gleicher
  // Wärmemenge und gleichem Kessel muss dieselbe Zahl herauskommen.
  const wpKwh = 4200;
  const jaz = 3.4;
  const qGes = wpKwh * jaz;
  const fuelKwh = fuelKwhForWpHeat(wpKwh, "gas", jaz);

  const wpInputs: HeatPumpInputs = {
    situation: "bestand",
    wohnflaeche: 140,
    insulationIdx: 1,
    personen: 3.5,
    heizsystem: "hk_alt",
    wpType: "lwwp",
    fuelKind: "gas",
    greenGas: true,
    override: {
      qGes,
      gasEfficiency: FUEL.gas.efficiency,
      gasPrice: FUEL.gas.price,
      gasCo2: FUEL.gas.co2PerKwh,
      fossilErsatzInvest: 0,   // PV-Block setzt keine Anschaffung an
    },
  };

  const pvSide = calcFossilReference({
    fuelKind: "gas",
    fuelKwh,
    years: HEATING_YEARS,
    pricePerKwh: FUEL.gas.price,
    co2PerKwh: FUEL.gas.co2PerKwh,
    inflation: 0.02,
    fossilInvest: 0,
    greenGas: true,
  });
  const wpSide = calcHeatPump(wpInputs);

  it("Brennstoffkosten stimmen auf den Euro überein", () => {
    expect(pvSide.fuel).toBe(wpSide.gasKosten);
  });

  it("Grundpreis und Wartung stimmen überein", () => {
    expect(pvSide.fix).toBe(wpSide.gasFix);
    expect(pvSide.wartung).toBe(wpSide.gasWartung);
  });

  it("die Gesamtsumme der fossilen Seite stimmt überein", () => {
    expect(pvSide.total).toBe(wpSide.tcoGas);
  });

  it("keiner der beiden rechnet die Bio-Treppe ohne Neueinbau", () => {
    expect(pvSide.greenGasApplied).toBe(false);
    // Gegenprobe im WP-Rechner: mit und ohne Grüngas-Wunsch dasselbe Ergebnis,
    // solange die Anschaffung auf 0 steht.
    const ohneWunsch = calcHeatPump({ ...wpInputs, greenGas: false });
    expect(ohneWunsch.tcoGas).toBe(wpSide.tcoGas);
  });

  it("beide rechnen über denselben Horizont", () => {
    expect(HEATING_YEARS).toBe(DEFAULT_HEATPUMP_CONFIG.years);
  });
});

describe("Laufende Nebenkosten stehen auf beiden Seiten", () => {
  it("Wärmepumpe trägt Wartung UND Zählergrundpreis", () => {
    expect(wpStandingCostPerYear()).toBe(
      DEFAULT_HEATPUMP_CONFIG.wpMaintenance + DEFAULT_HEATPUMP_CONFIG.wpFixCostPerYear,
    );
    expect(wpStandingCostPerYear()).toBeGreaterThan(0);
  });

  it("Gas trägt einen Netz-Grundpreis, Heizöl nicht (Strukturfrage, kein Preis)", () => {
    expect(fossilStandingCostPerYear("gas").fix).toBeGreaterThan(0);
    expect(fossilStandingCostPerYear("oil").fix).toBe(0);
    // Wartung ist für beide Brennstoffe gleich angesetzt (belegt ist nichts anderes).
    expect(fossilStandingCostPerYear("oil").wartung).toBe(fossilStandingCostPerYear("gas").wartung);
  });

  it("die Ölheizung wird ohne Gas-Grundpreis gerechnet", () => {
    const gas = calcFossilReference({ fuelKind: "gas", fuelKwh: 15000, pricePerKwh: 0.11, co2PerKwh: 0.2, fossilInvest: 0 });
    const oel = calcFossilReference({ fuelKind: "oil", fuelKwh: 15000, pricePerKwh: 0.11, co2PerKwh: 0.2, fossilInvest: 0 });
    expect(gas.fix).toBeGreaterThan(0);
    expect(oel.fix).toBe(0);
    expect(gas.fuel).toBe(oel.fuel);   // gleicher Brennstoffpreis → gleiche Brennstoffkosten
  });
});
