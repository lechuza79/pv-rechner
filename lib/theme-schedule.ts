// Time-of-day theme scheduling for the "auto" mode.
//
// A solar product's surface should track the sun: bright by day, dimmed at
// dusk/dawn, dark at night. We approximate sunrise/sunset for the geographic
// centre of Germany (no user location needed) and classify the current local
// clock time into one of three themes.
//
// The resolved values ('light' | 'dusk' | 'dark') map 1:1 onto the `data-theme`
// attribute so this module, the no-flash boot script in app/(site)/layout.tsx,
// and the CSS override blocks in lib/theme.ts all speak the same language.
//
// NOTE: The boot script in layout.tsx inlines a compact copy of this same
// formula (it cannot import modules before first paint). Keep them in sync.

/** Geographic centre of Germany — drives the daylight approximation. */
export const DE_LAT = 51.16;
export const DE_LON = 10.45; // °E

/** Half-width of the twilight band around sunrise/sunset, in minutes. */
export const DUSK_MINUTES = 50;

export type ThemeMode = "light" | "dusk" | "dark";

/** Day of the year (1–366) from a date's local Y/M/D. */
export function dayOfYear(date: Date): number {
  const y = date.getFullYear();
  const start = Date.UTC(y, 0, 0);
  const cur = Date.UTC(y, date.getMonth(), date.getDate());
  return Math.floor((cur - start) / 86_400_000);
}

/**
 * Approximate sunrise/sunset as fractional LOCAL clock hours.
 * `tzOffsetHours` is the local offset from UTC (e.g. +1 for CET, +2 for CEST) —
 * pass `-date.getTimezoneOffset() / 60` at runtime so DST is handled by the
 * Date object itself.
 */
export function sunTimes(
  doy: number,
  tzOffsetHours: number,
  lat = DE_LAT,
  lon = DE_LON,
): { sunrise: number; sunset: number } {
  const decl = declination(doy);
  const latRad = (lat * Math.PI) / 180;
  // Hour angle at sunrise; clamp guards the polar edge case (never hit in DE).
  const cosH = Math.max(-1, Math.min(1, -Math.tan(latRad) * Math.tan(decl)));
  const halfDayHours = (Math.acos(cosH) * 12) / Math.PI;
  const solarNoonUtc = 12 - lon / 15;
  return {
    sunrise: solarNoonUtc - halfDayHours + tzOffsetHours,
    sunset: solarNoonUtc + halfDayHours + tzOffsetHours,
  };
}

/** Solar declination (radians) for a day of the year. */
function declination(doy: number): number {
  return 0.4093 * Math.sin((2 * Math.PI) / 365 * (doy - 81));
}

/**
 * Solar elevation above the horizon, in degrees (negative = below).
 * `utcHours` is the UTC time of day as a fraction.
 */
export function sunElevation(
  doy: number,
  utcHours: number,
  lat = DE_LAT,
  lon = DE_LON,
): number {
  const decl = declination(doy);
  const latRad = (lat * Math.PI) / 180;
  // Hour angle: 15° per hour away from local solar noon.
  const solarHour = utcHours + lon / 15;
  const H = ((solarHour - 12) * 15 * Math.PI) / 180;
  const sinH =
    Math.sin(latRad) * Math.sin(decl) +
    Math.cos(latRad) * Math.cos(decl) * Math.cos(H);
  return (Math.asin(Math.max(-1, Math.min(1, sinH))) * 180) / Math.PI;
}

/**
 * Clear-sky global irradiance in W/m² for a given sun elevation — what the sky
 * could deliver right now with no clouds. Haurwitz model; the reference we
 * measure the real irradiance against, so a crisp winter noon counts as "full
 * sun" even though its absolute value is far below a summer noon.
 */
export function clearSkyGhi(elevationDeg: number): number {
  if (elevationDeg <= 0) return 0;
  const cosZenith = Math.sin((elevationDeg * Math.PI) / 180);
  if (cosZenith <= 0) return 0;
  return Math.max(0, 1098 * cosZenith * Math.exp(-0.057 / cosZenith));
}

/** Sun is effectively down below this clear-sky level (W/m²). */
export const NIGHT_GHI = 25;
/** Below this share of the clear-sky potential, daylight is dimmed to dusk. */
export const DIM_UTILISATION = 0.45;

/**
 * How much of the clear-sky potential is actually arriving (0–1).
 * Returns null when the sun is too low for the ratio to mean anything.
 */
export function utilisation(actualGhi: number, clearSky: number): number | null {
  if (clearSky < NIGHT_GHI) return null;
  return Math.max(0, Math.min(1, actualGhi / clearSky));
}

/**
 * Dim a sun-position theme with live conditions: heavy cloud turns a bright day
 * into dusk, but never into night — night is only ever the sun being down.
 * Unknown conditions (no data) leave the sun-position theme untouched.
 */
export function applyConditions(base: ThemeMode, util: number | null): ThemeMode {
  if (util === null || base !== "light") return base;
  return util < DIM_UTILISATION ? "dusk" : "light";
}

/** Classify a local clock hour into a theme given sunrise/sunset. */
export function classifyHour(
  hour: number,
  sunrise: number,
  sunset: number,
  bandHours = DUSK_MINUTES / 60,
): ThemeMode {
  if (hour < sunrise - bandHours || hour > sunset + bandHours) return "dark";
  if (hour < sunrise + bandHours || hour > sunset - bandHours) return "dusk";
  return "light";
}

/** Resolve the auto theme for a given moment (defaults to now). */
export function scheduleTheme(date: Date, lat = DE_LAT, lon = DE_LON): ThemeMode {
  const tz = -date.getTimezoneOffset() / 60;
  const { sunrise, sunset } = sunTimes(dayOfYear(date), tz, lat, lon);
  const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  return classifyHour(hour, sunrise, sunset);
}

// What the user can choose. "dusk" is deliberately NOT a preference: it is a
// stage of the automatic sun cycle, not something you pick — so the manual
// switch stays a clean light/dark flip.
export type ThemePref = "auto" | "light" | "dark";

/**
 * Resolve the effective theme from a stored preference.
 * `util` is the live share of the clear-sky potential (see utilisation()); it
 * only ever dims the automatic mode — picking "Hell" by hand must stay light
 * however cloudy it is. null (no data yet, or request failed) falls back to the
 * pure sun position, which is also what the boot script paints with.
 */
export function resolveTheme(
  pref: ThemePref,
  date: Date,
  util: number | null = null,
): ThemeMode {
  if (pref === "light") return "light";
  if (pref === "dark") return "dark";
  return applyConditions(scheduleTheme(date), util);
}

/**
 * The manual mode a click from auto lands on: always the opposite of what is
 * currently on screen, so one click does what people expect. Dusk is dark-ish,
 * so its opposite is light.
 */
export function oppositeOf(resolved: ThemeMode): ThemePref {
  return resolved === "light" ? "dark" : "light";
}

/**
 * Next preference when the switch is clicked: auto → opposite → other → auto.
 * `firstManual` is the mode the last click-out-of-auto landed on; it makes the
 * cycle symmetric (both manual modes stay reachable whichever way auto went).
 */
export function cycleFrom(
  pref: ThemePref,
  resolved: ThemeMode,
  firstManual: ThemePref | null,
): ThemePref {
  if (pref === "auto") return oppositeOf(resolved);
  const first = firstManual ?? pref;
  if (pref === first) return first === "light" ? "dark" : "light";
  return "auto";
}
