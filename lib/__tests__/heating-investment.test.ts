import { describe, it, expect } from "vitest";
import { calcHeatPump, calcInvestBrutto, calcHeatPumpInvestmentSensitivity } from "../heatpump";
import { DEFAULT_HEATPUMP_CONFIG as cfg } from "../heatpump-config";
import { gasInvestmentGross, lwwpCoreGross, HEATING_INVESTMENT } from "../heating-investment";
import { fossilReplacementInvestment } from "../fossil-reference";

const house = { situation: "bestand" as const, wohnflaeche: 140, personen: 5,
  heizsystem: "hk_neu" as const, wpType: "lwwp" as const, insulationIdx: 1 };

describe("source-based investment costs", () => {
  it("preserves published KWW absolute core amounts with VAT exactly once", () => {
    expect(lwwpCoreGross(5)).toBe(11305);
    expect(lwwpCoreGross(10)).toBe(18207);
    expect(lwwpCoreGross(20)).toBe(29274);
    expect(lwwpCoreGross(7.5)).toBe(14756);
    expect(calcInvestBrutto("lwwp", 10, false)).toBe(36011);
    expect(calcInvestBrutto("lwwp", 5, false)).toBe(29109);
    expect(calcInvestBrutto("lwwp", 20, false)).toBe(47078);
  });
  it("uses the source gas regression on full building load, not WP sizing", () => {
    expect(gasInvestmentGross(10)).toBeCloseTo(13877.494, 0);
    expect(gasInvestmentGross(20)).toBeCloseTo(19888.026, 0);
    const r = calcHeatPump(house);
    expect(r.gasInvest).toBe(Math.round(gasInvestmentGross(r.heizlastKw)));
    expect(r.gasInvest).not.toBe(Math.round(gasInvestmentGross(r.auslegungKw)));
    expect(fossilReplacementInvestment("gas", cfg, r.heizlastKw)).toBe(r.gasInvest);
  });
  it("makes a smaller reference cheaper only within its supported cost classes", () => {
    const rows = [1,2,3].map(insulationIdx => calcHeatPump({ ...house, insulationIdx }));
    expect(rows[0].gasInvest).toBeGreaterThan(rows[1].gasInvest);
    expect(rows[1].gasInvest).toBe(rows[2].gasInvest);
    expect(rows[0].investBrutto).toBeGreaterThan(rows[1].investBrutto);
    expect(rows[1].investBrutto).toBeGreaterThan(rows[2].investBrutto);
    expect(gasInvestmentGross(3)).toBe(gasInvestmentGross(10));
    expect(lwwpCoreGross(3)).toBe(lwwpCoreGross(5));
    for(const bad of [-1,101,Infinity,NaN]) {
      expect(() => gasInvestmentGross(bad)).toThrow(RangeError);
      expect(() => lwwpCoreGross(bad)).toThrow(RangeError);
    }
  });
  it("preserves fixed overhead and adds radiator replacement only once", () => {
    const doubledFixed = { ...cfg, investLwwpBase: cfg.investLwwpBase + 1000 };
    for(const kw of [4,8,14,20]) {
      expect(calcInvestBrutto("lwwp",kw,false,doubledFixed)-calcInvestBrutto("lwwp",kw,false)).toBe(1000);
      expect(calcInvestBrutto("lwwp",kw,true)-calcInvestBrutto("lwwp",kw,false)).toBe(cfg.heizkoerperTauschKosten);
    }
  });
  it("preserves entered quotes and zero in every building variant", () => {
    for(const amount of [0,12345]) for(const insulationIdx of [1,2,3]) {
      const r=calcHeatPump({ ...house, insulationIdx, override:{investNetto:amount,fossilErsatzInvest:amount} });
      expect(r.investNetto).toBe(amount); expect(r.gasInvest).toBe(amount);
      expect(r.kostenJeJahr.wp.invest).toBe(amount); expect(r.kostenJeJahr.fossil.invest).toBe(amount);
    }
  });
});

describe("investment sensitivity is recalculated, not applied to net savings", () => {
  it("recalculates subsidy below/above the cap and holds running costs fixed", () => {
    const input={ ...house, insulationIdx:3 };
    const cases=calcHeatPumpInvestmentSensitivity(input);
    expect(cases.favorable.investBrutto).toBe(Math.round(cases.central.investBrutto*.8));
    expect(cases.adverse.investBrutto).toBe(Math.round(cases.central.investBrutto*1.2));
    expect(cases.favorable.beg.amount).toBeLessThan(cases.central.beg.amount);
    expect(cases.adverse.beg.amount).toBe(cases.central.beg.amount);
    expect(cases.favorable.gasInvest).toBeGreaterThan(cases.central.gasInvest);
    expect(cases.adverse.gasInvest).toBeLessThan(cases.central.gasInvest);
    expect(cases.favorable.tcoEinsparung).toBeGreaterThan(cases.central.tcoEinsparung);
    expect(cases.adverse.tcoEinsparung).toBeLessThan(cases.central.tcoEinsparung);
    for(const r of [cases.favorable,cases.adverse]) {
      expect(r.stromKosten).toBe(cases.central.stromKosten);
      expect(r.gasKosten).toBe(cases.central.gasKosten);
      expect(r.tcoEinsparung).toBe(r.tcoGas-r.tcoWp);
      expect(r.kostenJeJahr.wp.invest).toBe(r.investNetto);
    }
  });
  it("never varies entered prices, including zero", () => {
    for(const amount of [0,15000]) {
      const cases=calcHeatPumpInvestmentSensitivity({...house,override:{investNetto:amount,fossilErsatzInvest:amount}});
      expect(cases.favorable).toEqual(cases.central);
      expect(cases.adverse).toEqual(cases.central);
    }
    const cases=calcHeatPumpInvestmentSensitivity({...house,override:{investNetto:12345}});
    expect(cases.favorable.investNetto).toBe(12345);
    expect(cases.adverse.investNetto).toBe(12345);
    expect(HEATING_INVESTMENT.sensitivityFraction).toBe(.2);
  });
});
