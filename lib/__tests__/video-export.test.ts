import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { checkVideoParams, normaliseEmail, VIDEO_WIDGETS } from "../video-export-config";
import { VIDEO_EXPORT_SQL } from "../video-export-sql";

const lies = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("video export: what may be rendered", () => {
  it("accepts the pilot widget for Nidda only", () => {
    expect(checkVideoParams({ widget: "gemeinde-solar-monat", ags: "06440016", period: "2026-08" }).ok).toBe(true);
    expect(checkVideoParams({ widget: "gemeinde-solar-monat", ags: "09162000", period: "2026-08" })).toEqual({ ok: false, reason: "ags_not_released" });
  });
  it("rejects addresses, unknown widgets and malformed periods", () => {
    for (const bad of [
      { widget: "https://evil.example/", ags: "06440016", period: "2026-08" },
      { widget: "gemeinde-solar-monat", ags: "../../x", period: "2026-08" },
      { widget: "gemeinde-solar-monat", ags: "06440016", period: "2026-13" },
      { widget: "__proto__", ags: "06440016", period: "2026-08" },
      null,
    ]) expect(checkVideoParams(bad).ok).toBe(false);
  });
  it("builds the render address from the table, never from input", () => {
    expect(VIDEO_WIDGETS["gemeinde-solar-monat"].embedPath({ widget: "gemeinde-solar-monat", ags: "06440016", period: "2026-08" }))
      .toBe("/embed/gemeinde/06440016/monitor");
  });
  it("normalises addresses so case does not bypass limits", () => {
    expect(normaliseEmail(" Anna@Example.ORG ")).toBe("anna@example.org");
    for (const bad of ["", "a@b", "a b@x.de", "<a@x.de>", "a@x.de, b@y.de", 42]) expect(normaliseEmail(bad)).toBeNull();
  });
});

describe("video export: the limits cannot be raced", () => {
  it("every mutating SQL function takes the same transaction lock first", () => {
    const fns = [...VIDEO_EXPORT_SQL.matchAll(/create or replace function (\w+)\(p jsonb\) returns jsonb\s+language plpgsql as \$\$\s*declare[^]*?begin\s*([^;]*;)|create or replace function (\w+)\(p jsonb\) returns jsonb\s+language plpgsql as \$\$\s*begin\s*([^;]*;)/g)];
    const mutating = ["video_request_create", "video_request_discard", "video_request_confirm", "video_operator_create",
      "video_job_claim", "video_job_finish", "video_request_notified", "video_cleanup"];
    for (const name of mutating) {
      const m = fns.find((f) => (f[1] ?? f[3]) === name);
      expect(m, name).toBeTruthy();
      expect((m![2] ?? m![4]).trim(), name).toBe("perform pg_advisory_xact_lock(7342100);");
    }
  });
  it("the public never reaches the tables or functions", () => {
    expect(VIDEO_EXPORT_SQL).toMatch(/alter table video_requests enable row level security/);
    expect(VIDEO_EXPORT_SQL).toMatch(/revoke all on function %I\(jsonb\) from anon, authenticated/);
  });
});

describe("video export: personal data stays out of logs and links", () => {
  it("no route or worker logs an address", () => {
    for (const f of ["app/api/video-export/anfrage/route.ts", "app/api/video-export/bestaetigen/route.ts", "lib/video-export-mail.ts",
      "lib/video-export-service.ts", "scripts/video-export-worker.ts", "lib/video-export-abo.ts"]) {
      for (const line of lies(f).split("\n").filter((l) => /console\.(log|error|warn)/.test(l))) {
        expect(line, f).not.toMatch(/email|\bto\b|\ban\b/i);
      }
    }
  });
  it("confirmation by GET only shows a button", () => {
    const route = lies("app/api/video-export/bestaetigen/route.ts");
    const get = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"));
    expect(get).not.toMatch(/confirmVideo/);
  });
  it("the subscription is only handed on after confirmation, through the existing subscription functions", () => {
    const service = lies("lib/video-export-service.ts");
    const request = service.slice(service.indexOf("export async function requestPublicVideo"), service.indexOf("export async function confirmVideo"));
    expect(request).not.toMatch(/handOffSubscription/);
    expect(lies("lib/video-export-abo.ts")).toContain('import("./gemeinde-abo")');
    expect(lies("lib/video-export-abo.ts")).toContain("aboBestaetigen(result.abo.id, now)");
  });
});
