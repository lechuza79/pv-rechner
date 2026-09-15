import { afterEach, expect, it, vi } from "vitest";

// Execute the real CLI against an in-memory database. Two pages belong to the
// same municipality; the legacy row deliberately points at the unreviewed one.
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetModules(); });
it("marks only the exact reviewed URL and leaves a different legacy source untouched", async () => {
  const first = "https://example.org/funding-a";
  const second = "https://example.org/funding-b";
  const rows = [
    { region_id: "test-region", url: first.replace("https://", ""), gelesen_am: null as string | null },
    { region_id: "test-region", url: second, gelesen_am: null as string | null },
  ];
  const legacy = { region_id: "test-region", url: second, gelesen_am: null as string | null };
  const writes: { table: string; filters: Record<string, unknown> }[] = [];
  const db = { from(table: string) {
    const filters: Record<string, unknown> = {};
    let patch: Record<string, unknown> | undefined;
    const selection = () => (table === "funding_seiten" ? rows : [legacy]).filter(r => Object.entries(filters).every(([k, v]) => r[k as keyof typeof r] === v));
    const query = {
      select() { return query; },
      eq(k: string, v: unknown) { filters[k] = v; return query; },
      update(value: Record<string, unknown>) { patch = value; return query; },
      async maybeSingle() { return { data: selection()[0] ?? null, error: null }; },
      then(done: (value: unknown) => unknown) {
        if (patch) { writes.push({ table, filters: { ...filters } }); for (const row of selection()) Object.assign(row, patch); }
        return Promise.resolve({ error: null }).then(done);
      },
    };
    return query;
  } };
  const recorded = vi.fn();
  vi.doMock("@supabase/supabase-js", () => ({ createClient: () => db }));
  vi.doMock("../../scripts/lib/funding-source-reader", () => ({
    FundingSourceReader: class { async ready() {} async fetch() { return new Response("<p>Ein Zuschuss von 200 Euro ist möglich.</p>"); } },
    recordStage: recorded,
  }));
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid");
  vi.stubEnv("SUPABASE_SERVICE_KEY", "test-only");
  const originalArgs = process.argv;
  process.argv = ["node", "funding-screen.ts", "--gelesen", "test-region", "--url", first, "--beleg", "Zuschuss von 200 Euro", "--ergebnis", "confirmed"];
  vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    await import("../../scripts/funding-screen");
    await vi.waitFor(() => expect(recorded).toHaveBeenCalledTimes(1));
    expect(writes).toEqual([{ table: "funding_seiten", filters: { region_id: "test-region", url: first.replace("https://", "") } }]);
    expect(rows[0].gelesen_am).not.toBeNull();
    expect(rows[1].gelesen_am).toBeNull();
    expect(legacy.gelesen_am).toBeNull();
  } finally { process.argv = originalArgs; vi.doUnmock("@supabase/supabase-js"); vi.doUnmock("../../scripts/lib/funding-source-reader"); }
}, 15000);
