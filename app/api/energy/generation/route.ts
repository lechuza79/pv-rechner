import { NextRequest, NextResponse } from "next/server";
import { createCache, fetchPublicPower } from "../../../../lib/energy-api";

// In-memory cache (TTL scales with time range)
const cache = createCache<GenerationResponse>(5 * 60 * 1000);
const longCache = createCache<GenerationResponse>(30 * 60 * 1000); // 30 min for large requests
const historicalCache = createCache<GenerationResponse>(24 * 60 * 60 * 1000); // 24h for past periods

interface GenerationDataPoint {
  ts: string;
  [key: string]: number | string | null;
}

interface GenerationResponse {
  data: GenerationDataPoint[];
  source: string;
  license: string;
  country: string;
  resolution: string;
}

// ─── Downsample: average N consecutive data points into 1 ─────────────────────

function downsample(data: GenerationDataPoint[], factor: number): GenerationDataPoint[] {
  if (factor <= 1 || data.length === 0) return data;

  const result: GenerationDataPoint[] = [];
  const numericKeys = Object.keys(data[0]).filter(k => k !== "ts" && typeof data[0][k] === "number");

  for (let i = 0; i < data.length; i += factor) {
    const chunk = data.slice(i, i + factor);
    const merged: GenerationDataPoint = { ts: chunk[Math.floor(chunk.length / 2)].ts };

    for (const key of numericKeys) {
      let sum = 0;
      let count = 0;
      for (const d of chunk) {
        const val = d[key];
        if (typeof val === "number") { sum += val; count++; }
      }
      merged[key] = count > 0 ? Math.round(sum / count * 10) / 10 : null;
    }

    result.push(merged);
  }

  return result;
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get("country") || "de";
  const startParam = req.nextUrl.searchParams.get("start"); // ISO date e.g. "2025-01-01"
  const endParam = req.nextUrl.searchParams.get("end");     // ISO date e.g. "2025-12-31"
  const hoursBack = Math.min(Number(req.nextUrl.searchParams.get("hours")) || 24, 8784);

  // Determine time range: absolute start/end takes priority over hours
  const isAbsolute = !!(startParam && endParam);
  const cacheKey = isAbsolute ? `${country}-${startParam}-${endParam}` : `${country}-${hoursBack}`;
  const rangeHours = isAbsolute
    ? Math.ceil((new Date(endParam + "T23:59:59Z").getTime() - new Date(startParam + "T00:00:00Z").getTime()) / 3600000)
    : hoursBack;

  // Historical (past) periods get 24h cache; they don't change
  const isPast = isAbsolute && new Date(endParam + "T23:59:59Z").getTime() < Date.now() - 2 * 24 * 3600000;
  const store = isPast ? historicalCache : rangeHours > 168 ? longCache : cache;
  const cached = store.get(cacheKey);
  if (cached) {
    const maxAge = isPast ? 2592000 : 300; // 30 days for past periods
    return NextResponse.json(cached, {
      headers: { "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}` },
    });
  }

  try {
    let startStr: string;
    let endStr: string;

    if (isAbsolute) {
      startStr = startParam + "T00:00:00+01:00";
      endStr = endParam + "T23:59:59+01:00";
    } else {
      const now = new Date();
      const start = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
      startStr = start.toISOString().replace("Z", "+01:00").slice(0, 19) + "+01:00";
      endStr = now.toISOString().replace("Z", "+01:00").slice(0, 19) + "+01:00";
    }

    const rows = await fetchPublicPower(country, startStr, endStr);

    if (rows.length === 0) {
      const stale = store.getStale(cacheKey);
      if (stale) {
        return NextResponse.json(stale, {
          headers: { "Cache-Control": "public, s-maxage=60", "X-Data-Stale": "true" },
        });
      }
      return NextResponse.json({ data: [], source: "error", license: "", country, resolution: "none" }, { status: 502 });
    }

    let data: GenerationDataPoint[] = rows.map((r) => ({
      ts: r.ts,
      ...r.data,
    }));

    // Downsample for longer time ranges to keep response manageable
    // 15min → hourly (4x), → 3-hourly (12x), → 6-hourly (24x), → daily (96x)
    let resolution = "15min";
    if (rangeHours > 17520) {
      // >2 years: daily (~3650 points for 10 years)
      data = downsample(data, 96);
      resolution = "1d";
    } else if (rangeHours > 2160) {
      // >90 days: 6-hourly (~365 points for a year)
      data = downsample(data, 24);
      resolution = "6h";
    } else if (rangeHours > 720) {
      // >30 days: 3-hourly (~720 points for 90 days)
      data = downsample(data, 12);
      resolution = "3h";
    } else if (rangeHours > 168) {
      // >7 days: hourly (~720 points for 30 days)
      data = downsample(data, 4);
      resolution = "1h";
    }

    const response: GenerationResponse = {
      data,
      source: "Fraunhofer ISE / Energy-Charts",
      license: "CC BY 4.0",
      country,
      resolution,
    };

    store.set(cacheKey, response);

    const maxAge = isPast ? 2592000 : 300; // 30 days for past periods
    return NextResponse.json(response, {
      headers: { "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}` },
    });
  } catch (e) {
    console.error("Energy generation fetch error:", e);
    // Return stale cached data if available
    const stale = store.getStale(cacheKey);
    if (stale) {
      return NextResponse.json(stale, {
        headers: { "Cache-Control": "public, s-maxage=60", "X-Data-Stale": "true" },
      });
    }
    return NextResponse.json(
      { data: [], source: "error", license: "", country, resolution: "none" },
      { status: 502 }
    );
  }
}
