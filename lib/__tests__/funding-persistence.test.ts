import { expect, it, vi, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules(); process.exitCode = 0; });

it("retries a transient save without refetching or changing observation time", async () => {
  const dir = mkdtempSync(join(tmpdir(), "funding-save-"));
  process.env.FUNDING_EVIDENCE_DIR = dir;
  vi.resetModules();
  const { FundingSourceReader } = await import("../../scripts/lib/funding-source-reader");
  const rows: unknown[] = [];
  const upsert = vi.fn(async (row: unknown) => { rows.push(row); return { error: rows.length === 1 ? { message: "TypeError: fetch failed", code: "" } : null }; });
  const db = { from: () => ({ select: () => ({ range: async () => ({ data: [], error: null }) }), upsert }) } as unknown as SupabaseClient;
  const network = vi.fn(async () => new Response("<main>Photovoltaik Förderung mit Zuschuss</main>", { headers: { "content-type": "text/html" } }));
  vi.stubGlobal("fetch", network);
  try {
    const result = await new FundingSourceReader(db, "test").fetch("https://example.org/funding");
    expect(await result.text()).toContain("Photovoltaik");
    expect(network).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(rows[1]).toEqual(rows[0]);
    expect(process.exitCode ?? 0).toBe(0);
    expect(readFileSync(join(dir, "test.jsonl"), "utf8").trim().split("\n")).toHaveLength(1);
  } finally { delete process.env.FUNDING_EVIDENCE_DIR; rmSync(dir, { recursive: true }); }
});

it("records and reports a permanent save failure even if the caller catches it", async () => {
  const dir = mkdtempSync(join(tmpdir(), "funding-save-fatal-"));
  process.env.FUNDING_EVIDENCE_DIR = dir;
  vi.resetModules();
  const { FundingSourceReader } = await import("../../scripts/lib/funding-source-reader");
  const upsert = vi.fn(async () => ({ error: { code: "42501", message: "permission denied" } }));
  const db = { from: () => ({ select: () => ({ range: async () => ({ data: [], error: null }) }), upsert }) } as unknown as SupabaseClient;
  vi.stubGlobal("fetch", async () => new Response("<main>Photovoltaik Förderung</main>", { headers: { "content-type": "text/html" } }));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    await expect(new FundingSourceReader(db, "test").fetch("https://example.org/funding")).rejects.toThrow("permission denied");
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("permission denied"));
    const event = JSON.parse(readFileSync(join(dir, "persistence.jsonl"), "utf8"));
    expect(event).toMatchObject({ url: "https://example.org/funding", operation: "source-state", outcome: "failed", code: "42501" });
  } finally { delete process.env.FUNDING_EVIDENCE_DIR; rmSync(dir, { recursive: true }); }
});

it("stops after three transient failures and keeps save retries out of source counts", async () => {
  const dir = mkdtempSync(join(tmpdir(), "funding-save-exhausted-"));
  process.env.FUNDING_EVIDENCE_DIR = dir;
  vi.resetModules();
  const { persistFundingWrite, FundingPersistenceError } = await import("../../scripts/lib/funding-source-reader");
  const { summarizeEvidence } = await import("../funding-run-evidence");
  const work = vi.fn(async () => { throw new Error("fetch failed"); });
  vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    await expect(persistFundingWrite(work, { operation: "source-state", url: "https://example.org/funding", observed_at: "2026-09-16T08:08:34Z" })).rejects.toBeInstanceOf(FundingPersistenceError);
    expect(work).toHaveBeenCalledTimes(3);
    expect(process.exitCode).toBe(1);
    const events = readFileSync(join(dir, "persistence.jsonl"), "utf8").trim().split("\n").map(s => JSON.parse(s));
    expect(events.map(e => e.outcome)).toEqual(["retry", "retry", "failed"]);
    expect(summarizeEvidence(events).attempted).toBe(0);
  } finally { delete process.env.FUNDING_EVIDENCE_DIR; rmSync(dir, { recursive: true }); }
});
