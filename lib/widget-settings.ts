// Functional (behaviour) settings for embeddable widgets — separate from the
// visual theme in widget-theme.ts. Like the theme, these travel two ways:
//  1) URL query params on the iframe src (static copy-paste embed)
//  2) postMessage from the parent frame (live demo preview)
//
// Single source for the param<->value mapping and defaults so the widgets page
// (which builds the query + live preview) and the widgets (which parse it) agree.

export type WidgetRange = "24h" | "7d" | "30d" | "year";

export interface WidgetSettings {
  /** Show the share buttons (copy link / WhatsApp / X) in the footer. */
  share: boolean;
  /** Initial time range. */
  range: WidgetRange;
  /** Show the time-range switcher. When false, the range is fixed. */
  switchable: boolean;
}

export const WIDGET_SETTINGS_DEFAULTS: WidgetSettings = {
  share: true,
  range: "7d",
  switchable: true,
};

const RANGES: readonly WidgetRange[] = ["24h", "7d", "30d", "year"];

/** Parse iframe URL params into a partial settings override. */
export function parseWidgetSettingsQuery(search: string): Partial<WidgetSettings> {
  const p = new URLSearchParams(search);
  const out: Partial<WidgetSettings> = {};
  if (p.has("share")) out.share = p.get("share") !== "0";
  const r = p.get("range");
  if (r && RANGES.indexOf(r as WidgetRange) !== -1) out.range = r as WidgetRange;
  if (p.has("switch")) out.switchable = p.get("switch") !== "0";
  return out;
}

/** Build URL params from a selection, omitting any value equal to the default
 * so the standard widget yields a clean, param-free embed URL. */
export function buildWidgetSettingsQuery(s: WidgetSettings): URLSearchParams {
  const p = new URLSearchParams();
  if (s.share !== WIDGET_SETTINGS_DEFAULTS.share) p.set("share", s.share ? "1" : "0");
  if (s.range !== WIDGET_SETTINGS_DEFAULTS.range) p.set("range", s.range);
  if (s.switchable !== WIDGET_SETTINGS_DEFAULTS.switchable) p.set("switch", s.switchable ? "1" : "0");
  return p;
}
