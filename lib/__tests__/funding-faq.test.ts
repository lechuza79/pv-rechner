import { describe, it, expect } from "vitest";
import { buildFundingFaq } from "../funding-faq";
import { getFundingProgram } from "../funding-programs";

describe("buildFundingFaq", () => {
  const frankfurt = getFundingProgram("frankfurt-klimabonus")!;

  it("builds program-specific Q&A with name, rates and combine answer", () => {
    const faq = buildFundingFaq("Frankfurt am Main", frankfurt, { amortYears: 9 });
    const joined = faq.map((f) => f.q + " " + f.a).join("\n");
    expect(faq.length).toBeGreaterThanOrEqual(4);
    expect(joined).toContain("Frankfurter Klimabonus");
    expect(joined).toContain("0 % Mehrwertsteuer");
    expect(joined).toContain("9 Jahren"); // amortisation woven in
    // every entry has a non-empty question and answer
    for (const f of faq) { expect(f.q.length).toBeGreaterThan(0); expect(f.a.length).toBeGreaterThan(0); }
  });

  it("falls back to a generic answer without a program", () => {
    const faq = buildFundingFaq("Musterstadt", undefined, { amortYears: null });
    const joined = faq.map((f) => f.a).join("\n");
    expect(joined).toContain("kein eigenes kommunales Förderprogramm");
    expect(joined).toContain("0 % Mehrwertsteuer");
    // amort unknown → no "X Jahren" claim
    expect(joined).not.toMatch(/\d+ Jahren/);
  });

  it("flags an inactive program in the answer", () => {
    const karlsruhe = getFundingProgram("karlsruhe-klimabonus")!; // ausgeschoepft
    const faq = buildFundingFaq("Karlsruhe", karlsruhe, { amortYears: 10 });
    expect(faq[0].a).toContain("keine neuen Anträge");
  });
});
