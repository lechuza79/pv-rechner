/** Illustrative annual-average equivalents, not simultaneous replacement capacity.
 * PV/wind yield assumptions: Fraunhofer ISE, Fakten zur Photovoltaik,
 * 20 August 2026, section 16.4.2, citing the TSOs' 2026 trend scenario.
 * System sizes and household demand are explicitly chosen example inputs.
 */
export const IMPORT_COMPARISON = {
  solarKwp: 10,
  solarKwhPerKwp: 895,
  windMw: 6,
  windFullLoadHours: 1904,
  householdKwhPerYear: 3800,
  daysPerYear: 365,
} as const;
export function importDailyEquivalents(avgGw: number) {
  if (!Number.isFinite(avgGw) || avgGw < 0) return null;
  const dailyKwh = avgGw * 24 * 1_000_000;
  const a = IMPORT_COMPARISON;
  return {
    dailyGwh: dailyKwh / 1_000_000,
    solarSystems: dailyKwh / (a.solarKwp * a.solarKwhPerKwp / a.daysPerYear),
    windTurbines: dailyKwh / (a.windMw * 1000 * a.windFullLoadHours / a.daysPerYear),
    households: dailyKwh / (a.householdKwhPerYear / a.daysPerYear),
  };
}
