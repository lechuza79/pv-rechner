import type { Metadata, Viewport } from "next";
import WidgetAutoHeight from "../../components/WidgetAutoHeight";

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
    --color-accent-dim:color-mix(in srgb,var(--widget-accent) 12%,transparent);
    /* Mix accent shades toward the theme's own ink/background rather than fixed
       black/white, so derived tones stay correct on a dark widget theme. */
    --color-accent-dark:color-mix(in srgb,var(--widget-accent) 78%,var(--widget-ink));
    --color-accent-light:color-mix(in srgb,var(--widget-accent) 55%,var(--widget-bg));
    --color-positive:#00D950;
    --color-text-on-accent:var(--widget-accent-fg);
    --color-bg-muted:color-mix(in srgb,var(--widget-ink) 6%,var(--widget-bg));
    --color-bg-accent:color-mix(in srgb,var(--widget-accent) 8%,var(--widget-bg));
    --color-border-muted:color-mix(in srgb,var(--widget-ink) 10%,transparent);
    --color-border-accent:color-mix(in srgb,var(--widget-accent) 30%,var(--widget-bg));
    --color-negative:#EF4444;
    --color-negative-dim:rgba(239,68,68,0.08);
    --color-negative-border:rgba(239,68,68,0.25);
    --color-negative-light:color-mix(in srgb,var(--color-negative) 45%,var(--widget-bg));
    --color-highlight:var(--widget-highlight);
    --color-awareness:var(--widget-awareness);
    --font-text:var(--widget-font-family);
    --font-mono:ui-monospace,SFMono-Regular,Menlo,monospace;
    --radius-sm:6px;
    --radius-md:var(--widget-border-radius);
    /* Shadows — light values (widgets default to a light background). Present so
       recycled site components (ChartActionBar, charts) that reference the
       shadow tokens keep their lift inside embeds. */
    --shadow-sm:0 1px 3px rgba(0,0,0,0.06);
    --shadow-md:0 4px 16px rgba(0,0,0,0.08);
    --shadow-lg:0 8px 28px rgba(0,0,0,0.10);

    /* Energie-Palette — feste, semantische Farben (nicht theme-bar), damit
       recycelte Energie-Charts (Line/Donut/Stacked) im Embed korrekt färben. */
    --color-energy-solar:#4CAF50;
    --color-energy-wind:#66BB6A;
    --color-energy-wind-offshore:#2E7D32;
    --color-energy-hydro:#81C784;
    --color-energy-biomass:#A5D6A7;
    --color-energy-geothermal:#C8E6C9;
    --color-energy-gas:#BC8F6F;
    --color-energy-coal:#8D6E63;
    --color-energy-coal-gas:#8D6E63;
    --color-energy-lignite:#5D4037;
    --color-energy-oil:#A1887F;
    --color-energy-other:#BDBDBD;
    --color-energy-nuclear:#EF85F8;
    --color-energy-nuclear-import:#EA00FF;
    --color-energy-cat-renewable:#4CAF50;
    --color-energy-cat-fossil:#8D6E63;
    --color-energy-cat-other:#BDBDBD;
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

  /* Sanfter Wechsel beim Umschalten (z.B. Länder-Multitool) */
  @keyframes sc-fade {
    from { opacity: 0; transform: translateY(4px) }
    to   { opacity: 1; transform: none }
  }

  /* Fade-Up — dieselbe Step-/Reveal-Bewegung wie auf der Site (lib/theme.ts).
     Hier gespiegelt, damit Widgets mit einem eigenen Schritt-Flow (Förder-Check)
     dieselbe Transition fahren wie die großen Rechner. Replay beim Schrittwechsel
     über einen wechselnden key auf dem animierten Element. */
  @keyframes fu {
    from { opacity: 0; transform: translateY(10px) }
    to   { opacity: 1; transform: translateY(0) }
  }

  /* Bewegung respektiert die Systemeinstellung. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important }
  }

  /* Map widget: map left, value tiles right (like the main site). Stacks on
     very narrow embeds. */
  .mastr-hero-grid{display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:24px;align-items:start}
  .mastr-hero-aside{display:grid;gap:12px}
  .mastr-kpis{display:grid;gap:10px}
  .mastr-map-box{width:100%;height:600px}
  @media (max-width:600px){
    .mastr-hero-grid{grid-template-columns:1fr;gap:16px}
    .mastr-map-box{height:420px;margin-inline:auto}
    .mastr-map-box--de{max-width:300px}
    .mastr-hero-grid.has-filter .mastr-map-box{height:372px}
    .mastr-hero-grid.has-breadcrumb .mastr-map-box{height:376px}
    .mastr-hero-grid.has-filter.has-breadcrumb .mastr-map-box{height:328px}
    .mastr-hero-aside .mastr-summary{order:-1}
    .mastr-kpis{grid-template-columns:repeat(3,1fr);gap:8px}
    .mastr-kpis .kachel-tile{padding:10px}
    .mastr-kpis .kachel-value{font-size:15px !important;letter-spacing:-0.4px}
  }
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
      <body>
        {children}
        <WidgetAutoHeight />
      </body>
    </html>
  );
}
