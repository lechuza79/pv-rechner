import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase-server";
import { DEFAULT_PRICES } from "../../../../lib/prices-config";

// ─── Weekly price report / health alert (email via Resend) ───────────────────
// Vercel Cron: runs WEEKLY (Mondays). Two jobs in one, so the alert path never
// depends on Claude/the scheduled-task watchers (which share a monthly spend
// limit and can all go silent at once):
//   • Pipeline healthy  → stay quiet, EXCEPT once a month (first Monday) send the
//     full digest as before — the monthly heartbeat/change-log is preserved.
//   • Pipeline degraded → email EVERY week until it recovers, so a broken source
//     surfaces within days instead of waiting up to a month for the next digest.
// This is the Vercel-native safety net: it runs even when every Claude watcher
// is blocked. The self-healing watcher still handles the repair side on top.
//
// Auth: Authorization: Bearer $CRON_SECRET (Vercel Cron sends it automatically).

const CRON_SECRET = process.env.CRON_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM ?? "Solar Check <onboarding@resend.dev>";
const RECIPIENTS = Array.from(new Set((process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean)));

interface PriceRow {
  pv_price_small: number; pv_price_large: number;
  battery_base: number; battery_per_kwh: number;
  electricity_price: number | null; electricity_increase: number | null;
  wp_lwwp_base: number | null; wp_lwwp_per_kw: number | null;
  valid_from: string; notes: string | null;
}
interface FeedRow {
  teil_under_10: number; teil_over_10: number; voll_under_10: number; voll_over_10: number;
  valid_from: string; source: string | null;
}

function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// Render "current (Δ vs. last month)" with a sign and colour.
function delta(curr: number | null | undefined, prev: number | null | undefined, digits = 0): string {
  if (curr == null || prev == null || !Number.isFinite(curr) || !Number.isFinite(prev)) return "—";
  const d = curr - prev;
  if (Math.abs(d) < Math.pow(10, -digits) / 2) return `<span style="color:#777">±0</span>`;
  const sign = d > 0 ? "+" : "−";
  const color = d > 0 ? "#EF4444" : "#00A03C"; // teurer = rot, günstiger = grün
  return `<span style="color:${color}">${sign}${fmt(Math.abs(d), digits)}</span>`;
}

function row(label: string, value: string, change: string, source: string): string {
  return `<tr>
    <td style="padding:8px 12px;border-bottom:1px solid #eee">${label}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:monospace;text-align:right">${value}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:monospace;text-align:right">${change}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#777;font-size:12px">${source}</td>
  </tr>`;
}

