// Central theme tokens — Single Source of Truth for all design values.
// Used by getCssVariables() (injected in layout.tsx) and v() helper (for inline styles).
// For whitelabeling: swap token values per tenant, UI updates automatically.
//
// v2: Consolidated from Figma design. See theme-v1.ts for previous token set.

export const tokens = {
  // ─── Backgrounds (3) ────────────────────────────────────────────────────────
  '--color-bg': '#FFFFFF',              // Page, cards, panels, chart
  '--color-bg-muted': '#F8F8F8',        // Inputs, subtle areas, overlays
  '--color-bg-accent': '#F1F6FE',       // Hero section, accent backgrounds

  // ─── Borders (3) ───────────────────────────────────────────────────────────
  '--color-border': '#E9E9E9',          // Default borders, cards, inputs
  '--color-border-muted': '#E0E0E0',    // Muted/secondary borders, toggles
  '--color-border-accent': '#BCD6FF',   // Accent borders, hero, icon buttons

  // ─── Accent — Blue (5) ─────────────────────────────────────────────────────
  '--color-accent': '#1365EA',          // CTAs, toggles, active states, hero number
  '--color-accent-dim': 'rgba(19,101,234,0.08)',  // Selected card backgrounds
  '--color-accent-dark': '#073C93',     // Hover, dark accent text
  '--color-accent-light': '#6A9EF2',    // Light accent, secondary interactive

  // ─── Brand (2) ─────────────────────────────────────────────────────────────
  // The logo mark's two blues. Kept apart from --color-accent even where the
  // values match: the accent means "interactive", these mean "the brand" — a
  // white-label tenant swaps one without the other.
  //
  // They do shift per theme so the mark keeps its footing on a dark ground, but
  // the pair must always stay in the same order (brand above brand-deep), or
  // the mark's layering inverts. That is why the deep one is NOT
  // --color-accent-dark: that token means "the accent variant that contrasts
  // with the background" and therefore flips to a light blue in dark mode.
  '--color-brand': '#1365EA',
  '--color-brand-deep': '#073C93',

  // ─── Semantic (5) ──────────────────────────────────────────────────────────
  '--color-positive': '#00D950',        // Positive values (Rendite, Ersparnis)
  '--color-highlight': '#3DFFC1',       // Highlight (Live-Indikator, jüngster Wert)
  '--color-awareness': '#3DFFC1',       // Awareness/Aufmerksamkeit (Synonym fürs Highlight-Token, semantisch klarer für allgemeine Use-Cases ausserhalb Live-Daten)
  '--color-negative': '#EF4444',        // Negative values (Kosten, Verluste)
  '--color-negative-dim': 'rgba(239,68,68,0.06)',  // Negative background
  '--color-negative-border': 'rgba(239,68,68,0.2)', // Negative border

  // ─── Chart (4) ─────────────────────────────────────────────────────────────
  '--color-chart-positive-bg': 'rgba(0,217,80,0.08)',
  '--color-chart-negative-bg': 'rgba(239,68,68,0.05)',
  '--color-chart-grid': '#E9E9E9',
  '--color-chart-zero': '#BEBEBE',

  // ─── Energy — Renewables (green shades) ─────────────────────────────────────
  '--color-energy-solar': '#4CAF50',        // Strong green — Solar
  '--color-energy-wind': '#66BB6A',         // Medium green — Wind onshore
  '--color-energy-wind-offshore': '#2E7D32', // Dark green — Wind offshore
  '--color-energy-hydro': '#81C784',        // Light green — Wasserkraft
  '--color-energy-biomass': '#A5D6A7',      // Pale green — Biomasse
  '--color-energy-geothermal': '#C8E6C9',   // Very pale green — Geothermie
  // ─── Energy — Fossil (brown shades) ───────────────────────────────────────
  '--color-energy-gas': '#BC8F6F',          // Warm tan — Erdgas
  '--color-energy-coal': '#8D6E63',         // Medium brown — Steinkohle
  '--color-energy-coal-gas': '#8D6E63',     // Medium brown — Grubengas
  '--color-energy-lignite': '#5D4037',      // Dark brown — Braunkohle
  '--color-energy-oil': '#A1887F',          // Light brown — Öl
  // ─── Energy — Sonstige ────────────────────────────────────────────────────
  '--color-energy-other': '#BDBDBD',        // Light grey — Sonstige/Abfall
  // ─── Energy — Kernenergie ───────────────────────────────────────────────
  '--color-energy-nuclear': '#EF85F8',        // Light pink — Kernenergie erzeugt in DE (bis April 2023)
  '--color-energy-nuclear-import': '#EA00FF', // Magenta — Importierte Kernenergie
  // ─── Energy — Category summary colors ─────────────────────────────────────
  '--color-energy-cat-renewable': '#4CAF50', // Green — Erneuerbare (summary)
  '--color-energy-cat-fossil': '#8D6E63',    // Brown — Fossil (summary)
  '--color-energy-cat-other': '#BDBDBD',     // Grey — Sonstige (summary)

  // ─── Text (5) ──────────────────────────────────────────────────────────────
  '--color-text-primary': '#3F3F3F',    // Headings, strong text, values
  // A11y (WCAG 2.1 AA, BFSG): body/label greys darkened so they clear 4.5:1 on
  // white — secondary 5.3:1, muted 5.1:1 (was 4.48/3.03). faint is placeholder-
  // only (not essential text), darkened from 1.86:1 to 3.45:1. See audit
  // docs/audit-backlog-2026-07-19.md §4. Dark/Dusk/Overcast nachgezogen (N8).
  '--color-text-secondary': '#6B6B6B',  // Body text, labels, descriptions
  '--color-text-muted': '#6E6E6E',      // Dimmed text, hints
  '--color-text-faint': '#8A8A8A',      // Very light text, placeholders
  '--color-text-on-accent': '#FFFFFF',  // Text on accent-colored backgrounds

  // ─── Progress (1) ──────────────────────────────────────────────────────────
  '--color-progress-inactive': '#E9E9E9',

  // ─── Track (1) ─────────────────────────────────────────────────────────────
  // The unfilled part of a gauge/meter. Translucent so it composites over
  // whatever sits behind it, and flips ink per theme — "10 % white" only reads
  // on a dark ground, "10 % black" only on a light one.
  '--color-track': 'rgba(0,0,0,0.10)',

  // ─── Shadows (3) ───────────────────────────────────────────────────────────
  // Tokenised so they invert for dark/dusk (black shadows vanish on dark grounds).
  '--shadow-sm': '0 1px 3px rgba(0,0,0,0.06)',    // cards, subtle lift
  '--shadow-md': '0 4px 16px rgba(0,0,0,0.08)',   // menus, popovers, tooltips
  '--shadow-lg': '0 8px 28px rgba(0,0,0,0.10)',   // dropdowns, modals

  // ─── Fonts (2) ─────────────────────────────────────────────────────────────
  // Font families resolve to the self-hosted next/font variables (set on <html>
  // in app/(site)/layout.tsx), with system fallbacks before they load.
  '--font-text': "var(--font-dm-sans),'DM Sans',system-ui,sans-serif",
  '--font-mono': "var(--font-jetbrains-mono),'JetBrains Mono',monospace",

  // ─── Typografie-Skala (7) ──────────────────────────────────────────────────
  // Modulare Skala, Basis 15px (Fließtext), Verhältnis ~1.2, gerundet auf
  // ganze/halbe px. EINE Leseskala für alle Content-/Textseiten (Ratgeber,
  // Methodik, Glossar, Impressum, …), damit dieselbe Rolle überall dieselbe
  // Größe hat. Die interaktiven Rechner/Flows und Embed-Widgets nutzen sie
  // bewusst NICHT — dort ist die kompakte Größe gewollt.
  '--font-size-caption': '12px',        // Uppercase-Labels, Bildunterschriften
  '--font-size-small': '13px',          // Sekundär-/Tabellentext, Fußnoten
  '--font-size-body': '15px',           // Basis: Fließtext
  '--font-size-lead': '17px',           // Hero/Einleitung (Subtitle)
  '--font-size-h3': '18px',             // Kleine Überschrift
  '--font-size-h2': '21px',             // Sektions-Überschrift
  '--font-size-h1': '26px',             // Seiten-Titel

  // ─── Radii (3) ─────────────────────────────────────────────────────────────
  '--radius-sm': '6px',                 // Small: inputs, checkboxes, pills
  '--radius-md': '12px',                // Medium: buttons, cards, panels
  '--radius-lg': '20px',                // Large: hero cards, outer containers

  // ─── Layout (3) ────────────────────────────────────────────────────────────
  '--page-max-width': '480px',       // Rechner/Tools — kompakte, fokussierte Spalte
  '--content-max-width': '640px',    // Redaktionelle Lese-/Textseiten (Ratgeber, Methodik, …)
  '--header-max-width': '1040px',
} as const;

