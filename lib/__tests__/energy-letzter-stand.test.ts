import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Energy-Charts outage (05.10.2026): the data service answered 503 for hours,
 * and /strommix-deutschland showed three empty boxes because the only fallback
 * lived in the memory of a single serverless instance. These tests hold the
 * durable fallback: a failed upstream serves the last stored copy, marked
 * stale, with its own timestamps — and only a bounded set of windows is ever
 * written.
 */

const gespeichert = new Map<string, unknown>();
const fetchPublicPower = vi.fn();
const computeNuclearImport = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/server", async (orig) => {
  const mod = await orig<typeof import("next/server")>();
  // after() needs a request scope; in a unit test run the callback inline.
  return { ...mod, after: (fn: () => unknown) => void fn() };
});
vi.mock("../supabase-server", () => ({ supabase: null }));
vi.mock("../rate-limit", () => ({ rateLimit: () => null }));
vi.mock("../energy-api", async (orig) => {
  const mod = await orig<typeof import("../energy-api")>();
  return { ...mod, fetchPublicPower: (...a: unknown[]) => fetchPublicPower(...a) };
});
const fetchSmard = vi.fn();
vi.mock("../smard", () => ({ fetchSmardGeneration: (...a: unknown[]) => fetchSmard(...a) }));
vi.mock("../nuclear-import", async (orig) => {
  const mod = await orig<typeof import("../nuclear-import")>();
  return { ...mod, computeNuclearImport: (...a: unknown[]) => computeNuclearImport(...a) };
});
vi.mock("../energy-letzter-stand", async (orig) => {
  const mod = await orig<typeof import("../energy-letzter-stand")>();
  return {
    ...mod,
    ladeLetztenStand: async (scope: string, key: string) =>
      mod.darfDauerhaftSpeichern(scope as "generation", key) ? gespeichert.get(`${scope}:${key}`) ?? null : null,
    speichereLetztenStand: async (scope: string, key: string, payload: unknown) => {
      if (mod.darfDauerhaftSpeichern(scope as "generation", key)) gespeichert.set(`${scope}:${key}`, payload);
    },
  };
});

const { darfDauerhaftSpeichern } = await import("../energy-letzter-stand");
const { quellenHinweis, letzterZeitpunkt } = await import("../energy-ersatzstand");

function req(path: string) {
  return new NextRequest(new URL(path, "https://solar-check.io"));
}

beforeEach(() => {
  gespeichert.clear();
  fetchPublicPower.mockReset();
  computeNuclearImport.mockReset();
  fetchSmard.mockReset();
  fetchSmard.mockRejectedValue(new Error("smard down too"));
  vi.resetModules();
});

describe("which windows are stored durably", () => {
  it("accepts the rolling windows the site requests", () => {
    for (const k of ["de-24", "de-26-raw", "de-168", "de-720", "de-8760"]) {
      expect(darfDauerhaftSpeichern("generation", k), k).toBe(true);
    }
    expect(darfDauerhaftSpeichern("nuclear-import", "nuclear-24")).toBe(true);
  });

  it("accepts full calendar years and nothing else of the absolute ranges", () => {
    expect(darfDauerhaftSpeichern("generation", "de-2025-01-01-2025-12-31")).toBe(true);
    expect(darfDauerhaftSpeichern("generation", "de-2024-01-01-2025-12-31")).toBe(false);
    expect(darfDauerhaftSpeichern("generation", "de-2025-03-01-2025-03-31")).toBe(false);
  });

  it("rejects arbitrary windows — otherwise enumerating ?hours grows the table", () => {
    for (const k of ["de-25", "de-6789", "de-1", "nuclear-24-raw", "xx--24"]) {
      const scope = k.startsWith("nuclear") ? "nuclear-import" : "generation";
      expect(darfDauerhaftSpeichern(scope, k), k).toBe(false);
    }
  });
});

