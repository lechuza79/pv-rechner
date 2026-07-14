import { describe, it, expect } from "vitest";
import {
  dayOfYear,
  sunTimes,
  classifyHour,
  scheduleTheme,
  resolveTheme,
} from "../theme-schedule";

describe("dayOfYear", () => {
  it("is 1 on Jan 1 and grows through the year", () => {
    expect(dayOfYear(new Date(2024, 0, 1))).toBe(1);
    expect(dayOfYear(new Date(2024, 6, 1))).toBe(183); // leap year
    expect(dayOfYear(new Date(2023, 6, 1))).toBe(182);
  });
});

describe("sunTimes (central Germany)", () => {
  it("gives a long summer day and short winter day", () => {
    const summer = sunTimes(183, 2); // ~Jul 1, CEST (+2)
    const winter = sunTimes(1, 1); // Jan 1, CET (+1)
    // Summer: sunrise ~5h, sunset ~21.5h
    expect(summer.sunrise).toBeGreaterThan(4.5);
    expect(summer.sunrise).toBeLessThan(6);
    expect(summer.sunset).toBeGreaterThan(20.5);
    expect(summer.sunset).toBeLessThan(22);
    // Winter days are markedly shorter than summer days.
    const summerLen = summer.sunset - summer.sunrise;
    const winterLen = winter.sunset - winter.sunrise;
    expect(winterLen).toBeLessThan(summerLen);
    expect(winterLen).toBeGreaterThan(6); // still ~8h
  });
});

describe("classifyHour", () => {
  const sunrise = 6;
  const sunset = 21;
  const band = 50 / 60;
  it("midday is light, deep night is dark", () => {
    expect(classifyHour(13, sunrise, sunset, band)).toBe("light");
    expect(classifyHour(2, sunrise, sunset, band)).toBe("dark");
  });
  it("just around sunrise and sunset is dusk", () => {
    expect(classifyHour(6, sunrise, sunset, band)).toBe("dusk");
    expect(classifyHour(21, sunrise, sunset, band)).toBe("dusk");
    expect(classifyHour(5.5, sunrise, sunset, band)).toBe("dusk");
  });
  it("well before sunrise / well after sunset is dark", () => {
    expect(classifyHour(4, sunrise, sunset, band)).toBe("dark");
    expect(classifyHour(23, sunrise, sunset, band)).toBe("dark");
  });
});

describe("scheduleTheme (tz-robust times)", () => {
  it("midday is light, midnight is dark year-round", () => {
    expect(scheduleTheme(new Date(2024, 6, 1, 13, 0))).toBe("light");
    expect(scheduleTheme(new Date(2024, 0, 1, 13, 0))).toBe("light");
    expect(scheduleTheme(new Date(2024, 6, 1, 0, 30))).toBe("dark");
    expect(scheduleTheme(new Date(2024, 0, 1, 0, 30))).toBe("dark");
  });
});

describe("resolveTheme", () => {
  const noon = new Date(2024, 6, 1, 13, 0);
  const midnight = new Date(2024, 6, 1, 0, 30);
  it("honours explicit light/dark regardless of time", () => {
    expect(resolveTheme("light", midnight)).toBe("light");
    expect(resolveTheme("dark", noon)).toBe("dark");
  });
  it("falls back to the schedule in auto mode", () => {
    expect(resolveTheme("auto", noon)).toBe("light");
    expect(resolveTheme("auto", midnight)).toBe("dark");
  });
});
