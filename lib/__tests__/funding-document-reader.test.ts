import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fundingContentGap } from "../../scripts/lib/funding-document";
const db = { from: () => ({ select: () => ({ range: async () => ({ data: [], error: null }) }) }) } as unknown as SupabaseClient;
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules(); vi.doUnmock("../../scripts/lib/funding-document"); });
it("keeps loading and embedded-document gaps distinct from negative findings", () => {
  expect(fundingContentGap('<div id="app"></div><script src="/app.js"></script>')).toBe("loading-shell");
  expect(fundingContentGap('<main>Hier gibt es derzeit keine Förderung.</main>')).toBeNull();
  expect(fundingContentGap('<iframe src="/richtlinie.pdf"></iframe>')).toBe("embedded-document");
});
it("keeps PDF originals separate from extracted text and preserves the source URL", async () => {
  const directory = mkdtempSync(join(tmpdir(), "funding-pdf-"));
  process.env.FUNDING_EVIDENCE_DIR = directory;
  vi.doMock("../../scripts/lib/funding-document", () => ({ fundingPdfText: async () => "Förderung Photovoltaik 500 Euro", htmlText: (s: string) => `<article>${s}</article>`, fundingContentGap: () => null }));
  const { FundingSourceReader } = await import("../../scripts/lib/funding-source-reader");
  const bytes = Buffer.from("%PDF-source-bytes");
  const response = new Response(bytes, { headers: { "content-type": "application/pdf" } });
  Object.defineProperty(response, "url", { value: "https://amt.example/original.pdf" });
  vi.stubGlobal("fetch", async () => response);
  try {
    const result = await new FundingSourceReader(db, "pdf", true).fetch("https://amt.example/original.pdf");
    expect(result.url).toBe("https://amt.example/original.pdf");
    expect(await result.text()).toContain("500 Euro");
    const observation = JSON.parse(readFileSync(join(directory, "pdf.jsonl"), "utf8"));
    expect(observation).toMatchObject({ readable: true, content_type: "application/pdf", derived: { method: "pdf-text" } });
    expect(observation.sha256).not.toBe(observation.derived.sha256);
    expect(readFileSync(join(directory, "bodies", observation.sha256))).toEqual(bytes);
    expect(readFileSync(join(directory, "bodies", observation.derived.sha256), "utf8")).toContain("500 Euro");
  } finally { delete process.env.FUNDING_EVIDENCE_DIR; rmSync(directory, { recursive: true }); }
});
