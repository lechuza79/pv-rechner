/**
 * Which towns are wind towns — the rule and the generated list.
 *
 * A wind town has more wind than solar capacity installed and at least two
 * turbines. The two-turbine floor
 * keeps a single small turbine on a farm (369 towns have only turbines under
 * 50 kW) from turning a solar town into a wind town.
 *
 * Deliberately loose (operator, 28.09.2026): the flag decides a picture in the
 * hero, not a number. Wind is counted where the turbine stands since
 * 09.10.2026 (lib/wind-standort.ts), so the list follows the Atlas numbers.
 *
 * The list is generated (scripts/windgemeinden-build.ts, `npm run
 * windgemeinden:build`) so the town page reads a Set instead of querying the
 * register on every build — a page must not get more expensive with the data.
 */
import liste from "./windgemeinden.json";

export const WIND_MIN_ANLAGEN = 2;

export type WindStand = { windKw: number; windAnlagen: number; solarKwp: number };

export function istWindgemeinde({ windKw, windAnlagen, solarKwp }: WindStand): boolean {
  return windAnlagen >= WIND_MIN_ANLAGEN && windKw > solarKwp;
}

export const WINDGEMEINDEN_STAND: string = liste.stand;
const MENGE = new Set<string>(liste.gemeinden);

export function windgemeinde(ags: string): boolean {
  return MENGE.has(ags);
}
