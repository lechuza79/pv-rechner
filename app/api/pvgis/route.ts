import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase-server";

// Bundesland-Fallback (kWh/kWp Durchschnitt)
const FALLBACK: Record<string, number> = {
  BW: 1123, BY: 1123, BE: 1055, BB: 1052, HB: 991, HH: 985,
  HE: 1079, MV: 1022, NI: 1017, NW: 1035, RP: 1100, SL: 1089,
  SN: 1067, ST: 1074, SH: 983, TH: 1041,
};

// PLZ-Prefix (2 Stellen) → Bundesland-Kürzel
const PLZ_BL: Record<string, string> = {
  "01": "SN", "02": "SN", "03": "BB", "04": "SN", "06": "ST", "07": "TH",
  "08": "SN", "09": "SN", "10": "BE", "12": "BE", "13": "BE", "14": "BB",
  "15": "BB", "16": "BB", "17": "MV", "18": "MV", "19": "MV", "20": "HH",
  "21": "NI", "22": "HH", "23": "SH", "24": "SH", "25": "SH", "26": "NI",
  "27": "NI", "28": "HB", "29": "NI", "30": "NI", "31": "NI", "32": "NW",
  "33": "NW", "34": "HE", "35": "HE", "36": "HE", "37": "NI", "38": "NI",
  "39": "ST", "40": "NW", "41": "NW", "42": "NW", "44": "NW", "45": "NW",
  "46": "NW", "47": "NW", "48": "NW", "49": "NI", "50": "NW", "51": "NW",
  "52": "NW", "53": "NW", "54": "RP", "55": "RP", "56": "RP", "57": "NW",
  "58": "NW", "59": "NW", "60": "HE", "61": "HE", "63": "HE", "64": "HE",
  "65": "HE", "66": "SL", "67": "RP", "68": "BW", "69": "BW", "70": "BW",
  "71": "BW", "72": "BW", "73": "BW", "74": "BW", "75": "BW", "76": "BW",
  "77": "BW", "78": "BW", "79": "BW", "80": "BY", "81": "BY", "82": "BY",
  "83": "BY", "84": "BY", "85": "BY", "86": "BY", "87": "BY", "88": "BW",
  "89": "BW", "90": "BY", "91": "BY", "92": "BY", "93": "BY", "94": "BY",
  "95": "BY", "96": "BY", "97": "BY", "98": "TH", "99": "TH",
};

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");
  const plzPrefix = req.nextUrl.searchParams.get("plzPrefix") || "";

  // Sofort-Fallback wenn keine Koordinaten
  if (isNaN(lat) || isNaN(lon) || lat < 47 || lat > 55 || lon < 5 || lon > 16) {
    const bl = PLZ_BL[plzPrefix] || "BY";
    return NextResponse.json({ annual: FALLBACK[bl] || 1050, monthly: null, source: "fallback" });
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
      return NextResponse.json({
        annual: cached.annual_kwh_per_kwp,
        monthly: cached.monthly,
        source: "cache",
      });
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

    return NextResponse.json({ annual, monthly, source: "pvgis" });
  } catch {
    // 3. Fallback auf Bundesland-Tabelle
    const bl = PLZ_BL[plzPrefix] || "BY";
    return NextResponse.json({ annual: FALLBACK[bl] || 1050, monthly: null, source: "fallback" });
  }
}
