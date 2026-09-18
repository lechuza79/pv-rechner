import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadFundingCheckHistory, type FundingCheckRow } from "../funding-check-history";
import { pruefstandFuer, type Erreichbarkeit } from "../funding-verify-state";

function database(rows: FundingCheckRow[], failAfterFirstPage = false) {
  const query = {
    select() { return query; },
    order() { return query; },
    range(from: number, to: number) {
      return Promise.resolve(from >= 1000 && failAfterFirstPage
        ? { data: null, error: { message: "second page unavailable" } }
        : { data: rows.slice(from, to + 1), error: null });
    },
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve({ data: rows.slice(0, 1000), error: null }).then(resolve);
    },
  };
  return { from: () => query } as unknown as SupabaseClient;
}

const oldRows = Array.from({ length: 1000 }, () => ({
  program_id: "reviewed-town", checked_at: "2026-08-31T12:00:00Z", source: "traeger",
}));

describe("funding review history beyond the database response cap", () => {
  it("keeps a recent successful review and a later change for another programme", async () => {
    const rows = await loadFundingCheckHistory(database([...oldRows,
      { program_id: "reviewed-town", checked_at: "2026-09-17T01:48:00Z", source: "traeger" },
      { program_id: "changed-town", checked_at: "2026-09-17T02:00:00Z", source: "seite-geaendert" },
    ]));
    const attempts = rows.filter(r => r.source === "traeger").map(r => ({
      programId: r.program_id, checkedAt: r.checked_at, erreichbarkeit: r.source as Erreichbarkeit,
    }));
    expect(pruefstandFuer({ id: "reviewed-town" }, attempts, "2026-09-17").tageSeitQuellenpruefung).toBe(0);
    const changes = rows.filter(r => r.source === "seite-geaendert").map(r => ({
      programId: r.program_id, changedAt: r.checked_at, art: "geaendert" as const,
    }));
    expect(pruefstandFuer({ id: "changed-town", lastVerified: "2026-09-16" }, attempts, "2026-09-17", changes).seiteGeaendert).toBe(true);
    expect(rows).toHaveLength(1002);
  });

  it("fails instead of presenting an incomplete history when a later page fails", async () => {
    await expect(loadFundingCheckHistory(database(oldRows, true))).rejects.toThrow("second page unavailable");
  });
});
