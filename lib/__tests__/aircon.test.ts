import { describe, it, expect } from "vitest";
import {
  effectiveCdh, sizingKw, acquisitionCost, acquisitionRange, calcAircon, compareDevices, fallbackCdh,
  cdhFromHourly, cdhFromDailyMinMax,
  type AcInputs,
} from "../aircon";
import { DEFAULT_AIRCON_CONFIG as CFG, AC_REAL_FACTOR, effectiveSeer } from "../aircon-config";

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

// Der Gerätevergleich ist der Kern der Klimaanlagen-Seite. Er kippt, sobald ein
// Typ anders behandelt wird als die anderen — genau das war vor 07/2026 der Fall
// (mobile Split ~30 % abgewertet, fest installierte am Label). Diese Tests halten
// die Systematik aus aircon-config.ts fest, damit sie nicht wieder still driftet.
describe("Effizienz-Systematik", () => {
  it("leitet jeden seer-Wert aus Label × Realfaktor × struktureller Korrektur ab", () => {
    for (const d of CFG.devices) {
      expect(d.seer, `${d.id}: seer ist handgesetzt statt abgeleitet`)
        .toBe(effectiveSeer(d.labelValue, d.structuralFactor));
    }
  });

  it("wendet denselben Realitäts-Abschlag auf alle Typen an", () => {
    // Kein Typ darf einen eigenen, zusätzlichen Ermessens-Abschlag bekommen.
    for (const d of CFG.devices) {
      expect(d.seer, `${d.id}: Abschlag weicht vom einheitlichen Faktor ab`)
        .toBeCloseTo(d.labelValue * AC_REAL_FACTOR * d.structuralFactor, 1);
    }
  });

  it("korrigiert strukturell nur, wo die Prüfnorm etwas ausklammert", () => {
    for (const d of CFG.devices) {
      if (d.labelMetric === "SEER") {
        // EN 14825 misst Teillast bei realer ΔT — es fehlt nichts.
        expect(d.structuralFactor, `${d.id}: SEER-Skala braucht keine Korrektur`).toBe(1);
      } else {
        // Nur die EER-Skala (Einkanal) darf korrigiert werden — und nur nach unten.
        expect(d.structuralFactor).toBeGreaterThan(0);
        expect(d.structuralFactor).toBeLessThan(1);
      }
    }
  });

  it("hält Label-Metrik und -Klasse konsistent zu VO (EU) 626/2011", () => {
    const mono = CFG.devices.find(d => d.id === "monoblock")!;
    // Einkanalgeräte sind von EN 14825 ausgeschlossen → niemals SEER auf dem Label.
    expect(mono.labelMetric).toBe("EER");
    // Mobile Splits sind "room air conditioner" → SEER-Skala, wie fest installierte.
    expect(CFG.devices.find(d => d.id === "portasplit")!.labelMetric).toBe("SEER");
    expect(CFG.devices.find(d => d.id === "split")!.labelMetric).toBe("SEER");
    // Klassengrenzen Anhang II: Split A++ ≥ 6,10 · A+++ ≥ 8,50 | Einkanal A ≥ 2,60
    for (const d of CFG.devices.filter(x => x.labelMetric === "SEER")) {
      expect(d.labelValue, `${d.id}: labelValue passt nicht zu ${d.labelClass}`)
        .toBeGreaterThanOrEqual(6.1);
      expect(d.labelValue).toBeLessThan(8.5);
      expect(d.labelClass).toBe("A++");
    }
    expect(mono.labelValue).toBeGreaterThanOrEqual(2.6);
    expect(mono.labelValue).toBeLessThan(3.1);
    expect(mono.labelClass).toBe("A");
  });

  it("bleibt in den belegten Korridoren (Plausibilität gegen die Quellen)", () => {
    const [mono, porta, split] = ["monoblock", "portasplit", "split"].map(id => CFG.devices.find(d => d.id === id)!);
    // energie-lexikon.info: Monoblock real "deutlich unter 2"
    expect(mono.seer).toBeLessThan(2);
    // test.de 2025: PortaSplit "auf dem Niveau mancher fester Splitgeräte"
    expect(porta.seer).toBeGreaterThan(split.seer * 0.85);
    expect(porta.seer).toBeLessThanOrEqual(split.seer);
    // test.de: Monoblock "bis zu siebenmal geringer"; Verbrauchsangaben ~2–3×.
    // Unser Verhältnis muss dazwischen liegen — nicht darüber hinaus.
    const ratio = split.seer / mono.seer;
    expect(ratio).toBeGreaterThan(2);
    expect(ratio).toBeLessThan(7);
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

  it("clamps a negative room size to zero (no negative energy, cost or CO₂)", () => {
    const r = calcAircon({ ...base, roomM2: -20 });
    expect(r.electricityKwh).toBe(0);
    expect(r.runningCost).toBe(0);
    expect(r.co2Kg).toBe(0);
  });

  it("monoblock uses 2–7× the electricity of a split for the same demand", () => {
    // Korridor aus den Quellen, nicht aus den Konstanten rückgerechnet:
    // test.de nennt "bis zu siebenmal geringer" (eigene Messungen, 29.05.2026),
    // veröffentlichte Verbrauchsangaben legen typisch ~2–3× nahe.
    // Enger ist der Beleg nicht — die Systematik selbst prüft "Effizienz-Systematik".
    const split = calcAircon({ ...base, deviceId: "split" });
    const mono = calcAircon({ ...base, deviceId: "monoblock" });
    expect(mono.coolingDemandKwh).toBe(split.coolingDemandKwh); // same demand
    expect(mono.electricityKwh).toBeGreaterThan(split.electricityKwh * 2);
    expect(mono.electricityKwh).toBeLessThan(split.electricityKwh * 7);
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
