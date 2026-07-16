import { NextRequest, NextResponse } from "next/server";
import {
  SAMPLE_POINTS,
  weightedSolarNow,
  type SolarNowResponse,
  type SolarSample,
} from "../../../lib/solar-now";
import { SOLAR_STOCK_MW } from "../../../lib/mastr-data";
import plzCoords from "../../../public/plz.json";

// How much solar Germany (or one location) is making right now.
//
// Without ?plz: one irradiance sample per Bundesland — fetched in a SINGLE
// upstream request (Open-Meteo takes comma-separated coordinates) and averaged
// weighted by installed capacity, so Bayern counts ~27 % and Bremen ~0.2 %.
// With ?plz: the same maths for that one point.
//
// The PLZ→coordinate lookup happens here rather than in the browser so the page
// does not have to download the 176 KB postcode table just to pick a colour.

const cache = new Map<string, { data: SolarNowResponse; ts: number }>();
const TTL = 15 * 60 * 1000;
// Matches the upstream refresh; every visitor shares one edge-cached answer.
const CDN_CACHE = "public, s-maxage=900, stale-while-revalidate=3600";

const COORDS = plzCoords as unknown as Record<string, [number, number]>;

type OpenMeteoPoint = {
  current?: {
    shortwave_radiation?: number;
    temperature_2m?: number;
    cloud_cover_high?: number;
  };
};

async function fetchPoints(
  points: { lat: number; lon: number }[],
): Promise<{ ghi: number; temp: number; cloudHigh: number }[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", points.map((p) => p.lat).join(","));
  url.searchParams.set("longitude", points.map((p) => p.lon).join(","));
  // cloud_cover_high corrects the cirrus the radiation model under-weights.
  url.searchParams.set("current", "shortwave_radiation,temperature_2m,cloud_cover_high");
  url.searchParams.set("timezone", "UTC");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);

  const json = await res.json();
  // Single-coordinate requests return an object, multi-coordinate an array.
  const list: OpenMeteoPoint[] = Array.isArray(json) ? json : [json];
  if (list.length !== points.length) throw new Error("Open-Meteo point count mismatch");

  return list.map((p) => ({
    ghi: p.current?.shortwave_radiation ?? 0,
    temp: p.current?.temperature_2m ?? 15,
    cloudHigh: p.current?.cloud_cover_high ?? 0,
  }));
}

export async function GET(req: NextRequest) {
  const plzParam = req.nextUrl.searchParams.get("plz");
  const plz = plzParam && /^\d{5}$/.test(plzParam) ? plzParam : null;
  if (plzParam && !plz) {
    return NextResponse.json({ error: "Invalid plz" }, { status: 400 });
  }
  const coords = plz ? COORDS[plz] : null;
  if (plz && !coords) {
    return NextResponse.json({ error: "Unknown plz" }, { status: 404 });
  }

  const key = plz ?? "de";
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, { headers: { "Cache-Control": CDN_CACHE } });
  }

  try {
    let data: SolarNowResponse;

    if (plz && coords) {
      const [lat, lon] = coords;
      const [point] = await fetchPoints([{ lat, lon }]);
      const sample: SolarSample = { ags: "point", lat, lon, ...point };
      data = {
        ...weightedSolarNow([sample], { point: 1 }, new Date()),
        scope: "plz",
        plz,
        asOf: new Date().toISOString(),
      };
    } else {
      const readings = await fetchPoints(SAMPLE_POINTS);
      const samples: SolarSample[] = SAMPLE_POINTS.map((p, i) => ({
        ags: p.ags,
        lat: p.lat,
        lon: p.lon,
        ...readings[i],
      }));
      data = {
        ...weightedSolarNow(samples, SOLAR_STOCK_MW, new Date()),
        scope: "de",
        asOf: new Date().toISOString(),
      };
    }

    cache.set(key, { data, ts: Date.now() });
    if (cache.size > 500) {
      const now = Date.now();
      Array.from(cache.keys()).forEach((k) => {
        const entry = cache.get(k);
        if (entry && now - entry.ts > TTL) cache.delete(k);
      });
    }

    return NextResponse.json(data, { headers: { "Cache-Control": CDN_CACHE } });
  } catch {
    // No data → the caller keeps the sun-position theme and shows no figure.
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
