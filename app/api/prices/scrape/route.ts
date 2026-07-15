// ─── Legal note (verified 2026-07-08) ─────────────────────────────────────────
// This route extracts a small set of aggregated market averages from public
// pages: ~6 PV price-per-kWp data points, 1 battery all-in price, 4 heat-pump
// cost figures (Luft/Wasser Gerät + Einbau, low/high) per month (plus 1
// electricity price from a separate source). This is lawful under German law: it
// takes an insubstantial part of the respective site's data (§ 87b UrhG
// database-right threshold — a handful of published averages, not a systematic
// re-extraction of the underlying dataset), does not circumvent any technical
// access control, and every source domain's robots.txt permits crawling these
// pages (taptaphome.com robots.txt has no Disallow rules). Requests identify with
// an honest, descriptive User-Agent.

import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { supabase } from "../../../../lib/supabase-server";
import { DEFAULT_PRICES } from "../../../../lib/prices-config";
import { deriveLwwpBaseFromRanges, DEFAULT_HEATPUMP_PRICES, WP_PRICE_BOUNDS } from "../../../../lib/heatpump-prices";
import { DEFAULT_HEATPUMP_CONFIG } from "../../../../lib/heatpump-config";

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
// Heat-pump cost overview (same operator, DAA GmbH) — structured type table with
// Anschaffung + Installation ranges per WP type. We read only Luft/Wasser.
const WP_SOURCE_URL = "https://www.taptaphome.com/de/ratgeber/waermepumpe/waermepumpe-kosten";
const ELECTRICITY_SOURCE_URL = "https://strom-report.de/strompreise/";
// Second, independent battery-price source for cross-checking.
const BATTERY_SOURCE_2_URL = "https://www.energie-experten.org/erneuerbare-energien/photovoltaik/stromspeicher/kosten";

// Absolute plausibility window for an all-in 10-kWh home battery (€, incl. install).
const BATTERY_10KWH = { min: 2500, max: 7000 };
// Two sources count as "agreeing" if within this relative spread of the median.
const BATTERY_AGREE_SPREAD = 0.30;

// ─── Scraping Logic ───────────────────────────────────────────────────────────

interface ScrapedPrices {
  pvBySize: { kwp: number; pricePerKwp: number }[];
  batteryAllIn: { kwh: number; total: number } | null;  // all-in price (incl. install) for a stated size
}

function parseGermanNumber(s: string): number {
  // "1.400" → 1400, "1.400,50" → 1400.5
  return Number(s.replace(/\./g, "").replace(",", "."));
}

