import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { supabase } from "../../../../lib/supabase-server";
import { DEFAULT_PRICES } from "../../../../lib/prices-config";

// Vercel Cron: called monthly via vercel.json crons config
// Also callable manually: GET /api/prices/scrape?key=CRON_SECRET

const CRON_SECRET = process.env.CRON_SECRET || "";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

// Plausibility bounds
const BOUNDS = {
  pvMin: 800, pvMax: 2500,       // €/kWp
  batteryMin: 200, batteryMax: 1500, // €/kWh
  maxDeviation: 0.30,            // 30% max change from last value
};

const SOURCE_URL = "https://www.solaranlagen-portal.com/photovoltaik/kosten";

// ─── Scraping Logic ───────────────────────────────────────────────────────────

interface ScrapedPrices {
  pvBySize: { kwp: number; pricePerKwp: number }[];
  batteryPerKwh: { min: number; max: number } | null;
}

function parseGermanNumber(s: string): number {
  // "1.400" → 1400, "1.400,50" → 1400.5
  return Number(s.replace(/\./g, "").replace(",", "."));
}

function scrapeFromHtml(html: string): ScrapedPrices {
  const $ = cheerio.load(html);
  const result: ScrapedPrices = { pvBySize: [], batteryPerKwh: null };

  // Strategy 1: Find tables with "kWp" and "€/kWp" or "Kosten pro kWp" columns
  $("table").each((_, table) => {
    const headerText = $(table).find("th, thead td").text().toLowerCase();
    if (!headerText.includes("kwp") || (!headerText.includes("pro kwp") && !headerText.includes("€/kwp"))) return;

    $(table).find("tbody tr, tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 4) return;

      const sizeText = $(cells[0]).text().trim();
      const pricePerKwpText = $(cells[3]).text().trim(); // "Ø Kosten pro kWp" is typically 4th column

      // Extract kWp value: "5 kWp", "10 kWp", etc.
      const kwpMatch = sizeText.match(/([\d,.]+)\s*kwp/i);
      // Extract price: "1.530€", "1.530 €", "1530"
      const priceMatch = pricePerKwpText.match(/([\d.]+(?:,\d+)?)\s*€?/);

      if (kwpMatch && priceMatch) {
        const kwp = parseGermanNumber(kwpMatch[1]);
        const price = parseGermanNumber(priceMatch[1]);
        if (kwp > 0 && kwp <= 50 && price >= BOUNDS.pvMin && price <= BOUNDS.pvMax) {
          result.pvBySize.push({ kwp, pricePerKwp: price });
        }
      }
    });
  });

  // Strategy 2: Fallback regex if no table found
  if (result.pvBySize.length === 0) {
    const text = $.text();
    // Pattern: "X kWp ... Y €/kWp" or "Y € pro kWp"
    const matches = Array.from(text.matchAll(/([\d,.]+)\s*kWp[^€]*?([\d.]+(?:,\d+)?)\s*€\s*(?:pro\s*kWp|\/\s*kWp)/gi));
    for (const m of matches) {
      const kwp = parseGermanNumber(m[1]);
      const price = parseGermanNumber(m[2]);
      if (kwp > 0 && kwp <= 50 && price >= BOUNDS.pvMin && price <= BOUNDS.pvMax) {
        result.pvBySize.push({ kwp, pricePerKwp: price });
      }
    }
  }

  // Battery storage prices from text
  const text = $.text();
  // "400 bis 1.000 Euro pro Kilowattstunde" or "400 bis 900 Euro pro kWh"
  const batteryMatch = text.match(/([\d.]+(?:,\d+)?)\s*bis\s*([\d.]+(?:,\d+)?)\s*Euro\s*pro\s*(?:Kilowattstunde|kWh)/i);
  if (batteryMatch) {
    const min = parseGermanNumber(batteryMatch[1]);
    const max = parseGermanNumber(batteryMatch[2]);
    if (min >= BOUNDS.batteryMin && max <= BOUNDS.batteryMax && min < max) {
      result.batteryPerKwh = { min, max };
    }
  }

  return result;
}

