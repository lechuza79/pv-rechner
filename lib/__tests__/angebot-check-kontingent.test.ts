import { afterEach, describe, expect, it, vi } from "vitest";

// The paid reading service must never be reached unless the global daily cap
// said "frei". The service mock returns a working reader so that a missing cap
// check would visibly call it.
const { leseAufrufe, kontingent } = vi.hoisted(() => ({
  leseAufrufe: vi.fn(async () => ({ art: "unleserlich", grund: "test" })),
  kontingent: vi.fn(async (): Promise<string> => "frei"),
}));
vi.mock("../angebot-lesedienst", () => ({ anthropicLeseDienst: () => ({ lies: leseAufrufe }) }));
vi.mock("../angebot-auslesen", () => ({
  leseAngebot: async (dienst: { lies: () => Promise<unknown> }) => dienst.lies(),
}));
vi.mock("../angebot-sammlung-db", () => ({ merkeBefund: vi.fn() }));
vi.mock("../angebot-check-kontingent-db", () => ({ angebotCheckKontingent: kontingent }));

import { POST } from "../../app/api/angebot-check/route";
import { ANGEBOT_CHECK_FLAG } from "../angebot-check-freigabe";
import {
  ANGEBOT_CHECK_LIMIT_DEFAULT,
  ANGEBOT_CHECK_NUTZUNG_DDL,
  angebotCheckTageslimit,
  kontingentPruefen,
} from "../angebot-check-kontingent";
import { SECURITY_POSTURE_DDL, auditPosture, type SecurityPosture } from "../security-sql";

let ipZaehler = 0;
function anfrage(): Request {
  const form = new FormData();
  form.append("einwilligung", "ja");
  form.append("datei", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "a.pdf", { type: "application/pdf" }));
  // Fresh address per request so the per-IP limit never interferes.
  return new Request("http://localhost/api/angebot-check", {
    method: "POST",
    body: form,
    headers: { "x-forwarded-for": `10.0.0.${++ipZaehler}` },
  });
}

describe("Angebots-Check: globales Tageskontingent in der Route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    leseAufrufe.mockClear();
    kontingent.mockReset();
  });

  it("über dem Kontingent: 429 mit Meldung, der Lesedienst wird nie gerufen", async () => {
    vi.stubEnv(ANGEBOT_CHECK_FLAG, "1");
    kontingent.mockResolvedValue("erschoepft");
    const res = await POST(anfrage());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.fehler).toBe("tageslimit");
    expect(body.meldung).toMatch(/morgen/);
    expect(kontingent).toHaveBeenCalledTimes(1);
    expect(leseAufrufe).not.toHaveBeenCalled();
  });

  it("Zähler nicht erreichbar: 503, der Lesedienst wird nie gerufen (fail closed)", async () => {
    vi.stubEnv(ANGEBOT_CHECK_FLAG, "1");
    kontingent.mockResolvedValue("unerreichbar");
    const res = await POST(anfrage());
    expect(res.status).toBe(503);
    expect(leseAufrufe).not.toHaveBeenCalled();
  });

  it("Zähler wirft: ebenfalls kein Aufruf des Lesedienstes", async () => {
    vi.stubEnv(ANGEBOT_CHECK_FLAG, "1");
    kontingent.mockRejectedValue(new Error("db down"));
    await POST(anfrage()).catch(() => undefined);
    expect(leseAufrufe).not.toHaveBeenCalled();
  });

  it("unter dem Kontingent: die Anfrage erreicht den Lesedienst (Gegenprobe)", async () => {
    vi.stubEnv(ANGEBOT_CHECK_FLAG, "1");
    kontingent.mockResolvedValue("frei");
    const res = await POST(anfrage());
    expect(res.status).toBe(200);
    expect(leseAufrufe).toHaveBeenCalledTimes(1);
  });

  it("abgeschaltet: das Kontingent wird gar nicht erst angefasst", async () => {
    vi.stubEnv(ANGEBOT_CHECK_FLAG, "");
    const res = await POST(anfrage());
    expect(res.status).toBe(404);
    expect(kontingent).not.toHaveBeenCalled();
  });
});

describe("kontingentPruefen: nur ein ausdrückliches true gibt frei", () => {
  it("übersetzt jede Antwort", async () => {
    expect(await kontingentPruefen(async () => true, "2026-09-28", 50)).toBe("frei");
    expect(await kontingentPruefen(async () => false, "2026-09-28", 50)).toBe("erschoepft");
    expect(await kontingentPruefen(async () => null, "2026-09-28", 50)).toBe("unerreichbar");
    expect(await kontingentPruefen(async () => "true", "2026-09-28", 50)).toBe("unerreichbar");
    expect(await kontingentPruefen(async () => { throw new Error("x"); }, "2026-09-28", 50)).toBe("unerreichbar");
  });

  it("reicht Tag und Limit unverändert durch", async () => {
    const zaehlen = vi.fn(async () => true);
    await kontingentPruefen(zaehlen, "2026-09-28", 7);
    expect(zaehlen).toHaveBeenCalledWith("2026-09-28", 7);
  });
});