export type TokenName = keyof typeof tokens;

/**
 * Icon sizes — THE place to tune how big icons read across the UI.
 * Numbers (not CSS vars) because the icon components take a numeric `size`
 * prop, so they can be passed straight through.
 *
 * Every icon call site uses these, so changing a value here changes the whole
 * app. The scale replaced a spread of hand-picked pixel values (8, 10, 11, 12,
 * 13, 14, 15, 16, 18, 22) — the odd steps in between were drift, not intent.
 *
 *   xs  dense inline glyphs (dropdown chevrons, small markers)
 *   sm  inline with text (info tooltips, compact chevrons)
 *   md  standard UI icon (buttons, list items)
 *   lg  prominent
 *   xl  touch targets (burger, close) and tool-card icons
 */
export const iconSizes = {
  xs: 9,
  sm: 11,
  md: 13,
  lg: 16,
  xl: 20,
} as const;

/** CSS variable reference for inline styles: v('--color-accent') → 'var(--color-accent)' */
export const v = (name: TokenName): string => `var(${name})`;

/** Generate :root CSS block from tokens */
export function getCssVariables(): string {
  return `:root {\n${Object.entries(tokens).map(([k, val]) => `  ${k}: ${val};`).join('\n')}\n}`;
}

// ─── Dark / Dusk theme overrides ───────────────────────────────────────────
// Only the tokens that change per theme; everything else inherits from :root
// (the light base). data-theme values are the resolved themes from
// lib/theme-schedule.ts ('light' | 'dusk' | 'dark'), set by the boot script and
// the ThemeController.
//
// Semantic data colours stay recognisable in every mode: green = positive,
// red = negative, cyan = highlight, and the energy-mix palette (green =
// renewables, brown = fossil, pink = nuclear) are deliberately NOT overridden —
// they are data, not chrome. Only chrome (surfaces, text, borders, shadows) and
// the interactive accent shift, brightened for contrast on dark grounds.

