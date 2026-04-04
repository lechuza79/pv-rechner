import { NextRequest, NextResponse } from "next/server";
import {
  createCache,
  fetchCrossBorderFlows,
  fetchPublicPower,
} from "../../../../lib/energy-api";

// Countries with active nuclear power plants
const NUCLEAR_COUNTRIES = ["fr", "cz", "ch", "se", "be", "nl"] as const;

// CBPF country names → country codes (Energy-Charts uses full names)
const CBPF_NAME_TO_CODE: Record<string, string> = {
  france: "fr",
  czech_republic: "cz",
  switzerland: "ch",
  sweden: "se",
  belgium: "be",
  netherlands: "nl",
};

interface NuclearDataPoint {
  ts: string;
  nuclear_gw: number;
}

interface NuclearImportResponse {
  data: NuclearDataPoint[];
  avg_gw: number;
  avg_share_pct: number;
  source: string;
  license: string;
}

// ─── Cache ──────────────────────────────────────────────────────────────────

const cache = createCache<NuclearImportResponse>(10 * 60 * 1000); // 10 min
const longCache = createCache<NuclearImportResponse>(30 * 60 * 1000); // 30 min
const historicalCache = createCache<NuclearImportResponse>(24 * 60 * 60 * 1000); // 24h for past periods

// ─── Downsample ─────────────────────────────────────────────────────────────

function downsample(data: NuclearDataPoint[], factor: number): NuclearDataPoint[] {
  if (factor <= 1 || data.length === 0) return data;
  const result: NuclearDataPoint[] = [];
  for (let i = 0; i < data.length; i += factor) {
    const chunk = data.slice(i, i + factor);
    let sum = 0;
    let count = 0;
    for (const d of chunk) {
      if (d.nuclear_gw != null) { sum += d.nuclear_gw; count++; }
    }
    result.push({
      ts: chunk[Math.floor(chunk.length / 2)].ts,
      nuclear_gw: count > 0 ? Math.round(sum / count * 1000) / 1000 : 0,
    });
  }
  return result;
}

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
    const maxAge = isPast ? 86400 : 600;
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
      startStr = start.toISOString().slice(0, 19) + "+01:00";
      endStr = now.toISOString().slice(0, 19) + "+01:00";
    }

    // Step 1: Fetch cross-border flows (1 request)
    const cbpfRows = await fetchCrossBorderFlows("de", startStr, endStr);

    if (cbpfRows.length === 0) {
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

    // Step 2: Fetch nuclear countries in parallel (partial data is fine)
    const countryGenRows: Map<string, Map<string, { nuclear: number; total: number }>> = new Map();

    const countryResults = await Promise.allSettled(
      NUCLEAR_COUNTRIES.map(code =>
        fetchPublicPower(code, startStr, endStr, 6000, 1).then(rows => ({ code, rows }))
      )
    );

    for (const result of countryResults) {
      if (result.status === "rejected") {
        console.warn(`Nuclear import: skipping country:`, result.reason?.message || result.reason);
        continue;
      }
      const { code, rows } = result.value;
      const tsMap = new Map<string, { nuclear: number; total: number }>();
      for (const row of rows) {
        const nuclear = (row.data.nuclear as number) ?? 0;
        let total = 0;
        for (const [key, val] of Object.entries(row.data)) {
          if (
            typeof val === "number" && val > 0 &&
            !key.includes("load") &&
            !key.includes("share") &&
            !key.includes("cross_border") &&
            !key.includes("consumption")
          ) {
            total += val;
          }
        }
        tsMap.set(row.ts, { nuclear, total });
      }
      countryGenRows.set(code, tsMap);
    }

    // Build lookup: ts → { country_code → flow_gw }
    const cbpfByTs = new Map<string, Record<string, number>>();
    for (const row of cbpfRows) {
      const flows: Record<string, number> = {};
      for (const [name, val] of Object.entries(row.data)) {
        if (name === "net" || typeof val !== "number") continue;
        const code = CBPF_NAME_TO_CODE[name];
        if (code) flows[code] = val;
      }
      cbpfByTs.set(row.ts, flows);
    }

    // Calculate nuclear import per timestamp
    // For DE load %, use total import from CBPF as proxy
    // (client has actual DE load from generation data)
    let data: NuclearDataPoint[] = [];
    let totalNuclear = 0;
    let totalNetImport = 0;
    let count = 0;

    cbpfByTs.forEach((flows, ts) => {
      let nuclearGw = 0;

      for (const code of NUCLEAR_COUNTRIES) {
        const flowGw = flows[code] ?? 0;
        if (flowGw <= 0) continue; // Only imports (positive = import to DE)

        const mix = countryGenRows.get(code)?.get(ts);
        if (!mix || mix.total <= 0) continue;

        const nuclearShare = mix.nuclear / mix.total;
        nuclearGw += flowGw * nuclearShare;
      }

      data.push({ ts, nuclear_gw: Math.round(nuclearGw * 1000) / 1000 });
      totalNuclear += nuclearGw;
      count++;
    });

    // Sort by timestamp
    data.sort((a, b) => a.ts.localeCompare(b.ts));

    // Downsample for longer ranges
    if (rangeHours > 17520) {
      // >2 years: daily
      data = downsample(data, 96);
    } else if (rangeHours > 2160) {
      data = downsample(data, 24);
    } else if (rangeHours > 720) {
      data = downsample(data, 12);
    } else if (rangeHours > 168) {
      data = downsample(data, 4);
    }

    const avgGw = count > 0 ? Math.round(totalNuclear / count * 100) / 100 : 0;
    // Estimate share: avg nuclear GW / typical DE load (~45 GW)
    // Client will calculate exact % from its own generation data
    const avgSharePct = count > 0 ? Math.round(avgGw / 45 * 100 * 10) / 10 : 0;

    const response: NuclearImportResponse = {
      data,
      avg_gw: avgGw,
      avg_share_pct: avgSharePct,
      source: "Fraunhofer ISE / Energy-Charts",
      license: "CC BY 4.0",
    };

    store.set(cacheKey, response);

    const maxAge = isPast ? 86400 : 600;
    return NextResponse.json(response, {
      headers: { "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}` },
    });
  } catch (e) {
    console.error("Nuclear import fetch error:", e);
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
