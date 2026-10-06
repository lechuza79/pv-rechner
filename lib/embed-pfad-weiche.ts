/**
 * WHERE AN EMBED REQUEST WITH QUERY PARAMETERS IS SERVED FROM.
 *
 * Embed codes on municipal websites carry their subject in the query string
 * (`/embed/gemeinde-solar?ags=09679147`). A page that reads `searchParams` is
 * rendered on every request and never cached — gemessen: jeder Aufruf eines
 * Gemeinde-Widgets war ein voller Serverless-Aufbau mit Datenbankabfragen.
 *
 * The middleware therefore REWRITES (never redirects) the query form onto a
 * path-parameter twin that is cached (same pattern as the calculator's
 * `/photovoltaik-rechner` → `/ergebnis` switch). The address in the browser
 * stays exactly as embedded, so every existing embed code keeps working, and
 * the theme/settings parameters stay readable client-side from
 * `window.location.search` (lib/useWidgetTheme.ts).
 *
 * Only widgets whose output depends on a SMALL, BOUNDED key take part:
 * a municipality key, a federal-state key, a postcode, or a fixed enum.
 * Normalisation happens here exactly as the page did it before, so the
 * twin receives only canonical keys and cannot be flooded with variants.
 *
 * Two routes to the twin, one target (this function decides it for both):
 * the CANONICAL query forms are rewritten by `EMBED_PFAD_REWRITES` in
 * next.config.js, because only a config rewrite keeps an on-demand ISR twin
 * cached; the rare non-canonical forms ("09-679-147", "bl=130") by the
 * middleware (`embedPfadZiel` without `istKonfigRewrite`). Fully prerendered
 * twins (kennzahl) work either way and stay with the middleware.
 *
 * Edge-safe on purpose: no imports.
 */

const GEMEINDE_WIDGETS = ["gemeinde-solar", "gemeinde-erneuerbare", "gemeinde-solarleistung"] as const;
const LAND_WIDGETS = ["region-anlagentyp", "region-solarleistung"] as const;

export const KENNZAHL_METRICS = ["leistung", "anlagen"] as const;
export const KENNZAHL_TRAEGER = ["gesamt", "solar", "wind", "biomasse", "wasser", "speicher"] as const;

/** Path segment for "no postcode given" in the simulation twin. */
export const SIMULATION_OHNE_PLZ = "ohne";
export const SIMULATION_DARSTELLUNGEN = ["widget", "site"] as const;

function istAus<T extends string>(liste: readonly T[], wert: string | null): wert is T {
  return wert !== null && (liste as readonly string[]).includes(wert);
}

/**
 * The rewrite target for an embed request, or null if the request is served
 * by the page at its own address (no parameter, or an invalid one — the
 * base pages render exactly the output the query form produced before).
 */
export function embedPfadZiel(pathname: string, params: URLSearchParams): string | null {
  const teile = pathname.split("/").filter(Boolean);
  if (teile.length !== 2 || teile[0] !== "embed") return null;
  const widget = teile[1];

  if (istAus(GEMEINDE_WIDGETS, widget)) {
    const ags = (params.get("ags") ?? "").replace(/\D/g, "");
    return ags.length === 8 ? `/embed/${widget}/${ags}` : null;
  }

  if (istAus(LAND_WIDGETS, widget)) {
    const bl = (params.get("bl") ?? "").replace(/\D/g, "").slice(0, 2);
    return bl.length === 2 ? `/embed/${widget}/${bl}` : null;
  }

  if (widget === "kennzahl") {
    if (!params.has("metric") && !params.has("traeger")) return null;
    const metric = istAus(KENNZAHL_METRICS, params.get("metric")) ? params.get("metric") : "leistung";
    const traeger = istAus(KENNZAHL_TRAEGER, params.get("traeger")) ? params.get("traeger") : "gesamt";
    return `/embed/kennzahl/${metric}/${traeger}`;
  }

  if (widget === "simulation") {
    const roh = params.get("plz") ?? "";
    const plz = /^\d{5}$/.test(roh) ? roh : SIMULATION_OHNE_PLZ;
    const darstellung = params.get("presentation") === "site" ? "site" : "widget";
    if (plz === SIMULATION_OHNE_PLZ && darstellung === "widget") return null;
    return `/embed/simulation/${plz}/${darstellung}`;
  }

  return null;
}

/**
 * True when next.config.js (`EMBED_PFAD_REWRITES`) already rewrites this
 * request — the middleware then must leave it alone. Mirrors the `has` rules
 * there exactly (their values are anchored regular expressions).
 */
export function istKonfigRewrite(pathname: string, params: URLSearchParams): boolean {
  const teile = pathname.split("/").filter(Boolean);
  if (teile.length !== 2 || teile[0] !== "embed") return false;
  const widget = teile[1];
  if (istAus(GEMEINDE_WIDGETS, widget)) return /^\d{8}$/.test(params.get("ags") ?? "");
  if (istAus(LAND_WIDGETS, widget)) return /^\d{2}$/.test(params.get("bl") ?? "");
  if (widget === "simulation") {
    if (/^\d{5}$/.test(params.get("plz") ?? "")) return true;
    return !params.has("plz") && params.get("presentation") === "site";
  }
  return false;
}
