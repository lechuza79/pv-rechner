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

/**
 * How much of the clear-sky potential is actually arriving (0–1).
 * Returns null when the sun is too low for the ratio to mean anything.
 */
export function utilisation(actualGhi: number, clearSky: number): number | null {
  if (clearSky < NIGHT_GHI) return null;
  return Math.max(0, Math.min(1, actualGhi / clearSky));
}

/** What the live reading says about the sun; null fields mean "not known". */
export type SolarConditions = {
  /** Output as % of what the panels make in full sun. */
  powerPct: number;
  /** Share of the clear-sky potential arriving (0–1), null when the sun is down. */
  utilisation: number | null;
};

// ─── The seven brightness stages ───────────────────────────────────────────
// s6 brightest (full sun) … s0 darkest (deep night). Three hand-tuned anchor
// palettes (light = s6, dusk = s2, dark = s0) with interpolated stages between;
// see lib/theme.ts. The one hard boundary is s3↔s2: s3–s6 are light backgrounds
// with dark text, s0–s2 dark backgrounds with light text. There is no readable
// theme in between (mid-grey has too little contrast for any text), so the flip
// is tied to the sun crossing the horizon — day above, dusk/night below.
export const STAGE_COUNT = 7;
/** First stage that is a light background (dark text). Below this: dark bg. */
export const FIRST_LIGHT_STAGE = 3;

// Sun-elevation gates (degrees). Above DAY → light zone; the rest steps down
// through dusk to night as the sun sinks past the horizon.
const ELEV_DAY = 6;
const ELEV_DUSK = 0;
const ELEV_NIGHT = -6;

// Within the light zone, the actual output (% of full-sun capacity) picks the
// fine stage — the page brightness tracks how much power the sun is really
// making. It arcs up toward noon and dims in the evening and under cloud. A
// clear but weak winter noon lands in the middle stages: honestly less sun, not
// darkness. (Full sun ≈ 65 %; these are its slices.)
const POWER_S6 = 48;
const POWER_S5 = 33;
const POWER_S4 = 15;

/** Sun elevation right now for central Germany. */
function elevationNow(date: Date): number {
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
  return sunElevation(dayOfYear(date), utcHours, DE_LAT, DE_LON);
}

/**
 * The brightness stage the live sun justifies (0–6).
 *
 * Elevation decides the zone: this is what keeps a clear DAWN dim (low sun →
 * dusk/night stages) rather than jumping bright the instant the sky clears.
 * Within the day, the real output is the dimmer — so a bright noon is bright, an
 * overcast noon and a low evening sun both dim, each by how much power is
 * actually there.
 */
export function sunStage(date: Date, solar: SolarConditions | null): number {
  const elev = elevationNow(date);
  if (elev < ELEV_NIGHT) return 0;
  if (elev < ELEV_DUSK) return 1;
  if (elev < ELEV_DAY) return 2;
  // Sun is up. Brightness by output; no reading yet → a neutral daylight stage.
  const p = solar?.powerPct ?? null;
  if (p === null) return 5;
  if (p >= POWER_S6) return 6;
  if (p >= POWER_S5) return 5;
  if (p >= POWER_S4) return 4;
  return 3;
}

/** The `data-theme` value for a stage number (clamped): "s0" … "s6". */
export type ThemeStage = `s${number}`;
export function stageId(n: number): ThemeStage {
  return `s${Math.max(0, Math.min(STAGE_COUNT - 1, Math.round(n)))}` as ThemeStage;
}
/** True for the light-background stages (dark text). */
export function isLightStage(stage: ThemeStage): boolean {
  return Number(stage.slice(1)) >= FIRST_LIGHT_STAGE;
}

// What the user can choose. The in-between stages are steps of the automatic
// sun cycle, not things you pick — so the manual switch stays a clean
// light/dark flip (brightest ↔ darkest).
export type ThemePref = "auto" | "light" | "dark";

/**
 * Resolve the effective theme stage from a stored preference.
 * `solar` is the live reading; it only ever drives the automatic mode — picking
 * "Hell" by hand pins the brightest stage however dark it is outside. null (no
 * data yet, or request failed) falls back to the sun position, which is also
 * what the boot script paints with.
 */
export function resolveTheme(
  pref: ThemePref,
  date: Date,
  solar: SolarConditions | null = null,
): ThemeStage {
  if (pref === "light") return stageId(STAGE_COUNT - 1);
  if (pref === "dark") return stageId(0);
  return stageId(sunStage(date, solar));
}

/**
 * The manual mode a click from auto lands on: always the opposite of what is
 * currently on screen, so one click does what people expect.
 */
export function oppositeOf(resolved: ThemeStage): ThemePref {
  return isLightStage(resolved) ? "dark" : "light";
}

/**
 * Next preference when the switch is clicked: auto → opposite → other → auto.
 * `firstManual` is the mode the last click-out-of-auto landed on; it makes the
 * cycle symmetric (both manual modes stay reachable whichever way auto went).
 */
export function cycleFrom(
  pref: ThemePref,
  resolved: ThemeStage,
  firstManual: ThemePref | null,
): ThemePref {
  if (pref === "auto") return oppositeOf(resolved);
  const first = firstManual ?? pref;
  if (pref === first) return first === "light" ? "dark" : "light";
  return "auto";
}
