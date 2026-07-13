import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";

// ─── Price-pipeline health (public, read-only) ───────────────────────────────
// Single source of truth for the self-healing watcher agent. It reports whether
// the latest auto-scrape produced healthy multi-source prices and how old they
// are. No secrets, no writes — safe to poll.
//
// status:
//   "ok"       – latest scrape healthy (≥2 agreeing sources) and fresh
//   "degraded" – ran, but single-source / kept-last-value, OR data is stale
//   "failed"   – the latest stored row is a scrape error, or nothing readable
//
// The watcher escalates to a human only when it cannot restore "ok" itself.

const STALE_DAYS = 40; // monthly cron → anything older than ~40 days means a run was missed

function daysSince(isoDate: string): number {
  const then = new Date(isoDate + "T00:00:00Z").getTime();
  return Math.floor((Date.now() - then) / 86_400_000);
}

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ status: "failed", reason: "database not configured" }, { status: 200 });
  }

  try {
    // Most recent row of ANY kind — an error row being newest is itself a signal.
    const { data: latest } = await supabase
      .from("market_prices")
      .select("source, notes, valid_from, battery_per_kwh, battery_base, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!latest) {
      return NextResponse.json({ status: "failed", reason: "no rows" }, { status: 200 });
    }

    if (latest.source === "SCRAPE_ERROR") {
      return NextResponse.json({
        status: "failed",
        reason: "latest run errored",
        notes: latest.notes,
        validFrom: latest.valid_from,
      }, { status: 200 });
    }

    const notes: string = latest.notes ?? "";
    const healthMatch = notes.match(/HEALTH=(\w+)/);
    const scrapeHealth = healthMatch ? healthMatch[1].toLowerCase() : "unknown";
    // Per-value electricity marker written by the scrape ("Strom[ok|MISS|STALE]").
    // A STALE electricity price already flips the overall HEALTH= to DEGRADED, but
    // surfacing it by name makes the watcher's reason precise instead of a bare
    // "scrape degraded".
    const elecMatch = notes.match(/Strom\[(\w+)/);
    const electricityHealth = elecMatch ? elecMatch[1].toLowerCase() : "unknown";
    const ageDays = daysSince(latest.valid_from);
    const stale = ageDays > STALE_DAYS;

    // "ok" requires BOTH a healthy scrape AND fresh data.
    let status: "ok" | "degraded" | "failed" = "ok";
    const reasons: string[] = [];
    if (scrapeHealth !== "ok") { status = "degraded"; reasons.push(`scrape ${scrapeHealth}`); }
    if (electricityHealth === "stale") { status = "degraded"; reasons.push("electricity price stale (2+ runs without a fresh scrape)"); }
    if (stale) { status = "degraded"; reasons.push(`stale (${ageDays}d old)`); }

    return NextResponse.json({
      status,
      reasons,
      scrapeHealth,
      electricityHealth,
      ageDays,
      batteryPerKwh: Number(latest.battery_per_kwh),
      batteryBase: Number(latest.battery_base),
      validFrom: latest.valid_from,
      source: latest.source,
      notes,
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({
      status: "failed",
      reason: err instanceof Error ? err.message : "unknown error",
    }, { status: 200 });
  }
}
