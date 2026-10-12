import { describe, expect, it } from "vitest";
import { buildFundingExamples } from "../funding-examples";
import { FUNDING_PROGRAMS, fundingAmount, type FundingProgram } from "../funding-programs";
const current = (id: string): FundingProgram => ({ ...FUNDING_PROGRAMS[id], lastVerified: new Date().toISOString(), pageSeenAt: new Date().toISOString(), changedSinceIso: undefined, status: "aktiv" });
describe("Shared funding example comparison", () => {
  it("compares identical systems with and without a grant in every scenario", () => {
    for (const id of ["heidelberg-rev", "nidda-solar", "koeln-pv"]) {
      const examples = buildFundingExamples(1050, current(id));
      const baseline = buildFundingExamples(1050);
      examples.forEach((example, index) => {
        expect(example.foerderung).toBeGreaterThan(0);
        expect(example.brutto - example.netto).toBe(example.foerderung);
        expect(example.withoutFunding.total).toBe(baseline[index].total);
        expect(example.total - example.withoutFunding.total).toBeCloseTo(example.foerderung, 5);
        expect(example.assumption).toBeTruthy();
      });
    }
  });
  it("keeps the Heidelberg assumption out of the personal calculator", () => {
    const program = current("heidelberg-rev");
    expect(buildFundingExamples(1050, program).map(x => x.foerderung)).toEqual([500, 1000, 1500]);
    expect(fundingAmount(program, { technik: "pv", kwp: 10, speicherKwh: 5, kosten: 17000 }).computable).toBe(false);
  });
  it("does not fund closed programmes or reuse assumptions after terms change", () => {
    const program = current("heidelberg-rev");
    expect(buildFundingExamples(1050, { ...program, status: "pausiert" }).every(x => x.foerderung === 0)).toBe(true);
    const changed = { ...program, exampleScenario: undefined, conditions: ["Changed terms"] };
    expect(buildFundingExamples(1050, changed).every(x => x.foerderung === 0)).toBe(true);
  });
});

// Balcony-only pages must not borrow rooftop economics.
import { buildBalconyFundingExample } from "../funding-examples";
import { calcBalkon } from "../balkon";
import { DEFAULT_PRICES } from "../prices-config";
import { PERSONEN } from "../constants";
it("uses the balcony calculator and excludes inactive grants", () => {
  const p = FUNDING_PROGRAMS["muenchen-fkg"];
  const example = buildBalconyFundingExample(1140, { ...p, status: "ausgeschoepft" });
  const expected = calcBalkon({ setId: "duo", storageId: "none", orientationId: "sued_gelaender", presenceId: "teils", haushaltKwh: PERSONEN[1].verbrauch, specificYield: 1140, stromPrice: DEFAULT_PRICES.electricityPrice });
  expect(example.grant).toBe(0);
  expect(example.result).toEqual(expected);
});
