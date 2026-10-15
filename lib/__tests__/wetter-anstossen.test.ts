import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { GET } from "../../app/api/wetter/anstossen/route";
import { readFileSync } from "node:fs";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

const aufruf = (auth?: string) => new Request("https://solar-check.io/api/wetter/anstossen", { headers: auth ? { authorization: auth } : {} });

describe("Stündlicher Anstoß des Wetter-Schnappschusses", () => {
  it("startet ohne Cron-Schlüssel nichts", async () => {
    vi.stubEnv("CRON_SECRET", "test-only"); vi.stubEnv("VIDEO_EXPORT_DISPATCH_TOKEN", "test-only");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await GET(aufruf())).status).toBe(401);
    expect((await GET(aufruf("Bearer falsch"))).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("startet genau den Wetter-Lauf auf main", async () => {
    vi.stubEnv("CRON_SECRET", "test-only"); vi.stubEnv("VIDEO_EXPORT_DISPATCH_TOKEN", "test-only");
    const fetcher = vi.fn().mockResolvedValue({ status: 204 }); vi.stubGlobal("fetch", fetcher);
    const antwort = await GET(aufruf("Bearer test-only"));
    expect(antwort.status).toBe(200);
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.github.com/repos/lechuza79/pv-rechner/actions/workflows/wetter-schnappschuss.yml/dispatches",
      expect.objectContaining({ method: "POST", body: '{"ref":"main"}' }),
    );
  });

  it("meldet einen abgelehnten Start als Fehler statt als Erfolg", async () => {
    vi.stubEnv("CRON_SECRET", "test-only"); vi.stubEnv("VIDEO_EXPORT_DISPATCH_TOKEN", "test-only");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 403 }));
    expect((await GET(aufruf("Bearer test-only"))).status).toBe(502);
  });

  it("ist als stündlicher Vercel-Cron eingetragen", () => {
    const crons = JSON.parse(readFileSync("vercel.json", "utf8")).crons as { path: string; schedule: string }[];
    expect(crons).toContainEqual({ path: "/api/wetter/anstossen", schedule: "5 * * * *" });
  });
});
