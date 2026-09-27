/**
 * Today's solar output curve for the 16 Bundesländer and Deutschland,
 * precomputed once per hourly weather snapshot.
 *
 * WHY PRECOMPUTED: the district route (/api/landkreis/solartag) builds its
 * curve on request from every member town's weather point. For a Land that is
 * hundreds of towns, for Deutschland ~11,000 and all 96 weather files. The
 * hourly snapshot job has those files in memory anyway, so it computes the
 * curves there and writes ONE small file; the page route only reads it.
 *
 * SAME MODEL AS THE DISTRICT, NOT A SECOND ONE: each town's curve comes from
 * `solarTagAusModell` at the town's representative postcode (`gemeindeGeo`),
 * and the towns are combined with `districtSolarCurve` weighted by installed
 * kWp — the district route's exact steps. The town list and kWp come from the
 * Bundesland package (lib/region-package.ts, `monitor.sites`), which is built
 * from the district packages and the kreisfreie Städte, so no town is counted
 * twice and the numbers match the district level of the same generation.
 *
 * NEVER A SMALLER TOTAL: a town without a weather point, coordinate or full-day
 * curve makes its Land unavailable (as it makes its district unavailable), and
 * Deutschland needs all 16. A day the snapshot does not fully cover is not
 * written as ready. Each day is stored under its German calendar date; the
 * route serves only today's, so yesterday's curve can never pass as today's.
 */
import { shardKey, type IconD2Shard } from "./icon-d2";
import { solarTagAusModell } from "./solar-tag-modell";
import { districtSolarCurve } from "./district-solar-curve";
import type { DistrictSite } from "./district-package";

export const REGION_SOLAR_DAY_VERSION = 1;
/** In the weather bucket, next to the snapshot it is computed from. */
export const REGION_SOLAR_DAY_PATH = "regionen/solartag.json";
export const REGION_IDS = [...Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, "0")), "de"] as const;

export type Point = { time: string; powerPct: number };
export type RegionUnavailable = "no-sites" | "no-location" | "no-weather" | "incomplete-states";
export type RegionDay =
  | { status: "ready"; points: Point[]; installedKwp: number; towns: number; runInit: string }
  | { status: "unavailable"; reason: RegionUnavailable; detail?: string };

export type RegionSolarDayFile = {
  version: number;
  generatedAt: string;
  /** Model run of the newest snapshot this file was written from (each ready day names its own). */
  runInit: string;
  snapshotFirstHour: string;
  /** District/region package generation the town lists come from, or null. */
  generation: string | null;
  /** German calendar date → region id → curve. */
  days: Record<string, Record<string, RegionDay>>;
};

export type TownGeo = { plz: string; lat: number; lon: number } | null;

/**
 * Curves for every region for one German day `[start, end)`.
 * `states` maps "01"…"16" to that Land's site list (null = not available).
 */
export function regionDay(
  states: Record<string, DistrictSite[] | null>,
  geo: ReadonlyMap<string, TownGeo>,
  shard: (key: string) => IconD2Shard | null,
  bounds: [number, number],
  runInit: string,
): Record<string, RegionDay> {
  const memo = new Map<string, Point[] | null>();
  const curveOf = (ags: string): Point[] | null | "no-location" => {
    const g = geo.get(ags);
    if (!g || !Number.isFinite(g.lat) || !Number.isFinite(g.lon)) return "no-location";
    if (!memo.has(ags)) {
      const s = shard(shardKey(g.plz));
      memo.set(ags, s ? solarTagAusModell(s, g.plz, g.lat, g.lon, bounds) : null);
    }
    return memo.get(ags)!;
  };
  const combine = (sites: DistrictSite[]): RegionDay => {
    const rows: { kwp: number; points: Point[] | null }[] = [];
    for (const site of sites) {
      const c = curveOf(site.ags);
      if (c === "no-location") return { status: "unavailable", reason: "no-location", detail: site.ags };
      if (!c) return { status: "unavailable", reason: "no-weather", detail: site.ags };
      rows.push({ kwp: site.kwp, points: c });
    }
    const points = districtSolarCurve(rows);
    return points
      ? { status: "ready", points, installedKwp: sites.reduce((t, s) => t + s.kwp, 0), towns: sites.length, runInit }
      : { status: "unavailable", reason: "no-weather" };
  };

  const out: Record<string, RegionDay> = {};
  for (const id of REGION_IDS.slice(0, 16)) {
    const sites = states[id];
    out[id] = sites?.length ? combine(sites) : { status: "unavailable", reason: "no-sites" };
  }
  const missing = REGION_IDS.slice(0, 16).filter((id) => out[id].status !== "ready");
  if (missing.length) out.de = { status: "unavailable", reason: "incomplete-states", detail: missing.join(",") };
  else {
    const all = REGION_IDS.slice(0, 16).flatMap((id) => states[id]!);
    out.de = new Set(all.map((s) => s.ags)).size === all.length ? combine(all) : { status: "unavailable", reason: "no-sites", detail: "duplicate town" };
  }
  return out;
}

/**
 * The next file from the previous one and this run's results. Only `keep`
 * days survive (today and tomorrow), so nothing older than today can be read.
 * A day this run could not compute keeps an earlier run's ready curve for the
 * SAME day: the snapshot's window slides, and an hourly start GitHub skips must
 * not blank a curve that was already complete. A new ready curve always wins.
 */
export function mergeDays(prev: RegionSolarDayFile | null, next: RegionSolarDayFile["days"], keep: string[]): RegionSolarDayFile["days"] {
  const out: RegionSolarDayFile["days"] = {};
  for (const day of keep) {
    const before = prev?.version === REGION_SOLAR_DAY_VERSION ? prev.days?.[day] ?? {} : {};
    const now = next[day] ?? {};
    const merged: Record<string, RegionDay> = {};
    for (const id of REGION_IDS) {
      const n = now[id], b = before[id];
      merged[id] = n?.status === "ready" || b?.status !== "ready" ? n ?? b ?? { status: "unavailable", reason: "no-weather" } : b;
    }
    // Deutschland is only ready as the sum of 16 ready Länder of one run's weather.
    if (merged.de.status === "ready" && REGION_IDS.slice(0, 16).some((id) => merged[id].status !== "ready")) merged.de = { status: "unavailable", reason: "incomplete-states" };
    out[day] = merged;
  }
  return out;
}

/**
 * What the page may show: today's ready curve, or why not. `today` is the
 * German calendar date (heuteInBerlin()); any other day in the file is ignored.
 */
export function regionToday(file: RegionSolarDayFile | null, id: string, today: string):
  | { ok: true; points: Point[]; installedKwp: number; towns: number; day: string; runInit: string }
  | { ok: false; reason: "no-file" | "not-today" | RegionUnavailable } {
  if (!file || file.version !== REGION_SOLAR_DAY_VERSION || !file.days) return { ok: false, reason: "no-file" };
  const day = file.days[today]?.[id];
  if (!day) return { ok: false, reason: "not-today" };
  if (day.status !== "ready") return { ok: false, reason: day.reason };
  return { ok: true, points: day.points, installedKwp: day.installedKwp, towns: day.towns, day: today, runInit: day.runInit };
}