export async function GET(req: Request) {
  if (!CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";

  try {
    // Newest row = current. Order by date AND insertion time so that when several
    // rows share a date (e.g. a re-run), the most recent wins.
    const { data: latest } = await supabase
      .from("market_prices")
      .select("pv_price_small, pv_price_large, battery_base, battery_per_kwh, electricity_price, electricity_increase, wp_lwwp_base, wp_lwwp_per_kw, valid_from, notes")
      .neq("source", "SCRAPE_ERROR")
      .gt("pv_price_small", 0)
      .order("valid_from", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!latest) {
      return NextResponse.json({ error: "No price data" }, { status: 422 });
    }
    const curr = latest as PriceRow;

    // Previous = newest row with a strictly earlier date (true month-over-month,
    // robust against multiple same-day rows from manual re-runs).
    const { data: prevRows } = await supabase
      .from("market_prices")
      .select("pv_price_small, pv_price_large, battery_base, battery_per_kwh, electricity_price, electricity_increase, wp_lwwp_base, wp_lwwp_per_kw, valid_from, notes")
      .neq("source", "SCRAPE_ERROR")
      .gt("pv_price_small", 0)
      .lt("valid_from", curr.valid_from)
      .order("valid_from", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);
    const prev = (prevRows?.[0] ?? null) as PriceRow | null;

    const { data: feedData } = await supabase
      .from("feed_in_rates")
      .select("teil_under_10, teil_over_10, voll_under_10, voll_over_10, valid_from, source")
      .order("valid_from", { ascending: false })
      .limit(1)
      .single();
    const feed = feedData as FeedRow | null;

    const health = (curr.notes?.match(/HEALTH=(\w+)/)?.[1] ?? "unbekannt").toUpperCase();
    const healthColor = health === "OK" ? "#00A03C" : "#EF4444";

    // Weekly cadence, but only two situations actually send a mail:
    //  1) health != OK        → weekly warning until the pipeline recovers.
    //  2) first Monday of month → the monthly full digest (heartbeat), even if OK.
    // getUTCDate() is evaluated at runtime (no hard-coded date, rollover-safe);
    // days 1–7 contain exactly one Monday, so the digest fires once per month.
    const isWarning = health !== "OK";
    const isMonthlyDigestSlot = new Date().getUTCDate() <= 7;
    const shouldSend = isWarning || isMonthlyDigestSlot;

    const sapSrc = "taptaphome.com (vormals solaranlagen-portal.com)";
    const battSrc = "taptaphome + energie-experten (Mittel)";
    const wpSrc = "taptaphome.com (WP-Kostenübersicht)";
    const stromSrc = "strom-report.de";
    const feedSrc = feed?.source ?? "Bundesnetzagentur";

    const ct = (v: number | null | undefined) => (v == null ? null : v * 100); // €/kWh → ct/kWh
    const pct = (v: number | null | undefined) => (v == null ? null : v * 100);
    // electricity_increase is a fixed assumption, often stored null → mirror the
    // effective value the app uses (DB value or default fallback).
    const currInc = curr.electricity_increase ?? DEFAULT_PRICES.electricityIncrease;
    const prevInc = prev ? (prev.electricity_increase ?? DEFAULT_PRICES.electricityIncrease) : null;

    const rows = [
      row("PV-Preis ≤10 kWp", `${fmt(curr.pv_price_small)} €/kWp`, delta(curr.pv_price_small, prev?.pv_price_small), sapSrc),
      row("PV-Preis >10 kWp", `${fmt(curr.pv_price_large)} €/kWp`, delta(curr.pv_price_large, prev?.pv_price_large), sapSrc),
      row("Speicher-Basis (Installation)", `${fmt(curr.battery_base)} €`, delta(curr.battery_base, prev?.battery_base), "Fixwert"),
      row("Speicher Zell-Preis", `${fmt(curr.battery_per_kwh)} €/kWh`, delta(curr.battery_per_kwh, prev?.battery_per_kwh), battSrc),
      row("WP-Grundpreis Luft/Wasser", `${fmt(curr.wp_lwwp_base)} € + ${fmt(curr.wp_lwwp_per_kw)} €/kW`, delta(curr.wp_lwwp_base, prev?.wp_lwwp_base), wpSrc),
      row("Haushaltsstrom", `${fmt(ct(curr.electricity_price), 1)} ct/kWh`, delta(ct(curr.electricity_price), ct(prev?.electricity_price), 1), stromSrc),
      row("Strompreis-Steigerung", `${fmt(pct(currInc), 1)} %/a`, delta(pct(currInc), pct(prevInc), 1), "Annahme"),
      feed ? row("Einspeisung Teil ≤10 kWp", `${fmt(feed.teil_under_10, 2)} ct/kWh`, "—", feedSrc) : "",
      feed ? row("Einspeisung Teil >10 kWp", `${fmt(feed.teil_over_10, 2)} ct/kWh`, "—", feedSrc) : "",
      feed ? row("Einspeisung Voll ≤10 kWp", `${fmt(feed.voll_under_10, 2)} ct/kWh`, "—", feedSrc) : "",
      feed ? row("Einspeisung Voll >10 kWp", `${fmt(feed.voll_over_10, 2)} ct/kWh`, "—", feedSrc) : "",
    ].join("");

    const subject = isWarning
      ? `Solar Check – ⚠️ Preis-Pipeline ${health} (Stand ${curr.valid_from})`
      : `Solar Check – Preis-Report ${curr.valid_from}`;
    // A degraded run repeats weekly until fixed → tell the reader why, so a
    // recurring mail reads as "still broken", not as a duplicate glitch.
    const warningBanner = isWarning
      ? `<p style="background:#FEF2F2;border:1px solid #EF4444;border-radius:8px;padding:12px 14px;margin:0 0 16px;font-size:14px;color:#3F3F3F">
          <b style="color:#EF4444">⚠️ Die Preis-Pipeline ist nicht gesund (${health}).</b><br>
          Der ausgelieferte Preis kann trotzdem stimmen (letzter guter Wert wird gehalten) — aber eine Datenquelle liefert nicht mehr sauber. Diese Warnung kommt wöchentlich, bis der Status wieder OK ist. Details siehe „Pipeline-Status" und die Quellen-Spalte unten.
        </p>`
      : "";
    const html = `<div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;color:#3F3F3F">
      <h2 style="margin:0 0 4px">Solar Check – ${isWarning ? "Preis-Pipeline: Warnung" : "Monatlicher Preis-Report"}</h2>
      <p style="color:#777;margin:0 0 16px">Stand ${curr.valid_from}${prev ? ` · Vergleich zu ${prev.valid_from}` : " · (kein Vormonat zum Vergleich)"}</p>
      ${warningBanner}
      <p style="margin:0 0 16px">Pipeline-Status: <b style="color:${healthColor}">${health}</b></p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <thead><tr style="text-align:left;color:#777;font-size:12px;text-transform:uppercase">
          <th style="padding:8px 12px">Attribut</th>
          <th style="padding:8px 12px;text-align:right">Aktuell</th>
          <th style="padding:8px 12px;text-align:right">Δ Vormonat</th>
          <th style="padding:8px 12px">Quelle</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#949494;font-size:12px;margin-top:16px">Automatisch erzeugt von solar-check.io · Werte aus der live gepflegten Preis-Datenbank.</p>
    </div>`;

    if (dryRun) {
      return NextResponse.json({ dryRun: true, subject, recipients: RECIPIENTS, health, shouldSend, isWarning, isMonthlyDigestSlot, html });
    }

    // Healthy week that isn't the monthly digest slot → stay quiet (no inbox spam).
    if (!shouldSend) {
      return NextResponse.json({ success: true, sent: false, reason: "healthy, not monthly digest slot", health });
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }
    if (RECIPIENTS.length === 0) {
      return NextResponse.json({ error: "No recipients (set ADMIN_EMAILS)" }, { status: 500 });
    }

    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: RESEND_FROM, to: RECIPIENTS, subject, html }),
    });

    if (!send.ok) {
      const detail = await send.text();
      console.error(`[Price Report] Resend failed ${send.status}: ${detail}`);
      return NextResponse.json({ error: "Send failed", status: send.status, detail }, { status: 502 });
    }

    console.log(`[Price Report] Sent to ${RECIPIENTS.join(", ")} (health=${health})`);
    return NextResponse.json({ success: true, sentTo: RECIPIENTS, subject, health });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Price Report] Exception: ${message}`);
    return NextResponse.json({ error: "Report failed", details: message }, { status: 500 });
  }
}
