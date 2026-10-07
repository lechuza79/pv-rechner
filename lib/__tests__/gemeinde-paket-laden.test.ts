import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { brotliCompressSync } from "node:zlib";

vi.mock("server-only", () => ({}));
const currentAtlas = vi.hoisted(() => vi.fn());
vi.mock("../mastr-data", () => ({getRegionAtlasData: currentAtlas}));

// A failed read must never look like a missing town: the first becomes a
// failed render (the CDN keeps the last good page), the second a 404.
describe("Gemeinde-Paket laden", () => {
  const env = { ...process.env };
  beforeEach(() => {
    currentAtlas.mockReset();
    currentAtlas.mockResolvedValue({data_as_of: "2026-10-01", solar: {by_year: [{year: 2026, count: 150}]}});
    delete process.env.GEMEINDE_PAKET_LOKAL;
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "test";
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  async function laden(antwort: Response | Error) {
    vi.stubGlobal("fetch", vi.fn(async () => {
      if (antwort instanceof Error) throw antwort;
      return antwort;
    }));
    const { ladeGemeindeAnzeigePaket } = await import("../gemeinde-paket-server");
    return ladeGemeindeAnzeigePaket("09679147");
  }

  it("fehlendes Paket → null (404)", async () => {
    expect(await laden(new Response("not found", { status: 400 }))).toBeNull();
    expect(await laden(new Response("not found", { status: 404 }))).toBeNull();
  });

  it("Speicher gestört → Fehler, nicht null", async () => {
    await expect(laden(new Response("boom", { status: 503 }))).rejects.toThrow();
    await expect(laden(new Error("network"))).rejects.toThrow();
  });

  it("gültiges Paket wird entpackt", async () => {
    const { GEMEINDE_PAKET_VERSION } = await import("../gemeinde-paket");
    const paket = { version: GEMEINDE_PAKET_VERSION, ags: "09679147", name: "Höchberg", registerStand: "2026-09-10", missing: [] };
    const br = brotliCompressSync(Buffer.from(JSON.stringify(paket)));
    expect(await laden(new Response(br, { status: 200 }))).toMatchObject({ name: "Höchberg", registerStand: "2026-09-10", solarAnnualGrowth: {stand: "2026-10-01", years: [{year: 2026, count: 150}]}});
    expect(currentAtlas).toHaveBeenCalledWith("09679147");
  });

  it("a failed current register read does not silently publish old counts", async () => {
    const { GEMEINDE_PAKET_VERSION } = await import("../gemeinde-paket");
    const paket = {version: GEMEINDE_PAKET_VERSION, ags: "09679147", registerStand: "2026-09-10", missing: []};
    currentAtlas.mockRejectedValue(new Error("register unavailable"));
    await expect(laden(new Response(brotliCompressSync(Buffer.from(JSON.stringify(paket)))))).rejects.toThrow("register unavailable");
  });

  it.each(["2025-01-31", "", "2026-09-01"])("rejects missing or older register dates: %s", async (stand) => {
    const { GEMEINDE_PAKET_VERSION } = await import("../gemeinde-paket");
    const paket = {version: GEMEINDE_PAKET_VERSION, ags: "09679147", registerStand: "2026-09-10", missing: []};
    currentAtlas.mockResolvedValue({data_as_of: stand, solar: {by_year: [{year: 2026, count: 150}]}});
    await expect(laden(new Response(brotliCompressSync(Buffer.from(JSON.stringify(paket)))))).rejects.toThrow();
  });

  it("ohne Zugang → Fehler", async () => {
    delete process.env.SUPABASE_SERVICE_KEY;
    await expect(laden(new Response("", { status: 200 }))).rejects.toThrow();
  });
});
