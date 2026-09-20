import { NextRequest, NextResponse } from "next/server";
// @ts-expect-error seek-bzip ships no types
import Bunzip from "seek-bzip";
import { rateLimit } from "../../../lib/rate-limit";
import { modelWeatherAt, shardKey } from "../../../lib/icon-d2";
import { loadIconD2Shard } from "../../../lib/icon-d2-store";
import { parseRadolan, precipitationRatePerHour, radolanValueAt, type RadolanGrid } from "../../../lib/dwd-radolan";
import { combineWeather } from "../../../lib/weather-now";
import plzCoords from "../../../public/plz.json";
import { DATA_SOURCES, sourceLabel } from "../../../lib/data-sources";

// Live weather for one postcode: DWD ICON-D2 for the sky (from the hourly
// snapshot, never the archive itself), DWD radar for precipitation.
//
// Every visitor of a postcode shares one CDN answer for five minutes; the radar
// changes every five, the model every hour. Nothing here calls a weather API
// per visitor.

const COORDS = plzCoords as unknown as Record<string, [number, number]>;
const CDN_CACHE = "public, s-maxage=300, stale-while-revalidate=900";
const RADAR_URL = "https://opendata.dwd.de/weather/radar/radolan/ry/raa01-ry_10000-latest-dwd---bin.bz2";

/** The radar file changes every five minutes. */
const RADAR_TTL = 2 * 60 * 1000;
let radar: { grid: RadolanGrid | null; at: number } | null = null;

async function loadRadar(): Promise<RadolanGrid | null> {
  if (radar && Date.now() - radar.at < RADAR_TTL) return radar.grid;
  let grid: RadolanGrid | null = null;
  try {
    const response = await fetch(RADAR_URL, {
      signal: AbortSignal.timeout(4000),
      headers: { "user-agent": "solar-check.io weather-now" },
    });
    if (response.ok) grid = parseRadolan(Bunzip.decode(Buffer.from(await response.arrayBuffer())));
  } catch {
    grid = null;
  }
  if (!grid && radar?.grid) grid = radar.grid;
  radar = { grid, at: Date.now() };
  return grid;
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "weather-now");
  if (limited) return limited;

  const plz = req.nextUrl.searchParams.get("plz") ?? "";
  if (!/^\d{5}$/.test(plz)) return NextResponse.json({ error: "Invalid plz" }, { status: 400 });
  const coords = COORDS[plz];
  if (!coords) return NextResponse.json({ error: "Unknown plz" }, { status: 404 });

  const now = new Date();
  const [shard, grid] = await Promise.all([loadIconD2Shard(shardKey(plz)), loadRadar()]);
  const model = shard ? modelWeatherAt(shard, plz, now) : null;

  let radarRate: number | null = null;
  if (grid) {
    try {
      const amount = radolanValueAt(grid, coords[0], coords[1]);
      radarRate = amount === null ? null : precipitationRatePerHour(grid, amount);
    } catch {
      radarRate = null; // unknown format version: no measured rain, not zero rain
    }
  }
  const weather = combineWeather({ now, model, radarRate, radarMeasuredAt: grid?.time ?? null });

  return NextResponse.json(
    {
      plz,
      location: { latitude: coords[0], longitude: coords[1] },
      weather,
      // From the source register, never typed here: the credit must read the same
      // at the scene, on the sources page and in a shared image.
      // "Datenbasis:", not "Quelle:": the scene is a reworking, and "Quelle" next
      // to it reads like an official DWD product (CC BY Sec. 2(a)(6)).
      attribution: `Datenbasis: ${sourceLabel(DATA_SOURCES.dwdRadar)} · ${sourceLabel(DATA_SOURCES.iconD2Archive)}`,
    },
    { headers: { "Cache-Control": CDN_CACHE } },
  );
}
