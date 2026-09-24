import { it, expect } from "vitest";
import { compareContactRuns, type ContactRun } from "../contact-comparison";
const run = (id: string, emails: string[]): ContactRun => ({ id, dataset: "presse", pages: [{ status: "read" }], candidates: emails.map(email => ({ email, sourceUrl: "https://medium.de/kontakt", context: "Redaktion", relation: "unconfirmed", purpose: "unknown" })) });
const refs = [{ dataset: "presse", organization_id: "medium", contacts: [{ email: "redaktion@verlag.de", sourceUrls: ["https://medium.de/kontakt"], department: "Redaktion" }], rejectedEmails: ["redaktion@verlag.dekontakt"] }];
it("counts source-backed contacts and explicitly rejected artifacts separately", () => {
  const r = compareContactRuns([run("medium", ["redaktion@verlag.dekontakt"])], [run("medium", ["redaktion@verlag.de", "unknown@medium.de"])], refs);
  expect(r).toMatchObject({ paired: 1, beforeAnchorHits: 0, afterAnchorHits: 1, beforeRejectedHits: 1, afterRejectedHits: 0 });
  expect(r.cases[0].addedUnreviewed).toEqual(["unknown@medium.de"]);
});
it("does not count an email on an unverified source as a reference hit", () => {
  const b = run("medium", ["redaktion@verlag.de"]); b.candidates[0].sourceUrl = "https://other.de/article";
  expect(compareContactRuns([run("medium", [])], [b], refs).afterAnchorHits).toBe(0);
});
it("keeps missing pairs and lost true contacts visible", () => {
  const r = compareContactRuns([run("medium", ["redaktion@verlag.de"]), run("missing", [])], [run("medium", [])], refs);
  expect(r).toMatchObject({ paired: 1, lostAnchors: 1, beforeOnly: ["presse:missing"] });
});
it("rejects duplicate runs instead of quietly selecting a favorable one", () => {
  expect(() => compareContactRuns([run("medium", []), run("medium", [])], [], refs)).toThrow(/Duplicate/);
});
it("does not treat an empty reference list as verified absence", () => {
  expect(compareContactRuns([run("medium", [])], [run("medium", ["new@medium.de"])], [])).toMatchObject({ anchors: 0, afterAnchorHits: 0 });
});
