import { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { getCssVariables, globalStyles } from "../../lib/theme";
import { DEFAULT_FEED_IN } from "../../lib/feedin-config";
import { GlossaryProvider } from "../../components/GlossaryTerm";
import Footer from "../../components/Footer";

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
    "Kostenloser PV-Rentabilitätsrechner ohne Leadfunnel. Sofort Ergebnis: Amortisation, Rendite und Szenarien für deine Photovoltaikanlage mit oder ohne Speicher.",
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
    description: "Ehrlich berechnet. Ohne Leadfunnel. Sofort Ergebnis.",
    type: "website",
    url: BASE_URL,
    siteName: "Solar Check",
    images: [{ url: `${BASE_URL}/api/og`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Solar Check – Lohnt sich Photovoltaik?",
    description: "Ehrlich berechnet. Ohne Leadfunnel. Sofort Ergebnis.",
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
    "Kostenlose Energie-Rechner ohne Leadfunnel: Photovoltaik-Rentabilität, Wärmepumpe und Live-Energiedaten für Deutschland.",
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

// FAQ JSON-LD with year-aware question titles. Built per render so the year
// in "Lohnt sich Photovoltaik <YEAR>?" rolls over automatically — never
// hardcode a year here. Dynamic SEO content > static SEO content gone stale.
function buildFaqJsonLd() {
  const year = new Date().getFullYear();
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Lohnt sich Photovoltaik ${year}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "In den meisten Fällen ja. Eine typische 10-kWp-Anlage amortisiert sich bei aktuellen Strompreisen in etwa 9–12 Jahren und erwirtschaftet über 25 Jahre deutliche Rendite. Der genaue Zeitraum hängt von Eigenverbrauch, Strompreis und Anlagenkosten ab.",
        },
      },
      {
        "@type": "Question",
        name: "Wie lange dauert die Amortisation einer PV-Anlage?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Je nach Anlagengröße, Speicher und Eigenverbrauchsquote liegt die Amortisation zwischen 8 und 14 Jahren. Höherer Eigenverbrauch (z.B. durch Speicher, Wärmepumpe oder E-Auto) verkürzt den Zeitraum deutlich.",
        },
      },
      {
        "@type": "Question",
        name: "Was kostet eine PV-Anlage mit Speicher?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Eine 10-kWp-Anlage ohne Speicher kostet ca. 15.000 €. Mit einem 10-kWh-Speicher kommen rund 8.500 € hinzu. Die tatsächlichen Kosten variieren je nach Anbieter und Region.",
        },
      },
      {
        "@type": "Question",
        name: `Wie hoch ist die Einspeisevergütung ${year}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Die Einspeisevergütung für Anlagen bis 10 kWp liegt aktuell bei ca. ${DEFAULT_FEED_IN.teilUnder10.toLocaleString("de-DE")} ct/kWh. Sie ist für 20 Jahre ab Inbetriebnahme garantiert, sinkt aber für neue Anlagen kontinuierlich.`,
        },
      },
    ],
  };
}

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqJsonLd()) }}
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "var(--color-bg)",
          minHeight: "100vh",
        }}
      >
        <GlossaryProvider>
          {children}
          <div style={{ padding: "0 16px" }}><Footer /></div>
        </GlossaryProvider>
      </body>
    </html>
  );
}
