import { describe, it, expect } from "vitest";
import {
  effectiveCdh, sizingKw, acquisitionCost, acquisitionRange, calcAircon, compareDevices, fallbackCdh,
  cdhFromHourly, cdhFromDailyMinMax, calcAirconHeating, acHeatSpecKwhPerM2,
  type AcInputs,
} from "../aircon";
import { DEFAULT_AIRCON_CONFIG as CFG } from "../aircon-config";
import { FUEL, INSULATION_BESTAND, INSULATION_NEUBAU } from "../constants";

const base: AcInputs = {
  deviceId: "split",
  rooms: 1,
  roomM2: 20,
  targetTemp: 24,
  window: "day",
  cdh: CFG.cdhNational,   // 1200
  stromPrice: 0.34,
  pvActive: false,
};

describe("effectiveCdh", () => {
  it("applies target + window factors", () => {
    expect(effectiveCdh(1200, 24, "allday")).toBe(1200 * 1.0 * 1.0);
    expect(effectiveCdh(1200, 24, "day")).toBe(1200 * 1.0 * 0.75);
    expect(effectiveCdh(1200, 26, "night")).toBe(1200 * 0.6 * 0.35);
  });

  it("cooling to a lower temperature means more degree-hours", () => {
    expect(effectiveCdh(1200, 22, "allday")).toBeGreaterThan(effectiveCdh(1200, 26, "allday"));
  });

  it("interpolates target temperatures outside the preset table", () => {
    const v = effectiveCdh(1200, 23, "allday"); // not in {22,24,26}
    expect(v).toBeGreaterThan(effectiveCdh(1200, 24, "allday"));
    expect(v).toBeLessThan(effectiveCdh(1200, 22, "allday"));
  });
});

describe("sizingKw", () => {
  it("scales cooling capacity with area (~85 W/m²)", () => {
    expect(sizingKw(20)).toBeCloseTo(1.7, 1);
    expect(sizingKw(40)).toBeCloseTo(3.4, 1);
  });
});

describe("acquisitionCost", () => {
  const mono = CFG.devices.find(d => d.id === "monoblock")!;
  const porta = CFG.devices.find(d => d.id === "portasplit")!;
  const split = CFG.devices.find(d => d.id === "split")!;

  it("scales per-room devices by the room counter", () => {
    expect(acquisitionCost(mono, 1)).toBe(400);
    expect(acquisitionCost(mono, 3)).toBe(1200);
    expect(acquisitionCost(porta, 2)).toBe(1600);
  });

  it("prices the fixed split as base + per indoor unit (per room), not per kW", () => {
    // 1 Raum: 700 + 1900 = 2.600 €
    expect(acquisitionCost(split, 1)).toBe(2600);
    // jeder weitere Raum (Innengerät) ~+1.900 € → mehr Räume = mehr €
    expect(acquisitionCost(split, 3)).toBe(700 + 1900 * 3);
    expect(acquisitionCost(split, 2)).toBeGreaterThan(acquisitionCost(split, 1));
  });

  it("brackets the mean with a realistic range (low < mean < high)", () => {
    const mid = acquisitionCost(split, 1); // 2.600 €
    const [lo, hi] = acquisitionRange(split, 1);
    expect(lo).toBeLessThan(mid);
    expect(hi).toBeGreaterThan(mid);
    // Split 1 Raum trifft die recherchierte Spanne ~1.800–3.500 €
    expect(lo).toBeGreaterThanOrEqual(1700);
    expect(lo).toBeLessThanOrEqual(2000);
    expect(hi).toBeGreaterThanOrEqual(3300);
    expect(hi).toBeLessThanOrEqual(3700);
  });
});

