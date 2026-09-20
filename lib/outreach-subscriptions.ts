import { zaehleAbos, type AboZeile } from "./kommunen-abo-spiegel";
import type { EvaluationTarget } from "./outreach-evaluation";

export type SubscriptionObservation = AboZeile & { erstellt_am: string; bestaetigt_am: string | null };
export type SubscriptionFeedback = {
  status: "read" | "failed"; observedAt: string; error?: string;
  rows: { organizationId: string; confirmed: number; pending: number; confirmedViaLetter: number; confirmedWithAdministrationClaim: number | null; confirmedViaLetterWithAdministrationClaim: number | null }[];
  current: { confirmed: number; pending: number } | null;
};
/** Current subscriptions only. No mailbox, person identity, or causal claim. */
export function subscriptionFeedback(targets: EvaluationTarget[], observations: SubscriptionObservation[], observedAt: string): SubscriptionFeedback {
  const end = Date.parse(observedAt);
  if (!Number.isFinite(end)) throw Error("Invalid subscription observation date");
  const active = observations.filter(a => a.status === "bestaetigt" || a.status === "ausstehend");
  const current = { confirmed: active.filter(a => a.status === "bestaetigt").length, pending: active.filter(a => a.status === "ausstehend").length };
  const rows = targets.map(t => {
    const start = Date.parse(t.contactedAt);
    if (!Number.isFinite(start)) throw Error("Invalid outreach date");
    const relevant = active.filter(a => a.region_id === t.organizationId && Date.parse(a.erstellt_am) >= start && Date.parse(a.erstellt_am) <= end && (a.status !== "bestaetigt" || (a.bestaetigt_am !== null && Date.parse(a.bestaetigt_am) >= Date.parse(a.erstellt_am) && Date.parse(a.bestaetigt_am) <= end)));
    const counts = zaehleAbos(relevant).get(t.organizationId);
    return { organizationId: t.organizationId, confirmed: counts?.bestaetigt ?? 0, pending: counts?.ausstehend ?? 0, confirmedViaLetter: counts?.ueberBrief ?? 0, confirmedWithAdministrationClaim: (counts?.bestaetigt ?? 0) >= 5 ? counts!.mitAngabeVerwaltung : null, confirmedViaLetterWithAdministrationClaim: (counts?.bestaetigt ?? 0) >= 5 ? relevant.filter(a => a.status === "bestaetigt" && a.ueber_brief === true && a.aus_verwaltung === true).length : null };
  });
  return { status: "read", observedAt, current, rows };
}
export function subscriptionSummary(feedback?: SubscriptionFeedback) {
  if (!feedback || feedback.status !== "read") return { status: feedback?.status ?? "unavailable", confirmed: null, pending: null, confirmedViaLetter: null, confirmedWithAdministrationClaim: null, confirmedViaLetterWithAdministrationClaim: null, organizationsWithConfirmed: null };
  const sum = (key: "confirmed" | "pending" | "confirmedViaLetter" | "confirmedWithAdministrationClaim" | "confirmedViaLetterWithAdministrationClaim") => feedback.rows.some(r => r[key] === null) ? null : feedback.rows.reduce((n,r) => n+(r[key] ?? 0), 0);
  return { status: "read", confirmed: sum("confirmed"), pending: sum("pending"), confirmedViaLetter: sum("confirmedViaLetter"), confirmedWithAdministrationClaim: sum("confirmedWithAdministrationClaim"), confirmedViaLetterWithAdministrationClaim: sum("confirmedViaLetterWithAdministrationClaim"), organizationsWithConfirmed: feedback.rows.filter(r => r.confirmed > 0).length };
}
