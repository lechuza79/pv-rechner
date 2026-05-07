import type { Metadata, Viewport } from "next";

// Standalone root layout for embeddable widgets.
// No site header/footer, no global CSS variables, no external font CDN.
// All widget styling lives inside the page itself, driven by the
// --widget-* CSS variables defined below. Parent pages may override these
// via postMessage.

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
    --widget-bg:#FFFFFF;
    --widget-fg:#3F3F3F;
    --widget-muted:#777777;
    --widget-accent:#00D950;
    --widget-accent-fg:#FFFFFF;
    --widget-border-radius:14px;
    --widget-font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
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
