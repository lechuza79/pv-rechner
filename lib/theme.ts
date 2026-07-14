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
  '--color-text-secondary': '#777777',  // Body text, labels, descriptions
  '--color-text-muted': '#949494',      // Dimmed text, hints
  '--color-text-faint': '#BEBEBE',      // Very light text, placeholders
  '--color-text-on-accent': '#FFFFFF',  // Text on accent-colored backgrounds

  // ─── Progress (1) ──────────────────────────────────────────────────────────
  '--color-progress-inactive': '#E9E9E9',

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

  // ─── Radii (3) ─────────────────────────────────────────────────────────────
  '--radius-sm': '6px',                 // Small: inputs, checkboxes, pills
  '--radius-md': '12px',                // Medium: buttons, cards, panels
  '--radius-lg': '20px',                // Large: hero cards, outer containers

  // ─── Layout (2) ────────────────────────────────────────────────────────────
  '--page-max-width': '480px',
  '--header-max-width': '960px',
} as const;

export type TokenName = keyof typeof tokens;

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
  '--color-text-muted': '#78828F',
  '--color-text-faint': '#59616C',
  '--color-progress-inactive': '#2A313C',
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
  '--color-text-muted': '#8E7F8C',
  '--color-text-faint': '#6B5F6A',
  '--color-progress-inactive': '#3E3442',
  '--shadow-sm': '0 1px 3px rgba(0,0,0,0.35)',
  '--shadow-md': '0 4px 16px rgba(0,0,0,0.45)',
  '--shadow-lg': '0 10px 30px rgba(0,0,0,0.5)',
};

/** Resolved theme identifier used on the <html data-theme> attribute. */
export type ResolvedTheme = 'light' | 'dusk' | 'dark';

const OVERRIDES: Record<Exclude<ResolvedTheme, 'light'>, Partial<Record<TokenName, string>>> = {
  dark: darkTokens,
  dusk: duskTokens,
};

/**
 * CSS for the dark/dusk theme overrides. Emitted once in the site <head> after
 * getCssVariables(). Light needs no block — it is the :root base.
 */
export function getThemeOverrides(): string {
  return (Object.entries(OVERRIDES) as [keyof typeof OVERRIDES, Partial<Record<TokenName, string>>][])
    .map(([theme, set]) => {
      const body = Object.entries(set).map(([k, val]) => `  ${k}: ${val};`).join('\n');
      return `:root[data-theme="${theme}"] {\n${body}\n}`;
    })
    .join('\n');
}

/** Global reset + animations (shared across all pages) */
export const globalStyles = `
  html{scroll-behavior:smooth}
  *{box-sizing:border-box;margin:0;padding:0}
  /* Smooth theme cross-fade — only enabled while a theme switch is in flight
     (ThemeController toggles .theme-anim on <html>), so normal hovers stay
     instant and the initial (boot-script) theme paints without animating. */
  html.theme-anim,html.theme-anim *,html.theme-anim *::before,html.theme-anim *::after{
    transition:background-color .5s ease,border-color .5s ease,color .5s ease,fill .5s ease,stroke .5s ease,box-shadow .5s ease,background .5s ease !important;
  }
  @media (prefers-reduced-motion:reduce){html.theme-anim,html.theme-anim *{transition:none !important}}
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
  input[type=number]{-moz-appearance:textfield}
  @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes sc-dots{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}
  @keyframes sc-map-pulse{0%,100%{opacity:.45}50%{opacity:1}}
  @keyframes sc-live-ring{0%{transform:translate(-50%,-50%) scale(1);opacity:.7}100%{transform:translate(-50%,-50%) scale(3.5);opacity:0}}
  @keyframes sc-live-bar{0%,100%{opacity:1}50%{opacity:.55}}
  @keyframes sc-bar-grow{from{opacity:0}to{opacity:1}}
  @keyframes sc-plz-pulse{0%{box-shadow:0 0 0 0 rgba(19,101,234,.4)}70%{box-shadow:0 0 0 6px rgba(19,101,234,0)}100%{box-shadow:0 0 0 0 rgba(19,101,234,0)}}
  .sc-plz-pulse{animation:sc-plz-pulse 2s ease-out infinite}
  .fu{animation:fu .3s ease-out}
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
