// ─── Legal note (verified 2026-07-08) ─────────────────────────────────────────
// This route extracts a small set of aggregated market averages from public
// pages: ~6 PV price-per-kWp data points and 1 battery all-in price per month
// (plus 1 electricity price from a separate source). This is lawful under German law: it
// takes an insubstantial part of the respective site's data (§ 87b UrhG
// database-right threshold — a handful of published averages, not a systematic
// re-extraction of the underlying dataset), does not circumvent any technical
// access control, and every source domain's robots.txt permits crawling these
// pages (taptaphome.com robots.txt has no Disallow rules). Requests identify with
// an honest, descriptive User-Agent.

import { NextResponse } from "next/server";
import { heuteInBerlin } from "../../../../lib/zeit";
import * as cheerio from "cheerio";
import { scrapeFromHtml, derivePvTiers, equipmentStorageQuote, installedStorageValue } from "../../../../lib/market-price-parser";
import { supabase } from "../../../../lib/supabase-server";
import { DEFAULT_PRICES } from "../../../../lib/prices-config";

// Vercel Cron: called monthly via vercel.json crons config.
// Manual trigger: send Authorization: Bearer $CRON_SECRET header.
// (Query params would leak the secret into browser history and access logs.)

const CRON_SECRET = process.env.CRON_SECRET;

// Plausibility bounds
const BOUNDS = {
  pvMin: 800, pvMax: 2500,       // €/kWp
  batteryMin: 50, batteryMax: 800, // €/kWh Zell-Preis (ohne Installations-Basis)
  electricityMin: 0.20, electricityMax: 0.50, // €/kWh Haushaltsstrom Bestandskunden
  maxDeviation: 0.30,            // 30% max change from last value
};

// solaranlagen-portal.com rebranded to taptaphome.com (same operator, DAA GmbH)
// and now 301-redirects here — point at the canonical URL directly.
const SOURCE_URL = "https://www.taptaphome.com/de/ratgeber/photovoltaik/solaranlage-kosten";
const ELECTRICITY_SOURCE_URL = "https://strom-report.de/strompreise/";
// Second, independent battery-price source for cross-checking.
const BATTERY_SOURCE_2_URL = "https://www.energie-experten.org/erneuerbare-energien/photovoltaik/stromspeicher/kosten";

// Absolute plausibility window for an all-in 10-kWh home battery (€, incl. install).
const BATTERY_10KWH = { min: 2500, max: 7000 };
// Two sources count as "agreeing" if within this relative spread of the median.
const BATTERY_AGREE_SPREAD = 0.30;

// ─── Scraping Logic ───────────────────────────────────────────────────────────

function parseGermanNumber(s: string): number { return Number(s.replace(/\./g, "").replace(",", ".")); }

// ─── Multi-source battery price (cross-check + average) ──────────────────────
// Every source is normalised to the SAME quantity: all-in € for a 10-kWh home
// battery (incl. installation). Then: average agreeing sources, drop outliers,
// fall back gracefully, and never write an implausible value.

interface BatterySample { source: string; value: number | null; evidence?: { min: number; max: number; scope: "equipment-only"; quote: string } | null }
interface BatteryResolution {
  value10kWh: number | null;   // averaged all-in € for 10 kWh; null = no usable source
  status: string;              // health summary (stored, read by the watcher)
  healthy: boolean;            // false → degraded (single source) or failed (none)
  samples: BatterySample[];
}

