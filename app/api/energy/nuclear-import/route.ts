import { NextRequest, NextResponse } from "next/server";
import { createCache } from "../../../../lib/energy-api";
import {
  computeNuclearImport,
  NuclearImportDataError,
  type NuclearImportResponse,
} from "../../../../lib/nuclear-import";

// ─── Cache ──────────────────────────────────────────────────────────────────

const cache = createCache<NuclearImportResponse>(10 * 60 * 1000); // 10 min
const longCache = createCache<NuclearImportResponse>(30 * 60 * 1000); // 30 min
const historicalCache = createCache<NuclearImportResponse>(24 * 60 * 60 * 1000); // 24h for past periods

// ─── GET Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const startParam = req.nextUrl.searchParams.get("start"); // ISO date e.g. "2025-01-01"
  const endParam = req.nextUrl.searchParams.get("end");     // ISO date e.g. "2025-12-31"
  const hoursBack = Math.min(Number(req.nextUrl.searchParams.get("hours")) || 24, 8784);

  const isAbsolute = !!(startParam && endParam);
  const cacheKey = isAbsolute ? `nuclear-${startParam}-${endParam}` : `nuclear-${hoursBack}`;
  const rangeHours = isAbsolute
    ? Math.ceil((new Date(endParam + "T23:59:59Z").getTime() - new Date(startParam + "T00:00:00Z").getTime()) / 3600000)
    : hoursBack;

  // Historical (past) periods get 24h cache; they don't change
  const isPast = isAbsolute && new Date(endParam + "T23:59:59Z").getTime() < Date.now() - 2 * 24 * 3600000;
  const store = isPast ? historicalCache : rangeHours > 168 ? longCache : cache;
  const cached = store.get(cacheKey);
  if (cached) {
    const maxAge = isPast ? 2592000 : 600; // 30 days for past periods
    return NextResponse.json(cached, {
      headers: { "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}` },
    });
  }

  let startStr: string;
  let endStr: string;
  if (isAbsolute) {
    startStr = startParam + "T00:00:00+01:00";
    endStr = endParam + "T23:59:59+01:00";
  } else {
    const now = new Date();
    const start = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
    startStr = start.toISOString().slice(0, 19) + "+01:00";
    endStr = now.toISOString().slice(0, 19) + "+01:00";
  }

  try {
    const response = await computeNuclearImport(startStr, endStr, rangeHours);
    store.set(cacheKey, response);

    const maxAge = isPast ? 2592000 : 600; // 30 days for past periods
    return NextResponse.json(response, {
      headers: { "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}` },
    });
  } catch (e) {
    if (!(e instanceof NuclearImportDataError)) {
      console.error("Nuclear import fetch error:", e);
    }
    // Return stale cached data if available
    const stale = store.getStale(cacheKey);
    if (stale) {
      return NextResponse.json(stale, {
        headers: { "Cache-Control": "public, s-maxage=60", "X-Data-Stale": "true" },
      });
    }
    return NextResponse.json(
      { data: [], avg_gw: 0, avg_share_pct: 0, source: "error", license: "" },
      { status: 502 }
    );
  }
}
