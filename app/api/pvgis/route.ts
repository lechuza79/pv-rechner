import { NextRequest, NextResponse } from "next/server";
import { getPvgisYield } from "../../../lib/pvgis";
import { rateLimit } from "../../../lib/rate-limit";

// PVGIS values for a given rounded coordinate are effectively stationary.
// Cache aggressively on the Vercel CDN so repeat requests skip the function entirely.
const CDN_CACHE_LONG = "public, s-maxage=2592000, stale-while-revalidate=2592000"; // 30 days
const CDN_CACHE_FALLBACK = "public, s-maxage=86400, stale-while-revalidate=604800"; // 1 day

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "pvgis");
  if (limited) return limited;

  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");
  const plzPrefix = req.nextUrl.searchParams.get("plzPrefix") || "";

  const result = await getPvgisYield({ lat, lon, plzPrefix });
  const cacheControl = result.source === "fallback" ? CDN_CACHE_FALLBACK : CDN_CACHE_LONG;
  return NextResponse.json(result, { headers: { "Cache-Control": cacheControl } });
}
