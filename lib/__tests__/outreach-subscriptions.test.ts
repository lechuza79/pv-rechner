import { describe, it, expect } from "vitest";
import { subscriptionFeedback, subscriptionSummary, type SubscriptionObservation } from "../outreach-subscriptions";
const target = { organizationId: "a", name: "A", contactedAt: "2026-09-01T12:00:00Z", campaign: null, currentMailbox: null, sentTo: null, sentMessageId: null, pagePath: null };
const row: SubscriptionObservation = { region_id: "a", status: "bestaetigt", erstellt_am: "2026-09-01T13:00:00Z", bestaetigt_am: "2026-09-02T12:00:00Z", ueber_brief: true, aus_verwaltung: true };
describe("subscription feedback", () => {
  it("keeps attempts, confirmations, self-reports and their intersection separate", () => {
    const r = subscriptionFeedback([target], [row, {...row, ueber_brief: false}, {...row, status: "ausstehend", bestaetigt_am: null}, {...row, status: "abgemeldet"}], "2026-09-15T00:00:00Z");
    expect(subscriptionSummary(r)).toMatchObject({ confirmed: 2, pending: 1, confirmedViaLetter: 1, confirmedWithAdministrationClaim: null, confirmedViaLetterWithAdministrationClaim: null, organizationsWithConfirmed: 1 });
  });
  it("does not attribute pre-send, unknown, future, inconsistent or other-town subscriptions", () => {
    const rows = [{...row, erstellt_am: "2026-09-01T11:59:59Z"}, {...row, erstellt_am: "unknown"}, {...row, bestaetigt_am: null}, {...row, bestaetigt_am: "2026-10-01"}, {...row, bestaetigt_am: "2026-08-31"}, {...row, region_id: "b"}];
    const r = subscriptionFeedback([target], rows, "2026-09-15T00:00:00Z");
    expect(subscriptionSummary(r).confirmed).toBe(0);
    expect(r.current?.confirmed).toBe(6);
  });
  it("discloses administration counts only for sufficiently large municipal groups", () => {
    const small=subscriptionFeedback([target], Array.from({length:4},()=>row), "2026-09-15");
    expect(small.rows[0].confirmedWithAdministrationClaim).toBeNull();
    const large=subscriptionFeedback([target], Array.from({length:5},()=>row), "2026-09-15");
    expect(subscriptionSummary(large).confirmedWithAdministrationClaim).toBe(5);
  });
  it("preserves unavailable and failed reads instead of reporting zero", () => {
    expect(subscriptionSummary().confirmed).toBeNull();
    expect(subscriptionSummary({status: "failed", observedAt: "2026-09-15", rows: [], current: null}).confirmed).toBeNull();
    expect(subscriptionSummary(subscriptionFeedback([target], [], "2026-09-15")).confirmed).toBe(0);
  });
});
