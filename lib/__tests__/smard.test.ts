import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { chunksFuer, zusammenfuehren, SMARD_FILTER } = await import("../smard");
const { GENERATION_STACK_KEYS } = await import("../chart-utils");

/**
 * SMARD is the fallback for the live mix while Energy-Charts is down. The
 * units were measured against our own Energy-Charts week (lib/smard.ts
 * header); these tests hold the conversion and the mapping.
 */
describe("SMARD fallback", () => {
  it("converts energy per quarter-hour into average power (MWh × 4 = MW)", () => {
    const t = Date.parse("2026-10-05T10:00:00Z");
    const [p] = zusammenfuehren([{ key: "solar", series: [[t, 10000]] }], t - 1, t + 1, "quarterhour");
    expect(p.solar).toBe(40000);
  });

  it("hour files are already MW", () => {
    const t = Date.parse("2026-10-05T10:00:00Z");
    const [p] = zusammenfuehren([{ key: "solar", series: [[t, 10000]] }], t - 1, t + 1, "hour");
    expect(p.solar).toBe(10000);
  });

  it("two filters on one key add up (biomass + other renewables), never overwrite", () => {
    const t = Date.parse("2026-10-05T10:00:00Z");
    const [p] = zusammenfuehren(
      [{ key: "biomass", series: [[t, 1000]] }, { key: "biomass", series: [[t, 25]] }],
      t - 1, t + 1, "quarterhour",
    );
    expect(p.biomass).toBe(4100);
  });

  it("not-yet-reported carriers stay null so the latency tail is trimmed, not shown as zero", () => {
    const t = Date.parse("2026-10-05T10:00:00Z");
    const pts = zusammenfuehren(
      [{ key: "solar", series: [[t, 1], [t + 900000, null]] }, { key: "load", series: [[t, 1], [t + 900000, 2]] }],
      t - 1, t + 2 * 900000, "quarterhour",
    );
    expect(pts).toHaveLength(2);
    expect(pts[1].solar).toBeNull();
  });

  it("only points inside the window", () => {
    const t = Date.parse("2026-10-05T10:00:00Z");
    const pts = zusammenfuehren([{ key: "solar", series: [[t - 900000, 1], [t, 1], [t + 900000, 1]] }], t, t, "quarterhour");
    expect(pts.map((p) => p.ts)).toEqual([new Date(t).toISOString()]);
  });

  it("picks every weekly chunk that overlaps the window", () => {
    const w = 7 * 86400000;
    const index = [0, w, 2 * w, 3 * w];
    expect(chunksFuer(index, w + 10, 2 * w + 10)).toEqual([w, 2 * w]);
    expect(chunksFuer(index, 2 * w - 1, 2 * w - 1)).toEqual([w]);
  });

  it("maps only onto keys the charts know (plus load)", () => {
    for (const key of Object.values(SMARD_FILTER)) {
      expect([...GENERATION_STACK_KEYS, "load"], key).toContain(key);
    }
  });
});
