import { Metadata } from "next";
import { ErrorBoundary } from "../../../components/ErrorBoundary";
import Faq from "../../../components/Faq";
import { pvRechnerFaq } from "../../../lib/faq";
import { v } from "../../../lib/theme";
import PVRechner from "./rechner";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  // Build OG image URL from share params
  const ogParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") ogParams.set(key, value);
  }
  const ogQuery = ogParams.toString();
  const ogUrl = ogQuery
    ? `${BASE_URL}/api/og?${ogQuery}`
    : `${BASE_URL}/api/og`;

  return {
    title: "Solar Check – Lohnt sich Photovoltaik? Ehrlich berechnet.",
    description: "Kostenloser PV-Rentabilitätsrechner mit direktem Ergebnis — ohne Anmeldung, ohne Verkaufsanrufe. Amortisation, Rendite und Szenarien.",
    // Canonical without query params — share links append ?a=…&s=… etc., which
    // would otherwise look like dozens of duplicate pages to search engines.
    alternates: { canonical: "/photovoltaik-rechner" },
    openGraph: {
      title: "Solar Check – Lohnt sich Photovoltaik?",
      description: "Direktes Ergebnis. Ohne Anmeldung, ohne Verkaufsanrufe.",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Solar Check – Lohnt sich Photovoltaik?",
      description: "Direktes Ergebnis. Ohne Anmeldung, ohne Verkaufsanrufe.",
      images: [ogUrl],
    },
  };
}

export default function RechnerPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <ErrorBoundary>
      <PVRechner initialParams={searchParams} />
      <div style={{ maxWidth: v("--page-max-width"), margin: "0 auto", padding: "0 16px 32px" }}>
        <Faq items={pvRechnerFaq()} currentPath="/photovoltaik-rechner" />
      </div>
    </ErrorBoundary>
  );
}
