// Shared theming layer for embeddable widgets.
//
// Widgets can be themed two ways:
//  1) postMessage from the parent frame (live, used by the demo preview)
//  2) URL query params on the iframe src (static, used by copy-paste embed code)
//
// This module is the single source for the param<->CSS-var mapping, the value
// validation, and the named font options, so the demo (which BUILDS the query
// and the live preview) and the widgets (which PARSE the query) never drift.

/** Short URL param -> CSS custom property for colors + radius. */
export const WIDGET_THEME_PARAMS: Record<string, string> = {
  bg: "--widget-bg",
  fg: "--widget-fg",
  muted: "--widget-muted",
  accent: "--widget-accent",
  accentfg: "--widget-accent-fg",
  highlight: "--widget-highlight",
  ink: "--widget-ink",
  radius: "--widget-border-radius",
};

/** Named font choices. The URL carries a short keyword (font=serif); the widget
 * resolves it to a safe font stack. Free-form family strings are never accepted
 * from the URL (spaces/commas + injection risk). */
export const WIDGET_FONTS: Record<string, { label: string; stack: string }> = {
  system: { label: "System", stack: 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif' },
  sans: { label: "Sans", stack: "Arial,Helvetica,sans-serif" },
  serif: { label: "Serif", stack: 'Georgia,"Times New Roman",serif' },
  mono: { label: "Mono", stack: "ui-monospace,Menlo,Consolas,monospace" },
};

/** The widget layout's :root defaults. A selection equal to these is omitted
 * from the URL so the default look produces a clean, param-free embed code. */
export interface WidgetThemeSelection {
  bg: string;
  fg: string;
  accent: string;
  highlight: string; // turquoise live indicator
  radius: string;
  font: string; // key of WIDGET_FONTS
}

export const WIDGET_THEME_DEFAULTS: WidgetThemeSelection = {
  bg: "#FFFFFF",
  fg: "#3F3F3F",
  accent: "#1365EA",
  highlight: "#3DFFC1",
  radius: "14px",
  font: "system",
};

// Accept hex colors, rgb/rgba/hsl/hsla functions, plain CSS color names, and
// simple lengths (px/rem/%). Rejects anything else so a crafted iframe src
// cannot inject arbitrary CSS values.
const SAFE_VALUE =
  /^#[0-9a-fA-F]{3,8}$|^[a-zA-Z]+$|^\d{1,4}(px|rem|%)$|^(rgb|rgba|hsl|hsla)\([0-9.,%\s/]+\)$/;

export function isSafeThemeValue(value: string): boolean {
  return SAFE_VALUE.test(value.trim());
}

/** Pick black or white text for a given accent so button labels stay readable
 * on any accent color. Falls back to white for non-hex values. */
export function contrastColor(accent: string): string {
  const hex = accent.trim().replace(/^#/, "");
  const full =
    hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return "#FFFFFF";
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  // Perceived luminance (sRGB-weighted).
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0F0F0F" : "#FFFFFF";
}

/** Full CSS-var map for a selection — always includes every var (set to its
 * default when unchanged) so the live postMessage preview never leaves stale
 * overrides behind. */
export function selectionToVars(sel: WidgetThemeSelection): Record<string, string> {
  return {
    "--widget-bg": sel.bg,
    "--widget-fg": sel.fg,
    "--widget-accent": sel.accent,
    "--widget-accent-fg": contrastColor(sel.accent),
    "--widget-highlight": sel.highlight,
    // Grid/border ink follows the background contrast → white on dark bg.
    "--widget-ink": contrastColor(sel.bg),
    "--widget-border-radius": sel.radius,
    "--widget-font-family": (WIDGET_FONTS[sel.font] ?? WIDGET_FONTS.system).stack,
  };
}

/** Build a query string (no leading "?") from a selection, omitting any value
 * equal to the default so the standard look yields a param-free URL. */
export function buildWidgetThemeQuery(sel: WidgetThemeSelection): string {
  const params = new URLSearchParams();
  if (sel.bg !== WIDGET_THEME_DEFAULTS.bg) {
    params.set("bg", sel.bg);
    params.set("ink", contrastColor(sel.bg));
  }
  if (sel.fg !== WIDGET_THEME_DEFAULTS.fg) params.set("fg", sel.fg);
  if (sel.accent !== WIDGET_THEME_DEFAULTS.accent) {
    params.set("accent", sel.accent);
    params.set("accentfg", contrastColor(sel.accent));
  }
  if (sel.highlight !== WIDGET_THEME_DEFAULTS.highlight) params.set("highlight", sel.highlight);
  if (sel.radius !== WIDGET_THEME_DEFAULTS.radius) params.set("radius", sel.radius);
  if (sel.font !== WIDGET_THEME_DEFAULTS.font) params.set("font", sel.font);
  return params.toString();
}

/** Parse a query string ("?bg=...&font=serif") into a { "--widget-bg": "..." }
 * map for the widget to apply. Colors/radius are validated; font is resolved
 * from the WIDGET_FONTS whitelist. */
export function parseWidgetThemeQuery(search: string): Record<string, string> {
  const out: Record<string, string> = {};
  const params = new URLSearchParams(search);
  for (const param in WIDGET_THEME_PARAMS) {
    const raw = params.get(param);
    if (raw && isSafeThemeValue(raw)) out[WIDGET_THEME_PARAMS[param]] = raw.trim();
  }
  const font = params.get("font");
  if (font && WIDGET_FONTS[font]) out["--widget-font-family"] = WIDGET_FONTS[font].stack;
  return out;
}
