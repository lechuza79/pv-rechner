import { describe, it, expect } from "vitest";
import { wetterAus } from "../../app/(site)/_startseite/hero-wetter";

// The homepage sky must never invent weather: a missing field is "unknown",
// not "clear" and not zero. These cases mirror the rules the weather session
// agreed for the DWD endpoint (every field may be null).

const voll = {
  weather: {
    condition: "rain",
    weatherCode: 61,
    cloudCover: 95,
    temperature: 12.4,
    windSpeed: 5,
    windDirection: 250,
    precipitationRate: 1.2,
    sources: { sky: { validAt: "2026-09-18T10:00:00Z" }, precipitation: { kind: "radar" as const, measuredAt: "2026-09-18T10:05:00Z" } },
  },
  attribution: "Datenbasis: Deutscher Wetterdienst",
};

describe("Homepage weather mapping", () => {
  it("passes real values through and converts wind from m/s to km/h", () => {
    const w = wetterAus(voll)!;
    expect(w.wolkenProzent).toBe(95);
    expect(w.windKmh).toBeCloseTo(18, 5);
    expect(w.regenMmH).toBe(1.2);
    expect(w.quelle).toBe("Datenbasis: Deutscher Wetterdienst");
    expect(w.stand).toContain("Radar");
    expect(w.stand).toContain("berechnet");
  });

  it("reports missing weather as missing instead of drawing a clear sky", () => {
    expect(wetterAus({})).toBeNull();
    expect(wetterAus({ weather: { ...voll.weather, cloudCover: null } })).toBeNull();
  });

  it("never labels model values as measured", () => {
    const w = wetterAus({ weather: { ...voll.weather, sources: { sky: { validAt: "2026-09-18T10:00:00Z" }, precipitation: { kind: "model" } } } })!;
    expect(w.stand).not.toMatch(/gemessen|Radar/);
  });
});
