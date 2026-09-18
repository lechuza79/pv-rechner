import { NextRequest, NextResponse } from "next/server";
// @ts-expect-error seek-bzip ships no types
import Bunzip from "seek-bzip";
import { rateLimit } from "../../../lib/rate-limit";
import { supabase } from "../../../lib/supabase-server";
import { DB_SOFT_READ_TIMEOUT_MS, withDbTimeout } from "../../../lib/db-timeout";
import { modelWeatherAt, shardKey, snapshotPath, SNAPSHOT_BUCKET, type IconD2Shard } from "../../../lib/icon-d2";
import { parseRadolan, precipitationRatePerHour, radolanValueAt, type RadolanGrid } from "../../../lib/dwd-radolan";
import { combineWeather } from "../../../lib/weather-now";
import { readFile } from "node:fs/promises";
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

/** Snapshot shards change hourly; ten minutes in memory keeps reads rare. */
const SHARD_TTL = 10 * 60 * 1000;
const shards = new Map<string, { shard: IconD2Shard | null; at: number }>();
/** The radar file changes every five minutes. */
const RADAR_TTL = 2 * 60 * 1000;
let radar: { grid: RadolanGrid | null; at: number } | null = null;

async function loadShard(key: string): Promise<IconD2Shard | null> {
  const hit = shards.get(key);
  if (hit && Date.now() - hit.at < SHARD_TTL) return hit.shard;
  let shard: IconD2Shard | null = null;
  const localDir = process.env.WEATHER_SNAPSHOT_DIR;
  if (localDir) {
    // Local development and tests read a snapshot written with `--lokal`, so a
    // check never needs the production store.
    shard = await readFile(`${localDir}/${key}.json`, "utf8").then((text) => JSON.parse(text) as IconD2Shard, () => null);
  } else if (supabase) {
    try {
      const { data, error } = await withDbTimeout(
        supabase.storage.from(SNAPSHOT_BUCKET).download(snapshotPath(key)),
        "weather-now snapshot",
        DB_SOFT_READ_TIMEOUT_MS,
      );
      if (!error && data) shard = JSON.parse(await data.text()) as IconD2Shard;
    } catch {
      shard = null;
    }
  }
  // Keep the last good shard over a failed read; a failed read is not "no sky".
  if (!shard && hit?.shard) shard = hit.shard;
  shards.set(key, { shard, at: Date.now() });
  return shard;
}

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
  const [shard, grid] = await Promise.all([loadShard(shardKey(plz)), loadRadar()]);
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
