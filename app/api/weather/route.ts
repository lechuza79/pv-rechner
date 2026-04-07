import { NextRequest, NextResponse } from "next/server";

// In-memory cache (warm Vercel function keeps this between requests)
const cache = new Map<string, { data: WeatherResponse; ts: number }>();
const TTL = 15 * 60 * 1000; // 15 minutes
// CDN cache-control: 15 min fresh, 1 h stale-while-revalidate
const CDN_CACHE = "public, s-maxage=900, stale-while-revalidate=3600";

interface WeatherResponse {
  current: {
    temperature: number;
    irradiance: number;
    cloudCover: number;
    isDay: boolean;
    time: string;
  };
  hourly: {
    time: string[];
    irradiance: number[];
    temperature: number[];
  };
  source: "open-meteo" | "error";
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");

  // Validate DE bounds
  if (isNaN(lat) || isNaN(lon) || lat < 47 || lat > 55 || lon < 5 || lon > 16) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  // Round to 0.01° (≈1 km) for cache consistency
  const rLat = Math.round(lat * 100) / 100;
  const rLon = Math.round(lon * 100) / 100;
  const key = `${rLat},${rLon}`;

  // Check cache
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, { headers: { "Cache-Control": CDN_CACHE } });
  }

  // Fetch from Open-Meteo
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(rLat));
    url.searchParams.set("longitude", String(rLon));
    url.searchParams.set("current", "temperature_2m,shortwave_radiation,cloud_cover,is_day");
    url.searchParams.set("hourly", "shortwave_radiation,temperature_2m");
    url.searchParams.set("forecast_days", "1");
    url.searchParams.set("timezone", "Europe/Berlin");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);

    const json = await res.json();

    const data: WeatherResponse = {
      current: {
        temperature: json.current.temperature_2m,
        irradiance: json.current.shortwave_radiation,
        cloudCover: json.current.cloud_cover,
        isDay: json.current.is_day === 1,
        time: json.current.time,
      },
      hourly: {
        time: json.hourly.time,
        irradiance: json.hourly.shortwave_radiation,
        temperature: json.hourly.temperature_2m,
      },
      source: "open-meteo",
    };

    // Cache result
    cache.set(key, { data, ts: Date.now() });

    // Evict old entries (prevent unbounded growth)
    if (cache.size > 500) {
      const now = Date.now();
      const keys = Array.from(cache.keys());
      keys.forEach(k => {
        const entry = cache.get(k);
        if (entry && now - entry.ts > TTL) cache.delete(k);
      });
    }

    return NextResponse.json(data, { headers: { "Cache-Control": CDN_CACHE } });
  } catch {
    return NextResponse.json({
      current: { temperature: 0, irradiance: 0, cloudCover: 0, isDay: false, time: "" },
      hourly: { time: [], irradiance: [], temperature: [] },
      source: "error",
    } satisfies WeatherResponse);
  }
}
