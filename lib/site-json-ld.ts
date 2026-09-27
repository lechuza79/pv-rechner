/**
 * Site-wide structured data (Organization, SoftwareApplication). One source for
 * the React site layout and the redesigned pages served as documents
 * (lib/neon-seite.ts) — a second typed copy would drift.
 */
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Solar Check",
  // Spellings people actually search for ("solarcheck" as one word) — helps
  // Google connect brand queries to this site.
  alternateName: ["Solarcheck", "solar-check.io"],
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  // The company page we post from (live since 24.08.2026); ties the brand
  // entity to it.
  sameAs: ["https://www.linkedin.com/company/solar-check-io"],
  description:
    "Kostenlose Energie-Rechner — ohne Anmeldung, ohne Verkaufsanrufe: Photovoltaik-Rentabilität, Wärmepumpe und Live-Energiedaten für Deutschland.",
};

export const softwareAppJsonLd = {
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

