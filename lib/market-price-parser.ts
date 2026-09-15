import * as cheerio from "cheerio";
const BOUNDS = { pvMin: 800, pvMax: 2500 };
export interface ScrapedPrices {
  pvBySize: { kwp: number; pricePerKwp: number; min: number; max: number; scope: "installed-pv"; sourceText: string }[];
  batteryAllIn: { kwh: number; total: number } | null;  // all-in price (incl. install) for a stated size
}

function parseGermanNumber(s: string): number {
  // "1.400" → 1400, "1.400,50" → 1400.5
  return Number(s.replace(/\./g, "").replace(",", "."));
}

export function parsePriceRange(text: string): { min: number; max: number } | null {
  const numbers = [...text.matchAll(/\d[\d.]*(?:,\d+)?/g)].map(m => parseGermanNumber(m[0]));
  if (!numbers.length || numbers.length > 2 || numbers.some(n => !Number.isFinite(n))) return null;
  const [min, max = min] = numbers;
  return min > 0 && max >= min ? { min, max } : null;
}

export function equipmentStorageQuote(html: string) {
  const text = cheerio.load(html)("body").text().replace(/­/g, "");
  const match = text.match(/([\d.]+(?:,\d+)?)\s*bis\s*([\d.]+(?:,\d+)?)\s*Euro\s*pro\s*(?:Kilowattstunde|kWh)/i);
  if (!match) return null;
  const range = parsePriceRange(match[0]);
  return range ? { ...range, scope: "equipment-only" as const, quote: match[0] } : null;
}

/** Cost scope, not network availability, determines comparability. */
export function installedStorageValue(quote: { min: number; max: number; scope: string } | null): number | null {
  return quote?.scope === "installed-storage" ? Math.round((quote.min + quote.max) / 2 * 10) : null;
}

export function scrapeFromHtml(html: string): ScrapedPrices {
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
          const range = parsePriceRange(pricePerKwpText);
          if (!range) return;
          const max = range.max;
          if (max < price || max > BOUNDS.pvMax) return;
          result.pvBySize.push({ kwp, pricePerKwp: price, min: price, max, scope: "installed-pv", sourceText: pricePerKwpText });
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
        result.pvBySize.push({ kwp, pricePerKwp: price, min: price, max: price, scope: "installed-pv", sourceText: m[0] });
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

  return result;
}

export function derivePvTiers(scraped: ScrapedPrices) {
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

