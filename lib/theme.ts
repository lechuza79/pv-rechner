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

  // ─── Semantic (4) ──────────────────────────────────────────────────────────
  '--color-positive': '#00D950',        // Positive values (Rendite, Ersparnis)
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
  // ─── Energy — Fossil / Other (brown/grey shades) ──────────────────────────
  '--color-energy-nuclear': '#9E9E9E',      // Neutral grey — Kernenergie
  '--color-energy-gas': '#BC8F6F',          // Warm tan — Erdgas
  '--color-energy-coal': '#8D6E63',         // Medium brown — Steinkohle
  '--color-energy-lignite': '#5D4037',      // Dark brown — Braunkohle
  '--color-energy-oil': '#A1887F',          // Light brown — Öl
  '--color-energy-other': '#BDBDBD',        // Light grey — Sonstige/Abfall

  // ─── Text (5) ──────────────────────────────────────────────────────────────
  '--color-text-primary': '#3F3F3F',    // Headings, strong text, values
  '--color-text-secondary': '#777777',  // Body text, labels, descriptions
  '--color-text-muted': '#949494',      // Dimmed text, hints
  '--color-text-faint': '#BEBEBE',      // Very light text, placeholders
  '--color-text-on-accent': '#FFFFFF',  // Text on accent-colored backgrounds

  // ─── Progress (1) ──────────────────────────────────────────────────────────
  '--color-progress-inactive': '#E9E9E9',

  // ─── Fonts (2) ─────────────────────────────────────────────────────────────
  '--font-text': "'DM Sans',system-ui,sans-serif",
  '--font-mono': "'JetBrains Mono',monospace",

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

/** Global reset + animations (shared across all pages) */
export const globalStyles = `
  *{box-sizing:border-box;margin:0;padding:0}
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
  input[type=number]{-moz-appearance:textfield}
  @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .fu{animation:fu .3s ease-out}
`;
