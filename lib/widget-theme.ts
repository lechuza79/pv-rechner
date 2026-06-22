// Shared theming layer for embeddable widgets.
//
// Widgets can be themed two ways:
//  1) postMessage from the parent frame (live, used by the demo preview)
//  2) URL query params on the iframe src (static, used by copy-paste embed code)
//
// This module is the single source for the param<->CSS-var mapping and the
// value validation, so the demo (which BUILDS the query) and the widgets
// (which PARSE it) can never drift apart.

/** Short URL param -> CSS custom property. Colors + radius only; font-family
 * is intentionally excluded from the URL channel (spaces/commas, lower value). */
export const WIDGET_THEME_PARAMS: Record<string, string> = {
  bg: "--widget-bg",
  fg: "--widget-fg",
  muted: "--widget-muted",
  accent: "--widget-accent",
  accentfg: "--widget-accent-fg",
  highlight: "--widget-highlight",
  radius: "--widget-border-radius",
};

// Accept hex colors, rgb/rgba/hsl/hsla functions, plain CSS color names, and
// simple lengths (px/rem/%). Rejects anything else so a crafted iframe src
// cannot inject arbitrary CSS values.
const SAFE_VALUE =
  /^#[0-9a-fA-F]{3,8}$|^[a-zA-Z]+$|^\d{1,4}(px|rem|%)$|^(rgb|rgba|hsl|hsla)\([0-9.,%\s/]+\)$/;

export function isSafeThemeValue(value: string): boolean {
  return SAFE_VALUE.test(value.trim());
}

/** Parse a query string ("?bg=...&accent=...") into { "--widget-bg": "..." }. */
export function parseWidgetThemeQuery(search: string): Record<string, string> {
  const out: Record<string, string> = {};
  const params = new URLSearchParams(search);
  for (const param in WIDGET_THEME_PARAMS) {
    const raw = params.get(param);
    if (raw && isSafeThemeValue(raw)) {
      out[WIDGET_THEME_PARAMS[param]] = raw.trim();
    }
  }
  return out;
}

/** Build a query string (no leading "?") from a { "--widget-bg": "..." } map.
 * Returns "" when no themeable vars are present (= default look). */
export function buildWidgetThemeQuery(vars: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const param in WIDGET_THEME_PARAMS) {
    const value = vars[WIDGET_THEME_PARAMS[param]];
    if (value) params.set(param, value);
  }
  return params.toString();
}
