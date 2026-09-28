/**
 * The ranking table's cells from the precomputed package (lib/ranking-package.ts)
 * must be EXACTLY what the database path returns — same cells, same order, same
 * numbers — and the page must fall back to the database whenever the package
 * cannot answer. Both paths are computed here on the same fixture data.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { brotliCompressSync } from "node:zlib";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: <T,>(fn: T) => fn }));
const db = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("../supabase-server", () => ({ supabase: db }));
const meta = vi.hoisted(() => ({ stand: "2026-09-05" as string | null }));
vi.mock("../mastr-data", async (importOriginal) => ({ ...(await importOriginal<object>()), getMastrDataAsOf: async () => meta.stand }));
const objects = vi.hoisted(() => new Map<string, Buffer>());
vi.stubGlobal("fetch", vi.fn(async (url: string) => {
  const hit = objects.get(url.split("/gemeinde-pakete/")[1]);
  return hit ? new Response(new Uint8Array(hit)) : new Response("not found", { status: 404 });
}));
process.env.SUPABASE_URL = "https://x.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "k";

import { foldSiblings, getRankingData, loadRankingCells, type AtlasChild, type AtlasRegion, type ChildYearRow } from "../atlas";
import { decodeRankingCells, encodeRankingCells } from "../ranking-package";
import { getRankingDataForPage } from "../atlas-ranking-server";
import { packeRankingZellen } from "../ranking-zellen";
import { districtSolarCells } from "../district-monitor";
import { buildRegionPackage } from "../region-package";
import { buildDistrictPackage, DISTRICT_PACKAGE_VERSION, DISTRICT_POINTER_PATH, type DistrictManifest } from "../district-package";
import { GEMEINDE_PAKET_VERSION } from "../gemeinde-paket";

const STAND = "2026-09-05";
const SEGMENTS = ["batterie_gewerbe", "batterie_privat", "gewerbe_dach", "privat_dach", "pumpspeicher", "freiflaeche"];

/** Rows as PostgREST returns them: numerics as strings, some with long decimals. */
function dbRows(ids: string[]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  let k = 0;
  for (const id of ids)
    for (const segment of SEGMENTS)
      for (let year = 1970; year <= 2026; year++) {
        k++;
        rows.push({ region_id: id, segment, year: String(year), count: String((k * 7) % 13), kwp: String(((k * 1.37) % 97).toFixed(k % 5)), kwh: (k % 3 ? "0" : String((k * 0.731) % 11)) });
      }
  return rows;
}

let rows: Record<string, unknown>[] = [];
let regionRows: Record<string, unknown>[] = [];
function mockDb() {
  db.rpc.mockImplementation((_fn: string, _args: unknown, o?: { count?: string }) => {
    const b = {
      order: vi.fn(() => b),
      range: vi.fn(async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null, count: o?.count ? rows.length : null })),
    };
    return b;
  });
  db.from.mockImplementation(() => {
    const q = { select: vi.fn(() => q), eq: vi.fn(() => q), then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: regionRows, error: null }).then(ok) };
    return q;
  });
}

const child = (region_id: string, parent: string, bezeichnung: string | null = null) =>
  ({ region_id, parent_region_id: parent, bezeichnung, name: region_id, slug: region_id, level: parent.length === 2 ? "landkreis" : "gemeinde", population: 1000 }) as unknown as AtlasChild;

function publish(kind: "district" | "region", regionId: string, pkg: object) {
  const path = `kreise/v${DISTRICT_PACKAGE_VERSION}/g1/${kind === "region" ? "region-" : ""}${regionId}.json.br`;
  objects.set(path, brotliCompressSync(Buffer.from(JSON.stringify(pkg))));
  const entry = { path, fingerprint: "f", members: 1, editions: [], missing: 0, bytes: 1 };
  const m: DistrictManifest = { version: DISTRICT_PACKAGE_VERSION, townPackageVersion: GEMEINDE_PAKET_VERSION, generation: "g1", publishedAt: "", previousGeneration: null, districts: kind === "district" ? { [regionId]: entry } : {}, regions: kind === "region" ? { [regionId]: entry } : {} };
  objects.set(DISTRICT_POINTER_PATH, Buffer.from(JSON.stringify(m)));
}

// Bundesland 15 with three Kreise; the snapshot is built exactly as the package run does.
const land = { region_id: "15", level: "bundesland", parent_region_id: "de", name: "Sachsen-Anhalt" } as AtlasRegion;
const landKids = ["15001", "15002", "15003"].map((id) => child(id, "15"));
const landPkg = (ranking?: object, parts = landKids.map((c) => c.region_id)) => ({
  ...buildRegionPackage({ regionId: "15", name: "Sachsen-Anhalt", level: "bundesland", parts: parts.map((id) => ({ id, kind: "district" as const })), excluded: [] }, parts.map(() => null), "fp", "now"),
  ...(ranking ? { ranking } : {}),
});

