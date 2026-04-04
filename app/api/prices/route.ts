import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase-server";
import { DEFAULT_PRICES, type PriceConfig } from "../../../lib/prices-config";

// In-memory cache (warm Vercel function keeps this between requests)
let cached: { data: PriceConfig; ts: number } | null = null;
const TTL = 60 * 60 * 1000; // 1 hour

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

// ─── GET: Current prices (public) ─────────────────────────────────────────────

export async function GET() {
  // Check cache
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  }

  if (!supabase) {
    return NextResponse.json(DEFAULT_PRICES);
  }

  try {
    const { data, error } = await supabase
      .from("market_prices")
      .select("*")
      .neq("source", "SCRAPE_ERROR")
      .gt("pv_price_small", 0)
      .lte("valid_from", new Date().toISOString().split("T")[0])
      .order("valid_from", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json(DEFAULT_PRICES);
    }

    const prices: PriceConfig = {
      pvPriceSmall: Number(data.pv_price_small),
      pvPriceLarge: Number(data.pv_price_large),
      pvThresholdKwp: Number(data.pv_threshold_kwp),
      batteryBase: Number(data.battery_base),
      batteryPerKwh: Number(data.battery_per_kwh),
      validFrom: data.valid_from,
      source: data.source,
    };

    cached = { data: prices, ts: Date.now() };

    return NextResponse.json(prices, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json(DEFAULT_PRICES);
  }
}

// ─── POST: Admin manual update ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  // Auth check: require admin email
  const { createClient } = await import("../../../lib/supabase-server-component");
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { pvPriceSmall, pvPriceLarge, pvThresholdKwp, batteryBase, batteryPerKwh, validFrom, source, notes } = body;

    // Type + bounds validation
    const num = (v: unknown, min: number, max: number): number | null => {
      const n = Number(v);
      return isFinite(n) && n >= min && n <= max ? n : null;
    };
    const pSmall = num(pvPriceSmall, 500, 3000);
    const pLarge = num(pvPriceLarge, 500, 3000);
    const bPerKwh = num(batteryPerKwh, 100, 2000);
    const threshold = num(pvThresholdKwp, 1, 50) ?? 10;
    const bBase = num(batteryBase, 0, 10000) ?? 0;

    if (!pSmall || !pLarge || !bPerKwh) {
      return NextResponse.json({ error: "Invalid or missing price values (pvPriceSmall: 500-3000, pvPriceLarge: 500-3000, batteryPerKwh: 100-2000)" }, { status: 400 });
    }
    if (typeof validFrom !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(validFrom)) {
      return NextResponse.json({ error: "validFrom must be YYYY-MM-DD" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("market_prices")
      .insert({
        pv_price_small: pSmall,
        pv_price_large: pLarge,
        pv_threshold_kwp: threshold,
        battery_base: bBase,
        battery_per_kwh: bPerKwh,
        valid_from: validFrom,
        source: typeof source === "string" ? source.slice(0, 100) : "Manual (Admin)",
        notes: typeof notes === "string" ? notes.slice(0, 500) : null,
        updated_by: user.email,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Invalidate cache
    cached = null;

    return NextResponse.json({ success: true, id: data.id });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
