import { describe, expect, it } from "vitest";
import { fundingApplication, fundingApplicationAnswer, fundingConditionGroups, validFundingApplication, type FundingApplication } from "../funding-application";
import { FUNDING_PROGRAMS } from "../funding-programs";
import { fundingContentDate } from "../funding-page-dates";

const source = "https://example.org/official-guideline";
const application: FundingApplication = {
  checkedAt: "2026-01-01T12:00:00Z",
  sources: [{ url: source, title: "Official guideline", quote: "Submit before purchase." }],
  steps: [{ title: "Submit", text: "Submit before purchase.", kind: "application", evidenceUrls: [source], nur: ["pv"] }],
};
const program = Object.values(FUNDING_PROGRAMS).find(p => p.name.includes("Rationelle Energieverwendung"))!;
describe("programme-specific application evidence", () => {
  it("rejects unsupported claims, future dates and unsafe links", () => {
    expect(validFundingApplication(application)).toBe(true);
    expect(validFundingApplication({ ...application, checkedAt: "2999-01-01T00:00:00Z" })).toBe(false);
    expect(validFundingApplication({ ...application, sources: [] })).toBe(false);
    expect(validFundingApplication({ ...application, steps: [{ ...application.steps[0], evidenceUrls: ["https://other.example"] }] })).toBe(false);
    expect(validFundingApplication({ ...application, portal: { url: "javascript:alert(1)", label: "Apply", evidenceUrls: [source] } })).toBe(false);
  });
  it("does not reuse a changed or wrong-technology procedure", () => {
    expect(fundingApplication({ ...program, application }, "pv")?.steps).toHaveLength(1);
    expect(fundingApplication({ ...program, application }, "balkon")).toBeNull();
    expect(fundingApplication({ ...program, application, changedSinceIso: "2026-02-01T00:00:00Z" })).toBeNull();
  });
  it("preserves every original condition and does not manufacture a process", () => {
    const groups = fundingConditionGroups(program, "pv");
    expect(groups.application.join(" ")).toContain("Antrag vor Kauf/Installation");
    expect(groups.eligibility.join(" ")).toContain("PV-Pflicht");
    expect(fundingApplicationAnswer({ ...program, conditions: [], application: undefined })).toContain("noch nicht verlässlich erfasst");
    const afterPurchase = { ...program, conditions: ["Antrag innerhalb von sechs Monaten nach Kauf stellen"] };
    expect(fundingApplicationAnswer(afterPurchase)).toBe(afterPurchase.conditions[0]);
  });
  it("does not turn an unrelated check date into a content revision", () => {
    expect(fundingContentDate([{ ...program, lastVerified: "2026-10-01", contentUpdatedAt: undefined }])).toBeUndefined();
    expect(fundingContentDate([{ ...program, contentUpdatedAt: "2026-01-02T12:00:00Z" }])?.toISOString()).toBe("2026-01-02T12:00:00.000Z");
  });
});
