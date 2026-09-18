import { describe, it, expect } from "vitest";
import { szeneWetter } from "../szene-wetter";

const voll = { time: "2026-09-18T13:00:00Z", weatherCode: 61, cloudCover: 90, temperature: 12.5, windSpeed: 4, windDirection: 250, precipitationRate: 1.2 };

describe("Stage weather from the DWD endpoint", () => {
  it("maps every field the stage checks", () => {
    const w = szeneWetter(voll)!;
    expect(w.current).toEqual({
      time: Date.parse(voll.time) / 1000,
      temperature_2m: 12.5,
      cloud_cover: 90,
      wind_speed_10m: 4,
      wind_direction_10m: 250,
      weather_code: 61,
      rain: 1.2,
      showers: 0,
    });
  });

  it("drops the whole weather instead of inventing a value for a missing field", () => {
    for (const feld of Object.keys(voll) as (keyof typeof voll)[]) {
      expect(szeneWetter({ ...voll, [feld]: null })).toBeNull();
    }
    expect(szeneWetter(undefined)).toBeNull();
  });
});
