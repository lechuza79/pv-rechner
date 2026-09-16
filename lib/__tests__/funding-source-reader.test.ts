import { it, expect, vi } from "vitest";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

it("preserves original failure bytes and date, and defers another network attempt", async () => {
  const dir = mkdtempSync(join(tmpdir(), "funding-evidence-"));
  process.env.FUNDING_EVIDENCE_DIR = dir;
  vi.resetModules();
  const { FundingSourceReader } = await import("../../scripts/lib/funding-source-reader");
  const saved: unknown[] = [];
  const db = { from: () => ({ select: () => ({ range: async () => ({ data: [], error: null }) }), upsert: async (row: unknown) => { saved.push(row); return { error: null }; } }) } as unknown as SupabaseClient;
  const original = new Uint8Array([0x3c, 0x70, 0x3e, 0x61, 0xff, 0x3c, 0x2f, 0x70, 0x3e]);
  const network = vi.fn(async () => new Response(original, { status: 403, headers: { "content-type": "text/html" } }));
  vi.stubGlobal("fetch", network);
  try {
    const reader = new FundingSourceReader(db, "test");
    await expect(reader.fetch("https://example.org/funding")).rejects.toThrow("blocked");
    await expect(reader.fetch("https://example.org/funding")).rejects.toThrow("deferred");
    expect(network).toHaveBeenCalledTimes(1);
    expect(saved).toHaveLength(1);
    const observations = readFileSync(join(dir, "test.jsonl"), "utf8").trim().split("\n").map(s => JSON.parse(s));
    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({ readable: false, status: 403, failure_reason: "blocked", url: "https://example.org/funding" });
    const hash = createHash("sha256").update(original).digest("hex");
    expect(readdirSync(join(dir, "bodies"))).toEqual([hash]);
    expect(readFileSync(join(dir, "bodies", hash))).toEqual(Buffer.from(original));
  } finally { vi.unstubAllGlobals(); delete process.env.FUNDING_EVIDENCE_DIR; rmSync(dir, { recursive: true }); }
});

it("returns captured HTML after the network request is aborted during persistence", async () => {
  const { createServer } = await import("node:http");
  const server = createServer((_req, res) => { res.writeHead(200, { "content-type": "text/html" }); res.end("<main>Förderung für Photovoltaik mit Zuschuss von 500 Euro.</main>"); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/funding`;
  const controller = new AbortController();
  const dir = mkdtempSync(join(tmpdir(), "funding-abort-"));
  process.env.FUNDING_EVIDENCE_DIR = dir;
  vi.resetModules();
  const { FundingSourceReader } = await import("../../scripts/lib/funding-source-reader");
  const db = { from: () => ({ select: () => ({ range: async () => ({ data: [], error: null }) }), upsert: async () => { controller.abort(); await new Promise(resolve => setTimeout(resolve, 10)); return { error: null }; } }) } as unknown as SupabaseClient;
  try {
    const result = await new FundingSourceReader(db, "test").fetch(url, { signal: controller.signal });
    expect(result.url).toBe(url);
    expect(await result.text()).toContain("500 Euro");
    const observation = JSON.parse(readFileSync(join(dir, "test.jsonl"), "utf8"));
    expect(observation).toMatchObject({ readable: true, failure_reason: null });
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); delete process.env.FUNDING_EVIDENCE_DIR; rmSync(dir, { recursive: true }); }
});