describe("angebotCheckTageslimit", () => {
  it("fällt bei allem Unklaren auf den vorsichtigen Standard zurück, nie auf unbegrenzt", () => {
    expect(ANGEBOT_CHECK_LIMIT_DEFAULT).toBe(50);
    for (const roh of [undefined, "", "abc", "-5", "1.5", "1e9", "Infinity"]) {
      expect(angebotCheckTageslimit({ ANGEBOT_CHECK_TAGESLIMIT: roh })).toBe(ANGEBOT_CHECK_LIMIT_DEFAULT);
    }
  });
  it("nimmt eine ganze Zahl, auch 0 (sperrt für alle)", () => {
    expect(angebotCheckTageslimit({ ANGEBOT_CHECK_TAGESLIMIT: "120" })).toBe(120);
    expect(angebotCheckTageslimit({ ANGEBOT_CHECK_TAGESLIMIT: " 0 " })).toBe(0);
  });
});

describe("Zähl-SQL: Sicherheitsgrenze nach lib/security-sql.ts", () => {
  it("Tabelle mit RLS und ohne Policy", () => {
    expect(ANGEBOT_CHECK_NUTZUNG_DDL).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(ANGEBOT_CHECK_NUTZUNG_DDL).not.toMatch(/CREATE POLICY/i);
  });
  it("Funktion ist SECURITY DEFINER mit festem search_path", () => {
    expect(ANGEBOT_CHECK_NUTZUNG_DDL).toMatch(/SECURITY DEFINER\s+SET search_path = public, pg_temp/);
  });
  it("Rechte über alle Signaturen, anon und authenticated einzeln entzogen", () => {
    expect(ANGEBOT_CHECK_NUTZUNG_DDL).toMatch(/p\.proname = 'angebot_check_zaehlen'/);
    expect(ANGEBOT_CHECK_NUTZUNG_DDL).toMatch(/REVOKE ALL ON FUNCTION %s FROM PUBLIC/);
    expect(ANGEBOT_CHECK_NUTZUNG_DDL).toMatch(/REVOKE ALL ON FUNCTION %s FROM anon/);
    expect(ANGEBOT_CHECK_NUTZUNG_DDL).toMatch(/REVOKE ALL ON FUNCTION %s FROM authenticated/);
    expect(ANGEBOT_CHECK_NUTZUNG_DDL).toMatch(/GRANT EXECUTE ON FUNCTION %s TO service_role/);
  });
  it("Zählen und Vergleich sind EINE Anweisung (atomar)", () => {
    expect(ANGEBOT_CHECK_NUTZUNG_DDL).toMatch(/ON CONFLICT \(tag\) DO UPDATE[\s\S]*WHERE t\.anzahl < p_limit/);
  });
  it("die Selbstauskunft fragt die Funktion ab", () => {
    expect(SECURITY_POSTURE_DDL).toMatch(/'angebot_check_zaehlen'/);
  });
});

describe("auditPosture: Rechte auf der Zählfunktion", () => {
  const basis = (): SecurityPosture => ({
    exec_sql: [{
      args: "sql text", security_definer: true, owner: "postgres",
      search_path: ["search_path=public, extensions, pg_temp"], acl: null,
      execute_anon: false, execute_authenticated: false, execute_service_role: true, execute_public: false,
    }],
    definer_functions: [{
      name: "angebot_check_zaehlen", args: "p_tag date, p_limit integer", security_definer: true,
      search_path: ["search_path=public, pg_temp"],
      execute_anon: false, execute_authenticated: false, execute_service_role: true, execute_public: false,
    }],
    calculations: null,
    tables_without_rls: [],
    tables_rls_without_policy: ["angebot_check_nutzung"],
  });

  it("gesund: kein Befund", () => {
    expect(auditPosture(basis()).problems).toEqual([]);
  });
  it("anon darf ausführen: Befund", () => {
    const p = basis();
    p.definer_functions![0].execute_anon = true;
    expect(auditPosture(p).problems.join()).toMatch(/angebot_check_zaehlen.*anon/);
  });
  it("PUBLIC darf ausführen: Befund", () => {
    const p = basis();
    p.definer_functions![0].execute_public = true;
    expect(auditPosture(p).ok).toBe(false);
  });
  it("ohne search_path: Befund", () => {
    const p = basis();
    p.definer_functions![0].search_path = null;
    expect(auditPosture(p).ok).toBe(false);
  });
  it("alte Selbstauskunft ohne das Feld: kein Absturz, kein Befund", () => {
    const p = basis();
    delete p.definer_functions;
    expect(auditPosture(p).ok).toBe(true);
  });
});
