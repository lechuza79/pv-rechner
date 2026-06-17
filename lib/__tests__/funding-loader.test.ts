import { describe, it, expect, vi } from "vitest";

// Simulate "Supabase not configured" → getFundingPrograms must fall back to the
// code seed (same resilience contract as market prices / DEFAULT_PRICES).
vi.mock("../supabase-server", () => ({ supabase: null }));

import { getFundingPrograms, getFundingProgramById } from "../funding-data";
import { FUNDING_PROGRAMS } from "../funding-programs";

describe("getFundingPrograms (DB unavailable → code fallback)", () => {
  it("returns the full code seed", async () => {
    const programs = await getFundingPrograms();
    expect(programs.length).toBe(Object.keys(FUNDING_PROGRAMS).length);
    expect(programs.find((p) => p.id === "frankfurt-klimabonus")).toBeTruthy();
  });

  it("getFundingProgramById resolves from the fallback", async () => {
    expect((await getFundingProgramById("berlin-solarplus"))?.name).toBe("SolarPLUS");
    expect(await getFundingProgramById("does-not-exist")).toBeUndefined();
  });
});
