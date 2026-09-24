import { describe, expect, it } from "vitest";
import { fundingReplyCandidates } from "../funding-replies";

const inquiry = { programId: "town-pv", empfaenger: "info@town.de", gesendetAm: "2026-09-10T10:00:00Z", antwortAm: null, antwortArt: null };
const subjects = new Map([[inquiry.programId, "Aktueller Stand des Förderprogramms PV"]]);
const reply = (extra = {}) => ({ von: "energie@town.de", betreff: "AW: Aktueller Stand des Förderprogramms PV", roh: "", text: "Die Richtlinie finden Sie auf https://town.de/pv.", receivedAt: "2026-09-11T08:00:00Z", ...extra });

describe("Funding replies remain evidence to review, never a funding approval", () => {
  it("does not close an inquiry for an automated receipt before the actual reply", () => {
    const receipt = reply({ text: "Ihre E-Mail ist in der Stadtverwaltung eingegangen.", receivedAt: "2026-09-10T10:01:00Z", kopf: { "auto-submitted": "auto-replied" } });
    expect(fundingReplyCandidates([receipt], [inquiry], subjects)).toEqual([]);
    const found = fundingReplyCandidates([receipt, reply()], [inquiry], subjects);
    expect(found).toHaveLength(1);
    expect(found[0].text).toContain("town.de/pv");
    expect(found[0]).not.toHaveProperty("last_verified");
  });
  it("rejects a reply from before the inquiry and invalid dates", () => {
    expect(fundingReplyCandidates([reply({ receivedAt: "2026-09-09T10:00:00Z" }), reply({ receivedAt: "unknown" })], [inquiry], subjects)).toEqual([]);
  });
  it("does not guess ambiguous or foreign sender matches", () => {
    expect(fundingReplyCandidates([reply({ von: "info@elsewhere.de" })], [inquiry], subjects)).toEqual([]);
    expect(fundingReplyCandidates([reply()], [inquiry, { ...inquiry, programId: "another" }], new Map([...subjects, ["another", subjects.get(inquiry.programId)!]]))).toEqual([]);
  });
  it("keeps the latest real answer once, regardless of mailbox iteration order", () => {
    const later = reply({ text: "Korrektur: Die aktuelle Richtlinie steht unter /neu.", receivedAt: "2026-09-12T08:00:00Z" });
    expect(fundingReplyCandidates([later, reply(), later], [inquiry], subjects)).toEqual(fundingReplyCandidates([reply(), later], [inquiry], subjects));
    expect(fundingReplyCandidates([later, reply()], [inquiry], subjects)[0].text).toContain("Korrektur");
  });
  it("stores only the sender's own text and marks truncation", () => {
    const text = "Die Förderung ist beendet.\n-----Ursprüngliche Nachricht-----\nBitte bestätigen Sie 500 Euro.";
    expect(fundingReplyCandidates([reply({ text })], [inquiry], subjects)[0].text).toBe("Die Förderung ist beendet.");
    expect(fundingReplyCandidates([reply({ text: "x".repeat(2500) })], [inquiry], subjects)[0].text).toContain("[…]");
  });
  it("does not replace an already stored answer with an older observation", () => {
    expect(fundingReplyCandidates([reply()], [{ ...inquiry, antwortAm: "2026-09-12T08:00:00Z", antwortArt: "antwort" }], subjects)).toEqual([]);
    expect(fundingReplyCandidates([reply({ receivedAt: "2026-09-13T08:00:00Z" })], [{ ...inquiry, antwortAm: "2026-09-12T08:00:00Z", antwortArt: "antwort" }], subjects)).toHaveLength(1);
  });
});