beforeEach(async () => {
  // Load the mock once before two reads import it concurrently (a vitest quirk).
  await import("../supabase-server");
  vi.clearAllMocks();
  objects.clear();
  meta.stand = STAND;
  rows = dbRows(["15001", "15002", "15003"]);
  regionRows = landKids.map((c) => ({ region_id: c.region_id, name: c.name, slug: c.slug, population: c.population }));
  mockDb();
});

describe("ranking cells: package path equals database path", () => {
  it("the same cells in the same order with the same numbers, and no cell query", async () => {
    expect(rows.length).toBeGreaterThan(1000); // paged on the database path
    const fromDb = await getRankingData(land);
    // The package run: page reader → snapshot → JSON (the object's bytes) → page.
    publish("region", "15", landPkg(JSON.parse(JSON.stringify(encodeRankingCells(await loadRankingCells(land), STAND)))));
    db.rpc.mockClear();
    const fromPkg = await getRankingDataForPage(land, Promise.resolve(landKids));
    expect(db.rpc).not.toHaveBeenCalled();
    expect(fromPkg).toEqual(fromDb);
    expect(Object.is(fromPkg.cells[5].kwp, fromDb.cells[5].kwp)).toBe(true);
    // Everything the page computes from them is therefore identical, too.
    expect(packeRankingZellen(fromPkg.cells, fromPkg.regions)).toEqual(packeRankingZellen(fromDb.cells, fromDb.regions));
    expect(foldSiblings(fromPkg.regions, fromPkg.cells)).toEqual(foldSiblings(fromDb.regions, fromDb.cells));
    expect(districtSolarCells(fromPkg.cells)).toEqual(districtSolarCells(fromDb.cells));
  });

  it("round-trips every field, including battery kWp and non-battery kWh", () => {
    const cells: ChildYearRow[] = [
      { region_id: "b", segment: "privat_dach", year: 2020, count: 3, kwp: 0.1 + 0.2, kwh: 1.5 },
      { region_id: "a", segment: "batterie_privat", year: 2019, count: 1, kwp: 4.25, kwh: 9.8 },
      { region_id: "b", segment: "pumpspeicher", year: 2001, count: 1, kwp: 1e6, kwh: 8e6 },
    ];
    expect(decodeRankingCells(JSON.parse(JSON.stringify(encodeRankingCells(cells, STAND))), STAND)).toEqual(cells);
  });
});

describe("ranking cells: the page falls back to the database", () => {
  async function expectDbPath(kids = landKids) {
    const fromDb = await getRankingData(land);
    db.rpc.mockClear();
    const got = await getRankingDataForPage(land, Promise.resolve(kids));
    expect(db.rpc).toHaveBeenCalled();
    expect(got).toEqual(fromDb);
  }
  const snapshot = async () => encodeRankingCells(await loadRankingCells(land), STAND);

  it("without a published package", async () => {
    await expectDbPath();
  });
  it("for a package built before the field existed", async () => {
    publish("region", "15", landPkg());
    await expectDbPath();
  });
  it("for cells of another register import", async () => {
    publish("region", "15", landPkg(await snapshot()));
    meta.stand = "2026-10-05";
    await expectDbPath();
    meta.stand = null;
    await expectDbPath();
  });
  it("for a package of another child list", async () => {
    publish("region", "15", landPkg(await snapshot(), ["15001", "15002"]));
    await expectDbPath();
  });
  it("for a malformed snapshot", async () => {
    const z = await snapshot();
    publish("region", "15", landPkg({ ...z, r: z.r.slice(1) }));
    await expectDbPath();
    publish("region", "15", landPkg({ ...z, ids: z.ids.slice(1) }));
    await expectDbPath();
  });
});

describe("ranking cells: district pages", () => {
  const kreis = { region_id: "15001", level: "landkreis", parent_region_id: "15", name: "A" } as AtlasRegion;
  // The unincorporated area is a child of the page but no district member.
  const kids = [child("15001001", "15001"), child("15001002", "15001"), child("15001999", "15001", "Gemeindefreies Gebiet")];
  beforeEach(() => {
    rows = dbRows(kids.map((c) => c.region_id));
    regionRows = kids.map((c) => ({ region_id: c.region_id, name: c.name, slug: c.slug, population: c.population }));
  });

  it("checks the package against the member towns, like the monitor, and keeps the area's cells", async () => {
    const fromDb = await getRankingData(kreis);
    const pkg = buildDistrictPackage({ regionId: "15001", name: "A", members: ["15001001", "15001002"] }, [null, null], "fp", "now");
    pkg.ranking = encodeRankingCells(await loadRankingCells(kreis), STAND);
    publish("district", "15001", pkg);
    db.rpc.mockClear();
    const got = await getRankingDataForPage(kreis, Promise.resolve(kids));
    expect(db.rpc).not.toHaveBeenCalled();
    expect(got).toEqual(fromDb);
    expect(got.cells.some((c) => c.region_id === "15001999")).toBe(true);
  });
});
