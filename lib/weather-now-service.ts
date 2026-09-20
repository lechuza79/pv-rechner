// @ts-expect-error seek-bzip ships no types
import Bunzip from "seek-bzip";
import { modelWeatherAt, shardKey } from "./icon-d2";
import { loadIconD2Shard } from "./icon-d2-store";
import { parseRadolan, precipitationRatePerHour, radolanValueAt, type RadolanGrid } from "./dwd-radolan";
import { combineWeather } from "./weather-now";
import plzCoords from "../public/plz.json";
import { DATA_SOURCES, sourceLabel } from "./data-sources";

/** Shared by the public endpoint and the stage; one snapshot/radar read per process. */
const COORDS = plzCoords as unknown as Record<string, [number, number]>;
const RADAR_URL = "https://opendata.dwd.de/weather/radar/radolan/ry/raa01-ry_10000-latest-dwd---bin.bz2";

/** The radar file changes every five minutes. */
const RADAR_TTL = 2 * 60 * 1000;
let radarPending: Promise<RadolanGrid | null> | null = null;
let radar: { grid: RadolanGrid | null; at: number } | null = null;

async function loadRadar(): Promise<RadolanGrid | null> {
  if (radar && Date.now() - radar.at < RADAR_TTL) return radar.grid;
  if (radarPending) return radarPending;
  radarPending = refreshRadar().finally(() => { radarPending = null; });
  return radarPending;
}

async function refreshRadar(): Promise<RadolanGrid | null> {
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

export async function readWeatherNow(plz: string) {
  const coords = COORDS[plz];
  if (!coords) throw new Error("Unknown postcode");
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

  return {
    plz,
    location: { latitude: coords[0], longitude: coords[1] },
    weather,
    // From the source register, never typed here: the credit must read the same
    // at the scene, on the sources page and in a shared image.
    // "Datenbasis:", not "Quelle:": the scene is a reworking, and "Quelle" next
    // to it reads like an official DWD product (CC BY Sec. 2(a)(6)).
    attribution: `Datenbasis: ${sourceLabel(DATA_SOURCES.dwdRadar)} · ${sourceLabel(DATA_SOURCES.iconD2Archive)}`,
  };
}