/** Nacht — cool dark slate. */
const darkTokens: Partial<Record<TokenName, string>> = {
  '--color-bg': '#12161C',
  '--color-bg-muted': '#1B212A',
  '--color-bg-accent': '#152238',
  '--color-border': '#2A313C',
  '--color-border-muted': '#232A34',
  '--color-border-accent': '#31517F',
  '--color-brand': '#4D8DF0',                       // mark, brightened for the dark ground
  '--color-brand-deep': '#2D5FBF',                  // still a step below brand — layering holds
  '--color-accent': '#4D8DF0',                      // brightened blue for dark contrast
  '--color-accent-dim': 'rgba(77,141,240,0.16)',
  '--color-accent-dark': '#8FBBF7',                 // "hover / accent text" → lighter on dark
  '--color-accent-light': '#3E74CC',
  '--color-positive': '#2BE06E',
  '--color-negative': '#F26D6D',
  '--color-negative-dim': 'rgba(242,109,109,0.12)',
  '--color-negative-border': 'rgba(242,109,109,0.32)',
  '--color-chart-positive-bg': 'rgba(43,224,110,0.13)',
  '--color-chart-negative-bg': 'rgba(242,109,109,0.10)',
  '--color-chart-grid': '#2A313C',
  '--color-chart-zero': '#4C5561',
  '--color-text-primary': '#E7EBF1',
  '--color-text-secondary': '#9AA6B4',
  '--color-text-muted': '#838D9A',                 // A11y: 5.4:1 on dark bg (was 4.66)
  '--color-text-faint': '#6C7683',                 // A11y: 3.9:1 placeholder tier (was 2.90)
  '--color-progress-inactive': '#2A313C',
  '--color-track': 'rgba(255,255,255,0.10)',
  '--shadow-sm': '0 1px 3px rgba(0,0,0,0.45)',
  '--shadow-md': '0 4px 16px rgba(0,0,0,0.55)',
  '--shadow-lg': '0 10px 30px rgba(0,0,0,0.6)',
};

