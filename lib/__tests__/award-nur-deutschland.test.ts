import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MASTR_AWARD_SQL } from "../mastr-award-sql";

// Swiss municipalities share mastr_aggregates_gem since 07.10.2026. The first
// refresh after that import put 2,105 of them into the public ranking table
// and broke the package run (09.10.2026). Both ranking sources take German
// eight-digit keys only, until a Swiss page exists.
const NUR_DEUTSCH = "AND a.region_id ~ '^[0-9]{8}$'";

describe("Ranglisten-Tabellen enthalten nur deutsche Gemeinden", () => {
  it("Award-Tabelle", () => {
    const fn = MASTR_AWARD_SQL.slice(MASTR_AWARD_SQL.indexOf("FUNCTION mastr_refresh_gemeinde_award()"));
    expect(fn.slice(0, fn.indexOf("$fn$;"))).toContain(NUR_DEUTSCH);
  });
  it("Solar-Summen für den Größenklassen-Vergleich", () => {
    const route = readFileSync("app/api/mastr/setup/route.ts", "utf8");
    const fn = route.slice(route.indexOf("FUNCTION mastr_refresh_gemeinde_solar()"));
    expect(fn.slice(0, fn.indexOf("$fn$;"))).toContain(NUR_DEUTSCH);
  });
});
