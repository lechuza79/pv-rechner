import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "../../../lib/rate-limit";
import { readWeatherNow } from "../../../lib/weather-now-service";
import { szeneWetter } from "../../../lib/szene-wetter";
import plzCoords from "../../../public/plz.json";

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "weather-now");
  if (limited) return limited;
  const plz = req.nextUrl.searchParams.get("plz") ?? "";
  if (!/^\d{5}$/.test(plz)) return NextResponse.json({ error: "Invalid plz" }, { status: 400 });
  if (!(plz in plzCoords)) return NextResponse.json({ error: "Unknown plz" }, { status: 404 });
  const data = await readWeatherNow(plz);
  // An unavailable sky must never become a cached success.
  return NextResponse.json(data, { headers: {
    "Cache-Control": szeneWetter(data.weather)
      ? "public, s-maxage=300, stale-while-revalidate=900" : "no-store",
  } });
}
