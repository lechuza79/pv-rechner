import { WidgetVideoConfirmation } from "../../components/WidgetVideoDialog";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import WidgetAutoHeight from "../../components/WidgetAutoHeight";
import VideoRenderBridge from "../../components/VideoRenderBridge";
import { widgetBasisCss } from "../../lib/widget-basis-css";

// Reuse the versioned site fonts without external build-time requests.
// Embeds preload none; their host chooses whether to use the site typography.
const dmSans = localFont({src:"../../public/fonts/dm-sans-variable.woff2",weight:"100 900",
  display: "swap",
  variable: "--font-dm-sans",
  preload: false,
});
const jetBrainsMono = localFont({src:"../../public/fonts/jetbrains-mono-variable.woff2",weight:"100 800",
  display: "swap",
  variable: "--font-jetbrains-mono",
  preload: false,
});

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};


const baseStyles = widgetBasisCss();

export default function EmbedRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${dmSans.variable} ${jetBrainsMono.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: baseStyles }} />
      </head>
      <body>
        {children}
        <WidgetAutoHeight />
        <VideoRenderBridge />
        <WidgetVideoConfirmation />
      </body>
    </html>
  );
}
