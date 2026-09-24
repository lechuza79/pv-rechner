/** Investment sources only; no calculator imports or inferred energy demand.
 * KWW 08/2026 v1.1, Tab 5 C23:C24 and Tab 10 D6:L6/D10:L10.
 * Scope, calibration and limitations: docs/lehren/heating-investment-model.md.
 */
export const HEATING_INVESTMENT = {
  checkedAt: "2026-09-14",
  kwwSource: "https://api.kww-halle.de/fileadmin/PDFs/KWW-Technikkatalog-Waermeplanung_08-2026_Version_1.1.xlsx",
  vzSource: "https://www.verbraucherzentrale-rlp.de/waermepumpen-wir-checken-ihre-angebote-98555",
  vat: 1.19,
  gas: { minKw: 10, maxKw: 100, a: 3527.996080056838, b: 0.5192211045318676 },
  lwwp: {
    minKw: 5, maxKw: 100, referenceKw: 10,
    // VZ 2025, pp.7–8, Table 3: 42 offers with DHW, balancing, foundation
    // and electrical work, excluding radiator replacement. NOT a 10-kW median.
    // Using this median at 10 kW is our explicit calibration assumption.
    referenceTotalGross: 36011,
    referenceCoreGross: 15300 * 1.19,
    fixedGross: 36011 - 15300 * 1.19,
  },
  // Deliberate investment stress cases, not a confidence interval. KWW shows
  // ±20% for gas costs; the same variation for WP is OUR sensitivity choice.
  sensitivityFraction: 0.2,
} as const;

/** KWW core plant INCLUDING its associated installation, excluding additional
 * measures, storage and radiator replacement. Absolute net EUR(2026), not €/kW.
 */
export const LWWP_CORE_NET = [
  [5, 9500], [10, 15300], [20, 24600], [30, 32700], [40, 40000],
  [50, 46500], [60, 52800], [80, 64000], [100, 75000],
] as const;

function referenceKw(kw: number, min: number, max: number): number {
  if (!Number.isFinite(kw) || kw < 0 || kw > max) {
    throw new RangeError(`Investment cost reference requires 0–${max} kW`);
  }
  // Below the smallest tabulated capacity retain that cost class. This is an
  // explicit estimate, not proof of minimum market price or technical sizing.
  return Math.max(min, kw);
}

export function gasInvestmentGross(heatLoadKw: number): number {
  const g = HEATING_INVESTMENT.gas;
  const kw = referenceKw(heatLoadKw, g.minKw, g.maxKw);
  // Use the published regression consistently, including at table points;
  // it approximates the rounded table values (e.g. 10 kW: 11,662 vs 11,800 net).
  return HEATING_INVESTMENT.vat * g.a * Math.pow(kw, g.b);
}

export function lwwpCoreGross(costClassKw: number): number {
  const wp = HEATING_INVESTMENT.lwwp;
  const kw = referenceKw(costClassKw, wp.minKw, wp.maxKw);
  for (let i = 1; i < LWWP_CORE_NET.length; i++) {
    const [hiKw, hiCost] = LWWP_CORE_NET[i];
    const [loKw, loCost] = LWWP_CORE_NET[i - 1];
    if (kw <= hiKw) return HEATING_INVESTMENT.vat *
      (loCost + (hiCost - loCost) * (kw - loKw) / (hiKw - loKw));
  }
  throw new RangeError("Outside heat pump cost reference");
}