describe("calcAircon", () => {
  it("split reference case lands in the published consumption band (~100 kWh)", () => {
    const r = calcAircon(base);
    expect(r.electricityKwh).toBeGreaterThan(70);
    expect(r.electricityKwh).toBeLessThan(140);
  });

  it("monoblock uses 2–3× the electricity of a split for the same demand", () => {
    const split = calcAircon({ ...base, deviceId: "split" });
    const mono = calcAircon({ ...base, deviceId: "monoblock" });
    expect(mono.coolingDemandKwh).toBe(split.coolingDemandKwh); // same demand
    expect(mono.electricityKwh).toBeGreaterThan(split.electricityKwh * 2);
    expect(mono.electricityKwh).toBeLessThan(split.electricityKwh * 3);
  });

  it("more rooms → more demand, electricity and cost", () => {
    const one = calcAircon(base);
    const three = calcAircon({ ...base, rooms: 3 });
    expect(three.electricityKwh).toBeGreaterThan(one.electricityKwh);
    expect(three.runningCost).toBeGreaterThan(one.runningCost);
  });

  it("PV covers more of daytime cooling than night cooling", () => {
    const day = calcAircon({ ...base, window: "day", pvActive: true });
    const night = calcAircon({ ...base, window: "night", pvActive: true });
    expect(day.pvCoverage).toBeGreaterThan(night.pvCoverage);
    expect(day.netRunningCost).toBeLessThan(day.runningCost);
  });

  it("no PV → no coverage, net equals running cost", () => {
    const r = calcAircon({ ...base, pvActive: false });
    expect(r.pvCoverage).toBe(0);
    expect(r.netRunningCost).toBe(r.runningCost);
  });

  it("solar exposure scales the cooling demand (sunny > normal > shaded)", () => {
    const sunny = calcAircon({ ...base, exposure: "high" });
    const normal = calcAircon({ ...base, exposure: "normal" });
    const shaded = calcAircon({ ...base, exposure: "low" });
    expect(sunny.electricityKwh).toBeGreaterThan(normal.electricityKwh);
    expect(shaded.electricityKwh).toBeLessThan(normal.electricityKwh);
    // Default (weggelassen) = normal
    expect(calcAircon(base).electricityKwh).toBe(normal.electricityKwh);
  });

  it("battery lifts coverage, most strongly for night cooling", () => {
    const nightBat = calcAircon({ ...base, window: "night", pvActive: true, battery: true });
    const nightNo = calcAircon({ ...base, window: "night", pvActive: true, battery: false });
    expect(nightBat.pvCoverage).toBeGreaterThan(nightNo.pvCoverage);
    // Akku ist nachts der entscheidende Hebel: deutlich höhere Deckung
    expect(nightBat.pvCoverage).toBeGreaterThan(nightNo.pvCoverage + 0.3);
    // Default (battery weggelassen) = mit Speicher
    const def = calcAircon({ ...base, window: "night", pvActive: true });
    expect(def.pvCoverage).toBe(nightBat.pvCoverage);
  });

  it("derives CO₂ from electricity and the grid factor", () => {
    const r = calcAircon(base);
    expect(r.co2Kg).toBe(Math.round(r.electricityKwh * CFG.gridCo2PerKwh));
  });
});

describe("compareDevices", () => {
  it("returns all three device types, split most efficient", () => {
    const cmp = compareDevices({ rooms: 1, roomM2: 20, targetTemp: 24, window: "day", cdh: 1200, stromPrice: 0.34, pvActive: false });
    expect(cmp).toHaveLength(3);
    const split = cmp.find(r => r.device.id === "split")!;
    const mono = cmp.find(r => r.device.id === "monoblock")!;
    expect(split.electricityKwh).toBeLessThan(mono.electricityKwh);
  });
});

describe("fallbackCdh", () => {
  it("uses the Bundesland value when known, else the national average", () => {
    expect(fallbackCdh("BY")).toBe(CFG.cdhByBundesland.BY);
    expect(fallbackCdh(null)).toBe(CFG.cdhNational);
    expect(fallbackCdh("XX")).toBe(CFG.cdhNational);
  });
});

describe("cdhFromHourly", () => {
  it("sums only hours above the base", () => {
    expect(cdhFromHourly([20, 22, 24, 26], 22)).toBe(0 + 0 + 2 + 4);
    expect(cdhFromHourly([10, 15, 18], 22)).toBe(0);
  });
  it("ignores non-numbers", () => {
    // @ts-expect-error – Robustheit gegen lückenhafte Archivdaten
    expect(cdhFromHourly([24, null, 26], 22)).toBe(2 + 4);
  });
});

