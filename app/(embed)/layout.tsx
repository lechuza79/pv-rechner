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
    --widget-border-radius:14px;
    --widget-font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;

    /* Aliases for recycled chart components — derived from widget tokens */
    --color-bg:var(--widget-bg);
    --color-text-primary:var(--widget-fg);
    --color-text-secondary:var(--widget-muted);
    --color-text-muted:var(--widget-muted);
    --color-text-faint:color-mix(in srgb,var(--widget-fg) 30%,transparent);
    --color-border:color-mix(in srgb,var(--widget-fg) 12%,transparent);
    --color-chart-grid:color-mix(in srgb,var(--widget-fg) 8%,transparent);
    --color-accent:var(--widget-accent);
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
