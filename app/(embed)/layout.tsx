import type { Metadata, Viewport } from "next";

// Standalone root layout for embeddable widgets.
// No site header/footer, no global CSS variables, no external font CDN.
// All widget styling lives inside the page itself, driven by the
// --widget-* CSS variables defined below. Parent pages may override
// these via postMessage.
//
// We additionally alias the site CSS variables that recycled chart
// components from /energie depend on (--color-bg, --color-border,
// --color-text-*, …) onto the widget tokens. This lets the chart
// components render correctly inside the embed without any code
// changes — and keeps whitelabel theming working out of the box,
// since the aliases re-resolve whenever the widget tokens change.

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const baseStyles = `
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0}
  :root{
    /* Public widget tokens — overridable via postMessage */
    --widget-bg:#FFFFFF;
    --widget-fg:#3F3F3F;
    --widget-muted:#777777;
    --widget-accent:#1365EA;
    --widget-accent-fg:#FFFFFF;
    --widget-highlight:#3DFFC1;
    --widget-awareness:#3DFFC1;
    --widget-border-radius:14px;
    --widget-font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;

    /* Structural "ink" — grid lines, borders, faint axis labels. Derived from
       the BACKGROUND's contrast (set by the parent via postMessage/URL), not
       from the text color, so a dark background flips grid/borders to white
       automatically. Defaults to dark for the standard light background. */
    --widget-ink:#0F0F0F;

    /* Aliases for recycled chart components — derived from widget tokens */
    --color-bg:var(--widget-bg);
    --color-text-primary:var(--widget-fg);
    --color-text-secondary:var(--widget-muted);
    --color-text-muted:var(--widget-muted);
    --color-text-faint:color-mix(in srgb,var(--widget-ink) 30%,transparent);
    --color-border:color-mix(in srgb,var(--widget-ink) 14%,transparent);
    --color-chart-grid:color-mix(in srgb,var(--widget-ink) 10%,transparent);
    --color-accent:var(--widget-accent);
    --color-highlight:var(--widget-highlight);
    --color-awareness:var(--widget-awareness);
    --font-text:var(--widget-font-family);
    --font-mono:ui-monospace,SFMono-Regular,Menlo,monospace;
    --radius-sm:6px;
  }
  body{
    background:transparent;
    color:var(--widget-fg);
    font-family:var(--widget-font-family);
    font-size:14px;
    line-height:1.4;
  }

  /* Live-Indikator: zwei expandierende Ringe, der zweite halb versetzt */
  @keyframes sc-live-ring {
    0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.7 }
    100% { transform: translate(-50%,-50%) scale(3.5); opacity: 0 }
  }
  .sc-live-dot { position: relative }
  .sc-live-dot::before,
  .sc-live-dot::after {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    width: 100%; height: 100%;
    border-radius: 50%;
    background: var(--color-highlight);
    pointer-events: none;
    animation: sc-live-ring 1.8s ease-out infinite;
  }
  .sc-live-dot::after { animation-delay: 0.9s }

  /* Bar-Wachstum-Stagger fuer Live-Radial-Chart */
  @keyframes sc-bar-grow {
    from { opacity: 0 }
    to   { opacity: 1 }
  }

  /* Map widget: always single-column (tabs → map → summary), so it fits any
     iframe width and the preview matches the copy-paste code. */
  .mastr-hero-grid{display:grid;grid-template-columns:1fr;gap:18px;justify-items:stretch}
`;

export default function EmbedRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <style dangerouslySetInnerHTML={{ __html: baseStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