describe("cdhFromDailyMinMax", () => {
  it("a hot day contributes, a cool day does not", () => {
    expect(cdhFromDailyMinMax([32], [20], 22)).toBeGreaterThan(0);
    expect(cdhFromDailyMinMax([19], [10], 22)).toBe(0);
  });
  it("hotter days yield more cooling-degree-hours", () => {
    const hot = cdhFromDailyMinMax([34], [22], 22);
    const mild = cdhFromDailyMinMax([28], [16], 22);
    expect(hot).toBeGreaterThan(mild);
  });
  it("scales linearly with the number of days", () => {
    const one = cdhFromDailyMinMax([32], [20], 22);
    const three = cdhFromDailyMinMax([32, 32, 32], [20, 20, 20], 22);
    expect(three).toBeCloseTo(one * 3, 6);
  });
  it("a single hot day sits in a plausible per-day range (~tens of Kh)", () => {
    // Heißer Tag (Max 30 / Min 18): die Sonnenstunden über 22 °C summieren sich
    // auf einige Dutzend Kühlgradstunden — gleiche Größenordnung wie real-stündlich.
    const perDay = cdhFromDailyMinMax([30], [18], 22);
    expect(perDay).toBeGreaterThan(20);
    expect(perDay).toBeLessThan(120);
  });
});

describe("calcAirconHeating", () => {
  const split = CFG.devices.find(d => d.id === "split")!;
  const mono = CFG.devices.find(d => d.id === "monoblock")!;

  it("flags monoblocks as unable to heat", () => {
    const h = calcAirconHeating(mono, 20, 0.34);
    expect(h.canHeat).toBe(false);
  });

  it("derives heating electricity from thermal demand and SCOP", () => {
    const h = calcAirconHeating(split, 20, 0.34);
    expect(h.heatThermalKwh).toBe(20 * acHeatSpecKwhPerM2(CFG.defaultHeatStandard));
    expect(h.heatElectricKwh).toBe(Math.round(h.heatThermalKwh / split.scop!));
  });

  it("scales the heating demand with the building standard (Altbau ≫ Neubau)", () => {
    const alt = calcAirconHeating(split, 20, 0.34, null, "unsaniert");
    const neu = calcAirconHeating(split, 20, 0.34, null, "neubau");
    // Der Wächter-Befund: ein Wert für alle war für Neubau ~3× zu hoch.
    expect(alt.heatThermalKwh).toBeGreaterThan(neu.heatThermalKwh * 2.5);
    expect(alt.standard.id).toBe("unsaniert");
    expect(neu.standard.id).toBe("neubau");
  });

  it("takes the per-m² heating demand from the shared insulation table", () => {
    // Geteilte Rechen-Basis: kein eigenes kWh/m²-Fundament im Klima-Rechner.
    for (const std of CFG.heatStandards) {
      expect(acHeatSpecKwhPerM2(std.id)).toBe(Math.round(std.specKwh * CFG.heatTransitionShare));
    }
    const canonical = [...INSULATION_BESTAND, ...INSULATION_NEUBAU].map(i => i.specKwh);
    for (const std of CFG.heatStandards) expect(canonical).toContain(std.specKwh);
  });

  it("falls back to the default standard for an unknown id", () => {
    const h = calcAirconHeating(split, 20, 0.34, null, "gibtsnicht");
    expect(h.standard.id).toBe(CFG.defaultHeatStandard);
  });

  it("lets an explicit thermal override beat the building standard", () => {
    const h = calcAirconHeating(split, 20, 0.34, 2000, "unsaniert");
    expect(h.heatThermalKwh).toBe(2000);
  });

  it("computes the heat price per kWh from price ÷ SCOP; split beats gas", () => {
    const h = calcAirconHeating(split, 20, 0.34);
    expect(h.costPerKwhHeatSplitCt).toBeCloseTo(Math.round((0.34 / split.scop!) * 1000) / 10, 5);
    expect(h.costPerKwhHeatSplitCt).toBeLessThan(h.costPerKwhHeatGasCt);
  });

  it("saving is gas cost minus split cost (default gas from FUEL)", () => {
    const h = calcAirconHeating(split, 20, 0.34);
    const gasExpected = Math.round((h.heatThermalKwh / FUEL.gas.efficiency) * FUEL.gas.price);
    expect(h.gasCost).toBe(gasExpected);
    expect(h.saving).toBe(h.gasCost - h.heatCost);
  });

  it("honours an overridden thermal demand and a custom gas price", () => {
    const h = calcAirconHeating(split, 20, 0.34, 2000, undefined, CFG, { price: 0.15, efficiency: 0.9 });
    expect(h.heatThermalKwh).toBe(2000);
    expect(h.gasCost).toBe(Math.round((2000 / 0.9) * 0.15));
  });
});
