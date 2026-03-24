// Central theme tokens — Single Source of Truth for all design values.
// Used by getCssVariables() (injected in layout.tsx) and v() helper (for inline styles).
// For whitelabeling: swap token values per tenant, UI updates automatically.

export const tokens = {
  // Backgrounds
  '--color-bg': '#0c0c0c',
  '--color-bg-card': '#151515',
  '--color-bg-input': '#161616',
  '--color-bg-hero': '#111',
  '--color-bg-subtle': 'rgba(255,255,255,0.03)',
  '--color-bg-chart': '#131313',

  // Borders
  '--color-border': '#252525',
  '--color-border-input': '#2a2a2a',
  '--color-border-subtle': '#222',
  '--color-border-muted': '#333',
  '--color-border-hero': '#1e3a1e',

  // Accent (green)
  '--color-accent': '#22c55e',
  '--color-accent-dim': 'rgba(34,197,94,0.1)',
  '--color-accent-dim-15': 'rgba(34,197,94,0.15)',
  '--color-accent-border': 'rgba(34,197,94,0.3)',
  '--color-accent-border-strong': 'rgba(34,197,94,0.4)',

  // Semantic
  '--color-negative': '#ef4444',
  '--color-negative-dim': 'rgba(239,68,68,0.1)',
  '--color-negative-border': 'rgba(239,68,68,0.3)',
  '--color-optimistic': '#3b82f6',

  // Chart
  '--color-chart-positive-bg': 'rgba(34,197,94,0.05)',
  '--color-chart-negative-bg': 'rgba(239,68,68,0.05)',
  '--color-chart-grid': '#252525',
  '--color-chart-zero': '#555',

  // Text
  '--color-text-primary': '#f0f0f0',
  '--color-text-white': '#fff',
  '--color-text-secondary': '#888',
  '--color-text-tertiary': '#999',
  '--color-text-muted': '#666',
  '--color-text-faint': '#555',
  '--color-text-disabled': '#444',
  '--color-text-label': '#777',
  '--color-text-ccc': '#ccc',
  '--color-text-bbb': '#bbb',
  '--color-text-aaa': '#aaa',
  '--color-text-black': '#000',
  '--color-text-ddd': '#ddd',

  // Progress
  '--color-progress-inactive': '#282828',

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
