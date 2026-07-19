import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase-server";
import { DEFAULT_PRICES, type PriceConfig } from "../../../lib/prices-config";
import { DEFAULT_HEATPUMP_PRICES } from "../../../lib/heatpump-prices";

// The public price payload = PV/battery/electricity (PriceConfig) + the live
// Wärmepumpen-Grundpreis (Luft/Wasser). usePrices() reads the PriceConfig part,
// useHeatpumpPrices() the wp fields — both hit this one cached endpoint.
type PricePayload = PriceConfig & { wpLwwpBase: number; wpLwwpPerKw: number };
const DEFAULT_PAYLOAD: PricePayload = {
  ...DEFAULT_PRICES,
  wpLwwpBase: DEFAULT_HEATPUMP_PRICES.investLwwpBase,
  wpLwwpPerKw: DEFAULT_HEATPUMP_PRICES.investLwwpPerKw,
};

// In-memory cache (warm Vercel function keeps this between requests)
let cached: { data: PricePayload; ts: number } | null = null;
const TTL = 60 * 60 * 1000; // 1 hour

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

// Run on every request so the in-memory cache + CDN header below actually govern
// freshness. Without this, Next.js statically caches this argument-less GET at
// build time and never runs the handler again until the next deploy — a scrape
// that updates the DB without a deploy would stay invisible. (See 2026-07-18.)
export const dynamic = "force-dynamic";

// ─── GET: Current prices (public) ─────────────────────────────────────────────

export async function GET() {
  // Check cache
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  }

  if (!supabase) {
    return NextResponse.json(DEFAULT_PAYLOAD);
  }

  try {
    const { data, error } = await supabase
      .from("market_prices")
      .select("*")
      .neq("source", "SCRAPE_ERROR")
      .gt("pv_price_small", 0)
      .lte("valid_from", new Date().toISOString().split("T")[0])
      .order("valid_from", { ascending: false })
      .order("created_at", { ascending: false }) // tiebreaker: newest insertion wins on same-day rows
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json(DEFAULT_PAYLOAD);
    }

    const prices: PricePayload = {
      pvPriceSmall: Number(data.pv_price_small),
      pvPriceLarge: Number(data.pv_price_large),
      pvThresholdKwp: Number(data.pv_threshold_kwp),
      batteryBase: Number(data.battery_base),
      batteryPerKwh: Number(data.battery_per_kwh),
      electricityPrice: data.electricity_price != null ? Number(data.electricity_price) : DEFAULT_PRICES.electricityPrice,
      electricityIncrease: data.electricity_increase != null ? Number(data.electricity_increase) : DEFAULT_PRICES.electricityIncrease,
      validFrom: data.valid_from,
      source: data.source,
      // WP columns may be absent on older rows (pre-migration) → fall back to config.
      wpLwwpBase: data.wp_lwwp_base != null ? Number(data.wp_lwwp_base) : DEFAULT_HEATPUMP_PRICES.investLwwpBase,
      wpLwwpPerKw: data.wp_lwwp_per_kw != null ? Number(data.wp_lwwp_per_kw) : DEFAULT_HEATPUMP_PRICES.investLwwpPerKw,
    };

    cached = { data: prices, ts: Date.now() };

    return NextResponse.json(prices, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json(DEFAULT_PAYLOAD);
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
    const { pvPriceSmall, pvPriceLarge, pvThresholdKwp, batteryBase, batteryPerKwh, electricityPrice, electricityIncrease, wpLwwpBase, wpLwwpPerKw, validFrom, source, notes } = body;

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
    const elecPrice = num(electricityPrice, 0.10, 1.00);
    const elecIncrease = num(electricityIncrease, -0.05, 0.20);
    // WP base is auto-scraped; a manual insert must not wipe it. Carry forward the
    // last stored WP values (or config default), overridable via the body.
    const { data: lastWp } = await supabase
      .from("market_prices")
      .select("wp_lwwp_base, wp_lwwp_per_kw")
      .neq("source", "SCRAPE_ERROR")
      .gt("pv_price_small", 0)
      .order("valid_from", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    const wpBase = num(wpLwwpBase, 3000, 30000)
      ?? (lastWp?.wp_lwwp_base != null ? Number(lastWp.wp_lwwp_base) : DEFAULT_HEATPUMP_PRICES.investLwwpBase);
    const wpPerKw = num(wpLwwpPerKw, 200, 4000)
      ?? (lastWp?.wp_lwwp_per_kw != null ? Number(lastWp.wp_lwwp_per_kw) : DEFAULT_HEATPUMP_PRICES.investLwwpPerKw);

    if (!pSmall || !pLarge || !bPerKwh) {
      return NextResponse.json({ error: "Invalid or missing price values (pvPriceSmall: 500-3000, pvPriceLarge: 500-3000, batteryPerKwh: 100-2000)" }, { status: 400 });
    }
    if (!elecPrice || elecIncrease === null) {
      return NextResponse.json({ error: "Invalid electricity values (electricityPrice: 0.10-1.00 €/kWh, electricityIncrease: -0.05 to 0.20)" }, { status: 400 });
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
        electricity_price: elecPrice,
        electricity_increase: elecIncrease,
        wp_lwwp_base: wpBase,
        wp_lwwp_per_kw: wpPerKw,
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
