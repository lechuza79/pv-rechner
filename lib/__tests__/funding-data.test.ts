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
    // Flensburg (01001000, Schleswig-Holstein) has no own program → only bund
    const flensburg = fundingForAgs("01001000");
    expect(flensburg.every((p) => p.level === "bund")).toBe(true);
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

  // Regression: official-source verification (Juni 2026) found Würzburg DOES
  // fund standard roof PV (150 €/kWp, max 1.500 €) — earlier data wrongly
  // treated it as non-computable.
  it("Würzburg funds standard roof PV (150 €/kWp, cap 1.500)", () => {
    const p = getFundingProgram("wuerzburg-klimastadt")!;
    expect(p.status).toBe("aktiv");
    expect(fundingAmount(p, 8, 0, 16000).total).toBe(8 * 150);
    expect(fundingAmount(p, 20, 0, 40000).total).toBe(1500); // cap
  });

  // Regression: Bad Homburg amounts are correct but the program is not reliably
  // accepting applications → status "unsicher" must NOT be auto-deducted.
  it("Bad Homburg (status unsicher) is not auto-applied", () => {
    const p = getFundingProgram("badhomburg-energiespar")!;
    expect(p.status).toBe("unsicher");
    const a = fundingAmount(p, 10, 5, 20000);
    expect(a.computable).toBe(true);
    expect(a.active).toBe(false); // computable, but not active → no deduction
    expect(stackFunding(fundingForAgs("06434003"), 10, 5, 20000).total).toBe(0);
  });
});

// Batch Juni 2026, Teil 2 — verified against official sources.
describe("funding batch 2 (Juni 2026)", () => {
  it("Potsdam funds roof PV (200 €/kWp, cap 1.200) and a flat storage grant", () => {
    const p = getFundingProgram("potsdam-klimaschutz")!;
    expect(p.status).toBe("aktiv");
    expect(fundingAmount(p, 5, 0, 12000).total).toBe(5 * 200);
    expect(fundingAmount(p, 10, 0, 20000).total).toBe(1200);
    expect(fundingAmount(p, 10, 8, 25000).total).toBe(1200 + 1000);
    expect(fundingAmount(p, 10, 3, 25000).total).toBe(1200);
    expect(stackFunding(fundingForAgs("12054000"), 10, 8, 25000).total).toBe(2200);
  });
  it("Hannover proKlima caps the PV grant at 2.000 €", () => {
    const p = getFundingProgram("hannover-proklima")!;
    expect(p.status).toBe("aktiv");
    expect(fundingAmount(p, 15, 0, 25000).total).toBe(1500);
    expect(fundingAmount(p, 30, 0, 45000).total).toBe(2000);
  });
  it("Dortmund (ausgeschoepft) and Essen (pausiert) are not auto-applied", () => {
    expect(getFundingProgram("dortmund-pv")!.status).toBe("ausgeschoepft");
    expect(getFundingProgram("essen-solar")!.status).toBe("pausiert");
    expect(stackFunding(fundingForAgs("05913000"), 10, 5, 20000).total).toBe(0);
    expect(stackFunding(fundingForAgs("05113000"), 10, 5, 20000).total).toBe(0);
  });
});

// Batch Juni 2026, Teil 3 — Katalog-Vervollständigung. Einziger neuer
// aktiv+anrechenbarer Zuschuss: Schweinfurt.
describe("funding batch 3 (Katalog)", () => {
  it("Schweinfurt funds roof PV (100 €/kWp cap 1.000) + storage (100 €/kWh ab 3 kWh)", () => {
    const p = getFundingProgram("schweinfurt-pv")!;
    expect(p.status).toBe("aktiv");
    expect(fundingAmount(p, 8, 0, 16000).total).toBe(800);
    expect(fundingAmount(p, 20, 0, 40000).total).toBe(1000); // cap
    expect(fundingAmount(p, 8, 5, 18000).total).toBe(800 + 500);
    expect(stackFunding(fundingForAgs("09662000"), 10, 6, 22000).total).toBe(1000 + 600);
  });
  it("Wolfsburg (pausiert) and Bottrop (ausgeschoepft) are not auto-applied", () => {
    expect(getFundingProgram("wolfsburg-pv")!.status).toBe("pausiert");
    expect(stackFunding(fundingForAgs("03103000"), 10, 5, 20000).total).toBe(0);
    expect(stackFunding(fundingForAgs("05512000"), 10, 5, 20000).total).toBe(0); // Bottrop
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
