import { describe, it, expect } from "vitest";
import { ATLAS_CITIES } from "../atlas-cities";
import { FUNDING_PROGRAMS, allFundingPrograms, getFundingProgram, fundingForAgs, fundingAmount, stackFunding } from "../funding-programs";

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

  it("every non-bund program has a valid AGS prefix (2/5/8 digits)", () => {
    for (const p of allFundingPrograms()) {
      if (p.level === "bund") continue;
      expect(p.agsCode, `${p.id} needs an agsCode for geo-matching`).toBeDefined();
      expect(p.agsCode!).toMatch(/^\d{2}$|^\d{5}$|^\d{8}$/);
      // prefix length must fit the level: Land=2, Kreis=5, Kommune=8 (or 5 for kreisfreie Städte)
      if (p.level === "land") expect(p.agsCode!.length).toBe(2);
      if (p.level === "landkreis") expect(p.agsCode!.length).toBe(5);
    }
  });
});

describe("fundingForAgs geo-matching", () => {
  it("returns bund programs for any location", () => {
    const result = fundingForAgs("08111000"); // Stuttgart
    expect(result.some((p) => p.level === "bund")).toBe(true);
  });

  it("matches a kreisfreie Stadt by its 5-digit prefix", () => {
    const stuttgart = fundingForAgs("08111000");
    expect(stuttgart.map((p) => p.id)).toContain("stuttgart-solaroffensive");
  });

  it("matches Berlin (Land) for any Berlin AGS", () => {
    const berlin = fundingForAgs("11000000");
    expect(berlin.some((p) => p.bundesland === "Berlin" && p.level === "land")).toBe(true);
  });

  it("matches a kommune by its 8-digit prefix", () => {
    const badHomburg = fundingForAgs("06434003");
    expect(badHomburg.map((p) => p.id)).toContain("badhomburg-energiespar");
  });

  it("does not bleed funding across city borders", () => {
    // Munich (09162000) has no own program here → only bund-level should match
    const munich = fundingForAgs("09162000");
    expect(munich.every((p) => p.level === "bund")).toBe(true);
  });

  it("orders results broadest-first (bund → land → kreis → kommune)", () => {
    const order = { bund: 0, land: 1, landkreis: 2, kommune: 3 } as const;
    const result = fundingForAgs("08111000");
    const levels = result.map((p) => order[p.level]);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });
});

describe("fundingAmount math", () => {
  it("returns non-computable for undefined or free-text-only programs", () => {
    expect(fundingAmount(undefined, 10, 5, 20000).computable).toBe(false);
  });

  it("applies €/kWp with socket and cap", () => {
    // Düsseldorf: 1000 € Sockel + 200 €/kWp, Cap 10.000 €
    const p = getFundingProgram("duesseldorf-klimafreundlich")!;
    const r = fundingAmount(p, 10, 0, 20000);
    expect(r.computable).toBe(true);
    expect(r.total).toBe(1000 + 10 * 200); // 3000, well under cap
  });

  it("caps the PV grant at pvCap", () => {
    const p = getFundingProgram("duesseldorf-klimafreundlich")!;
    const r = fundingAmount(p, 100, 0, 200000); // huge system → cap bites
    expect(r.total).toBe(10000);
  });

  it("applies percent-of-cost programs against the gross cost", () => {
    const p = getFundingProgram("frankfurt-klimabonus")!; // 20 %
    const r = fundingAmount(p, 10, 5, 25000);
    expect(r.total).toBe(5000);
  });

  it("respects a storage minimum (no grant below speicherMin)", () => {
    const p = getFundingProgram("koeln-pv")!; // tiered, speicherMin set
    const withTiny = fundingAmount(p, 10, 1, 20000);
    const withReal = fundingAmount(p, 10, 10, 20000);
    expect(withReal.total).toBeGreaterThan(withTiny.total);
  });
});

describe("stackFunding", () => {
  it("only counts active+computable programs and caps at gross cost", () => {
    const programs = fundingForAgs("06412000"); // Frankfurt (aktiv, 20%)
    const { total, applied } = stackFunding(programs, 10, 5, 25000);
    expect(total).toBe(5000);
    expect(applied.map((a) => a.program.id)).toContain("frankfurt-klimabonus");
  });

  it("yields zero where no active computable program applies", () => {
    const programs = fundingForAgs("09162000"); // Munich → only bund (no € rule)
    expect(stackFunding(programs, 10, 5, 25000).total).toBe(0);
  });

  it("never exceeds the gross cost", () => {
    const programs = fundingForAgs("06412000");
    const { total } = stackFunding(programs, 5, 0, 1000); // tiny brutto
    expect(total).toBeLessThanOrEqual(1000);
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