describe("generation route on an upstream outage", () => {
  const rows = [
    { ts: "2026-10-05T09:30:00.000Z", data: { solar: 20000, wind_onshore: 8000, fossil_gas: 4000 } },
    { ts: "2026-10-05T09:45:00.000Z", data: { solar: 21000, wind_onshore: 8000, fossil_gas: 4000 } },
  ].map((r) => ({ source: "energy-charts", metric: "public_power", country: "de", ...r }));

  it("serves the stored copy, marked stale, on a fresh instance", async () => {
    // First instance: upstream fine → copy stored.
    fetchPublicPower.mockResolvedValueOnce(rows);
    const a = await import("../../app/api/energy/generation/route");
    const ok = await a.GET(req("/api/energy/generation?hours=24&trim=0"));
    expect(ok.status).toBe(200);
    expect(gespeichert.size).toBe(1);

    // Fresh instance (empty memory): upstream down.
    vi.resetModules();
    fetchPublicPower.mockRejectedValueOnce(new Error("HTTP 503"));
    const b = await import("../../app/api/energy/generation/route");
    const res = await b.GET(req("/api/energy/generation?hours=24&trim=0"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Stale")).toBe("true");
    const body = await res.json();
    expect(body.stale).toBe(true);
    expect(body.data.map((d: { ts: string }) => d.ts)).toEqual(rows.map((r) => r.ts));
  });

  it("still answers 502 when there is no copy at all", async () => {
    fetchPublicPower.mockRejectedValueOnce(new Error("HTTP 503"));
    const r = await import("../../app/api/energy/generation/route");
    const res = await r.GET(req("/api/energy/generation?hours=24"));
    expect(res.status).toBe(502);
  });

  it("does not mark a fresh response stale", async () => {
    fetchPublicPower.mockResolvedValueOnce(rows);
    const r = await import("../../app/api/energy/generation/route");
    const body = await (await r.GET(req("/api/energy/generation?hours=24&trim=0"))).json();
    expect(body.stale).toBeUndefined();
  });
});

describe("SMARD as second source", () => {
  const smardPunkte = [
    { ts: "2026-10-05T11:45:00.000Z", solar: 40000, wind_onshore: 5000, fossil_gas: 3000, load: 55000 },
    { ts: "2026-10-05T12:00:00.000Z", solar: 41000, wind_onshore: 5000, fossil_gas: 3000, load: 55000 },
  ];

  it("Energy-Charts down: live SMARD numbers, credited as SMARD, not stale", async () => {
    fetchPublicPower.mockRejectedValueOnce(new Error("HTTP 503"));
    fetchSmard.mockResolvedValueOnce(smardPunkte);
    const r = await import("../../app/api/energy/generation/route");
    const res = await r.GET(req("/api/energy/generation?hours=24"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fallback).toBe("smard");
    expect(body.source).toBe("Bundesnetzagentur | SMARD.de");
    expect(body.stale).toBeUndefined();
    expect(body.data).toHaveLength(2);
    expect(quellenHinweis(body, letzterZeitpunkt(body.data))).toBe(
      "Energy-Charts (Fraunhofer ISE) liefert gerade keine Daten. Gezeigt werden die Zahlen von Bundesnetzagentur | SMARD.de, Stand 05.10., 14:00 Uhr.",
    );
  });

  it("SMARD before the stored copy: a fresh series from a second source wins", async () => {
    fetchPublicPower.mockResolvedValueOnce([
      { source: "energy-charts", metric: "public_power", country: "de", ts: "2026-10-01T10:00:00.000Z", data: { solar: 1, wind_onshore: 1, wind_offshore: 1 } },
    ]);
    const a = await import("../../app/api/energy/generation/route");
    await a.GET(req("/api/energy/generation?hours=24"));
    vi.resetModules();
    fetchPublicPower.mockRejectedValueOnce(new Error("HTTP 503"));
    fetchSmard.mockResolvedValueOnce(smardPunkte);
    const b = await import("../../app/api/energy/generation/route");
    const body = await (await b.GET(req("/api/energy/generation?hours=24"))).json();
    expect(body.fallback).toBe("smard");
  });

  it("no SMARD for other countries or windows above 30 days", async () => {
    fetchPublicPower.mockRejectedValue(new Error("HTTP 503"));
    const r = await import("../../app/api/energy/generation/route");
    await r.GET(req("/api/energy/generation?country=fr&hours=24"));
    await r.GET(req("/api/energy/generation?hours=8760"));
    expect(fetchSmard).not.toHaveBeenCalled();
    fetchPublicPower.mockReset();
  });

  it("a normal answer carries no note", () => {
    expect(quellenHinweis({}, "2026-10-05T12:00:00Z")).toBeNull();
  });
});

describe("nuclear-import route on an upstream outage", () => {
  it("serves the stored copy, marked stale", async () => {
    const resp = { data: [{ ts: "2026-10-05T09:00:00.000Z", nuclear_gw: 1.2 }], avg_gw: 1.2, avg_share_pct: 2, source: "x", license: "CC BY 4.0" };
    computeNuclearImport.mockResolvedValueOnce(resp);
    const a = await import("../../app/api/energy/nuclear-import/route");
    await a.GET(req("/api/energy/nuclear-import?hours=24"));

    vi.resetModules();
    computeNuclearImport.mockRejectedValueOnce(new Error("HTTP 503"));
    const b = await import("../../app/api/energy/nuclear-import/route");
    const res = await b.GET(req("/api/energy/nuclear-import?hours=24"));
    expect(res.status).toBe(200);
    expect((await res.json()).stale).toBe(true);
  });
});

describe("outage note", () => {
  it("names the source and the real time of the newest point, in German time", () => {
    const ts = letzterZeitpunkt([{ ts: "2026-10-05T09:30:00.000Z" }, { ts: "2026-10-05T09:45:00.000Z" }]);
    expect(quellenHinweis({ stale: true }, ts)).toBe(
      "Energy-Charts (Fraunhofer ISE) liefert gerade keine Daten. Gezeigt wird der letzte Stand vom 05.10., 11:45 Uhr.",
    );
  });

  it("never invents a time it does not have", () => {
    expect(quellenHinweis({ stale: true }, null)).toMatch(/letzte verfügbare Stand\.$/);
    expect(quellenHinweis({ stale: true }, "2026-W40")).toMatch(/letzte verfügbare Stand\.$/);
  });
});
