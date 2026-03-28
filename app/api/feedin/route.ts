import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase-server";
import { DEFAULT_FEED_IN, type FeedInRates } from "../../../lib/feedin-config";

let cached: { data: FeedInRates; ts: number } | null = null;
const TTL = 60 * 60 * 1000; // 1 hour

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

// ─── GET: Current feed-in rates (public) ──────────────────────────────────────

export async function GET() {
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  }

  if (!supabase) {
    return NextResponse.json(DEFAULT_FEED_IN);
  }

  try {
    const { data, error } = await supabase
      .from("feed_in_rates")
      .select("*")
      .lte("valid_from", new Date().toISOString().split("T")[0])
      .order("valid_from", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json(DEFAULT_FEED_IN);
    }

    const rates: FeedInRates = {
      teilUnder10: Number(data.teil_under_10),
      teilOver10: Number(data.teil_over_10),
      vollUnder10: Number(data.voll_under_10),
      vollOver10: Number(data.voll_over_10),
      thresholdKwp: Number(data.threshold_kwp),
      validFrom: data.valid_from,
      source: data.source,
    };

    cached = { data: rates, ts: Date.now() };

    return NextResponse.json(rates, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json(DEFAULT_FEED_IN);
  }
}

// ─── POST: Admin update ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { createClient } = await import("../../../lib/supabase-server-component");
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { teilUnder10, teilOver10, vollUnder10, vollOver10, validFrom, source, notes } = body;

    if (!teilUnder10 || !teilOver10 || !vollUnder10 || !vollOver10 || !validFrom) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("feed_in_rates")
      .insert({
        teil_under_10: teilUnder10,
        teil_over_10: teilOver10,
        voll_under_10: vollUnder10,
        voll_over_10: vollOver10,
        threshold_kwp: 10,
        valid_from: validFrom,
        source: source || "Manual (Admin)",
        notes: notes || null,
        updated_by: user.email,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    cached = null;

    return NextResponse.json({ success: true, id: data.id });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
