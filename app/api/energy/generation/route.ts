import { NextRequest, NextResponse } from "next/server";
import { createCache, fetchPublicPower } from "../../../../lib/energy-api";

// In-memory cache (TTL scales with time range)
const cache = createCache<GenerationResponse>(5 * 60 * 1000);
const longCache = createCache<GenerationResponse>(30 * 60 * 1000); // 30 min for large requests

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
  const hoursBack = Math.min(Number(req.nextUrl.searchParams.get("hours")) || 24, 8784);

  const cacheKey = `${country}-${hoursBack}`;
  const store = hoursBack > 168 ? longCache : cache;
  const cached = store.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  try {
    const now = new Date();
    const start = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);

    const startStr = start.toISOString().replace("Z", "+01:00").slice(0, 19) + "+01:00";
    const endStr = now.toISOString().replace("Z", "+01:00").slice(0, 19) + "+01:00";

    const rows = await fetchPublicPower(country, startStr, endStr);

    if (rows.length === 0) {
      return NextResponse.json({ data: [], source: "error", license: "", country, resolution: "none" }, { status: 502 });
    }

    let data: GenerationDataPoint[] = rows.map((r) => ({
      ts: r.ts,
      ...r.data,
    }));

    // Downsample for longer time ranges to keep response manageable
    // 15min → hourly (4x), → 3-hourly (12x), → 6-hourly (24x)
    let resolution = "15min";
    if (hoursBack > 2160) {
      // >90 days: 6-hourly (~365 points for a year)
      data = downsample(data, 24);
      resolution = "6h";
    } else if (hoursBack > 720) {
      // >30 days: 3-hourly (~720 points for 90 days)
      data = downsample(data, 12);
      resolution = "3h";
    } else if (hoursBack > 168) {
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

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (e) {
    console.error("Energy generation fetch error:", e);
    return NextResponse.json(
      { data: [], source: "error", license: "", country, resolution: "none" },
      { status: 502 }
    );
  }
}
