import { Metadata } from "next";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import PVRechner from "./rechner";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://pv-rechner-alpha.vercel.app";

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
    title: "PV Rechner – Lohnt sich Photovoltaik? Ehrlich berechnet.",
    description: "Kostenloser PV-Rentabilitätsrechner ohne Leadfunnel. Sofort Ergebnis: Amortisation, Rendite und Szenarien.",
    openGraph: {
      title: "PV Rechner – Lohnt sich Photovoltaik?",
      description: "Ehrlich berechnet. Ohne Leadfunnel. Sofort Ergebnis.",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "PV Rechner – Lohnt sich Photovoltaik?",
      description: "Ehrlich berechnet. Ohne Leadfunnel. Sofort Ergebnis.",
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
    </ErrorBoundary>
  );
}
