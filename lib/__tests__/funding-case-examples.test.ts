import { describe, expect, it } from "vitest";
import { buildHeidelbergFundingCases, buildFundingExamples, buildLocalFundingCases } from "../funding-examples";
import { FUNDING_PROGRAMS } from "../funding-programs";

describe("Heidelberg category examples", () => {
  const program = {...FUNDING_PROGRAMS["heidelberg-rev"], lastVerified: new Date().toISOString()};
  it("uses three separate grant categories and only calculates rooftop returns", () => {
    const cases = buildHeidelbergFundingCases(1064, program)!;
    expect(cases.map(item => item.grant)).toEqual([500, 1000, 2500]);
    expect(cases[0].result).toEqual(buildFundingExamples(1064, program)[0]);
    expect(cases.slice(1).every(item => item.result === undefined)).toBe(true);
  });
  it("does not calculate unverified seed funding", () => {
    expect(buildHeidelbergFundingCases(1064, FUNDING_PROGRAMS["heidelberg-rev"])).toBeNull();
  });
  it("does not retain reviewed examples after changed rates", () => {
    expect(buildHeidelbergFundingCases(1064, {...program, rates: []})).toBeNull();
  });
});


describe("shared municipal examples", () => {
  const verified = (id: string) => ({...FUNDING_PROGRAMS[id], lastVerified: new Date().toISOString()});
  it("keeps Heidelberg's three reviewed cases in the shared adapter", () => {
    expect(buildLocalFundingCases(1064, verified("heidelberg-rev"))?.map(item => item.grant)).toEqual([500, 1000, 2500]);
  });
  it("never applies a balcony-only grant to a roof example", () => {
    expect(buildLocalFundingCases(1064, verified("tuebingen-balkon-pv"))).toBeNull();
  });
  it("does not promise a grant after a programme closes", () => {
    expect(buildLocalFundingCases(1064, {...verified("heidelberg-rev"), status: "pausiert"})).toBeNull();
  });
  it("uses each programme's own calculation instead of Heidelberg's rates", () => {
    const program = {...verified("nidda-solar"), status: "aktiv" as const};
    const eligible = buildFundingExamples(1064, program).find(example => example.foerderComputable && example.foerderung > 0);
    const cases = buildLocalFundingCases(1064, program);
    expect(eligible).toBeDefined();
    {
      expect(cases).toHaveLength(1);
      expect(cases![0].grant).toBe(eligible!.foerderung);
      expect(cases![0].result).toEqual(eligible);
    }
  });
});
