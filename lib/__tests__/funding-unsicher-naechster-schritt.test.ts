import { describe, it, expect } from "vitest";
import { allFundingPrograms, type FundingProgram } from "../funding-programs";
import { validateMunicipalReviews } from "../funding-municipal-review";
import reviews from "../../data/funding/municipal-reviews.json";

// ─── An unclear programme always has a dated next step ──────────────────────
//
// Error class (14 Oct 2026): a finding is parked as "unclear" and nothing
// brings it back. Recklinghausen showed a storage grant for two weeks after
// the city had dropped it; Moormerland sat on "Status unklar" from August
// without any next step; Gerbrunn's sync-test exception claimed a "queued
// enquiry" that was never queued. Comments and exception texts are not a
// mechanism. The ledger is: the existing sender only sends what stands there
// as a reviewed `klaerung` with a dated next action.
//
// So every programme on `status: "unsicher"` needs a ledger record for its
// region key that is still unresolved, carries a dated next action and has
// not gone stale. Resolving it means changing the programme's status, not
// loosening this test.

const STALE_DAYS = 30;
const ledger = validateMunicipalReviews(reviews);

function nextStepProblem(p: FundingProgram, today: Date): string | null {
  const r = ledger.find(x => x.regionId === p.agsCode);
  if (!r) return "no review record for its region key";
  if (r.outcome !== "klaerung") return `review record is "${r.outcome}", not an open clarification`;
  if (!r.nextAction) return "review record has no next action";
  const ageDays = (today.getTime() - Date.parse(r.recheckAt)) / 86_400_000;
  if (ageDays > STALE_DAYS) return `recheck date ${r.recheckAt.slice(0, 10)} is more than ${STALE_DAYS} days past`;
  return null;
}

describe("unclear programmes", () => {
  it("each has a dated, current next step in the review ledger", () => {
    const today = new Date();
    const problems = allFundingPrograms()
      .filter(p => p.status === "unsicher")
      .map(p => [p.id, nextStepProblem(p, today)] as const)
      .filter(([, problem]) => problem)
      .map(([id, problem]) => `${id}: ${problem}`);
    expect(problems).toEqual([]);
  });

  it("catches a programme without a record, a resolved record and a stale one", () => {
    const today = new Date("2026-10-14T12:00:00Z");
    const fake = (agsCode: string) => ({ id: "x", agsCode, status: "unsicher" }) as FundingProgram;
    expect(nextStepProblem(fake("99999999"), today)).toMatch(/no review record/);
    const resolved = ledger.find(r => r.outcome !== "klaerung")!;
    expect(nextStepProblem(fake(resolved.regionId), today)).toMatch(/not an open clarification/);
    const open = ledger.find(r => r.outcome === "klaerung" && r.nextAction)!;
    const later = new Date(Date.parse(open.recheckAt) + (STALE_DAYS + 1) * 86_400_000);
    expect(nextStepProblem(fake(open.regionId), later)).toMatch(/days past/);
    expect(nextStepProblem(fake(open.regionId), new Date(open.recheckAt))).toBeNull();
  });
});
