import { describe, it, expect } from "vitest";
import {
  dayOfYear,
  sunStage,
  resolveTheme,
  isLightStage,
  stageId,
  oppositeOf,
  cycleFrom,
  type ThemeStage,
} from "../theme-schedule";

// UTC-based so these are timezone-robust: sunStage reads the date's UTC hours.
const HIGH_SUN = new Date(Date.UTC(2024, 5, 21, 11, 0)); // solar noon, sun ~62°
const NIGHT = new Date(Date.UTC(2024, 5, 21, 0, 0)); // deep night

describe("dayOfYear", () => {
  it("is 1 on Jan 1 and grows through the year", () => {
    expect(dayOfYear(new Date(2024, 0, 1))).toBe(1);
    expect(dayOfYear(new Date(2024, 6, 1))).toBe(183); // leap year
    expect(dayOfYear(new Date(2023, 6, 1))).toBe(182);
  });
});

describe("stageId / isLightStage", () => {
  it("formats and clamps to s0…s6", () => {
    expect(stageId(3)).toBe("s3");
    expect(stageId(9)).toBe("s6");
    expect(stageId(-1)).toBe("s0");
  });
  it("s3–s6 are light backgrounds, s0–s2 dark", () => {
    expect(isLightStage("s6")).toBe(true);
    expect(isLightStage("s3")).toBe(true);
    expect(isLightStage("s2")).toBe(false);
    expect(isLightStage("s0")).toBe(false);
  });
});

describe("sunStage", () => {
  it("is 0 (deep night) when the sun is well down", () => {
    expect(sunStage(NIGHT, null)).toBe(0);
  });

  it("in daylight, actual output picks the fine stage", () => {
    expect(sunStage(HIGH_SUN, { powerPct: 60, utilisation: 0.95 })).toBe(6);
    expect(sunStage(HIGH_SUN, { powerPct: 40, utilisation: 0.74 })).toBe(5);
    expect(sunStage(HIGH_SUN, { powerPct: 20, utilisation: 0.55 })).toBe(4);
    expect(sunStage(HIGH_SUN, { powerPct: 13, utilisation: 0.2 })).toBe(3);
  });

  // A clear but weak winter noon (~20 %) sits in the middle — honestly less sun,
  // not darkness — while an overcast noon dims further. A low evening sun dims
  // the same way, which is the point of following output, not clarity.
  it("puts a weak-but-clear noon mid, an overcast noon lower", () => {
    expect(sunStage(HIGH_SUN, { powerPct: 20, utilisation: 0.95 })).toBe(4);
    expect(sunStage(HIGH_SUN, { powerPct: 12, utilisation: 0.2 })).toBe(3);
    // A low, clear evening sun (17 %) dims too — no longer held bright by clarity.
    expect(sunStage(HIGH_SUN, { powerPct: 17, utilisation: 0.71 })).toBe(4);
  });

  it("daylight with no reading yet is a bright stage, never the dark ones", () => {
    expect(isLightStage(stageId(sunStage(HIGH_SUN, null)))).toBe(true);
  });
});

describe("resolveTheme", () => {
  it("pins the extremes for a manual choice, whatever the sun", () => {
    expect(resolveTheme("light", NIGHT)).toBe("s6");
    expect(resolveTheme("dark", HIGH_SUN, { powerPct: 60, utilisation: 1 })).toBe("s0");
  });
  it("auto follows the sun stage", () => {
    expect(resolveTheme("auto", NIGHT)).toBe("s0");
    expect(resolveTheme("auto", HIGH_SUN, { powerPct: 60, utilisation: 0.95 })).toBe("s6");
    expect(resolveTheme("auto", HIGH_SUN, { powerPct: 12, utilisation: 0.2 })).toBe("s3");
  });
});

describe("oppositeOf", () => {
  it("light stages flip to dark, dark stages to light", () => {
    expect(oppositeOf("s6")).toBe("dark");
    expect(oppositeOf("s3")).toBe("dark");
    expect(oppositeOf("s2")).toBe("light");
    expect(oppositeOf("s0")).toBe("light");
  });
});

describe("cycleFrom", () => {
  it("first click out of auto lands on the opposite of what's shown", () => {
    expect(cycleFrom("auto", "s6", null)).toBe("dark");
    expect(cycleFrom("auto", "s0", null)).toBe("light");
    expect(cycleFrom("auto", "s2", null)).toBe("light"); // dark-ish stage → light
  });

  it("walks auto → dark → light → auto when auto showed a light stage", () => {
    const a = cycleFrom("auto", "s5", null);
    expect(a).toBe("dark");
    const b = cycleFrom(a, "s0", a);
    expect(b).toBe("light");
    expect(cycleFrom(b, "s6", a)).toBe("auto");
  });

  it("keeps both manual modes reachable whichever way auto went", () => {
    for (const shown of ["s6", "s3", "s2", "s0"] as ThemeStage[]) {
      const seen = new Set<string>();
      let pref = cycleFrom("auto", shown, null);
      const first = pref;
      seen.add(pref);
      const shown2: ThemeStage = pref === "light" ? "s6" : "s0";
      pref = cycleFrom(pref, shown2, first);
      seen.add(pref);
      expect(seen).toEqual(new Set(["light", "dark"]));
      const shown3: ThemeStage = pref === "light" ? "s6" : "s0";
      expect(cycleFrom(pref, shown3, first)).toBe("auto");
    }
  });
});