function scrapeFromHtml(html: string): ScrapedPrices {
  const $ = cheerio.load(html);
  const result: ScrapedPrices = { pvBySize: [], batteryAllIn: null };

  // Strategy 1: Find tables with "kWp" and "Kosten pro kWp" columns
  // Note: header row may use <td> or <th> depending on the source's markup, so
  // check the first row's text content either way rather than assuming <th>.
  $("table").each((_, table) => {
    const allRows = $(table).find("tr");
    const firstRowText = allRows.first().text().toLowerCase();
    // Check if first row contains header indicators
    if (!firstRowText.includes("kwp") || (!firstRowText.includes("pro kwp") && !firstRowText.includes("€/kwp"))) return;

    // Find the column index for "Kosten pro kWp" dynamically
    const headerCells = allRows.first().find("td, th");
    let priceColIdx = -1;
    headerCells.each((i, cell) => {
      const t = $(cell).text().toLowerCase();
      if (t.includes("pro kwp") || t.includes("€/kwp")) {
        priceColIdx = i;
        return false; // cheerio: returning false breaks .each()
      }
      return; // continue iteration (explicit for noImplicitReturns)
    });
    if (priceColIdx < 0) priceColIdx = 3; // fallback to 4th column

    // Parse data rows (skip first row = headers)
    allRows.slice(1).each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length <= priceColIdx) return;

      const sizeText = $(cells[0]).text().trim();
      const pricePerKwpText = $(cells[priceColIdx]).text().trim();

      // Extract kWp value: "3 kWp", "10 kWp", etc.
      const kwpMatch = sizeText.match(/([\d,.]+)\s*kwp/i);
      // Extract price: "1.730€", "1.530 €", "1530"
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

  // Battery storage price. Soft hyphens (­) in the source break word matching → strip them.
  const text = $.text().replace(/­/g, "");

  // Primary: all-in total for a stated size, e.g. "Ein 10 kWh-Batteriespeicher kostet etwa 3.250 €"
  // (this price INCLUDES installation). Most faithful — a real datapoint, not a vague range.
  const totalMatch = text.match(/(\d+(?:[.,]\d+)?)\s*kWh[\s-]*Batteriespeicher\s+kostet\s+etwa\s+([\d.]+(?:,\d+)?)\s*€/i);
  if (totalMatch) {
    const kwh = parseGermanNumber(totalMatch[1]);
    const total = parseGermanNumber(totalMatch[2]);
    if (kwh > 0 && total > 0) result.batteryAllIn = { kwh, total };
  }

  // Fallback: a per-kWh range "400 bis 900 Euro pro kWh". The lower end ≈ the
  // realistic large-system all-in price; anchor it to a 10-kWh reference system.
  if (!result.batteryAllIn) {
    const rangeMatch = text.match(/([\d.]+(?:,\d+)?)\s*bis\s*([\d.]+(?:,\d+)?)\s*Euro\s*pro\s*(?:Kilowattstunde|kWh)/i);
    if (rangeMatch) {
      const min = parseGermanNumber(rangeMatch[1]);
      const max = parseGermanNumber(rangeMatch[2]);
      if (min > 0 && max > min) result.batteryAllIn = { kwh: 10, total: min * 10 };
    }
  }

  return result;
}

function derivePvTiers(scraped: ScrapedPrices) {
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

  if (!pvPriceSmall) return null;

  return {
    pvPriceSmall,
    pvPriceLarge: pvPriceLarge ?? Math.round(pvPriceSmall * 0.9),
  };
}

// ─── Multi-source battery price (cross-check + average) ──────────────────────
// Every source is normalised to the SAME quantity: all-in € for a 10-kWh home
// battery (incl. installation). Then: average agreeing sources, drop outliers,
// fall back gracefully, and never write an implausible value.

interface BatterySample { source: string; value: number | null }
interface BatteryResolution {
  value10kWh: number | null;   // averaged all-in € for 10 kWh; null = no usable source
  status: string;              // health summary (stored, read by the watcher)
  healthy: boolean;            // false → degraded (single source) or failed (none)
  samples: BatterySample[];
}

// Source 2: energie-experten.org — "350 bis 500 Euro pro Kilowattstunde" → midpoint ×10.
async function fetchBatterySource2(): Promise<number | null> {
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
    const text = cheerio.load(await res.text())("body").text().replace(/­/g, "");
    const m = text.match(/([\d.]+(?:,\d+)?)\s*bis\s*([\d.]+(?:,\d+)?)\s*Euro\s*pro\s*(?:Kilowattstunde|kWh)/i);
    if (!m) return null;
    const lo = parseGermanNumber(m[1]), hi = parseGermanNumber(m[2]);
    if (lo <= 0 || hi < lo) return null;
    return Math.round((lo + hi) / 2 * 10);
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
    { source: "energie-experten", value: eeVal },
  ];

  const valid = samples.filter(
    (s): s is { source: string; value: number } =>
      s.value != null && s.value >= BATTERY_10KWH.min && s.value <= BATTERY_10KWH.max,
  );

  if (valid.length === 0) {
    return { value10kWh: null, status: "FAILED: no source delivered a plausible battery price", healthy: false, samples };
  }
  if (valid.length === 1) {
    return { value10kWh: valid[0].value, status: `DEGRADED: single source (${valid[0].source}=${valid[0].value} €)`, healthy: false, samples };
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

// ─── Wärmepumpen-Grundpreis (Luft/Wasser) ───────────────────────────────────
// Reads the structured "Was kostet eine Wärmepumpe?" table on the taptaphome WP
// cost page: the Anschaffungskosten + Installations-/Erschließungskosten ranges
// for the Luft-Wasser column. From those four numbers we derive the LWWP base
// (see lib/heatpump-prices.ts). Same graceful-degradation contract as the battery
// price: a WP failure NEVER blocks the PV update — keep last good value or fall
// back to config, and alert so the watcher can fix a dead source.

interface WpRanges { geraetLow: number; geraetHigh: number; installLow: number; installHigh: number }
interface WpResolution {
  base: number;                // LWWP base € (always a plausible number — scraped, last, or config)
  perKw: number;               // stable slope from config
  healthy: boolean;
  status: string;
  ranges: WpRanges | null;
}

// Parse a German "X bis Y €" range, e.g. "ca. 12.000 bis 20.000 €" → [12000, 20000].
function parseGermanRange(s: string): [number, number] | null {
  const m = s.match(/([\d.]+(?:,\d+)?)\s*bis\s*([\d.]+(?:,\d+)?)/i);
  if (!m) return null;
  const lo = parseGermanNumber(m[1]);
  const hi = parseGermanNumber(m[2]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo <= 0 || hi < lo) return null;
  return [lo, hi];
}

function scrapeWpRangesFromHtml(html: string): WpRanges | null {
  const $ = cheerio.load(html);
  let ranges: WpRanges | null = null;

  $("table").each((_, table) => {
    if (ranges) return;
    const rows = $(table).find("tr");
    const header = rows.first().find("th, td");
    // Locate the "Luft-Wasser" column (must not match "Luft-Luft").
    let col = -1;
    header.each((i, cell) => {
      const t = $(cell).text().toLowerCase().replace(/\s+/g, "");
      if (t.includes("luft-wasser")) { col = i; return false; }
      return;
    });
    if (col < 0) return;

    let geraet: [number, number] | null = null;
    let install: [number, number] | null = null;
    rows.slice(1).each((_, row) => {
      const cells = $(row).find("th, td");
      if (cells.length <= col) return;
      const label = $(cells[0]).text().toLowerCase();
      const cellText = $(cells[col]).text();
      if (label.includes("anschaffung")) geraet = parseGermanRange(cellText);
      else if (label.includes("installation") || label.includes("erschließung") || label.includes("erschliessung")) {
        install = parseGermanRange(cellText);
      }
    });

    if (geraet && install) {
      ranges = { geraetLow: geraet[0], geraetHigh: geraet[1], installLow: install[0], installHigh: install[1] };
    }
  });

  return ranges;
}

async function resolveWpPrice(lastBase: number | null): Promise<WpResolution> {
  const perKw = DEFAULT_HEATPUMP_CONFIG.investLwwpPerKw;
  const fallback = lastBase ?? DEFAULT_HEATPUMP_PRICES.investLwwpBase;

  let html: string;
  try {
    const res = await fetch(WP_SOURCE_URL, {
      headers: {
        "User-Agent": "SolarCheck-PriceBot/1.0 (solar-check.io; automated market price update)",
        "Accept": "text/html",
        "Accept-Language": "de-DE,de;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { base: fallback, perKw, healthy: false, status: `DEGRADED: WP source HTTP ${res.status} → kept ${lastBase != null ? "last" : "config"} (${fallback} €)`, ranges: null };
    }
    html = await res.text();
  } catch {
    return { base: fallback, perKw, healthy: false, status: `DEGRADED: WP source unreachable → kept ${lastBase != null ? "last" : "config"} (${fallback} €)`, ranges: null };
  }

  const ranges = scrapeWpRangesFromHtml(html);
  if (!ranges) {
    return { base: fallback, perKw, healthy: false, status: `DEGRADED: WP cost table not found (page changed?) → kept ${lastBase != null ? "last" : "config"} (${fallback} €)`, ranges: null };
  }

  const derived = deriveLwwpBaseFromRanges(ranges.geraetLow, ranges.geraetHigh, ranges.installLow, ranges.installHigh, perKw);
  if (derived == null) {
    return { base: fallback, perKw, healthy: false, status: `DEGRADED: derived base out of bounds [${WP_PRICE_BOUNDS.lwwpBaseMin}–${WP_PRICE_BOUNDS.lwwpBaseMax}] → kept ${lastBase != null ? "last" : "config"} (${fallback} €)`, ranges };
  }

  // Deviation guard, dual-anchor like the battery check: a large move from the
  // last DB value is accepted if it matches the shipped config default (a blessed
  // recalibration), and only rejected when it deviates from BOTH anchors.
  if (lastBase != null) {
    const devLast = Math.abs(derived - lastBase) / lastBase;
    const devDefault = Math.abs(derived - DEFAULT_HEATPUMP_PRICES.investLwwpBase) / DEFAULT_HEATPUMP_PRICES.investLwwpBase;
    if (devLast > WP_PRICE_BOUNDS.maxDeviation && devDefault > WP_PRICE_BOUNDS.maxDeviation) {
      return { base: lastBase, perKw, healthy: false, status: `DEGRADED: derived ${derived} € deviates ${(devLast * 100).toFixed(0)}% from last and ${(devDefault * 100).toFixed(0)}% from default → kept last (${lastBase} €)`, ranges };
    }
  }

  return { base: derived, perKw, healthy: true, status: `ok: LWWP base ${derived} € (Gerät ${ranges.geraetLow}–${ranges.geraetHigh}, Einbau ${ranges.installLow}–${ranges.installHigh}; ${perKw} €/kW fix)`, ranges };
}

// ─── Plausibility Check ───────────────────────────────────────────────────────

async function getLastPrices(): Promise<{ pvPriceSmall: number; pvPriceLarge: number; batteryPerKwh: number; electricityPrice: number | null; electricityIncrease: number | null; wpLwwpBase: number | null; electricityHealth: string | null } | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("market_prices")
    .select("pv_price_small, pv_price_large, battery_per_kwh, electricity_price, electricity_increase, wp_lwwp_base, notes")
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
    wpLwwpBase: data.wp_lwwp_base != null ? Number(data.wp_lwwp_base) : null,
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
      valid_from: new Date().toISOString().split("T")[0],
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

    // 4c. Wärmepumpen-Grundpreis (Luft/Wasser) — non-fatal, keeps last/config on failure.
    const wp = await resolveWpPrice(lastPrices?.wpLwwpBase ?? null);
    if (!wp.healthy) {
      await notifyAdmin("WP base price degraded", `${wp.status}\nRanges: ${JSON.stringify(wp.ranges)}`);
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
      wp_lwwp_base: wp.base,
      wp_lwwp_per_kw: wp.perKw,
      valid_from: new Date().toISOString().split("T")[0],
      source: `taptaphome.com (vormals solaranlagen-portal.com) + energie-experten.org + strom-report.de (auto)`,
      // Health string is read by the self-healing watcher agent. "HEALTH=ok/DEGRADED/FAILED"
      // is a stable, machine-greppable prefix — keep it first. A WP OR electricity
      // degradation flips HEALTH too so the monthly report/heartbeat surfaces it.
      // "Strom[<status>]" is the greppable electricity marker the next run reads back.
      notes: `HEALTH=${battery.healthy && wp.healthy && electricityHealthy ? "ok" : "DEGRADED"} · Battery[${battery.status}] → ${derived.batteryBase} € + ${derived.batteryPerKwh} €/kWh · PV: ${scraped.pvBySize.length} entries → ${derived.pvPriceSmall}/${derived.pvPriceLarge} · WP[${wp.status}] → ${wp.base} € + ${wp.perKw} €/kW · Strom[${electricityStatus}]: ${electricityNote}`,
      updated_by: "cron",
    });

    if (error) {
      await notifyAdmin("Database insert failed", error.message);
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 });
    }

    console.log(`[Price Scrape] Updated: PV ${derived.pvPriceSmall}/${derived.pvPriceLarge} €/kWp, Battery ${derived.batteryPerKwh} €/kWh, WP-Basis ${wp.base} €, Strom ${electricityPrice != null ? (electricityPrice * 100).toFixed(1) + " ct/kWh" : "—"}`);

    return NextResponse.json({
      success: true,
      health: battery.healthy && wp.healthy && electricityHealthy ? "ok" : "degraded",
      prices: { ...derived, electricityPrice, wpLwwpBase: wp.base, wpLwwpPerKw: wp.perKw },
      battery: { status: battery.status, samples: battery.samples },
      wp: { status: wp.status, ranges: wp.ranges },
      electricity: { status: electricityStatus, note: electricityNote, healthy: electricityHealthy },
      raw: { pvEntries: scraped.pvBySize.length, electricity: electricityNote },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await notifyAdmin("Scraping exception", message);
    return NextResponse.json({ error: "Scraping failed", details: message }, { status: 500 });
  }
}
