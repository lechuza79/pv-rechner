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
  /** Show the "Einbetten" button. The widgets gallery sets this to false
   * (embed=0) so the button doesn't appear on the gallery itself. */
  embed: boolean;
  /** Show the "Powered by solar-check.io" footer. Default true (free external
   * embeds keep it). Our own on-site integrations set branding=0 to hide it;
   * hiding it externally is a future premium feature, so it is never offered in
   * the free copy-paste embed code. */
  branding: boolean;
  /** First-party embed: this widget is embedded by us on one of our OWN pages
   * (onsite=1), not on a third-party site. In that case the surrounding page
   * already carries the CTAs' context, the "Powered by" line is redundant, and
   * the data source is credited centrally in the page footer — so the widget
   * shows its actions as a direct bar (no ⋯), and drops its own "Powered by" and
   * source note. Default false (external embed: keep branding + in-widget source
   * per the licence terms). Never offered in the copy-paste embed code. */
  onsite: boolean;
}

export const WIDGET_SETTINGS_DEFAULTS: WidgetSettings = {
  share: true,
  range: "7d",
  switchable: true,
  embed: true,
  branding: true,
  onsite: false,
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
  if (p.has("embed")) out.embed = p.get("embed") !== "0";
  if (p.has("branding")) out.branding = p.get("branding") !== "0";
  if (p.has("onsite")) out.onsite = p.get("onsite") !== "0";
  return out;
}

/** Coerce a postMessage settings object into a validated partial override.
 * Shares the same validation as the URL parser so the two paths never drift —
 * crucially this accepts every valid range (incl. "24h"). */
export function parseWidgetSettingsObject(obj: unknown): Partial<WidgetSettings> {
  const s = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
  const out: Partial<WidgetSettings> = {};
  if (typeof s.share === "boolean") out.share = s.share;
  if (typeof s.switchable === "boolean") out.switchable = s.switchable;
  if (typeof s.embed === "boolean") out.embed = s.embed;
  if (typeof s.branding === "boolean") out.branding = s.branding;
  if (typeof s.onsite === "boolean") out.onsite = s.onsite;
  if (typeof s.range === "string" && RANGES.indexOf(s.range as WidgetRange) !== -1) {
    out.range = s.range as WidgetRange;
  }
  return out;
}

/** Build URL params from a selection, omitting any value equal to the default
 * so the standard widget yields a clean, param-free embed URL.
 * NOTE: `embed` and `onsite` are intentionally NOT serialised here — they are
 * first-party runtime flags (embed=0 on the gallery, onsite=1 on our own pages),
 * never part of the copy-paste embed code handed to external embedders. */
export function buildWidgetSettingsQuery(s: WidgetSettings): URLSearchParams {
  const p = new URLSearchParams();
  if (s.share !== WIDGET_SETTINGS_DEFAULTS.share) p.set("share", s.share ? "1" : "0");
  if (s.range !== WIDGET_SETTINGS_DEFAULTS.range) p.set("range", s.range);
  if (s.switchable !== WIDGET_SETTINGS_DEFAULTS.switchable) p.set("switch", s.switchable ? "1" : "0");
  return p;
}
