import { describe, expect, it } from "vitest";
import { solarTagAusModell } from "../solar-tag-modell";
import type { IconD2Shard } from "../icon-d2";

// A synthetic snapshot for one postcode: radiation as hour means (direct +
// diffuse), constant temperature, no cloud. 22.09.2026, Berlin = UTC+2.
const TAG: [number, number] = [Date.parse("2026-09-21T22:00:00Z"), Date.parse("2026-09-22T22:00:00Z")];
const FIRST = Date.parse("2026-09-21T20:00:00Z");
const HOURS = 30;

function shard(radiation: (hourUtc: number, ms: number) => number | null): IconD2Shard {
  const vars = ["direct_radiation", "diffuse_radiation", "temperature_2m", "cloud_cover_high"] as const;
  const values = vars.map((v) =>
    Array.from({ length: HOURS }, (_, h) => {
      const ms = FIRST + h * 3600000;
      const utc = new Date(ms).getUTCHours();
      if (v === "direct_radiation") return radiation(utc, ms);
      if (v === "diffuse_radiation") return radiation(utc, ms) === null ? null : 0;
      if (v === "temperature_2m") return 15;
      return 0;
    }),
  );
  return {
    version: 1,
    model: "dwd_icon_d2",
    runInit: "2026-09-21T18:00:00Z",
    generatedAt: "2026-09-21T19:00:00Z",
    firstHour: new Date(FIRST).toISOString(),
    hours: HOURS,
    variables: [...vars] as never,
    scale: { direct_radiation: 1, diffuse_radiation: 1, temperature_2m: 1, cloud_cover_high: 1 } as never,
    points: { "97204": { cell: [49.78, 9.88], elevation: 300, values } },
  };
}

// A bell of radiation around noon UTC.
const tagesgang = (h: number) => Math.max(0, 600 - 80 * (h - 11) ** 2);

describe("solarTagAusModell", () => {
  it("delivers the whole German day in quarter hours", () => {
    const points = solarTagAusModell(shard(tagesgang), "97204", 49.78, 9.88, TAG)!;
    expect(points).toHaveLength(96);
    expect(points[0].time).toBe("2026-09-21T22:00:00.000Z");
    expect(points.at(-1)!.time).toBe("2026-09-22T21:45:00.000Z");
  });

  it("is smooth, not a staircase of hour values", () => {
    const pct = solarTagAusModell(shard(tagesgang), "97204", 49.78, 9.88, TAG)!.map((p) => p.powerPct);
    // Morning quarters rise from one to the next instead of four equal bars.
    const morgen = pct.slice(34, 46);
    const gleiche = morgen.filter((v, i) => i > 0 && v === morgen[i - 1] && v > 0).length;
    expect(gleiche).toBeLessThan(3);
    expect(Math.max(...pct)).toBeGreaterThan(0);
  });

  it("returns nothing when the snapshot has a hole inside the day", () => {
    expect(solarTagAusModell(shard((h) => (h === 10 ? null : tagesgang(h))), "97204", 49.78, 9.88, TAG)).toBeNull();
  });

  it("returns nothing for a postcode the snapshot does not hold", () => {
    expect(solarTagAusModell(shard(tagesgang), "10115", 52.5, 13.4, TAG)).toBeNull();
  });
});

describe("solarTagAusModell at the snapshot's edge", () => {
  it("holds the known hour when only the padding hour outside the day is missing", () => {
    // The hours just outside the German day (ending 22:00 UTC on the 21st,
    // 23:00 UTC on the 22nd) are absent; inside the day nothing is.
    for (const aussen of ["2026-09-21T22:00:00Z", "2026-09-22T23:00:00Z"]) {
      const ms0 = Date.parse(aussen);
      const points = solarTagAusModell(shard((h, ms) => (ms === ms0 ? null : tagesgang(h))), "97204", 49.78, 9.88, TAG);
      expect(points, aussen).toHaveLength(96);
    }
  });
});
