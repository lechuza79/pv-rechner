import { NextRequest, NextResponse } from "next/server";
import {
  SAMPLE_POINTS,
  weightedSolarNow,
  type SolarNowResponse,
  type SolarSample,
} from "../../../lib/solar-now";
import { SOLAR_STOCK_MW } from "../../../lib/mastr-data";
import plzCoords from "../../../public/plz.json";
import { modelWeatherAt, shardKey } from "../../../lib/icon-d2";
import { loadIconD2Shard } from "../../../lib/icon-d2-store";
import { nearestPlz } from "../../../lib/plz-nearest";

// How much solar Germany (or one location) is making right now.
//
// Without ?plz: one irradiance sample per Bundesland, read from the hourly DWD
// ICON-D2 snapshot (no weather service is called per visitor) and averaged
// weighted by installed capacity, so Bayern counts ~27 % and Bremen ~0.2 %.
// With ?plz: the same maths for that one point.
//
// The PLZ→coordinate lookup happens here rather than in the browser so the page
// does not have to download the 176 KB postcode table just to pick a colour.

const cache = new Map<string, { data: SolarNowResponse; ts: number }>();
const TTL = 5 * 60 * 1000;
// 5 min fresh so the morning/evening ramp shows nearly live (the value is
// interpolated between model hours); every visitor shares one edge-cached
// answer. stale-while-revalidate keeps a last-good answer for an hour, which
// cushions a missing snapshot — the theme never goes blank.
const CDN_CACHE = "public, s-maxage=300, stale-while-revalidate=3600";

const COORDS = plzCoords as unknown as Record<string, [number, number]>;

/**
 * Model weather now at each point, from the hourly DWD ICON-D2 snapshot of the
 * nearest postcode. Throws when a point has no value: a gauge averaged over
 * the points that happened to load would show a Germany that does not exist.
 */
async function fetchPoints(
  points: { lat: number; lon: number }[],
): Promise<{ ghi: number; temp: number; cloudHigh: number }[]> {
  const now = new Date();
  return Promise.all(
    points.map(async (p) => {
      const plz = nearestPlz(p.lat, p.lon);
      const shard = plz ? await loadIconD2Shard(shardKey(plz)) : null;
      const model = shard && plz ? modelWeatherAt(shard, plz, now) : null;
      if (!model || model.shortwaveRadiation === null || model.temperature === null) {
        throw new Error("model snapshot incomplete");
      }
      return { ghi: model.shortwaveRadiation, temp: model.temperature, cloudHigh: model.cloudCoverHigh ?? 0 };
    }),
  );
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
