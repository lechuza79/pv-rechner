import { subscriptionSummary, type SubscriptionFeedback } from "./outreach-subscriptions";
import { ohneZitat, ordneEin } from "./outreach-ruecklauf";

export type CommunicationAction = "response" | "internal-forward" | "material-prepared" | "press-distributed" | "publication";
export type EvidenceSource = {
  id: string; kind: "mail" | "page"; text: string;
  observedAt: string; eventAt?: string | null;
  from?: string; subject?: string; headers?: Record<string,string>;
  url?: string; publisher?: string;
};
export type ActionReview = {
  organizationId: string; sourceId: string; action: CommunicationAction;
  quote: string; reviewedBy: string; reviewedAt: string;
  scope: "own-message" | "quoted-history" | "public-page";
  actorMailbox?: string | null;
  channel?: "municipal" | "personal-social" | "press";
};
export type RecipientReview = {
  organizationId: string; sourceId: string; mailbox: string; quote: string;
  reviewedBy: string; reviewedAt: string;
};
export type EvaluationTarget = {
  organizationId: string; name: string; contactedAt: string; campaign: string | null;
  currentMailbox: string | null; sentTo: string | null; sentMessageId: string | null;
  pagePath: string | null;
};
export type PageAnalytics = {
  organizationId: string; since: string; until: string;
  status: "read" | "failed" | "missing-path"; error?: string;
  groups: {referrer: string; visitors: number; pageviews: number | null}[];
};
export type OutreachEvaluationInput = {
  subscriptions?: SubscriptionFeedback;
  targets: EvaluationTarget[]; sources: EvidenceSource[]; actions: ActionReview[];
  recipients: RecipientReview[]; analytics: PageAnalytics[];
};
const normalize = (s: string) => s.normalize("NFKC").replace(/\s+/gu," ").trim();
const mailbox = (s: string) => s.trim().toLowerCase();
const hasMailbox = (text: string, address: string) => (text.match(/[\w.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? []).some(found => mailbox(found) === mailbox(address));

/** Actions are explicitly reviewed observations. A role, a keyword, a visit,
 * or the highest stage in another organization cannot manufacture an action. */
export function evaluateOutreach(input: OutreachEvaluationInput) {
  const targets = new Map(input.targets.map(t=>[t.organizationId,t]));
  if (targets.size !== input.targets.length) throw Error("Duplicate cohort identity");
  if (input.subscriptions?.status === "read") {
    const rows = input.subscriptions.rows;
    if (rows.length !== targets.size || new Set(rows.map(r=>r.organizationId)).size !== rows.length || rows.some(r=>!targets.has(r.organizationId))) throw Error("Subscription feedback must cover the exact cohort");
    for (const r of rows) {
      if (r.confirmed < 5 && (r.confirmedWithAdministrationClaim !== null || r.confirmedViaLetterWithAdministrationClaim !== null)) throw Error("Small subscription groups must suppress administration counts");
      const counts = [r.confirmed, r.pending, r.confirmedViaLetter, r.confirmedWithAdministrationClaim, r.confirmedViaLetterWithAdministrationClaim];
      if (counts.some(n=>n!==null && (!Number.isSafeInteger(n)||n<0)) || r.confirmedViaLetter > r.confirmed || (r.confirmedWithAdministrationClaim !== null && r.confirmedWithAdministrationClaim > r.confirmed) || (r.confirmedViaLetterWithAdministrationClaim !== null && r.confirmedViaLetterWithAdministrationClaim > Math.min(r.confirmedViaLetter,r.confirmedWithAdministrationClaim ?? 0))) throw Error("Invalid subscription counts");
    }
  }
  const sources = new Map(input.sources.map(s=>[s.id,s]));
  if (sources.size !== input.sources.length) throw Error("Duplicate evidence source identity");
  const analytics = new Map(input.analytics.map(a=>[a.organizationId,a]));
  if (analytics.size !== input.analytics.length) throw Error("Duplicate analytics window for organization");
  for (const row of input.analytics) if (!targets.has(row.organizationId)) throw Error("Analytics outside cohort");
  const sourceFor = (review: {organizationId:string; sourceId:string; quote:string; reviewedBy:string; reviewedAt:string}) => {
    if (!targets.has(review.organizationId)) throw Error("Reviewed organization outside cohort");
    const source = sources.get(review.sourceId);
    if (!source || !review.reviewedBy.trim() || !review.reviewedAt || !normalize(review.quote)) throw Error("Missing reviewed source evidence");
    if (!normalize(source.text).includes(normalize(review.quote))) throw Error("Quote absent from original source");
    return source;
  };
  for (const review of input.actions) {
    const source = sourceFor(review);
    if (!["response", "internal-forward", "material-prepared", "press-distributed", "publication"].includes(review.action)) throw Error("Unknown action");
    if (!["own-message", "quoted-history", "public-page"].includes(review.scope)) throw Error("Unknown evidence scope");
    if (!Number.isFinite(Date.parse(review.reviewedAt))) throw Error("Invalid review date");
    if (source.eventAt && !Number.isFinite(Date.parse(source.eventAt))) throw Error("Invalid event date");
    if (review.action === "publication") {
      if (source.kind !== "page" || !source.url || !source.publisher || review.scope !== "public-page" || !review.channel) throw Error("Publication requires a reviewed public page and publisher");
      if (!["municipal", "personal-social", "press"].includes(review.channel)) throw Error("Unknown publication channel");
      if (review.actorMailbox) throw Error("Publication actor mailbox requires a separate mail observation");
    } else {
      if (source.kind !== "mail" || review.scope === "public-page") throw Error("Communication action requires mail evidence");
      if (review.scope === "own-message" && !normalize(ohneZitat(source.text)).includes(normalize(review.quote))) throw Error("Own-message action quoted only from history");
      if (review.action === "response" && (review.scope !== "own-message" || ordneEin({von:source.from ?? "", betreff:source.subject ?? "", text:source.text, kopf:source.headers}) !== "antwort")) throw Error("Automatic or historical message is not a genuine reply");
      if (review.actorMailbox && review.scope === "quoted-history") {
        const senderLine = review.quote.split(/\r?\n/).find(line => /^(?:Von|From):\s/i.test(line.trim()));
        if (!senderLine || !hasMailbox(senderLine, review.actorMailbox)) throw Error("Forwarding actor is not the quoted sender");
      }
      // A quote in a forwarded chain can name a different actor. It may prove
      // a route but cannot be attached to a mailbox without its literal address.
      if (review.actorMailbox && (review.scope === "own-message" ? mailbox(review.actorMailbox) !== mailbox(source.from ?? "") : !hasMailbox(review.quote, review.actorMailbox))) throw Error("Actor mailbox not established by source");
    }
    const contactedAt = targets.get(review.organizationId)!.contactedAt;
    if (!Number.isFinite(Date.parse(contactedAt))) throw Error("Invalid outreach date");
    // A date-only page stamp cannot determine ordering within the sending day.
    const predates = source.eventAt && (/^\d{4}-\d{2}-\d{2}$/.test(source.eventAt)
      ? source.eventAt < contactedAt.slice(0, 10)
      : Date.parse(source.eventAt) < Date.parse(contactedAt));
    if (review.scope !== "quoted-history" && predates) throw Error("Action predates recorded outreach");
  }
  for (const review of input.recipients) {
    const source = sourceFor(review);
    if (source.kind !== "mail" || !hasMailbox(review.quote, review.mailbox)) throw Error("Historical recipient requires literal mailbox evidence");
  }
  const rows = input.targets.map(target => {
    const seen = new Set<string>();
    const actions = input.actions.filter(a=>a.organizationId===target.organizationId).filter(a=>{
      const key = `${a.sourceId}:${a.action}:${a.actorMailbox ?? ""}:${a.channel ?? ""}`;
      if (seen.has(key)) return false; seen.add(key); return true;
    }).map(a=>({...a, source:sources.get(a.sourceId)!}));
    const originalRecipients = input.recipients.filter(r=>r.organizationId===target.organizationId);
    const mailboxCapabilities = [...new Set(actions.map(a=>a.actorMailbox).filter((m):m is string=>!!m).map(mailbox))].map(address=>({
      mailbox:address,
      actions:[...new Set(actions.filter(a=>mailbox(a.actorMailbox ?? "")===address).map(a=>a.action))],
      evidence:actions.filter(a=>mailbox(a.actorMailbox ?? "")===address).map(a=>({sourceId:a.sourceId,quote:a.quote,scope:a.scope})),
    }));
    return {
      ...target,
      dispatchEvidence: target.sentTo && target.sentMessageId ? "recorded-recipient-and-message-id" : originalRecipients.length ? "quoted-recipient-history-only" : "original-recipient-unknown",
      originalRecipients,
      actions,
      mailboxCapabilities,
      subscriptionFeedback: input.subscriptions?.status === "read" ? input.subscriptions.rows.find(r=>r.organizationId===target.organizationId) ?? null : null,
      analytics:analytics.get(target.organizationId) ?? null,
      observedActions:[...new Set(actions.map(a=>a.action))],
      outcome:actions.length ? "observed-communication-or-publication" : "no-verified-outcome-in-observed-sources",
    };
  });
  const counts = Object.fromEntries((["response","internal-forward","material-prepared","press-distributed","publication"] as CommunicationAction[]).map(action=>[action,rows.filter(r=>r.observedActions.includes(action)).length]));
  return { rows, summary:{
    subscriptions: subscriptionSummary(input.subscriptions),
    recordedOrganizations:rows.length,
    organizationsByObservedAction:counts,
    uniqueReplyMessages:new Set(rows.flatMap(r=>r.actions.filter(a=>a.action==="response").map(a=>a.sourceId))).size,
    organizationsWithOfficialPublication:rows.filter(r=>r.actions.some(a=>a.action==="publication" && a.channel==="municipal")).length,
    organizationsWithPersonalSocialPublication:rows.filter(r=>r.actions.some(a=>a.action==="publication" && a.channel==="personal-social")).length,
    organizationsWithVerifiedOutcome:rows.filter(r=>r.actions.length).length,
    analyticsRead:rows.filter(r=>r.analytics?.status==="read").length,
    analyticsFailedOrUnavailable:rows.filter(r=>r.analytics?.status!=="read").length,
    analyticsWithOverflow:rows.filter(r=>r.analytics?.groups.some(g=>g.referrer==="Others")).length,
    originalRecipientUnknown:rows.filter(r=>r.dispatchEvidence==="original-recipient-unknown").length,
    limits:["Counts overlap; this is not a sequential funnel.","Visits do not prove email opens, delivery, actor identity or publication.","No response observed is not a failed contact.","Current profile mailbox is not the historical recipient.","Quoted mail history is not an independently verified sent envelope.","Title and department do not establish communication capability.","Unknown event dates do not establish timing after outreach.","No causal or population-wide role ranking is inferred."],
  }};
}
