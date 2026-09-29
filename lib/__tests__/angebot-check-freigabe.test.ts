import { afterEach, describe, expect, it, vi } from "vitest";

// The reading service must never be reached while the route is switched off.
const { leseDienstAufrufe } = vi.hoisted(() => ({ leseDienstAufrufe: vi.fn(() => null) }));
vi.mock("../angebot-lesedienst", () => ({ anthropicLeseDienst: leseDienstAufrufe }));
vi.mock("../angebot-sammlung-db", () => ({ merkeBefund: vi.fn() }));
vi.mock("../angebot-check-kontingent-db", () => ({ angebotCheckKontingent: vi.fn(async () => "frei") }));

import { angebotCheckAktiv, ANGEBOT_CHECK_FLAG } from "../angebot-check-freigabe";
import { POST } from "../../app/api/angebot-check/route";

function anfrage(): Request {
  const form = new FormData();
  form.append("einwilligung", "ja");
  form.append("datei", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "a.pdf", { type: "application/pdf" }));
  return new Request("http://localhost/api/angebot-check", { method: "POST", body: form });
}

describe("Angebots-Check: abgeschaltet bis zum Einbau", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    leseDienstAufrufe.mockClear();
  });

  it("nur der exakte Wert 1 schaltet frei", () => {
    expect(angebotCheckAktiv({})).toBe(false);
    expect(angebotCheckAktiv({ [ANGEBOT_CHECK_FLAG]: "" })).toBe(false);
    expect(angebotCheckAktiv({ [ANGEBOT_CHECK_FLAG]: "true" })).toBe(false);
    expect(angebotCheckAktiv({ [ANGEBOT_CHECK_FLAG]: "0" })).toBe(false);
    expect(angebotCheckAktiv({ [ANGEBOT_CHECK_FLAG]: "1" })).toBe(true);
  });

  it("ohne Schalter antwortet die Route 404 und ruft den Lesedienst nie", async () => {
    vi.stubEnv(ANGEBOT_CHECK_FLAG, "");
    const res = await POST(anfrage());
    expect(res.status).toBe(404);
    expect(leseDienstAufrufe).not.toHaveBeenCalled();
  });

  it("mit Schalter läuft die Anfrage bis zum Lesedienst durch (Gegenprobe)", async () => {
    vi.stubEnv(ANGEBOT_CHECK_FLAG, "1");
    const res = await POST(anfrage());
    // The mocked service returns null → "nicht eingerichtet". The point: the gate let it through.
    expect(res.status).toBe(503);
    expect(leseDienstAufrufe).toHaveBeenCalledTimes(1);
  });
});
