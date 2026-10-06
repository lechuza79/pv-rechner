import { describe, expect, it } from "vitest";
import { dispatchSolarHour, storageCapacity } from "../solar-storage";
import { monthlyFromAnnual, simulateSolarYear } from "../balkon-sim";
import legacy from "./fixtures/solar-storage-legacy.json";

const base = {
  moduleKwp: 2, inverterKw: 0.8, batteryKwh: 6.33, roundtrip: .825,
  monthlyYieldPerKwp: monthlyFromAnnual(1024), orientation: "sued_flach",
  household: { baseKwh: 2800, tagQuote: .4, wpActive: false, eaActive: false },
};

describe("shared storage dispatch", () => {
  it("preserves every pre-change annual and monthly value without new parameters", () => {
    // Preserve every legacy value while allowing additional consumer attribution fields.
    // JSON normalizes the existing rounded -0 grid values to 0.
    for (const { input, expected } of legacy) expect(JSON.parse(JSON.stringify(simulateSolarYear(input)))).toMatchObject(expected);
  });
  it("explicit legacy options produce the same result", () => {
    expect(simulateSolarYear({ ...base, batteryCoupling: "ac", usableBatteryKwh: base.batteryKwh }))
      .toEqual(simulateSolarYear(base));
  });
  it("uses an explicit usable capacity instead of nominal capacity", () => {
    const nominal = simulateSolarYear(base);
    const usable = simulateSolarYear({ ...base, usableBatteryKwh: 2 });
    expect(usable.selfUsedKwh).toBeLessThan(nominal.selfUsedKwh);
    expect(simulateSolarYear({ ...base, usableBatteryKwh: 0 }).selfUsedKwh)
      .toBe(simulateSolarYear({ ...base, batteryKwh: 0 }).selfUsedKwh);
  });
  it("rejects invalid device limits rather than silently changing them", () => {
    for (const value of [-1, NaN, Infinity]) {
      expect(() => storageCapacity(2, { usableBatteryKwh: value })).toThrow(RangeError);
      expect(() => storageCapacity(2, { batteryPowerLimits: { chargeKw: value } })).toThrow(RangeError);
      expect(() => storageCapacity(2, { batteryPowerLimits: { dischargeKw: value } })).toThrow(RangeError);
    }
    expect(() => storageCapacity(2, { usableBatteryKwh: 3 })).toThrow(RangeError);
  });
  it("captures otherwise clipped energy before the inverter", () => {
    const ac = dispatchSolarHour(2, .3, 0, .8, 6, .825);
    const dc = dispatchSolarHour(2, .3, 0, .8, 6, .825, { batteryCoupling: "dc" });
    expect(ac.charge).toBeCloseTo(.5);
    expect(dc.charge).toBeCloseTo(1.7);
    expect(dc.clipped).toBeCloseTo(0);
    expect(dc.direct).toBe(ac.direct);
  });
  it("does not increase benefit when there is no clipping or output bottleneck", () => {
    const input = { ...base, moduleKwp: 1, inverterKw: 1 };
    const ac = simulateSolarYear(input);
    const dc = simulateSolarYear({ ...input, batteryCoupling: "dc" });
    expect(ac.clippedKwh).toBe(0);
    expect(dc.selfUsedKwh).toBe(ac.selfUsedKwh);
  });
  it("limits charging, discharging and combined DC inverter output", () => {
    const opts = { batteryCoupling: "dc" as const, batteryPowerLimits: { chargeKw: .4, dischargeKw: .2 } };
    const charging = dispatchSolarHour(2, .3, 0, .8, 6, .825, opts);
    expect(charging.charge).toBe(.4);
    expect(charging.feedIn).toBeCloseTo(.5);
    expect(charging.clipped).toBeCloseTo(.8);
    const limited = dispatchSolarHour(.3, 2, 6, .8, 6, .825, opts);
    expect(limited.discharge).toBeCloseTo(.2);
    const inverter = dispatchSolarHour(.3, 2, 6, .8, 6, .825, { batteryCoupling: "dc" });
    expect(inverter.direct + inverter.discharge).toBeCloseTo(.8);
    expect(dispatchSolarHour(2, .3, 0, .8, 6, .825, { batteryPowerLimits: { chargeKw: 0 } }).charge).toBe(0);
    expect(dispatchSolarHour(0, 2, 6, .8, 6, .825, { batteryPowerLimits: { dischargeKw: 0 } }).discharge).toBe(0);
  });
  it("keeps hourly energy balanced with empty, full and power-limited batteries", () => {
    for (const coupling of ["ac", "dc"] as const) for (const generation of [0, .2, .8, 2]) {
      for (const load of [0, .1, .9, 2]) for (const soc of [0, .4, 2]) {
        const f = dispatchSolarHour(generation, load, soc, .8, 2, .825, {
          batteryCoupling: coupling, batteryPowerLimits: { chargeKw: .6, dischargeKw: .4 },
        });
        expect(f.soc).toBeGreaterThanOrEqual(-1e-12);
        expect(f.soc).toBeLessThanOrEqual(2);
        expect(f.direct + f.discharge + f.grid).toBeCloseTo(load, 12);
        expect(f.direct + f.charge + f.feedIn + f.clipped).toBeCloseTo(generation, 12);
        expect(f.soc).toBeCloseTo(soc + f.charge - f.discharge / .825, 12);
        expect(Math.min(f.charge, f.discharge)).toBe(0);
      }
    }
  });
  it("cannot recover more storage energy than the available surplus times efficiency", () => {
    const noBattery = simulateSolarYear({ ...base, batteryKwh: 0 });
    for (const batteryKwh of [2.11, 4.22, 6.33, 10.55]) {
      const sim = simulateSolarYear({ ...base, batteryKwh, batteryCoupling: "dc" });
      expect(sim.selfUsedKwh - noBattery.selfUsedKwh)
        .toBeLessThanOrEqual((noBattery.feedInKwh + noBattery.clippedKwh) * base.roundtrip + 2);
      expect(sim.monthly.reduce((s, m) => s + m.selfUsed, 0)).toBeCloseTo(sim.selfUsedKwh, -1);
      for (const m of sim.monthly) expect(Math.abs(m.production - m.direct - m.stored - m.feedIn)).toBeLessThanOrEqual(2);
    }
  });
});
