import type { ReviewSource } from "./funding-source-review";

export type MunicipalReview = {
  regionId: string;
  name: string;
  checkedAt: string;
  recheckAt: string;
  scope: string;
  outcome: "programme-geprueft" | "keine-passende-foerderung" | "klaerung";
  conclusion: string;
  searches: string[];
  evidence: { url: string; finding: string }[];
  sources: { url: string; disposition: "reviewed" | "replaced" | "open"; reason: string; evidenceUrl: string }[];
  nextAction?: { kind: "manual" | "enquiry"; dueAt: string; detail: string };
  enquiry?: { id: string; recipient: string; recipientSource: string; website: string; question: string };
};
export type InquiryReceipt = { program_id: string; gesendet_am: string; beleg: string | null; antwort_am: string | null };
const nonempty = (value: unknown): value is string => typeof value === "string" && !!value.trim();
const date = (value: unknown): value is string => nonempty(value) && Number.isFinite(Date.parse(value));
const url = (value: unknown): value is string => {
  try { return nonempty(value) && ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
};

/** Reviewed evidence is explicit, never inferred from search hits or a crawl verdict. */
export function validateMunicipalReviews(input: unknown): MunicipalReview[] {
  if (!Array.isArray(input)) throw new Error("Municipal reviews must be an array.");
  const regions = new Set<string>();
  const ids = new Set<string>();
  for (const r of input) {
    if (!r || !/^\d{5}(\d{3})?$/.test(r.regionId) || regions.has(r.regionId)
      || !nonempty(r.name) || !date(r.checkedAt) || !date(r.recheckAt)
      || Date.parse(r.recheckAt) <= Date.parse(r.checkedAt)
      || !nonempty(r.scope) || !nonempty(r.conclusion)
      || !["programme-geprueft", "keine-passende-foerderung", "klaerung"].includes(r.outcome)
      || !Array.isArray(r.searches) || !r.searches.length || !r.searches.every(nonempty)
      || !Array.isArray(r.evidence) || !r.evidence.length || !r.evidence.every((e: MunicipalReview["evidence"][number]) => e && url(e.url) && nonempty(e.finding))
      || !Array.isArray(r.sources) || !r.sources.every((s: MunicipalReview["sources"][number]) => s && nonempty(s.url) && url(/^[a-z][a-z\d+.-]*:/i.test(s.url) ? s.url : `https://${s.url}`) && ["reviewed", "replaced", "open"].includes(s.disposition) && nonempty(s.reason) && (r.outcome === "klaerung" || s.disposition !== "open") && r.evidence.some((e: MunicipalReview["evidence"][number]) => e.url === s.evidenceUrl))) {
      throw new Error(`Incomplete municipal review: ${r?.regionId ?? "unknown"}`);
    }
    regions.add(r.regionId);
    if (r.outcome === "klaerung") {
      if (!r.nextAction || !["manual", "enquiry"].includes(r.nextAction.kind) || !date(r.nextAction.dueAt) || !nonempty(r.nextAction.detail)) throw new Error(`Unresolved review needs a dated next action: ${r.regionId}`);
      if (r.nextAction.kind === "enquiry") {
        const q = r.enquiry;
        if (!q || !/^klaerung-\d{5}(\d{3})?$/.test(q.id) || q.id !== `klaerung-${r.regionId}` || ids.has(q.id)
          || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.recipient) || !url(q.recipientSource) || !url(q.website) || !nonempty(q.question)) throw new Error(`Enquiry needs verified contact and question: ${r.regionId}`);
        ids.add(q.id);
      }
    } else if (r.nextAction || r.enquiry) throw new Error(`Resolved review cannot queue an enquiry: ${r.regionId}`);
  }
  return input as MunicipalReview[];
}

/** The denominator is municipalities with known sources or an explicit review, not all Germany. */
export function municipalReviewQueue(rows: ReviewSource[], reviews: MunicipalReview[], receipts: InquiryReceipt[], now: string) {
  const byRegion = new Map<string, ReviewSource[]>();
  for (const row of rows) byRegion.set(row.region_id, [...(byRegion.get(row.region_id) ?? []), row]);
  for (const review of reviews) if (!byRegion.has(review.regionId)) byRegion.set(review.regionId, []);
  const municipalities = [...byRegion].map(([regionId, sources]) => {
    const review = reviews.find(r => r.regionId === regionId);
    const base = { regionId, name: review?.name ?? null, sourceCount: sources.length, scope: review?.scope ?? null };
    if (!review) return { ...base, status: "ungeprueft", done: false, nextAction: "Kommune vollständig manuell prüfen", dueAt: now, overdue: false };
    const latestReply = receipts.filter(r => r.program_id === `klaerung-${regionId}` && r.antwort_am)
      .some(r => !date(r.antwort_am) || Date.parse(r.antwort_am!) > Date.parse(review.checkedAt));
    if (latestReply) return { ...base, status: "antwort-pruefen", done: false, nextAction: "Neue Behördenantwort im Original prüfen und Ergebnis dokumentieren", dueAt: now, overdue: true };
    const missing = sources.filter(s => !review.sources.some(r => r.url === s.url));
    const changed = sources.some(s => s.seite_geaendert_am && (!date(s.seite_geaendert_am) || Date.parse(s.seite_geaendert_am) > Date.parse(review.checkedAt)));
    if (review.outcome !== "klaerung" && (missing.length || changed || Date.parse(now) >= Date.parse(review.recheckAt) || Date.parse(review.checkedAt) > Date.parse(now))) {
      return { ...base, status: "erneut-pruefen", done: false, nextAction: "Neue/geänderte Quellen oder fällige Kommune manuell prüfen", dueAt: now, overdue: true };
    }
    if (review.outcome !== "klaerung") return { ...base, status: review.outcome, done: true, nextAction: "Regelmäßige Wiederprüfung", dueAt: review.recheckAt, overdue: false };
    const action = review.nextAction!;
    const receipt = receipts.find(r => r.program_id === review.enquiry?.id);
    let status = "handpruefung-faellig";
    let dueAt = action.dueAt;
    if (!receipt && Date.parse(now) >= Date.parse(review.recheckAt)) return { ...base, status, done: false, nextAction: "Abgelaufene Handprüfung vor einer Rückfrage erneuern", dueAt: review.recheckAt, overdue: true };
    if (action.kind === "enquiry") {
      status = !receipt ? "rueckfrage-vorgemerkt" : !receipt.beleg ? "versand-ungewiss" : receipt.antwort_am ? "antwort-pruefen" : "rueckfrage-offen";
      if (receipt?.beleg && !receipt.antwort_am && date(receipt.gesendet_am)) dueAt = new Date(Date.parse(receipt.gesendet_am) + 14 * 86400000).toISOString();
    }
    return { ...base, status, done: false, nextAction: action.detail, dueAt, overdue: Date.parse(now) >= Date.parse(dueAt) };
  }).sort((a,b) => Number(b.overdue) - Number(a.overdue) || a.regionId.localeCompare(b.regionId));
  const counts: Record<string, number> = {};
  for (const m of municipalities) counts[m.status] = (counts[m.status] ?? 0) + 1;
  return { scope: "Kommunen mit erfassten Quellen oder dokumentierter Handprüfung; keine bundesweite Vollabdeckung", totalMunicipalities: municipalities.length, completedMunicipalities: municipalities.filter(m => m.done).length, counts, municipalities };
}
