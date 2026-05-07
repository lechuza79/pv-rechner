import { NextRequest, NextResponse } from "next/server";
import { createCache, fetchPublicPower } from "../../../../lib/energy-api";

// Whitelist of actual generation keys (everything else from Energy-Charts —
// load, residual_load, cross_border_electricity_trading, etc. — must be ignored).
const GENERATION_KEYS = new Set([
  "solar",
  "wind_onshore",
  "wind_offshore",
  "fossil_gas",
  "fossil_coal_derived_gas",
  "fossil_hard_coal",
  "fossil_brown_coal_lignite",
  "fossil_oil",
  "biomass",
  "geothermal",
  "hydro_run_of_river",
  "hydro_water_reservoir",
  "hydro_pumped_storage",
  "nuclear",
  "waste",
  "others",
]);

// Lifecycle CO2 emission factors (g CO2 eq / kWh) for current German mix.
// Sources: UBA "Strommix-Emissionen" (2024), IPCC AR6 lifecycle medians.
// Values are coarse but appropriate for a single headline number on the widget.
const CO2_FACTORS: Record<string, number> = {
  fossil_brown_coal_lignite: 1100,
  fossil_hard_coal: 820,
  fossil_oil: 720,
  fossil_gas: 490,
  fossil_coal_derived_gas: 820,
  waste: 700,
  others: 400,
  biomass: 230,
  solar: 45,
  wind_onshore: 11,
  wind_offshore: 12,
  hydro_run_of_river: 24,
  hydro_water_reservoir: 24,
  hydro_pumped_storage: 24,
  geothermal: 38,
  nuclear: 12,
};

interface StrommixResponse {
  updatedAt: string;
  mix: {
    solar: number;
    wind: number;
    gas: number;
    kohle: number;
    sonstige: number;
  };
  co2PerKwh: number;
}

const cache = createCache<StrommixResponse>(5 * 60 * 1000);
const CACHE_KEY = "de";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const CACHE_HEADER = "public, s-maxage=300, stale-while-revalidate=600";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function aggregate(
  rows: Awaited<ReturnType<typeof fetchPublicPower>>,
): StrommixResponse | null {
  // Walk rows from newest to oldest, find the latest row that has actual data
  // (skip rows where all production types are null — happens for the most
  // recent timestamp Energy-Charts hasn't filled yet).
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    const data = row.data;

    let solar = 0;
    let wind = 0;
    let gas = 0;
    let kohle = 0;
    let sonstige = 0;
    let total = 0;
    let weightedCo2 = 0;
    let hasValue = false;

    for (const [key, raw] of Object.entries(data)) {
      if (!GENERATION_KEYS.has(key)) continue;
      const v = typeof raw === "number" ? raw : 0;
      if (v <= 0) continue;
      hasValue = true;
      total += v;
      weightedCo2 += v * (CO2_FACTORS[key] ?? 400);

      if (key === "solar") solar += v;
      else if (key === "wind_onshore" || key === "wind_offshore") wind += v;
      else if (key === "fossil_gas" || key === "fossil_coal_derived_gas") gas += v;
      else if (
        key === "fossil_hard_coal" ||
        key === "fossil_brown_coal_lignite"
      )
        kohle += v;
      else sonstige += v;
    }

    if (!hasValue || total <= 0) continue;

    const pct = (n: number) => Math.round((n / total) * 1000) / 10;

    return {
      updatedAt: row.ts,
      mix: {
        solar: pct(solar),
        wind: pct(wind),
        gas: pct(gas),
        kohle: pct(kohle),
        sonstige: pct(sonstige),
      },
      co2PerKwh: Math.round(weightedCo2 / total),
    };
  }

  return null;
}

export async function GET(_req: NextRequest) {
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { ...CORS_HEADERS, "Cache-Control": CACHE_HEADER },
    });
  }

  try {
    // Fetch the last 3 hours so we can fall back to slightly older rows if
    // the most recent timestamp hasn't been published yet.
    const now = new Date();
    const start = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d.toISOString().replace("Z", "+01:00").slice(0, 19) + "+01:00";

    // Energy-Charts can be slow under load. Retry network failures with
    // exponential backoff before giving up on the upstream.
    let rows: Awaited<ReturnType<typeof fetchPublicPower>> = [];
    let lastErr: unknown = null;
    const attempts = [
      { timeout: 8000, wait: 0 },
      { timeout: 12000, wait: 1500 },
      { timeout: 20000, wait: 3000 },
    ];
    for (const a of attempts) {
      if (a.wait) await new Promise((r) => setTimeout(r, a.wait));
      try {
        rows = await fetchPublicPower("de", fmt(start), fmt(now), a.timeout, 0);
        if (rows.length > 0) break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (rows.length === 0 && lastErr) throw lastErr;

    const response = aggregate(rows);

    if (!response) {
      const stale = cache.getStale(CACHE_KEY);
      if (stale) {
        return NextResponse.json(stale, {
          headers: {
            ...CORS_HEADERS,
            "Cache-Control": "public, s-maxage=60",
            "X-Data-Stale": "true",
          },
        });
      }
      return NextResponse.json(
        { error: "no data available" },
        { status: 502, headers: CORS_HEADERS },
      );
    }

    cache.set(CACHE_KEY, response);
    return NextResponse.json(response, {
      headers: { ...CORS_HEADERS, "Cache-Control": CACHE_HEADER },
    });
  } catch (e) {
    console.error("strommix embed fetch error:", e);
    const stale = cache.getStale(CACHE_KEY);
    if (stale) {
      return NextResponse.json(stale, {
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "public, s-maxage=60",
          "X-Data-Stale": "true",
        },
      });
    }
    return NextResponse.json(
      { error: "upstream unavailable" },
      { status: 502, headers: CORS_HEADERS },
    );
  }
}
