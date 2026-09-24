import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "../../../lib/rate-limit";
import { modelHours, modelWeatherAt, shardKey } from "../../../lib/icon-d2";
import { loadIconD2Shard } from "../../../lib/icon-d2-store";
import { nearestPlz } from "../../../lib/plz-nearest";
import { berlinTagesgrenzen } from "../../../lib/zeit";
import { sunElevation } from "../../../lib/solar-tilt";

// Today's weather at a point: DWD ICON-D2 from the hourly snapshot of the
// nearest postcode. No weather service is called per visitor; the answer is
// only as fresh as the snapshot (hourly), which is what the CDN time says.
const CDN_CACHE = "public, s-maxage=900, stale-while-revalidate=3600";

export interface WeatherResponse {
  current: {
    temperature: number;
    irradiance: number;
    cloudCover: number;
    isDay: boolean;
    /** German local time, "YYYY-MM-DDTHH:MM", floored to 15 minutes. */
    time: string;
  };
  hourly: {
    /** German local hours of today, "YYYY-MM-DDTHH:00". */
    time: string[];
    irradiance: number[];
    temperature: number[];
  };
  source: "dwd-icon-d2" | "error";
}

const LOCAL = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const localIso = (ms: number) => LOCAL.format(new Date(ms)).replace(" ", "T");

const EMPTY: WeatherResponse = {
  current: { temperature: 0, irradiance: 0, cloudCover: 0, isDay: false, time: "" },
  hourly: { time: [], irradiance: [], temperature: [] },
  source: "error",
};

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "weather");
  if (limited) return limited;

  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");
  if (isNaN(lat) || isNaN(lon) || lat < 47 || lat > 55 || lon < 5 || lon > 16) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const plz = nearestPlz(lat, lon);
  const shard = plz ? await loadIconD2Shard(shardKey(plz)) : null;
  const now = new Date();
  const [dayStart, dayEnd] = berlinTagesgrenzen(now);
  const day = shard && plz ? modelHours(shard, plz, dayStart, dayEnd) : null;
  const model = shard && plz ? modelWeatherAt(shard, plz, now) : null;

  // A day with a hole would draw a flat line nobody measured or modelled; an
  // explicit error lets the page say that the weather is missing instead.
  if (!day || !model || day.shortwave.some((v) => v === null) || day.temperature.some((v) => v === null)
    || model.temperature === null || model.shortwaveRadiation === null || model.cloudCover === null) {
    return NextResponse.json(EMPTY, { headers: { "Cache-Control": "public, s-maxage=60" } });
  }

  const quarter = Math.floor(now.getTime() / 900000) * 900000;
  const data: WeatherResponse = {
    current: {
      temperature: Math.round(model.temperature * 10) / 10,
      irradiance: Math.round(model.shortwaveRadiation),
      cloudCover: Math.round(model.cloudCover),
      isDay: sunElevation(lat, lon, now.getTime()) > 0,
      time: localIso(quarter),
    },
    hourly: {
      time: day.times.map(localIso),
      irradiance: day.shortwave.map((v) => Math.round(v as number)),
      temperature: day.temperature.map((v) => Math.round((v as number) * 10) / 10),
    },
    source: "dwd-icon-d2",
  };
  return NextResponse.json(data, { headers: { "Cache-Control": CDN_CACHE } });
}
