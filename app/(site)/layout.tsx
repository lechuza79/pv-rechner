import { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { getCssVariables, globalStyles } from "../../lib/theme";
import { GlossaryProvider } from "../../components/GlossaryTerm";
import Footer from "../../components/Footer";
import { Analytics } from "@vercel/analytics/next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

// Self-hosted fonts (next/font downloads them at build time and serves them
// from our own domain). No runtime request to Google -> DSGVO-konform und
// schneller (kein render-blocking external CSS). Exposed as CSS variables so
// the inline-style tokens in lib/theme.ts can reference them.
const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "Solar Check – Lohnt sich Photovoltaik? Ehrlich berechnet.",
  description:
    "Kostenloser PV-Rentabilitätsrechner mit direktem Ergebnis — ohne Anmeldung, ohne Verkaufsanrufe. Amortisation, Rendite und Szenarien für deine Photovoltaikanlage mit oder ohne Speicher.",
  keywords: [
    "PV Rechner",
    "Photovoltaik Rentabilität",
    "PV Amortisation berechnen",
    "Lohnt sich Photovoltaik",
    "Solaranlage Rechner",
    "PV Rendite",
    "Photovoltaik Rechner ohne Anmeldung",
  ],
  openGraph: {
    title: "Solar Check – Lohnt sich Photovoltaik?",
    description: "Direktes Ergebnis. Ohne Anmeldung, ohne Verkaufsanrufe.",
    type: "website",
    url: BASE_URL,
    siteName: "Solar Check",
    images: [{ url: `${BASE_URL}/api/og`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Solar Check – Lohnt sich Photovoltaik?",
    description: "Direktes Ergebnis. Ohne Anmeldung, ohne Verkaufsanrufe.",
    images: [`${BASE_URL}/api/og`],
  },
  other: {
    "theme-color": "#FFFFFF",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Solar Check",
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description:
    "Kostenlose Energie-Rechner — ohne Anmeldung, ohne Verkaufsanrufe: Photovoltaik-Rentabilität, Wärmepumpe und Live-Energiedaten für Deutschland.",
};

const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Solar Check",
  description:
    "Kostenloser PV-Rentabilitätsrechner: Amortisation, Rendite und Szenarien für Photovoltaikanlagen mit oder ohne Speicher.",
  url: BASE_URL,
  applicationCategory: "UtilityApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  inLanguage: "de",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${dmSans.variable} ${jetBrainsMono.variable}`}>
      <head>
        <meta name="google-site-verification" content="OdndfgILkY22LlMHqIT8_ASdidCYTyqksv6LC9zw67o" />
        <style dangerouslySetInnerHTML={{ __html: getCssVariables() + globalStyles }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "var(--color-bg)",
          minHeight: "100vh",
          fontFamily: "var(--font-text)",
        }}
      >
        <GlossaryProvider>
          {children}
          <div style={{ padding: "0 16px" }}><Footer /></div>
        </GlossaryProvider>
        {/* Cookieless Web Analytics (aggregiert, keine personenbezogenen
            Daten, kein Consent-Banner nötig — §25 TDDDG greift nicht, da
            nichts auf dem Gerät gespeichert wird). Nur im (site)-Layout,
            nicht in den Embed-Widgets. Siehe /datenschutz. */}
        <Analytics />
      </body>
    </html>
  );
}
