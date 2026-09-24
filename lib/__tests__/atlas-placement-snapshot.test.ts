import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { computePlacements } from "../award-hook";
import type { GemeindeStats } from "../awards";

const db = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("../supabase-server", () => ({ supabase: db }));
import { placementRows, writePlacementSnapshot } from "../atlas-placement-snapshot";
import { platzierungenFuer, loadAwardStats, baueAuszeichnungen } from "../awards-server";

const generation = "00000000-0000-4000-8000-000000000001";
function municipality(regionId: string, population = 2000): GemeindeStats {
  return { regionId, population, name: regionId, bezeichnung: "Gemeinde", slug: regionId,
    privatDachKwp: 1200, privatDachCount: 200, gewerbeDachKwp: 0, freiflaecheKwp: 0,
    balkonCount: 100, batteriePrivatKwh: 300, batteriePrivatCount: 50,
    windKwp: 0, biomasseKwp: 0, wasserKwp: 0, solarZubauKwp: 100,
  } as GemeindeStats;
}

beforeEach(() => { vi.resetAllMocks(); });

describe("precomputed municipality placements", () => {
  it("reads only the requested row without loading or calculating Germany", async () => {
    const placements = computePlacements([municipality("09679147"), municipality("09679148")]).get("09679147")!;
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { platzierungen: placements }, error: null }) };
    db.from.mockImplementation((table) => {
      if (table !== "atlas_platzierungen") throw new Error(`Forbidden request-time full load: ${table}`);
      return query;
    });
    expect(await platzierungenFuer("09679147")).toEqual(placements);
    expect(db.from).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenCalledWith("region_id", "09679147");
  });

  it("does not start a full calculation when a row is missing or the database fails", async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    db.from.mockReturnValue(query);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await platzierungenFuer("missing")).toEqual([]);
    query.maybeSingle.mockResolvedValue({ data: null, error: { message: "unavailable" } } as never);
    expect(await platzierungenFuer("missing")).toEqual([]);
    expect(log).toHaveBeenCalledTimes(2);
    expect(db.from.mock.calls.every(([table]) => table === "atlas_platzierungen")).toBe(true);
    log.mockRestore();
  });

  it("preserves all ranking fields, ties, class boundaries and empty municipalities", () => {
    const stats = [municipality("09679147"), municipality("09679148"),
      municipality("09679149", 5000), municipality("09162000", 1500000), municipality("01001000", 0)];
    const expected = computePlacements(stats);
    const rows = JSON.parse(JSON.stringify(placementRows(stats, expected)));
    for (const row of rows) expect(row.platzierungen).toEqual(expected.get(row.region_id) ?? []);
    expect(rows.find((r: { region_id: string }) => r.region_id === "01001000").platzierungen).toEqual([]);
    const a = expected.get("09679147")!;
    const b = expected.get("09679148")!;
    expect(a.length).toBeGreaterThan(0);
    expect(a.map((p) => p.rank)).toEqual(b.map((p) => p.rank));
    expect(() => placementRows([], new Map())).toThrow(/empty/);
    expect(() => placementRows([stats[0], stats[0]], expected)).toThrow(/Duplicate/);
  });

  it("publishes only after every batch was written", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    db.from.mockReturnValue({ insert });
    db.rpc.mockResolvedValue({ error: null });
    const stats = Array.from({ length: 201 }, (_, i) => municipality(String(9600000 + i)));
    await writePlacementSnapshot(generation, stats);
    expect(insert.mock.calls.map(([rows]) => rows.length)).toEqual([100, 100, 1]);
    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(db.rpc.mock.invocationCallOrder[0]).toBeGreaterThan(insert.mock.invocationCallOrder[2]);
    expect(db.rpc.mock.calls[0][1].sql).toContain('201');
  });

  it("never activates incomplete data after a failed batch", async () => {
    const insert = vi.fn().mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: "failed" } });
    db.from.mockReturnValue({ insert });
    const stats = Array.from({ length: 201 }, (_, i) => municipality(String(9600000 + i)));
    await expect(writePlacementSnapshot(generation, stats)).rejects.toThrow(/failed/);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("refreshes from new source data even when the process memo contains the previous month", async () => {
    let power = 1200;
    const published: unknown[] = [];
    db.rpc.mockResolvedValue({ error: null });
    db.from.mockImplementation((table) => {
      if (table === "mastr_gemeinde_award" || table === "mastr_regions") {
        const query = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(),
          then: (resolve: (result: unknown) => unknown) => Promise.resolve(resolve({ error: null, data:
            table === "mastr_regions" ? [{ region_id: "09679147", name: "Test", bezeichnung: "Gemeinde" }] :
            [{ region_id: "09679147", population: 2000, privat_dach_kwp: power, privat_dach_count: 200,
              gewerbe_dach_kwp: 0, freiflaeche_kwp: 0, balkon_count: 100, batterie_privat_kwh: 300,
              batterie_privat_count: 50, wind_kwp: 0, biomasse_kwp: 0, wasser_kwp: 0, solar_zubau_kwp: 100 }] })) };
        return query;
      }
      return { insert: vi.fn().mockImplementation((rows) => {
        if (table === "atlas_platzierung_zeilen") published.push(rows);
        return Promise.resolve({ error: null });
      }), upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: () => ({ lt: vi.fn().mockResolvedValue({ error: null }) }) };
    });
    const cached = await loadAwardStats();
    expect(cached[0].privatDachKwp).toBe(1200);
    power = 2400;
    await baueAuszeichnungen();
    const expected = computePlacements([{ ...cached[0], privatDachKwp: 2400 }]);
    expect((published[0] as { platzierungen: unknown }[])[0].platzierungen).toEqual(expected.get("09679147"));
    expect((published[0] as { platzierungen: unknown }[])[0].platzierungen).not.toEqual(computePlacements(cached).get("09679147"));
  });

  it("loads fresh data in the refresh and completes it before invalidating pages", () => {
    const source = readFileSync("lib/awards-server.ts", "utf8");
    const refresh = source.slice(source.indexOf("export async function baueAuszeichnungen"), source.indexOf("export async function hatAuszeichnung"));
    expect(refresh).toContain("await loadAwardStatsFresh()");
    expect(refresh.indexOf("preparePlacementSnapshot()")).toBeLessThan(refresh.indexOf("loadAwardStatsFresh()"));
    expect(refresh).toContain("await writePlacementSnapshot(generation, stats, placements)");
    const route = readFileSync("app/api/atlas/revalidate/route.ts", "utf8");
    const post = route.slice(route.indexOf("export async function POST"));
    expect(post.indexOf("await baueAuszeichnungen()")).toBeLessThan(post.indexOf("revalidateTag(ATLAS_DATEN_TAG)"));
  });
});
