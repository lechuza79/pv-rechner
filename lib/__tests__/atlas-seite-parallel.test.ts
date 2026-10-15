/**
 * Cold render of the Atlas pages: reads start together, not one after another.
 *
 * Every deployment empties the page cache, and ~300 district and ~11,000 town
 * pages are rarely visited, so real visitors regularly hit an uncached render.
 * Measured 28.09.2026 on a cold data cache: a district page waited in five
 * rounds (slug → child list → numbers/ranking/ancestors → funding catalogue →
 * monitor package), a town page in three (one query per slug segment). None of
 * the later rounds needed an earlier result beyond the region itself.
 *
 * The regression is invisible: the page stays correct, green and HTTP 200 — it
 * only gets slower. Hence the checks below, each of which goes red when the
 * corresponding change is reverted (verified before check-in):
 *   1. the slug path resolves in ONE query, by the same parent rule;
 *   2. the ancestor chain is requested at once, not level by level;
 *   3. concurrent callers of the funding catalogue join one read;
 *   3b. the ranking cells of a Land (up to ~13 pages) are paged a few at a time;
 *   4. the page body only awaits reads the shell started (startAtlasReads);
 *   5. the district component starts its package read before its first await
 *      and awaits map outline and funding together;
 *   6. the town page starts the funding read before it waits for its package.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const db = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("../supabase-server", () => ({ supabase: db }));
vi.mock("next/cache", () => ({ unstable_cache: <T,>(fn: T) => fn }));

import { resolveSlugPath, walkSlugPath, ancestorIdsGuess, getRankingData, cellPageBatches, CELL_PAGE_PARALLEL, type AtlasRegion } from "../atlas";
import { getFundingPrograms, invalidateFundingCache } from "../funding-data";

const root = path.resolve(__dirname, "../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const region = (region_id: string, slug: string, parent_region_id: string | null, level = "gemeinde"): AtlasRegion =>
  ({ region_id, slug, parent_region_id, level, name: slug, bezeichnung: null, population: 1, area_km2: 1, population_as_of: null }) as AtlasRegion;

/** A chainable PostgREST stand-in that records every query it is asked. */
function recordingQuery(result: (filters: Record<string, unknown>) => unknown) {
  const filters: Record<string, unknown> = {};
  const q = {
    select: vi.fn(() => q),
    eq: vi.fn((k: string, v: unknown) => { filters[k] = v; return q; }),
    in: vi.fn((k: string, v: unknown) => { filters[k] = v; return q; }),
    maybeSingle: vi.fn(() => Promise.resolve(result(filters))),
    then: (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) => Promise.resolve(result(filters)).then(ok, err),
  };
  return q;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("slug path: one query, same parent rule", () => {
  const rows = [
    region("09", "bayern", "de", "bundesland"),
    region("06", "hessen", "de", "bundesland"),
    region("09575", "landkreis-x", "09", "landkreis"),
    region("06440", "landkreis-x", "06", "landkreis"),
    // Two towns of the same name below different districts.
    region("09575128", "neustadt", "09575", "gemeinde"),
    region("06440001", "neustadt", "06440", "gemeinde"),
  ];

  it("walks each segment within its parent", () => {
    expect(walkSlugPath(rows, ["bayern", "landkreis-x", "neustadt"])?.region_id).toBe("09575128");
    expect(walkSlugPath(rows, ["hessen", "landkreis-x", "neustadt"])?.region_id).toBe("06440001");
    expect(walkSlugPath(rows, ["bayern"])?.region_id).toBe("09");
    expect(walkSlugPath(rows, ["bayern", "neustadt"])).toBeNull();
    expect(walkSlugPath(rows, ["sachsen", "landkreis-x"])).toBeNull();
  });

  it("refuses an ambiguous segment instead of picking one", () => {
    expect(() => walkSlugPath([...rows, region("09575999", "neustadt", "09575")], ["bayern", "landkreis-x", "neustadt"])).toThrow(/not unique/);
  });

  it("asks the database once for a three-segment path", async () => {
    db.from.mockImplementation(() => recordingQuery((f) => ({
      data: rows.filter((r) => (f.slug as string[] | undefined)?.includes(r.slug!) ?? r.slug === f.slug)
        .filter((r) => !("parent_region_id" in f) || r.parent_region_id === f.parent_region_id),
      error: null,
    })));
    const found = await resolveSlugPath(["hessen", "landkreis-x", "neustadt"]);
    expect(found?.region_id).toBe("06440001");
    expect(db.from).toHaveBeenCalledTimes(1);
  });
});

describe("ancestor chain: requested at once", () => {
  // Driven through the database mock this cannot be observed: vitest hands
  // concurrent dynamic imports of a mocked module the real (unconfigured) one,
  // so every link but the first fails in the test runner only. Hence the pure
  // part plus the order in the source.
  it("guesses parent, Land and Deutschland from the nested key", () => {
    expect(ancestorIdsGuess({ region_id: "09575128", parent_region_id: "09575" })).toEqual(["09575", "09", "de"]);
    expect(ancestorIdsGuess({ region_id: "09575", parent_region_id: "09" })).toEqual(["09", "de"]);
    expect(ancestorIdsGuess({ region_id: "09", parent_region_id: "de" })).toEqual(["de"]);
    expect(ancestorIdsGuess({ region_id: "de", parent_region_id: null })).toEqual([]);
  });
  it("requests every guessed link before it walks the chain", () => {
    const src = read("lib/atlas.ts");
    const fn = src.slice(src.indexOf("export async function getAncestors("));
    const request = fn.indexOf("guessed.set(id, getRegionById(id))");
    expect(request).toBeGreaterThan(-1);
    expect(request).toBeLessThan(fn.indexOf("while (cursor)"));
    expect(fn.slice(fn.indexOf("while (cursor)"), fn.indexOf("return chain"))).toMatch(/guessed\.get\(cursor\)/);
  });
});

describe("ranking cells: pages a few at a time", () => {
  const cells = Array.from({ length: 3500 }, (_, i) => ({ region_id: String(10000 + Math.floor(i / 100)), segment: "privat_dach", year: 2000 + (i % 100), count: 1, kwp: 1, kwh: 0 }));

  function mockRpc(opts: { shortPage?: number } = {}) {
    let inFlight = 0;
    const seen = { maxInFlight: 0, calls: 0 };
    db.rpc.mockImplementation((_fn: string, _args: unknown, o?: { count?: string }) => {
      const b = {
        order: vi.fn(() => b),
        range: vi.fn((from: number, to: number) => {
          seen.calls += 1;
          inFlight += 1;
          seen.maxInFlight = Math.max(seen.maxInFlight, inFlight);
          let data = cells.slice(from, to + 1);
          if (opts.shortPage === from) data = data.slice(1);
          return new Promise((resolve) => setTimeout(() => { inFlight -= 1; resolve({ data, error: null, count: o?.count ? cells.length : null }); }, 5));
        }),
      };
      return b;
    });
    db.from.mockImplementation(() => recordingQuery(() => ({ data: [], error: null })));
    return seen;
  }

  it("batches the page offsets", () => {
    expect(cellPageBatches(900)).toEqual([]);
    expect(cellPageBatches(3500, 1000, 4)).toEqual([[1000, 2000, 3000]]);
    expect(cellPageBatches(13000, 1000, 4).map((b) => b.length)).toEqual([4, 4, 4]);
  });

  it("requests the pages after the first one concurrently and keeps their order", async () => {
    await import("../supabase-server");
    const seen = mockRpc();
    const { cells: got } = await getRankingData(region("09", "bayern", "de", "bundesland"));
    expect(got.length).toBe(3500);
    expect(got.map((c) => c.year)).toEqual(cells.map((c) => c.year));
    expect(seen.calls).toBe(4);
    expect(seen.maxInFlight).toBeGreaterThan(1);
    expect(seen.maxInFlight).toBeLessThanOrEqual(CELL_PAGE_PARALLEL);
  });

  it("falls back to the sequential walk when the pages do not add up", async () => {
    await import("../supabase-server");
    mockRpc({ shortPage: 2000 });
    const { cells: got } = await getRankingData(region("09", "bayern", "de", "bundesland"));
    // The walk stops at the short page, as it always did; no duplicated rows.
    expect(got.length).toBe(2999);
    expect(new Set(got.map((c) => `${c.region_id}|${c.year}`)).size).toBe(got.length);
  });
});

describe("funding catalogue: concurrent callers join one read", () => {
  it("issues one query for two simultaneous callers", async () => {
    invalidateFundingCache();
    db.from.mockImplementation(() => recordingQuery(() => ({ data: [], error: null })));
    await Promise.all([getFundingPrograms(), getFundingPrograms()]);
    expect(db.from).toHaveBeenCalledTimes(1);
  });
});

/** Text of a top-level function or component, up to the next top-level declaration. */
function body(source: string, start: string): string {
  const i = source.indexOf(start);
  expect(i, `${start} not found`).toBeGreaterThanOrEqual(0);
  const rest = source.slice(i + start.length);
  const next = rest.search(/\n(?:export |async function |function |const [A-Z_]+ ?[:=]|type )/);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("Atlas region page (Kreis, Land, Deutschland)", () => {
  const page = read("app/(site)/solar-atlas/[[...pfad]]/page.tsx");
  const DATA_READS = /\b(getRegionAtlasData|getChildren|getAncestors|getRankingData|getRankingDataForPage|getEinzelgemeinden|getRegionById|getFundingPrograms)\(/;

  it("the body reads nothing itself — everything comes from startAtlasReads", () => {
    const b = body(page, "async function AtlasBody(");
    expect(b).not.toMatch(DATA_READS);
    // One wait for all of it.
    expect(b.match(/\bawait\b/g)?.length).toBe(1);
    expect(b).toMatch(/await Promise\.all\(\[\s*reads\./);
  });

  it("the shell starts the reads before it waits for the redirect check", () => {
    const shell = body(page, "export default async function AtlasPage(");
    const start = shell.indexOf("startAtlasReads(region, uhr)");
    const kinder = shell.indexOf("reads.kinder");
    expect(start).toBeGreaterThan(-1);
    expect(kinder).toBeGreaterThan(start);
    // Routing decisions stay in front of the Suspense boundary (soft-404 rule).
    expect(shell.indexOf("permanentRedirect(")).toBeLessThan(shell.indexOf("<Suspense"));
    expect(shell.lastIndexOf("notFound()")).toBeLessThan(shell.indexOf("<Suspense"));
  });

  it("startAtlasReads awaits nothing and warms funding and the monitor package", () => {
    const s = body(page, "function startAtlasReads(");
    // Only the per-capita helper awaits inside its own async callback.
    const topLevel = s.replace(/async \(r\) => \{[\s\S]*?\n {6}\}\),/, "");
    expect(topLevel).not.toMatch(/\bawait\b/);
    expect(s).toMatch(/getFundingPrograms\(\)/);
    expect(s).toMatch(/preloadPublishedPackage\(/);
  });

  it("takes the ranking cells from the monitor package, not the database pages (lib/atlas-ranking-server.ts)", () => {
    const s = body(page, "function startAtlasReads(");
    expect(s).toMatch(/ranking: getRankingDataForPage\(region, kinder\)/);
    expect(s).not.toMatch(/getRankingData\(/);
  });
});

describe("district component (LandkreisSeite)", () => {
  const src = body(read("components/landkreis/LandkreisSeite.tsx"), "export default async function LandkreisSeite(");
  it("starts the monitor package before its first wait", () => {
    const firstAwait = src.search(/\bawait\b/);
    expect(src.indexOf("loadDistrictContent(")).toBeGreaterThan(-1);
    expect(src.indexOf("loadDistrictContent(")).toBeLessThan(firstAwait);
  });
  it("waits once, for outline and funding together", () => {
    expect(src.match(/\bawait\b/g)?.length).toBe(1);
    expect(src).toMatch(/await Promise\.all\(\[[\s\S]*?(districtGeometry|childGeometry)[\s\S]*?getFundingPrograms\(\)[\s\S]*?\]\)/);
  });
});

describe("town page", () => {
  const src = read("app/(gemeinde)/solar-atlas/[bundesland]/[kreis]/[gemeinde]/page.tsx");
  it("starts the funding read before it waits for the town package", () => {
    const b = body(src, "export default async function GemeindePage(");
    const preload = b.indexOf("getFundingPrograms()");
    expect(preload).toBeGreaterThan(-1);
    expect(preload).toBeLessThan(b.indexOf("await Promise.all("));
  });
});
