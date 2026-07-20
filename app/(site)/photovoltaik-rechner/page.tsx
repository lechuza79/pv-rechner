import { Metadata } from "next";
import { ErrorBoundary } from "../../../components/ErrorBoundary";
import Faq from "../../../components/Faq";
import { pvRechnerFaq } from "../../../lib/faq";
import { pageMetadata } from "../../../lib/seo";
import { v } from "../../../lib/theme";
import PVRechner from "./rechner";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  // Shared result links carry the calculation in query params — the OG route
  // renders a personalized preview card from them. Without params, /api/og
  // falls back to the generic brand card. This dynamic image is why the page
  // uses generateMetadata instead of a static export.
  const ogParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") ogParams.set(key, value);
  }
  const ogQuery = ogParams.toString();
  const ogUrl = ogQuery
    ? `${BASE_URL}/api/og?${ogQuery}`
    : `${BASE_URL}/api/og`;

  // pageMetadata sets the canonical WITHOUT query params — share links append
  // ?a=…&s=… etc., which would otherwise look like dozens of duplicate pages
  // to search engines — plus consistent og:url/site_name/type like every
  // other public page.
  return pageMetadata({
    path: "/photovoltaik-rechner",
    title: "Photovoltaik-Rechner – Amortisation & Rendite sofort berechnen",
    description:
      "Kostenloser Photovoltaik-Rechner: Amortisation, Rendite und Eigenverbrauch sofort berechnen — ohne Anmeldung, ohne Verkaufsanrufe. Alle Annahmen transparent editierbar.",
    ogTitle: "Photovoltaik-Rechner – Lohnt sich PV?",
    ogDescription: "Direktes Ergebnis. Ohne Anmeldung, ohne Verkaufsanrufe.",
    ogImage: ogUrl,
  });
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
