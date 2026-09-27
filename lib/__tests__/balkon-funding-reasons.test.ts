import { heuteInBerlin } from "../zeit";
import { describe, expect, it } from "vitest";
import { balkonFunding } from "../balkon-funding";
import { FUNDING_PROGRAMS } from "../funding-programs";

const program = { ...FUNDING_PROGRAMS["landkreis-oldenburg-steckersolar"], lastVerified: heuteInBerlin(), pageSeenAt: new Date().toISOString() };
const hardware = { moduleWp: 2000, speicherKwh: 0 };
describe("balcony funding absence reasons", () => {
  it("explains why an otherwise eligible set without storage gets no grant", () => {
    const result = balkonFunding(hardware, 1000, { programs: [program], enabled: true });
    expect(result.label).toBe("Keine Förderung");
    expect(result.reasons.join()).toContain("Dieses Set hat keinen Speicher");
    expect(result.grant).toBe(0);
  });
  it("distinguishes an unchecked location from a checked location without programs", () => {
    expect(balkonFunding(hardware, 1000).label).toBe("Standort prüfen");
    expect(balkonFunding(hardware, 1000, { programs: [], enabled: true, locationKnown: true }).label).toBe("Keine Förderung");
  });
  it("explains an explicitly disabled grant", () => {
    expect(balkonFunding(hardware, 1000, { programs: [program], enabled: false }).reasons.join()).toContain("ausgeschaltet");
  });
  it("distinguishes missing housing information from ineligible housing", () => {
    const programs = [{ ...program, nurWohnform: "mieter" as const }];
    const withStorage = { ...hardware, speicherKwh: 4 };
    expect(balkonFunding(withStorage, 1000, { programs, enabled: true }).label).toBe("Angaben fehlen");
    expect(balkonFunding(withStorage, 1000, { programs, enabled: true, wohnform: "eigentuemer" }).reasons.join()).toContain("nur für Mieterinnen und Mieter");
  });
  it("does not claim ineligibility when a rule cannot be calculated", () => {
    const programs = [{ ...program, balkonPercentOfCost: undefined }];
    expect(balkonFunding({ ...hardware, speicherKwh: 4 }, 1000, { programs, enabled: true }).label).toBe("Förderung offen");
  });
  it("does not use expired evidence to claim hardware ineligibility", () => {
    const programs = [{ ...program, lastVerified: "2020-01-01", pageSeenAt: "2020-01-01" }];
    expect(balkonFunding(hardware, 1000, { programs, enabled: true }).reasons.join()).toContain("aktuelle Bestätigung fehlt");
  });
});
