import { describe, it, expect } from "vitest";
import { ATLAS_CITIES } from "../atlas-cities";
import { FUNDING_PROGRAMS, allFundingPrograms, getFundingProgram } from "../funding-programs";

// Integrity checks for the regional funding dataset. These are cheap insurance:
// as cities/programs are added by hand, a typo in a fundingId or combinableWith
// ref would silently break a page or a cross-link. Fail loudly at test time.

describe("funding-programs dataset", () => {
  it("each program's id matches its map key", () => {
    for (const [key, p] of Object.entries(FUNDING_PROGRAMS)) {
      expect(p.id).toBe(key);
    }
  });

  it("every combinableWith reference resolves to a real program", () => {
    for (const p of allFundingPrograms()) {
      for (const ref of p.combinableWith) {
        expect(getFundingProgram(ref), `${p.id} → combinableWith "${ref}"`).toBeDefined();
      }
    }
  });

  it("no program references itself as combinable", () => {
    for (const p of allFundingPrograms()) {
      expect(p.combinableWith).not.toContain(p.id);
    }
  });

  it("structured rates are coherent (percent in 0..1, positive €/kWp & €/kWh)", () => {
    for (const p of allFundingPrograms()) {
      if (p.percentOfCost !== undefined) {
        expect(p.percentOfCost).toBeGreaterThan(0);
        expect(p.percentOfCost).toBeLessThanOrEqual(1);
      }
      if (p.pvPerKwp !== undefined) expect(p.pvPerKwp).toBeGreaterThan(0);
      if (p.speicherPerKwh !== undefined) expect(p.speicherPerKwh).toBeGreaterThan(0);
      if (p.pvCap !== undefined) expect(p.pvCap).toBeGreaterThan(0);
      if (p.speicherCap !== undefined) expect(p.speicherCap).toBeGreaterThan(0);
    }
  });

  it("every program has a non-empty name, source url and at least one rate", () => {
    for (const p of allFundingPrograms()) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.url).toMatch(/^https?:\/\//);
      expect(p.rates.length).toBeGreaterThan(0);
    }
  });
});

describe("atlas-cities registry", () => {
  it("every city fundingId resolves to a real program", () => {
    for (const c of ATLAS_CITIES) {
      if (c.fundingId) {
        expect(getFundingProgram(c.fundingId), `${c.slug} → fundingId "${c.fundingId}"`).toBeDefined();
      }
    }
  });

  it("city slugs are unique and url-safe", () => {
    const slugs = ATLAS_CITIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it("MaStR region ids (AGS) are unique 5-digit codes", () => {
    const ags = ATLAS_CITIES.map((c) => c.ags);
    expect(new Set(ags).size).toBe(ags.length);
    for (const a of ags) expect(a).toMatch(/^\d{5}$/);
  });

  it("yields are in a plausible German range (900–1200 kWh/kWp)", () => {
    for (const c of ATLAS_CITIES) {
      expect(c.yieldKwhKwp).toBeGreaterThanOrEqual(900);
      expect(c.yieldKwhKwp).toBeLessThanOrEqual(1200);
    }
  });
});
