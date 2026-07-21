import { supabase } from "./supabase-server";
import { PLZ_BL } from "./plz-bundesland";
import { NATIONAL_AVG_YIELD } from "./constants";

// Standort-Ertrag (kWh/kWp) als servernutzbarer Helper. War vorher nur in der
// API-Route eingeschlossen; herausgezogen, damit Server Components (z. B. die
// Gemeinde-Detailseite) denselben Weg gehen statt einen eigenen zu bauen — die
// PVGIS-Zahl ist die geteilte Rechen-Basis für alle Rechner. Route und Seite
// teilen sich diese eine Funktion.

// Bundesland-Fallback (kWh/kWp Durchschnitt), wenn PVGIS nicht erreichbar ist.
const FALLBACK: Record<string, number> = {
  BW: 1123, BY: 1123, BE: 1055, BB: 1052, HB: 991, HH: 985,
  HE: 1079, MV: 1022, NI: 1017, NW: 1035, RP: 1100, SL: 1089,
  SN: 1067, ST: 1074, SH: 983, TH: 1041,
};


export type PvgisYield = {
  annual: number;
  monthly: number[] | null;
  source: "cache" | "pvgis" | "fallback";
};

export async function getPvgisYield({
  lat,
  lon,
  plzPrefix,
}: {
  lat: number;
  lon: number;
  plzPrefix: string;
}): Promise<PvgisYield> {
  // Sofort-Fallback wenn keine (plausiblen) Koordinaten
  if (isNaN(lat) || isNaN(lon) || lat < 47 || lat > 55 || lon < 5 || lon > 16) {
    const bl = PLZ_BL[plzPrefix] || "BY";
    return { annual: FALLBACK[bl] || NATIONAL_AVG_YIELD, monthly: null, source: "fallback" };
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
      return { annual: cached.annual_kwh_per_kwp, monthly: cached.monthly, source: "cache" };
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
    const monthly: number[] | null =
      outputs.monthly?.fixed?.map((m: { E_m: number }) => Math.round(m.E_m)) || null;

    // 3. In Supabase cachen
    if (supabase && annual > 0) {
      await supabase
        .from("pvgis_cache")
        .upsert({ lat: rLat, lon: rLon, annual_kwh_per_kwp: annual, monthly }, { onConflict: "lat,lon" })
        .then(() => {});
    }

    return { annual, monthly, source: "pvgis" };
  } catch {
    // Fallback auf Bundesland-Tabelle
    const bl = PLZ_BL[plzPrefix] || "BY";
    return { annual: FALLBACK[bl] || NATIONAL_AVG_YIELD, monthly: null, source: "fallback" };
  }
}