function derivePriceTiers(scraped: ScrapedPrices) {
  if (scraped.pvBySize.length === 0) return null;

  // Sort by kWp
  const sorted = [...scraped.pvBySize].sort((a, b) => a.kwp - b.kwp);

  // Small: average of entries ≤ 10 kWp
  const small = sorted.filter(e => e.kwp <= 10);
  // Large: entries > 10 kWp, or the largest entry as approximation
  const large = sorted.filter(e => e.kwp > 10);

  const pvPriceSmall = small.length > 0
    ? Math.round(small.reduce((s, e) => s + e.pricePerKwp, 0) / small.length)
    : null;

  const pvPriceLarge = large.length > 0
    ? Math.round(large.reduce((s, e) => s + e.pricePerKwp, 0) / large.length)
    : pvPriceSmall ? Math.round(pvPriceSmall * 0.9) : null; // Estimate 10% discount

  const batteryPerKwh = scraped.batteryPerKwh
    ? Math.round((scraped.batteryPerKwh.min + scraped.batteryPerKwh.max) / 2)
    : null;

  if (!pvPriceSmall) return null;

  return {
    pvPriceSmall,
    pvPriceLarge: pvPriceLarge ?? Math.round(pvPriceSmall * 0.9),
    batteryPerKwh: batteryPerKwh ?? DEFAULT_PRICES.batteryPerKwh,
  };
}

// ─── Plausibility Check ───────────────────────────────────────────────────────

async function getLastPrices(): Promise<{ pvPriceSmall: number; pvPriceLarge: number; batteryPerKwh: number } | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("market_prices")
    .select("pv_price_small, pv_price_large, battery_per_kwh")
    .order("valid_from", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;
  return {
    pvPriceSmall: Number(data.pv_price_small),
    pvPriceLarge: Number(data.pv_price_large),
    batteryPerKwh: Number(data.battery_per_kwh),
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
    if (devBatt > BOUNDS.maxDeviation) {
      issues.push(`Battery deviation ${(devBatt * 100).toFixed(0)}% exceeds ${BOUNDS.maxDeviation * 100}%`);
    }
  }

  return issues;
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
      valid_from: new Date().toISOString().split("T")[0],
      source: "SCRAPE_ERROR",
      notes: `${subject}: ${body}`,
      updated_by: "cron",
    });
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  // Auth: Vercel Cron sends Authorization header, or use query param for manual trigger
  const authHeader = req.headers.get("authorization");
  const url = new URL(req.url);
  const keyParam = url.searchParams.get("key");

  const isVercelCron = authHeader === `Bearer ${CRON_SECRET}`;
  const isManualTrigger = keyParam && keyParam === CRON_SECRET;

  if (!isVercelCron && !isManualTrigger && CRON_SECRET) {
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
      signal: AbortSignal.timeout(15000),
    });

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

    // 3. Derive price tiers
    const derived = derivePriceTiers(scraped);

    if (!derived) {
      await notifyAdmin("Scraping failed", `Could not derive price tiers. Raw data: ${JSON.stringify(scraped)}`);
      return NextResponse.json({ error: "Could not derive prices", scraped }, { status: 422 });
    }

    // 4. Plausibility check
    const lastPrices = await getLastPrices();
    const issues = checkPlausibility(derived, lastPrices);

    if (issues.length > 0) {
      await notifyAdmin(
        "Price plausibility check failed",
        `Issues:\n${issues.join("\n")}\n\nScraped: ${JSON.stringify(derived)}\nLast: ${JSON.stringify(lastPrices)}`,
      );
      return NextResponse.json({ error: "Plausibility check failed", issues, derived, lastPrices }, { status: 422 });
    }

    // 5. Store in database
    const { error } = await supabase.from("market_prices").insert({
      pv_price_small: derived.pvPriceSmall,
      pv_price_large: derived.pvPriceLarge,
      pv_threshold_kwp: 10,
      battery_base: 0,
      battery_per_kwh: derived.batteryPerKwh,
      valid_from: new Date().toISOString().split("T")[0],
      source: `solaranlagen-portal.com (auto)`,
      notes: `Raw: ${scraped.pvBySize.length} size entries, battery ${scraped.batteryPerKwh?.min ?? "?"}–${scraped.batteryPerKwh?.max ?? "?"} €/kWh`,
      updated_by: "cron",
    });

    if (error) {
      await notifyAdmin("Database insert failed", error.message);
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 });
    }

    console.log(`[Price Scrape] Updated: PV ${derived.pvPriceSmall}/${derived.pvPriceLarge} €/kWp, Battery ${derived.batteryPerKwh} €/kWh`);

    return NextResponse.json({
      success: true,
      prices: derived,
      raw: { pvEntries: scraped.pvBySize.length, batteryRange: scraped.batteryPerKwh },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await notifyAdmin("Scraping exception", message);
    return NextResponse.json({ error: "Scraping failed", details: message }, { status: 500 });
  }
}
