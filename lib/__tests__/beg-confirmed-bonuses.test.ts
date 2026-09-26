import { describe, expect, it } from "vitest";
import { BEG_EINKOMMEN_OPTIONS, begIncomeFor, confirmedBegBonuses } from "../beg-funding-options";
import { calcBegSubsidy } from "../heatpump";
import { begStufeAm, DEFAULT_HEATPUMP_CONFIG } from "../heatpump-config";

const stufe = begStufeAm(new Date("2026-09-26T12:00:00Z"));
const calculate = (confirmed: boolean, unknown = false, income?: number) => calcBegSubsidy("bestand", "lwwp", 37450, {
  ...confirmedBegBonuses(confirmed, true, true, unknown, income, false), stufe,
}, DEFAULT_HEATPUMP_CONFIG);

describe("funding check confirmation", () => {
  it("starts with only base funding even when old defaults contain bonus eligibility", () => {
    expect(calculate(false, false, 30000).rate).toBeCloseTo(0.3);
    expect(calculate(false).amount).toBe(8400);
  });
  it("adds the replacement bonus only after confirmation", () => {
    expect(calculate(true).rate).toBeCloseTo(0.46);
    expect(calculate(true).amount).toBe(12880);
  });
  it("does not assume a replacement bonus for unknown heating age", () => {
    expect(calculate(true, true).amount).toBe(8400);
  });
  it("does not grant personal bonuses without self use", () => {
    expect(confirmedBegBonuses(true, false, true, false, 30000, true)).toEqual({ klimaBonus: false, haushaltseinkommen: undefined, kindImHaushalt: false });
  });
});


describe("Family income boundary", () => {
  it("allows the family-only income band to reach the calculator", () => {
    const limit = DEFAULT_HEATPUMP_CONFIG.begEinkommensStaffel.at(-1)!.maxIncome + DEFAULT_HEATPUMP_CONFIG.begFamilienzuschlag;
    const option = BEG_EINKOMMEN_OPTIONS.find(item => item.income === limit)!;
    expect(option).toBeDefined();
    const calculate = (child: boolean) => calcBegSubsidy("bestand", "lwwp", 37450, {
      ...confirmedBegBonuses(true, true, false, false, begIncomeFor(option.key), child), stufe,
    }, DEFAULT_HEATPUMP_CONFIG);
    expect(calculate(false).rate).toBeCloseTo(stufe.grundfoerderung);
    expect(calculate(true).rate).toBeCloseTo(stufe.grundfoerderung + 0.1);
  });
});
