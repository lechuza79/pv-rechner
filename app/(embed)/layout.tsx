import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import WidgetAutoHeight from "../../components/WidgetAutoHeight";
import { widgetBasisCss } from "../../lib/widget-basis-css";

// Dieselben Schriften wie die Site, aus derselben Quelle (next/font lädt sie
// beim Bauen herunter und liefert sie von unserer Domain — kein Aufruf bei
// Google). Sie stehen hier nur BEREIT: Welche Schrift ein Widget benutzt,
// entscheidet `--widget-font-family`, und das bleibt für fremde Einbettungen
// auf der neutralen System-Schrift. Nur unsere eigenen Seiten reichen ihre
// Schrift durch (components/AutoHeightIframe.tsx), damit ein eingebettetes
// Chart nicht in einer anderen Schrift steht als der Text daneben.
//
// `preload: false` ist der Grund, warum das fremde Einbettungen nichts kostet:
// die Schriftdateien werden nur geholt, wenn eine CSS-Regel sie wirklich
// verlangt — also nur auf unseren Seiten.
const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  preload: false,
});
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
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
      </body>
    </html>
  );
}