/** Dämmerung — warm, dimmed twilight between day and night. */
const duskTokens: Partial<Record<TokenName, string>> = {
  '--color-bg': '#26202B',                          // warm plum, dimmed (not deep dark)
  '--color-bg-muted': '#302833',
  '--color-bg-accent': '#342740',
  '--color-border': '#3E3442',
  '--color-border-muted': '#352C39',
  '--color-border-accent': '#5A4A78',
  '--color-brand': '#6E9CEE',
  '--color-brand-deep': '#3F6BC4',
  '--color-accent': '#6E9CEE',
  '--color-accent-dim': 'rgba(110,156,238,0.16)',
  '--color-accent-dark': '#A9C4F5',
  '--color-accent-light': '#5A7FC8',
  '--color-positive': '#3BD97A',
  '--color-negative': '#F07D72',
  '--color-negative-dim': 'rgba(240,125,114,0.12)',
  '--color-negative-border': 'rgba(240,125,114,0.30)',
  '--color-chart-positive-bg': 'rgba(59,217,122,0.12)',
  '--color-chart-negative-bg': 'rgba(240,125,114,0.10)',
  '--color-chart-grid': '#3E3442',
  '--color-chart-zero': '#5E5566',
  '--color-text-primary': '#F0E6EC',                // warm off-white
  '--color-text-secondary': '#B7A6B4',
  '--color-text-muted': '#9E8D9B',                 // A11y: 5.1:1 on dusk bg (was 4.20)
  '--color-text-faint': '#7C6E7A',                 // A11y: 3.3:1 placeholder tier (was 2.62)
  '--color-progress-inactive': '#3E3442',
  '--color-track': 'rgba(255,255,255,0.10)',
  '--shadow-sm': '0 1px 3px rgba(0,0,0,0.35)',
  '--shadow-md': '0 4px 16px rgba(0,0,0,0.45)',
  '--shadow-lg': '0 10px 30px rgba(0,0,0,0.5)',
};

// Overcast day — a genuine medium grey, dark enough to read clearly as "dimmed"
// against white. Text is darkened to match (a light page's greys would vanish
// on this ground); dark text on the grey still clears 4.5:1.
const overcastTokens: Partial<Record<TokenName, string>> = {
  '--color-bg': '#BFC4CC',
  '--color-bg-muted': '#B4BAC3',
  '--color-bg-accent': '#B8C0CE',
  '--color-border': '#969CA6',
  '--color-border-muted': '#9EA4AE',
  '--color-border-accent': '#7FA0CE',
  '--color-text-primary': '#2C2F34',
  '--color-text-secondary': '#494D53',
  '--color-text-muted': '#4C5056',                 // A11y: 4.6:1 on overcast bg (was 3.72)
  '--color-text-faint': '#5E626A',                 // A11y: 3.5:1 placeholder tier (was 2.39)
  '--color-chart-grid': '#969CA6',
  '--color-chart-zero': '#7A7F87',
  '--color-progress-inactive': '#969CA6',
  '--color-track': 'rgba(0,0,0,0.18)',
  // Neon #00D950 (the brand green, kept everywhere else) sits at nearly the same
  // lightness as this medium grey, so it reads washed-out here. Only on s3 does
  // the positive green fall back a shade deeper. (Purely a look call — the
  // luminance contrast is still below WCAG on grey either way; real
  // accessibility is a separate pass.)
  '--color-positive': '#00BD45',
};