// Source 2: energie-experten.org — "350 bis 500 Euro pro Kilowattstunde" → midpoint ×10.
async function fetchBatterySource2(): Promise<NonNullable<BatterySample["evidence"]> | null> {
  try {
    const res = await fetch(BATTERY_SOURCE_2_URL, {
      headers: {
        "User-Agent": "SolarCheck-PriceBot/1.0 (solar-check.io; automated market price update)",
        "Accept": "text/html",
        "Accept-Language": "de-DE,de;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return equipmentStorageQuote(await res.text());
  } catch {
    return null;
  }
}

async function resolveBatteryPrice(sapAllIn: { kwh: number; total: number } | null): Promise<BatteryResolution> {
  // Source 1: solaranlagen-portal (already scraped) — normalise to 10 kWh.
  const sapVal = sapAllIn && sapAllIn.kwh > 0 ? Math.round((sapAllIn.total * 10) / sapAllIn.kwh) : null;
  // Source 2: energie-experten.
  const eeVal = await fetchBatterySource2();
  const samples: BatterySample[] = [
    { source: "solaranlagen-portal", value: sapVal },
    // This source explicitly excludes installation. Keep its range as evidence,
    // never average it with installed storage prices.
    { source: "energie-experten", value: installedStorageValue(eeVal), evidence: eeVal },
  ];

  const valid = samples.filter(
    (s): s is { source: string; value: number } =>
      s.value != null && s.value >= BATTERY_10KWH.min && s.value <= BATTERY_10KWH.max,
  );

  if (valid.length === 0) {
    return { value10kWh: null, status: "FAILED: no source delivered a plausible battery price", healthy: false, samples };
  }
  if (valid.length === 1) {
    // Preserve the established single-source policy. Equipment-only ranges
    // remain useful evidence but cannot provide installed-cost redundancy.
    return { value10kWh: valid[0].value, status: `ok: single source (${valid[0].source}=${valid[0].value} €; Zweitquelle nicht als Komplettpreis vergleichbar oder nicht lesbar)`, healthy: true, samples };
  }
  // ≥2 sources: drop outliers vs. median, average the rest.
  const vals = valid.map(v => v.value).sort((a, b) => a - b);
  const median = vals[Math.floor(vals.length / 2)];
  const agree = valid.filter(v => Math.abs(v.value - median) / median <= BATTERY_AGREE_SPREAD);
  const used = agree.length > 0 ? agree : valid;
  const avg = Math.round(used.reduce((s, v) => s + v.value, 0) / used.length);
  const spreadPct = Math.round(((Math.max(...used.map(u => u.value)) - Math.min(...used.map(u => u.value))) / median) * 100);
  const detail = used.map(u => `${u.source}=${u.value}`).join(", ");
  return { value10kWh: avg, status: `ok: ${used.length} sources avg ${avg} € (spread ${spreadPct}%; ${detail})`, healthy: true, samples };
}

/** All-in 10-kWh € → stable install base + market-tracking per-kWh cell price. */
function batteryTiers(value10kWh: number | null, lastPerKwh: number | null) {
  const batteryBase = DEFAULT_PRICES.batteryBase;
  const batteryPerKwh = value10kWh != null
    ? Math.max(50, Math.round((value10kWh - batteryBase) / 10))
    : (lastPerKwh ?? DEFAULT_PRICES.batteryPerKwh); // keep last good value, never garbage
  return { batteryBase, batteryPerKwh };
}

// ─── Plausibility Check ───────────────────────────────────────────────────────

async function getLastPrices(): Promise<{ pvPriceSmall: number; pvPriceLarge: number; batteryPerKwh: number; electricityPrice: number | null; electricityIncrease: number | null; electricityHealth: string | null } | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("market_prices")
    .select("pv_price_small, pv_price_large, battery_per_kwh, electricity_price, electricity_increase, notes")
    .neq("source", "SCRAPE_ERROR")
    .gt("pv_price_small", 0)
    .order("valid_from", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;
  // Electricity scrape health of the previous good row, parsed back from the
  // machine-greppable "Strom[<status>]" token in notes (null for old rows that
  // predate this marker → treated as "not a prior miss").
  const elecMatch = typeof data.notes === "string" ? data.notes.match(/Strom\[(\w+)/) : null;
  return {
    pvPriceSmall: Number(data.pv_price_small),
    pvPriceLarge: Number(data.pv_price_large),
    batteryPerKwh: Number(data.battery_per_kwh),
    electricityPrice: data.electricity_price != null ? Number(data.electricity_price) : null,
    electricityIncrease: data.electricity_increase != null ? Number(data.electricity_increase) : null,
    electricityHealth: elecMatch ? elecMatch[1].toLowerCase() : null,
  };
}

function checkPlausibility(
  newPrices: { pvPriceSmall: number; pvPriceLarge: number; batteryPerKwh: number },
  lastPrices: { pvPriceSmall: number; pvPriceLarge: number; batteryPerKwh: number } | null,
): string[] {
  const issues: string[] = [];

  if (newPrices.pvPriceSmall < BOUNDS.pvMin || newPrices.pvPriceSmall > BOUNDS.pvMax) {
    issues.push(`PV small (${newPrices.pvPriceSmall} €/kWp) outside bounds [${BOUNDS.pvMin}–${BOUNDS.pvMax}]`);
  }
  if (newPrices.pvPriceLarge < BOUNDS.pvMin || newPrices.pvPriceLarge > BOUNDS.pvMax) {
    issues.push(`PV large (${newPrices.pvPriceLarge} €/kWp) outside bounds [${BOUNDS.pvMin}–${BOUNDS.pvMax}]`);
  }
  if (newPrices.batteryPerKwh < BOUNDS.batteryMin || newPrices.batteryPerKwh > BOUNDS.batteryMax) {
    issues.push(`Battery (${newPrices.batteryPerKwh} €/kWh) outside bounds [${BOUNDS.batteryMin}–${BOUNDS.batteryMax}]`);
  }

  if (lastPrices) {
    const devSmall = Math.abs(newPrices.pvPriceSmall - lastPrices.pvPriceSmall) / lastPrices.pvPriceSmall;
    const devLarge = Math.abs(newPrices.pvPriceLarge - lastPrices.pvPriceLarge) / lastPrices.pvPriceLarge;
    const devBatt = Math.abs(newPrices.batteryPerKwh - lastPrices.batteryPerKwh) / lastPrices.batteryPerKwh;

    if (devSmall > BOUNDS.maxDeviation) {
      issues.push(`PV small deviation ${(devSmall * 100).toFixed(0)}% exceeds ${BOUNDS.maxDeviation * 100}%`);
    }
    if (devLarge > BOUNDS.maxDeviation) {
      issues.push(`PV large deviation ${(devLarge * 100).toFixed(0)}% exceeds ${BOUNDS.maxDeviation * 100}%`);
    }
    // Battery: a deploy can intentionally recalibrate the price model (e.g. new
    // base+per-kWh structure). Accept a large move from the last DB value if the
    // new value matches the shipped code default — that's a blessed correction,
    // not a scrape glitch. Only flag when it deviates from BOTH anchors.
    const devBattVsDefault = Math.abs(newPrices.batteryPerKwh - DEFAULT_PRICES.batteryPerKwh) / DEFAULT_PRICES.batteryPerKwh;
    if (devBatt > BOUNDS.maxDeviation && devBattVsDefault > BOUNDS.maxDeviation) {
      issues.push(`Battery deviation ${(devBatt * 100).toFixed(0)}% from last and ${(devBattVsDefault * 100).toFixed(0)}% from default both exceed ${BOUNDS.maxDeviation * 100}%`);
    }
  }

  return issues;
}

// ─── Electricity Price Scrape (strom-report.de) ───────────────────────────────
// Meta-Description holds the current consumer electricity prices, updated
// monthly by the source. We parse the "Bestandskunden X,Y Cent" value — that's
// the realistic average for households on existing contracts.

async function scrapeElectricityPrice(): Promise<{ price: number; note: string } | null> {
  try {
    const res = await fetch(ELECTRICITY_SOURCE_URL, {
      headers: {
        "User-Agent": "SolarCheck-PriceBot/1.0 (solar-check.io; automated market price update)",
        "Accept": "text/html",
        "Accept-Language": "de-DE,de;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    // Primary: meta description (most stable, owner maintains it for SEO)
    const meta = $('meta[name="description"]').attr("content") || "";
    // Pattern: "Bestandskunden 32,8 Cent" (case-insensitive, comma-decimal)
    let match = meta.match(/Bestandskunden[^\d]*([\d]+,[\d]+)\s*Cent/i);
    let source = "meta";

    // Fallback: page text
    if (!match) {
      const bodyText = $("body").text();
      match = bodyText.match(/Bestandskunden[^\d]*([\d]+,[\d]+)\s*Cent/i);
      source = "body";
    }

    if (!match) return null;
    const cents = parseGermanNumber(match[1]);
    const price = cents / 100; // ct → €/kWh
    return { price, note: `parsed from ${source}: "${match[0]}"` };
  } catch {
    return null;
  }
}

// ─── Notification ─────────────────────────────────────────────────────────────

async function notifyAdmin(subject: string, body: string) {
  // Log for Vercel function logs (always visible)
  console.error(`[Price Scrape Alert] ${subject}\n${body}`);

  // If Supabase is available, store as a notification record
  if (supabase) {
    await supabase.from("market_prices").insert({
      pv_price_small: 0,
      pv_price_large: 0,
      pv_threshold_kwp: 10,
      battery_base: 0,
      battery_per_kwh: 0,
      valid_from: heuteInBerlin(),
      source: "SCRAPE_ERROR",
      notes: `${subject}: ${body}`,
      updated_by: "cron",
    });
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  // Auth: Authorization: Bearer $CRON_SECRET. Vercel Cron sends this automatically;
  // manual triggers must use the same header. No query-param fallback (would leak the secret).
  const authHeader = req.headers.get("authorization");

  if (!CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // 1. Fetch source page
    const res = await fetch(SOURCE_URL, {
      headers: {
        "User-Agent": "SolarCheck-PriceBot/1.0 (solar-check.io; automated market price update)",
        "Accept": "text/html",
        "Accept-Language": "de-DE,de;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    // Redirect watcher: fetch() follows redirects silently, so a domain move
    // (like the 2026-07 solaranlagen-portal.com → taptaphome.com rebrand)
    // would otherwise go unnoticed until SOURCE_URL is manually re-verified.
    // Alert but keep scraping — the redirect may be legitimate.
    try {
      const finalHost = new URL(res.url).hostname;
      const expectedHost = new URL(SOURCE_URL).hostname;
      if (finalHost !== expectedHost) {
        await notifyAdmin(
          "Price source redirected to a new host",
          `SOURCE_URL host "${expectedHost}" redirected to "${finalHost}" (final URL: ${res.url}). Verify this is a legitimate rebrand/move and update SOURCE_URL if so.`,
        );
      }
    } catch {
      // res.url malformed — not fatal, continue with the scrape.
    }

    if (!res.ok) {
      await notifyAdmin("Scraping failed", `HTTP ${res.status} from ${SOURCE_URL}`);
      return NextResponse.json({ error: "Source unavailable", status: res.status }, { status: 502 });
    }

    const html = await res.text();

    // 2. Parse prices
    const scraped = scrapeFromHtml(html);

    if (scraped.pvBySize.length === 0) {
      await notifyAdmin("Scraping failed", `No price table found on ${SOURCE_URL}. Page structure may have changed.`);
      return NextResponse.json({ error: "No prices found", scraped }, { status: 422 });
    }

    // 3. Derive PV tiers + resolve battery price from MULTIPLE sources (cross-check).
    const pv = derivePvTiers(scraped);

    if (!pv) {
      await notifyAdmin("Scraping failed", `Could not derive PV price tiers. Raw data: ${JSON.stringify(scraped)}`);
      return NextResponse.json({ error: "Could not derive prices", scraped }, { status: 422 });
    }

    const lastPrices = await getLastPrices();
    const battery = await resolveBatteryPrice(scraped.batteryAllIn);

    // Hard fail (loud) ONLY when no source works AND there is no last good value to fall back on.
    if (battery.value10kWh == null && lastPrices?.batteryPerKwh == null) {
      await notifyAdmin(
        "Battery price unavailable — no source and no fallback",
        `${battery.status}\nSamples: ${JSON.stringify(battery.samples)}`,
      );
      return NextResponse.json({ error: "Battery price unavailable", battery }, { status: 422 });
    }
    // Degraded (single source / kept last value): write the value, but alert so the watcher can fix the dead source.
    if (!battery.healthy) {
      await notifyAdmin("Battery price degraded", `${battery.status}\nSamples: ${JSON.stringify(battery.samples)}`);
    }

    const { batteryBase, batteryPerKwh } = batteryTiers(battery.value10kWh, lastPrices?.batteryPerKwh ?? null);
    const derived = { ...pv, batteryBase, batteryPerKwh };

    // 4. Plausibility check
    const issues = checkPlausibility(derived, lastPrices);

    if (issues.length > 0) {
      await notifyAdmin(
        "Price plausibility check failed",
        `Issues:\n${issues.join("\n")}\n\nScraped: ${JSON.stringify(derived)}\nLast: ${JSON.stringify(lastPrices)}`,
      );
      return NextResponse.json({ error: "Plausibility check failed", issues, derived, lastPrices }, { status: 422 });
    }

    // 4b. Electricity price (separate single source, non-fatal — a failure keeps
    // the last known value so it NEVER blocks the PV/battery update). Same
    // graceful-degradation contract as battery/WP: but because a silently frozen
    // electricity price would otherwise hide behind a green health check (the
    // watcher only wakes on non-"ok" HEALTH), a scrape that misses for TWO
    // consecutive runs flips HEALTH to DEGRADED. A single miss is tolerated as a
    // transient blip (source briefly down / meta reworded once). The run-over-run
    // streak is tracked via the "Strom[<status>]" token written into notes below
    // and read back by getLastPrices() on the next run.
    const electricity = await scrapeElectricityPrice();
    let electricityPrice = lastPrices?.electricityPrice ?? null;
    let electricityNote = "kept last known value (no fresh scrape)";
    let electricityFresh = false;
    if (electricity) {
      const newPrice = electricity.price;
      const inBounds = newPrice >= BOUNDS.electricityMin && newPrice <= BOUNDS.electricityMax;
      const lastEp = lastPrices?.electricityPrice;
      const deviation = lastEp ? Math.abs(newPrice - lastEp) / lastEp : 0;
      const reasonableChange = !lastEp || deviation <= BOUNDS.maxDeviation;
      if (inBounds && reasonableChange) {
        electricityPrice = newPrice;
        electricityNote = electricity.note;
        electricityFresh = true;
      } else {
        electricityNote = `rejected (bounds: ${inBounds}, deviation: ${(deviation * 100).toFixed(1)}%); kept last value`;
      }
    }

    // Consecutive-miss tracking → only the SECOND straight miss flips HEALTH.
    const prevElecFailed = lastPrices?.electricityHealth != null && lastPrices.electricityHealth !== "ok";
    let electricityStatus: string;   // first word is machine-greppable: ok / MISS / STALE
    let electricityHealthy: boolean;
    if (electricityFresh) {
      electricityStatus = "ok";
      electricityHealthy = true;
    } else if (prevElecFailed) {
      electricityStatus = "STALE (2+ Läufe ohne frischen Strompreis — Quelle/Muster prüfen)";
      electricityHealthy = false;    // flips HEALTH so the watcher springs
    } else {
      electricityStatus = "MISS (1 Lauf ohne frischen Strompreis, letzter Wert gehalten)";
      electricityHealthy = true;     // single blip tolerated, HEALTH stays ok
    }
    if (!electricityHealthy) {
      await notifyAdmin("Electricity price stale", `${electricityStatus}: ${electricityNote}`);
    }

    // 5. Store in database
    const { error } = await supabase.from("market_prices").insert({
      pv_price_small: derived.pvPriceSmall,
      pv_price_large: derived.pvPriceLarge,
      pv_threshold_kwp: 10,
      battery_base: derived.batteryBase,
      battery_per_kwh: derived.batteryPerKwh,
      electricity_price: electricityPrice,
      electricity_increase: lastPrices?.electricityIncrease ?? null,
      valid_from: heuteInBerlin(),
      source: `taptaphome.com (vormals solaranlagen-portal.com) + energie-experten.org + strom-report.de (auto)`,
      // Health string is read by the self-healing watcher agent. "HEALTH=ok/DEGRADED/FAILED"
      // is a stable, machine-greppable prefix — keep it first. An electricity
      // degradation flips HEALTH too so the monthly report/heartbeat surfaces it.
      // "Strom[<status>]" is the greppable electricity marker the next run reads back.
      notes: `HEALTH=${battery.healthy && electricityHealthy ? "ok" : "DEGRADED"} · Battery[${battery.status}] → ${derived.batteryBase} € + ${derived.batteryPerKwh} €/kWh · PV: ${scraped.pvBySize.length} entries → ${derived.pvPriceSmall}/${derived.pvPriceLarge} · Strom[${electricityStatus}]: ${electricityNote} · PRICE_EVIDENCE=${JSON.stringify({ observedAt: new Date().toISOString(), pv: scraped.pvBySize, pointPolicy: "legacy-lower-bound-pending-product-review", battery: battery.samples })}`,
      updated_by: "cron",
    });

    if (error) {
      await notifyAdmin("Database insert failed", error.message);
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 });
    }

    console.log(`[Price Scrape] Updated: PV ${derived.pvPriceSmall}/${derived.pvPriceLarge} €/kWp, Battery ${derived.batteryPerKwh} €/kWh, Strom ${electricityPrice != null ? (electricityPrice * 100).toFixed(1) + " ct/kWh" : "—"}`);

    return NextResponse.json({
      success: true,
      health: battery.healthy && electricityHealthy ? "ok" : "degraded",
      prices: { ...derived, electricityPrice },
      battery: { status: battery.status, samples: battery.samples },
      electricity: { status: electricityStatus, note: electricityNote, healthy: electricityHealthy },
      raw: { pvEntries: scraped.pvBySize.length, electricity: electricityNote },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await notifyAdmin("Scraping exception", message);
    return NextResponse.json({ error: "Scraping failed", details: message }, { status: 500 });
  }
}
