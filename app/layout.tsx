import { Metadata } from "next";
import { getCssVariables, globalStyles } from "../lib/theme";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://pv-rechner-alpha.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "PV Rechner – Lohnt sich Photovoltaik? Ehrlich berechnet.",
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
    title: "PV Rechner – Lohnt sich Photovoltaik?",
    description: "Ehrlich berechnet. Ohne Leadfunnel. Sofort Ergebnis.",
    type: "website",
    url: BASE_URL,
  },
};

const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PV Rechner",
  description:
    "Kostenloser PV-Rentabilitätsrechner: Amortisation, Rendite und Szenarien für Photovoltaikanlagen mit oder ohne Speicher.",
  url: BASE_URL,
  applicationCategory: "UtilityApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  inLanguage: "de",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Lohnt sich Photovoltaik 2026?",
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
      name: "Wie hoch ist die Einspeisevergütung 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Die Einspeisevergütung für Anlagen bis 10 kWp liegt aktuell bei ca. 8,03 ct/kWh. Sie ist für 20 Jahre ab Inbetriebnahme garantiert, sinkt aber für neue Anlagen kontinuierlich.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <meta name="google-site-verification" content="ATH_SsHQBX5xWwJEO_f-IY30ld3a77-fIS6GjXTWURw" />
        <style dangerouslySetInnerHTML={{ __html: getCssVariables() + globalStyles }} />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
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
        {children}
      </body>
    </html>
  );
}
