/**
 * DWD live weather (/api/weather-now) in the shape the approved stage
 * validates (fields of its former source). Missing is missing: if any
 * required field is absent the stage shows its "Wetterdaten fehlen" state.
 */
export type WeatherNow = {
  weather?: {
    time?: string | null;
    weatherCode?: number | null;
    cloudCover?: number | null;
    cloudCoverLow?: number | null;
    cloudCoverMid?: number | null;
    cloudCoverHigh?: number | null;
    temperature?: number | null;
    windSpeed?: number | null;
    windDirection?: number | null;
    precipitationRate?: number | null;
  };
};

const zahl = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Exported for tests: never fills a gap with an invented value. */
export function szeneWetter(w: WeatherNow["weather"]) {
  if (!w) return null;
  const zeit = w.time ? Date.parse(w.time) : NaN;
  const pflicht = [w.temperature, w.cloudCover, w.windSpeed, w.windDirection, w.weatherCode, w.precipitationRate];
  if (!pflicht.every(zahl) || !Number.isFinite(zeit)) return null;
  return {
    current: {
      time: Math.round(zeit / 1000),
      temperature_2m: w.temperature,
      cloud_cover: w.cloudCover,
      cloud_cover_low: zahl(w.cloudCoverLow) ? w.cloudCoverLow : null,
      cloud_cover_mid: zahl(w.cloudCoverMid) ? w.cloudCoverMid : null,
      cloud_cover_high: zahl(w.cloudCoverHigh) ? w.cloudCoverHigh : null,
      // m/s, as the stage requested it from its old source (wind_speed_unit=ms).
      wind_speed_10m: w.windSpeed,
      wind_direction_10m: w.windDirection,
      weather_code: w.weatherCode,
      rain: w.precipitationRate,
      showers: 0,
    },
  };
}

