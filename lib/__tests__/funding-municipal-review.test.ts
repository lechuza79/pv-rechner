import type { ReviewSource } from "../funding-source-review";
import { describe, it, expect } from "vitest";
import { municipalReviewQueue, validateMunicipalReviews, type MunicipalReview } from "../funding-municipal-review";
import { renderMunicipalInquiry } from "../funding-inquiry-draft";
import { istAntwortAufSachfrage } from "../outreach-sachfrage";
import { ordneAnfrageZu, faelligeAnfragen } from "../funding-anfragen";
import { fehlendePflichtangaben } from "../outreach-mail";
import reviews from "../../data/funding/municipal-reviews.json";
const now = "2026-09-17T10:00:00Z";
const source: ReviewSource = { region_id: "01001000", url: "town.de/solar", gelesen_am: null, gelesen_ergebnis: null, gelesen_notiz: null, seite_geaendert_am: null };
const review: MunicipalReview = { regionId: source.region_id, name: "Town", checkedAt: "2026-09-16T10:00:00Z", recheckAt: "2026-12-01T10:00:00Z", scope: "PV, Speicher, Balkon, WP für private Haushalte", outcome: "keine-passende-foerderung", conclusion: "Searched and reviewed, no applicable grant found", searches: ["official funding search"], evidence: [{ url: "https://town.de/solar", finding: "Reviewed original" }], sources: [{ url: source.url, disposition: "reviewed", reason: "No private household grant", evidenceUrl: "https://town.de/solar" }] };
const state = (r = review, rows = [source], receipts: Parameters<typeof municipalReviewQueue>[2] = []) => municipalReviewQueue(rows, [r], receipts, now).municipalities[0];
describe("Municipal completion and follow-through", () => {
  it("counts an evidenced negative finding as done, not an unread town", () => {
    expect(state().done).toBe(true);
    expect(municipalReviewQueue([source], [], [], now).completedMunicipalities).toBe(0);
    expect(() => validateMunicipalReviews([{...review, evidence: []}])).toThrow();
    expect(() => validateMunicipalReviews([{...review, sources: [{...review.sources[0], disposition: "open"}]}])).toThrow();
  });
  it("reopens completed towns for unread extra sources, changes and expiration", () => {
    expect(state(review, [source, {...source, url: "town.de/new"}]).done).toBe(false);
    expect(state(review, [{...source, seite_geaendert_am: "2026-09-17T09:00:00Z"}]).done).toBe(false);
    expect(state({...review, recheckAt: "2026-09-17T09:00:00Z"}).done).toBe(false);
  });
  it("reopens a negative finding for a later authority reply", () => {
    expect(state(review, [source], [{program_id:"klaerung-01001000",gesendet_am:review.checkedAt,beleg:"receipt",antwort_am:now}]).status).toBe("antwort-pruefen");
  });
  it("rejects passive uncertainty and invalid contact plans", () => {
    expect(() => validateMunicipalReviews([{...review, outcome: "klaerung"}])).toThrow();
    expect(() => validateMunicipalReviews([{...review, outcome: "klaerung", nextAction: {kind: "enquiry", dueAt: now, detail: "ask"}}])).toThrow();
  });
  it("distinguishes queued, uncertain delivery, awaiting reply and unreviewed reply", () => {
    const r = validateMunicipalReviews(reviews)[0];
    const row = { program_id: r.enquiry!.id, gesendet_am: "2026-09-16T10:00:00Z", beleg: null, antwort_am: null };
    expect(state(r, [], []).status).toBe("rueckfrage-vorgemerkt");
    expect(state(r, [], [row]).status).toBe("versand-ungewiss");
    expect(state(r, [], [{...row, beleg: "receipt"}]).status).toBe("rueckfrage-offen");
    expect(state(r, [], [{...row, beleg: "receipt", antwort_am: now}]).status).toBe("antwort-pruefen");
    expect(state(r, [], [{...row, beleg: "receipt", antwort_am: now}]).done).toBe(false);
  });
  it("keeps inquiry replies out of outreach metrics and matches the existing ledger", () => {
    const draft = renderMunicipalInquiry("Town", "Is there a municipal grant?", ["https://town.de/solar"], "https://town.de/contact");
    expect(fehlendePflichtangaben(draft.body)).toEqual([]);
    const mail = {von: "climate@town.de", betreff: `Re: ${draft.subject}`, roh: "", text: "We have no such grant."};
    expect(istAntwortAufSachfrage(mail as Parameters<typeof istAntwortAufSachfrage>[0])).toBe(true);
    expect(ordneAnfrageZu(mail, [{programId:"klaerung-01001000",empfaenger:"climate@town.de",gesendetAm:now,antwortAm:null,antwortArt:null}], new Map([["klaerung-01001000",draft.subject]]))).toBe("klaerung-01001000");
  });
  it("preserves no-repeat, outreach spacing and shared volume limits for clarification IDs", () => {
    const candidates = Array.from({length:5},(_,i)=>({programId:`klaerung-${i}`,eskaliert:true,empfaenger:"climate@town.de",tageSeitBrief:null as number|null}));
    expect(faelligeAnfragen(candidates,new Set()).senden).toHaveLength(3);
    expect(faelligeAnfragen([candidates[0]],new Set([candidates[0].programId])).senden).toEqual([]);
    expect(faelligeAnfragen([{...candidates[0],tageSeitBrief:2}],new Set()).senden).toEqual([]);
  });
});