type Tokens = Partial<Record<TokenName, string>>;
const base = tokens as Record<TokenName, string>;

// Interpolate one token value. Colours (#hex / rgba) blend channel-wise;
// anything else (fonts, radii, shadows) snaps to the nearer anchor.
function lerpValue(a: string, b: string, t: number): string {
  const pa = parseColor(a);
  const pb = parseColor(b);
  if (!pa || !pb) return t < 0.5 ? a : b;
  const ch = (i: number) => Math.round(pa[i] + (pb[i] - pa[i]) * t);
  const alpha = +(pa[3] + (pb[3] - pa[3]) * t).toFixed(3);
  if (alpha >= 1) {
    return `#${[ch(0), ch(1), ch(2)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  }
  return `rgba(${ch(0)},${ch(1)},${ch(2)},${alpha})`;
}

function parseColor(v: string): [number, number, number, number] | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(v.trim());
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(v.trim());
  if (rgba) return [+rgba[1], +rgba[2], +rgba[3], rgba[4] === undefined ? 1 : +rgba[4]];
  return null;
}

// Blend two anchor overrides (each a partial over the light base) at t.
function lerpTokens(a: Tokens, b: Tokens, t: number): Tokens {
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])) as TokenName[];
  const out: Tokens = {};
  keys.forEach((k) => {
    const av = a[k] ?? base[k];
    const bv = b[k] ?? base[k];
    const v = lerpValue(av, bv, t);
    if (v !== base[k]) out[k] = v; // keep the CSS to what actually differs
  });
  return out;
}

// The seven stages (see lib/theme-schedule.ts). s6 is the light base — no
// override. Light zone (s3–s5) interpolates base→overcast (dark text
// throughout); dark zone (s1) interpolates dusk→dark. The gap s2↔s3 is the one
// hard flip: no smooth path crosses it with readable text.
const STAGE_TOKENS: Tokens[] = [
  darkTokens,                           // s0
  lerpTokens(duskTokens, darkTokens, 0.5), // s1
  duskTokens,                           // s2
  overcastTokens,                       // s3
  lerpTokens({}, overcastTokens, 2 / 3),   // s4
  lerpTokens({}, overcastTokens, 1 / 3),   // s5
  // s6 = base, emitted as no override
];

/** Background colour of a stage — for the mobile browser-chrome meta tag. */
export function stageBackground(i: number): string {
  return STAGE_TOKENS[i]?.['--color-bg'] ?? base['--color-bg'];
}

/**
 * CSS for the seven brightness-stage overrides, emitted once in the site <head>
 * after getCssVariables(). s6 needs no block — it is the :root light base.
 */
export function getThemeOverrides(): string {
  return STAGE_TOKENS
    .map((set, i) => {
      const body = Object.entries(set).map(([k, val]) => `  ${k}: ${val};`).join('\n');
      return `:root[data-theme="s${i}"] {\n${body}\n}`;
    })
    .join('\n');
}

/** Global reset + animations (shared across all pages) */
export const globalStyles = `
  html{scroll-behavior:smooth}
  *{box-sizing:border-box;margin:0;padding:0}
  /* Smooth theme cross-fade — only enabled while a theme switch is in flight
     (ThemeController toggles .theme-anim on <html>), so normal hovers stay
     instant and the initial (boot-script) theme paints without animating.
     opacity is in the list because this !important rule replaces every
     element's own transition for its duration: without it, anything fading in
     during a switch (e.g. the switch's own tooltip) would jump instead. */
  html.theme-anim,html.theme-anim *,html.theme-anim *::before,html.theme-anim *::after{
    transition:background-color .5s ease,border-color .5s ease,color .5s ease,fill .5s ease,stroke .5s ease,box-shadow .5s ease,background .5s ease,opacity .25s ease !important;
  }
  @media (prefers-reduced-motion:reduce){html.theme-anim,html.theme-anim *{transition:none !important}}
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
  input[type=number]{-moz-appearance:textfield}
  @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  /* Reveal — one motion, two semantic classes: accordions open with it, and so
     do flyouts/popovers anchored under their trigger. */
  @keyframes sc-reveal{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
  .sc-flyout{animation:sc-reveal .18s ease-out}
  /* Content swap — replay by changing the element's key, so a value changing
     underneath the reader fades in instead of snapping. Deliberately NOT named
     sc-fade: the embed layout defines its own sc-fade with different motion,
     and one name for two animations is a trap. */
  @keyframes sc-swap{from{opacity:0}to{opacity:1}}
  .sc-swap{animation:sc-swap .28s ease-out}
  @media (prefers-reduced-motion:reduce){.sc-flyout,.sc-swap{animation:none}}
  @keyframes sc-dots{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}
  @keyframes sc-map-pulse{0%,100%{opacity:.45}50%{opacity:1}}
  @keyframes sc-live-ring{0%{transform:translate(-50%,-50%) scale(1);opacity:.7}100%{transform:translate(-50%,-50%) scale(3.5);opacity:0}}
  @keyframes sc-live-bar{0%,100%{opacity:1}50%{opacity:.55}}
  @keyframes sc-bar-grow{from{opacity:0}to{opacity:1}}
  @keyframes sc-plz-pulse{0%{box-shadow:0 0 0 0 rgba(19,101,234,.4)}70%{box-shadow:0 0 0 6px rgba(19,101,234,0)}100%{box-shadow:0 0 0 0 rgba(19,101,234,0)}}
  .sc-plz-pulse{animation:sc-plz-pulse 2s ease-out infinite}
  .fu{animation:fu .3s ease-out}
  /* Akkordeon-Felder (Großverbraucher): Übergang zwischen Auswahl- und
     Fertig-Zustand in beide Richtungen. React tauscht dabei das Element
     (div ↔ button), die Animation läuft also bei jedem Wechsel neu an. */
  .sc-acc{animation:sc-reveal .22s ease-out}
  @media (prefers-reduced-motion:reduce){.sc-acc{animation:none}}
  .sc-live-dot{position:relative}
  .sc-live-dot::before,.sc-live-dot::after{content:'';position:absolute;top:50%;left:50%;width:100%;height:100%;border-radius:50%;background:var(--color-highlight);pointer-events:none;animation:sc-live-ring 1.8s ease-out infinite}
  .sc-live-dot::after{animation-delay:.9s}
  .sc-live-bar{animation:sc-live-bar 1.8s ease-in-out infinite}
  .mastr-hero-grid{display:grid;grid-template-columns:minmax(0,430px) 300px;gap:48px;align-items:start;justify-content:center}
  .mastr-hero-aside{display:grid;gap:12px}
  .mastr-kpis{display:grid;gap:10px}
  /* Desktop: full-height map in its column. */
  .mastr-map-box{width:100%;height:640px}
  @media (max-width:720px){
    .mastr-hero-grid{grid-template-columns:1fr;gap:16px}
    /* Single-column safety: cap the height so the KPI row stays on screen. The
       width cap only applies to the portrait Germany view (so it centers instead
       of sitting in a wide, empty box); a drilled-in Bundesland (usually
       landscape) keeps the full width and fills the height. */
    .mastr-map-box{height:420px;margin-inline:auto}
    .mastr-map-box--de{max-width:300px}
    /* Extra control rows (Solar segment filter, Bundesland breadcrumb) push the
       map down — shrink it by their height so the KPI row stays on screen. */
    .mastr-hero-grid.has-filter .mastr-map-box{height:372px}
    .mastr-hero-grid.has-breadcrumb .mastr-map-box{height:376px}
    .mastr-hero-grid.has-filter.has-breadcrumb .mastr-map-box{height:328px}
    .mastr-hero-aside .mastr-summary{order:-1}
    .mastr-kpis{grid-template-columns:repeat(3,1fr);gap:8px}
    .mastr-kpis .kachel-tile{padding:10px}
    .mastr-kpis .kachel-value{font-size:15px !important;letter-spacing:-0.4px}
  }
  .tool-cards-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media (max-width:720px){.tool-cards-grid{grid-template-columns:1fr}}
`;
