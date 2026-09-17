import { describe, expect, it } from "vitest";
import { FUNDING_PROGRAMS, bedingungenFuer, fundingAmount, fundingForAgs, type FundingAnlage } from "../funding-programs";

const id = "bad-marienberg-erneuerbare-energien";
const programme = FUNDING_PROGRAMS[id];

describe("Bad Marienberg: exhausted 2026 round", () => {
  it("covers the 18 verified member municipalities without widening to the county", () => {
    expect(programme.agsCodes).toHaveLength(18);
    for (const ags of ["07143206", "07143231", "07143300"]) {
      expect(fundingForAgs(ags).map(p => p.id)).toContain(id);
    }
    // Same county and a similar name, but NOT a member: Hahn am See.
    expect(fundingForAgs("07143232").map(p => p.id)).not.toContain(id);
    expect(fundingForAgs("07143").map(p => p.id)).not.toContain(id);
  });

  it("does not deduct exhausted or ambiguously specified funding", () => {
    expect(programme.status).toBe("ausgeschoepft");
    expect(programme.speicherPerKwh).toBeUndefined();
    expect(programme.wpPauschale).toBeUndefined();
    expect(programme.balkonPauschale).toBeUndefined();
    const systems: FundingAnlage[] = [
      { technik: "pv", kwp: 10, speicherKwh: 10, kosten: 20000 },
      { technik: "balkon", wattPeak: 1600, kosten: 1000 },
      { technik: "waermepumpe", kosten: 28000 },
    ];
    for (const system of systems) {
      expect(fundingAmount(programme, system).total).toBe(0);
      // Even accidental reactivation must not turn the ambiguous unit into money.
      expect(fundingAmount({ ...programme, status: "aktiv", lastVerified: "2026-09-17" }, system, "2026-09-17").total).toBe(0);
    }
  });

  it("keeps the storage combination ban separate from heating requirements", () => {
    const heat = bedingungenFuer(programme.conditions, "waermepumpe").join(" ");
    const storage = bedingungenFuer(programme.conditions, "pv").join(" ");
    expect(heat).toContain("Heizungsanlage mindestens zwei Jahre");
    expect(heat).not.toContain("nicht mit anderen Förderprogrammen");
    expect(storage).toContain("nicht mit anderen Förderprogrammen");
    expect(storage).not.toContain("Heizungsanlage mindestens zwei Jahre");
  });
});

describe("Herzberg official combination and commencement restrictions", () => {
  it("removes unsupported federal combination while retaining the approved early-start exception", () => {
    const herzberg = FUNDING_PROGRAMS["herzberg-balkonkraftwerke"];
    expect(herzberg.combinableWith).toEqual([]);
    expect(herzberg.balkonPauschale).toBe(100);
    expect(herzberg.status).toBe("aktiv");
    const text = bedingungenFuer(herzberg.conditions).join(" ");
    expect(text).toContain("genehmigtem vorzeitigem Maßnahmenbeginn");
    expect(text).toContain("durch andere Fördermittel");
    expect(text).not.toMatch(/Nullsteuer.*(verboten|ausgeschlossen)/);
  });
});
