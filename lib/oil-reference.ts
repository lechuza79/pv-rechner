/** Oil-only assumptions. No imports: usable by constants and both calculators.
 * Sources and scope: docs/lehren/oil-reference-model.md.
 */
export const OIL_KWH_PER_LITRE = 10;

export const OIL_REFERENCE = {
  checkedAt: "2026-09-10",
  priceSource: "https://www.umweltbundesamt.de/system/files/medien/11850/publikationen/2026-05/Rahmendatenpapier_3A.pdf",
  equipmentSource: "https://api.kww-halle.de/fileadmin/PDFs/KWW-Technikkatalog-Waermeplanung_08-2026_Version_1.1.xlsx",
  // KWW Tab 4, D6/D7/D14/D15: 20 kW, 93% on lower heating value,
  // EUR 21,600 investment and EUR 400 annual O&M, both excluding VAT.
  // Investment includes tank, simple flue adaptation and buffer storage.
  // O&M includes repair, maintenance and inspection; not an annual service quote.
  referenceKw: 20,
  newEfficiency: 0.93,
  existingEfficiency: 0.85,
  investment: 21600 * 1.19,
  upkeepPerYear: 400 * 1.19,
  co2PerKwh: 0.266,
} as const;

// UBA 2026, 3rd edition, table 11 p.57: all-in fossil heating-oil prices,
// EUR(2024)/litre INCLUDING CO2, energy tax and VAT. One published path,
// not three oil scenarios. Biofuel compliance costs are not represented.
export const OIL_PRICE_REAL = [
  [2025, 1.0], [2030, 1.1], [2035, 1.2],
  [2040, 1.3], [2045, 1.4], [2050, 1.5],
] as const;

// UBA table 3 p.21, GDP price index (2024=100).
export const OIL_PRICE_INDEX = [
  [2024, 100], [2030, 118.2], [2035, 131],
  [2040, 143.4], [2045, 156], [2050, 169],
] as const;

function interpolate(points: readonly (readonly [number, number])[], year: number): number {
  if (!Number.isFinite(year)) throw new Error("Oil projection year must be finite");
  if (year <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [end, high] = points[i];
    const [start, low] = points[i - 1];
    if (year <= end) return low + (high - low) * (year - start) / (end - start);
  }
  // No invented extrapolation beyond the publication. The last nominal price
  // stays constant; callers must disclose the source horizon (2050).
  return points[points.length - 1][1];
}

/** Nominal all-in oil projection, EUR/kWh (not a current supplier quote). */
export function oilProjectedPricePerKwh(year: number): number {
  return interpolate(OIL_PRICE_REAL, year) * interpolate(OIL_PRICE_INDEX, year)
    / 100 / OIL_KWH_PER_LITRE;
}

/** Preserve the entered all-in starting price, apply only the relative UBA
 * nominal trajectory. CO2 is already included: never add the gas surcharge.
 */
export function oilPricePerKwh(year: number, startYear: number, startPrice = oilProjectedPricePerKwh(startYear)): number {
  return startPrice * oilProjectedPricePerKwh(year) / oilProjectedPricePerKwh(startYear);
}
