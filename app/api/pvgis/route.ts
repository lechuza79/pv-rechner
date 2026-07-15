import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase-server";
import { PLZ_BL } from "../../../lib/plz-bundesland";
import { rateLimit } from "../../../lib/rate-limit";

// PVGIS values for a given rounded coordinate are effectively stationary.
// Cache aggressively on the Vercel CDN so repeat requests skip the function entirely.
const CDN_CACHE_LONG = "public, s-maxage=2592000, stale-while-revalidate=2592000"; // 30 days
const CDN_CACHE_FALLBACK = "public, s-maxage=86400, stale-while-revalidate=604800"; // 1 day

// Bundesland-Fallback (kWh/kWp Durchschnitt)
const FALLBACK: Record<string, number> = {
  BW: 1123, BY: 1123, BE: 1055, BB: 1052, HB: 991, HH: 985,
  HE: 1079, MV: 1022, NI: 1017, NW: 1035, RP: 1100, SL: 1089,
  SN: 1067, ST: 1074, SH: 983, TH: 1041,
};

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "pvgis");
  if (limited) return limited;

  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");
  const plzPrefix = req.nextUrl.searchParams.get("plzPrefix") || "";

  // Sofort-Fallback wenn keine Koordinaten
  if (isNaN(lat) || isNaN(lon) || lat < 47 || lat > 55 || lon < 5 || lon > 16) {
    const bl = PLZ_BL[plzPrefix] || "BY";
    return NextResponse.json(
      { annual: FALLBACK[bl] || 1050, monthly: null, source: "fallback" },
      { headers: { "Cache-Control": CDN_CACHE_FALLBACK } },
    );
  }

  // Gerundete Koordinaten für Cache (0.01° ≈ 1 km)
  const rLat = Math.round(lat * 100) / 100;
  const rLon = Math.round(lon * 100) / 100;

  // 1. Supabase Cache prüfen
  if (supabase) {
    const { data: cached } = await supabase
      .from("pvgis_cache")
      .select("annual_kwh_per_kwp, monthly")
      .eq("lat", rLat)
      .eq("lon", rLon)
      .maybeSingle();

    if (cached) {
      return NextResponse.json(
        {
          annual: cached.annual_kwh_per_kwp,
          monthly: cached.monthly,
          source: "cache",
        },
        { headers: { "Cache-Control": CDN_CACHE_LONG } },
      );
    }
  }

  // 2. PVGIS API abfragen
  try {
    const pvgisUrl = new URL("https://re.jrc.ec.europa.eu/api/v5_3/PVcalc");
    pvgisUrl.searchParams.set("lat", String(rLat));
    pvgisUrl.searchParams.set("lon", String(rLon));
    pvgisUrl.searchParams.set("peakpower", "1");
    pvgisUrl.searchParams.set("loss", "14");
    pvgisUrl.searchParams.set("optimalinclination", "1");
    pvgisUrl.searchParams.set("aspect", "0");
    pvgisUrl.searchParams.set("outputformat", "json");

    const res = await fetch(pvgisUrl.toString(), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`PVGIS ${res.status}`);

    const json = await res.json();
    const outputs = json?.outputs;
    if (!outputs?.totals?.fixed) throw new Error("Unexpected PVGIS response");

    const annual = Math.round(outputs.totals.fixed.E_y);
    const monthly = outputs.monthly?.fixed?.map((m: { E_m: number }) => Math.round(m.E_m)) || null;

    // 3. In Supabase cachen
    if (supabase && annual > 0) {
      await supabase.from("pvgis_cache").upsert({
        lat: rLat,
        lon: rLon,
        annual_kwh_per_kwp: annual,
        monthly: monthly,
      }, { onConflict: "lat,lon" }).then(() => {});
    }

    return NextResponse.json(
      { annual, monthly, source: "pvgis" },
      { headers: { "Cache-Control": CDN_CACHE_LONG } },
    );
  } catch {
    // 3. Fallback auf Bundesland-Tabelle
    const bl = PLZ_BL[plzPrefix] || "BY";
    return NextResponse.json(
      { annual: FALLBACK[bl] || 1050, monthly: null, source: "fallback" },
      { headers: { "Cache-Control": CDN_CACHE_FALLBACK } },
    );
  }
}
