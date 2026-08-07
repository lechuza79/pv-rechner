import { NextRequest, NextResponse } from "next/server";
import { createCache } from "../../../../lib/energy-api";
import { rateLimit } from "../../../../lib/rate-limit";

// Installierte PV-Leistung (Solar DC, GWp) je Monat aus der Energy-Charts-API —
// Grundlage der Zubau/Wetter-Zerlegung in der Solar-Trend-Karte. Proxy statt
// Direkt-Fetch im Browser (Legal-Checkliste #2: keine Nutzer-IP an Dritte).
// Monatsdaten ändern sich höchstens monatlich → 24h in-memory + 24h CDN.

export const runtime = "nodejs";

interface InstalledPowerResponse {
  /** Monats-Schlüssel "MM.YYYY" wie von Energy-Charts geliefert. */
  time: string[];
  /** Installierte Solarleistung (DC, GWp) je Monat, gleiche Reihenfolge. */
  solarDcGw: (number | null)[];
  source: string;
  license: string;
}

const cache = createCache<InstalledPowerResponse>(24 * 60 * 60 * 1000);

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "energy-installed-power");
  if (limited) return limited;

  const cached = cache.get("de-monthly");
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" },
    });
  }

  try {
    const res = await fetch(
      "https://api.energy-charts.info/installed_power?country=de&time_step=monthly&installation_decommission=false",
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} from api.energy-charts.info`);
    const data = (await res.json()) as {
      time: string[];
      production_types: { name: string; data: (number | null)[] }[];
    };
    const solar = data.production_types.find((p) => p.name === "Solar DC");
    if (!solar) throw new Error("Solar DC series missing in installed_power response");

    const payload: InstalledPowerResponse = {
      time: data.time,
      solarDcGw: solar.data,
      source: "Fraunhofer ISE / Energy-Charts",
      license: "CC BY 4.0",
    };
    cache.set("de-monthly", payload);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" },
    });
  } catch (err) {
    const stale = cache.getStale("de-monthly");
    if (stale) {
      return NextResponse.json(stale, {
        headers: { "Cache-Control": "public, s-maxage=3600" },
      });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
