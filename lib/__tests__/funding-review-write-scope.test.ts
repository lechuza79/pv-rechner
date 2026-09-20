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
    // Der Pruefweg heisst `verify`, nicht `fetch`: Ein gescheiterter
    // Gegenlese-Versuch darf die Quelle nicht fuer eine Woche sperren. Der
    // Nachbau bietet `fetch` deshalb bewusst als Falle an — wer den
    // Abhak-Befehl darauf zurueckdreht, macht diesen Test rot.
    FundingSourceReader: class {
      async ready() {}
      async verify() { return new Response("<p>Ein Zuschuss von 200 Euro ist möglich.</p>"); }
      async fetch(): Promise<Response> { throw new Error("Eine Pruefung liest ueber verify(), nicht ueber den Crawl-Weg."); }
    },
    recordStage: recorded,
  }));
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid");
  vi.stubEnv("SUPABASE_SERVICE_KEY", "test-only");
  const originalArgs = process.argv;
  // „aufgenommen" statt des früheren „confirmed": Nur die acht abschließenden
  // Ergebnisse nehmen eine Zeile wirklich aus dem Vorrat, und seit dem
  // 20.09.2026 weist das Werkzeug jedes andere Wort ab. Das alte Fixture hätte
  // eine Zeile geschrieben, die danach weiter als ungelesen gegolten hätte —
  // der Fehler, gegen den die Sperre steht, stand also im Test selbst.
  process.argv = ["node", "funding-screen.ts", "--gelesen", "test-region", "--url", first, "--beleg", "Zuschuss von 200 Euro", "--ergebnis", "aufgenommen"];
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
