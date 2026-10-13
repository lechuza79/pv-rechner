import { describe, expect, it } from "vitest";
import { FUNDING_PROGRAMS } from "../funding-programs";
import { fundingPromotion } from "../funding-promotion";

const today = "2026-10-12";
const program = { ...FUNDING_PROGRAMS["heidelberg-rev"], lastVerified: today, pageSeenAt: today };

describe("funding promotion", () => {
  it("uses the largest individual ceiling without adding alternatives", () => {
    expect(fundingPromotion(program, today)?.maximum).toBe(10000);
  });
  it("follows changed programme conditions", () => {
    expect(fundingPromotion({ ...program, rates: [{ label: "Dach-PV", value: "100 €/kWp, max. 7.500 €" }] }, today)?.text).toBe("Bis zu 7.500 € Förderung");
  });
  it("removes claims without a current active programme or a ceiling", () => {
    expect(fundingPromotion(undefined, today)).toBeNull();
    expect(fundingPromotion({ ...program, status: "eingestellt" }, today)).toBeNull();
    expect(fundingPromotion({ ...program, endetIso: "2026-10-11" }, today)).toBeNull();
    expect(fundingPromotion({ ...program, lastVerified: "2020-01-01", pageSeenAt: "2020-01-01" }, today)).toBeNull();
    expect(fundingPromotion({ ...program, rates: [{ label: "PV", value: "100 €/kWp" }] }, today)).toBeNull();
  });
  it("does not advertise loans or balcony-only ceilings as PV grants", () => {
    expect(fundingPromotion({ ...program, rates: [{ label: "Kredit", value: "max. 100.000 €" }] }, today)).toBeNull();
    expect(fundingPromotion({ ...program, rates: [{ label: "Balkon", value: "max. 500 €", nur: ["balkon"] }] }, today)).toBeNull();
  });
});
