// Central theme tokens — Single Source of Truth for all design values.
// Used by getCssVariables() (injected in layout.tsx) and v() helper (for inline styles).
// For whitelabeling: swap token values per tenant, UI updates automatically.

export const tokens = {
  // Backgrounds
  '--color-bg': '#FFFFFF',
  '--color-bg-card': '#FFFFFF',
  '--color-bg-input': '#F8F8F8',
  '--color-bg-hero': '#F1F6FE',
  '--color-bg-subtle': 'rgba(0,0,0,0.02)',
  '--color-bg-chart': '#FFFFFF',

  // Borders
  '--color-border': '#E9E9E9',
  '--color-border-input': '#E9E9E9',
  '--color-border-subtle': '#F0F0F0',
  '--color-border-muted': '#E0E0E0',
  '--color-border-hero': '#BCD6FF',

  // Accent (blue)
  '--color-accent': '#1365EA',
  '--color-accent-dim': 'rgba(19,101,234,0.08)',
  '--color-accent-dim-15': 'rgba(19,101,234,0.12)',
  '--color-accent-border': '#BCD6FF',
  '--color-accent-border-strong': '#6A9EF2',
  '--color-accent-dark': '#073C93',
  '--color-accent-light': '#6A9EF2',
  '--color-accent-bg': '#F1F6FE',

  // Semantic
  '--color-negative': '#EF4444',
  '--color-negative-dim': 'rgba(239,68,68,0.06)',
  '--color-negative-border': 'rgba(239,68,68,0.2)',
  '--color-optimistic': '#1365EA',
  '--color-positive': '#00D950',

  // Chart
  '--color-chart-positive-bg': 'rgba(0,217,80,0.08)',
  '--color-chart-negative-bg': 'rgba(239,68,68,0.05)',
  '--color-chart-grid': '#E9E9E9',
  '--color-chart-zero': '#BEBEBE',

  // Text
  '--color-text-primary': '#3F3F3F',
  '--color-text-white': '#1A1A1A',
  '--color-text-secondary': '#777777',
  '--color-text-tertiary': '#949494',
  '--color-text-muted': '#949494',
  '--color-text-faint': '#BEBEBE',
  '--color-text-disabled': '#CCCCCC',
  '--color-text-label': '#777777',
  '--color-text-ccc': '#777777',
  '--color-text-bbb': '#949494',
  '--color-text-aaa': '#777777',
  '--color-text-ddd': '#3F3F3F',
  '--color-text-on-accent': '#FFFFFF',

  // Progress
  '--color-progress-inactive': '#E9E9E9',

  // Fonts
  '--font-text': "'DM Sans',system-ui,sans-serif",
  '--font-mono': "'JetBrains Mono',monospace",

  // Radii
  '--radius-card': '14px',
  '--radius-card-lg': '16px',
  '--radius-card-xl': '20px',
  '--radius-button': '10px',
  '--radius-button-lg': '12px',
  '--radius-input': '6px',
  '--radius-pill': '8px',

  // Layout
  '--page-max-width': '480px',
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
