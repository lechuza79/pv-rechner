import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The logo route takes ONLY the page ID; the image URL comes from our database.
 * Network rules are tested in `fremdbild.test.ts` — here the network is mocked.
 */

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

// ─── The route ──────────────────────────────────────────────────────────────

const { seiteFuerKennung, holeMock } = vi.hoisted(() => ({ seiteFuerKennung: vi.fn(), holeMock: vi.fn() }));
vi.mock("../fachbetrieb-seite", () => ({ seiteFuerKennung }));
vi.mock("../fremdbild-netz", () => ({ aufloesen: vi.fn(), oeffnen: vi.fn() }));
vi.mock("../fremdbild", async (orig) => ({ ...(await orig<typeof import("../fremdbild")>()), holeFremdbild: holeMock }));

import { GET } from "../../app/api/fachbetrieb-logo/[kennung]/route";

const aufruf = (kennung: string) => GET(new Request(`https://solar-check.io/api/fachbetrieb-logo/${kennung}`), { params: Promise.resolve({ kennung }) });

describe("Route /api/fachbetrieb-logo/[kennung]", () => {
  afterEach(() => vi.clearAllMocks());

  it("unbekannte Kennung → 404, ohne Abruf", async () => {
    seiteFuerKennung.mockResolvedValue(null);
    const r = await aufruf("0123456789abcdef");
    expect(r.status).toBe(404);
    expect(holeMock).not.toHaveBeenCalled();
  });

  it("Betrieb ohne Logo → 404", async () => {
    seiteFuerKennung.mockResolvedValue({ logoUrl: null });
    expect((await aufruf("0123456789abcdef")).status).toBe(404);
  });

  it("die Adresse kommt aus der Datenbank, nie aus der Anfrage", async () => {
    seiteFuerKennung.mockResolvedValue({ logoUrl: "https://betrieb.de/favicon.png" });
    holeMock.mockResolvedValue({ typ: "image/png", bytes: PNG });
    const r = await aufruf("0123456789abcdef");
    expect(holeMock.mock.calls[0][0]).toBe("https://betrieb.de/favicon.png");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("image/png");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("cache-control")).toMatch(/s-maxage=604800/);
    expect(r.headers.get("cache-control")).toMatch(/stale-while-revalidate/);
  });

  it("Abruf scheitert → 404", async () => {
    seiteFuerKennung.mockResolvedValue({ logoUrl: "https://betrieb.de/favicon.svg" });
    holeMock.mockResolvedValue(null);
    expect((await aufruf("0123456789abcdef")).status).toBe(404);
  });
});
