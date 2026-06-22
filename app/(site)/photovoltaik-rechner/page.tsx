import { Metadata } from "next";
import { Suspense } from "react";
import { ErrorBoundary } from "../../../components/ErrorBoundary";
import PVRechner from "./rechner";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://solar-check.io";

// Statische Metadata (liest KEINE searchParams) — sonst würde die Route bei jedem
// Request dynamisch SSR-gerendert (kein CDN-Cache). Die Share-Parameter werden
// clientseitig im Rechner aus der URL gelesen. Geteilte Links behalten damit das
// generische OG-Bild; die nackte URL ist dafür statisch/edge-cachebar.
export const metadata: Metadata = {
  title: "Solar Check – Lohnt sich Photovoltaik? Ehrlich berechnet.",
  description: "Kostenloser PV-Rentabilitätsrechner ohne Leadfunnel. Sofort Ergebnis: Amortisation, Rendite und Szenarien.",
  // Canonical without query params — share links append ?a=…&s=… etc., which
  // would otherwise look like dozens of duplicate pages to search engines.
  alternates: { canonical: "/photovoltaik-rechner" },
  openGraph: {
    title: "Solar Check – Lohnt sich Photovoltaik?",
    description: "Ehrlich berechnet. Ohne Leadfunnel. Sofort Ergebnis.",
    images: [{ url: `${BASE_URL}/api/og`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Solar Check – Lohnt sich Photovoltaik?",
    description: "Ehrlich berechnet. Ohne Leadfunnel. Sofort Ergebnis.",
    images: [`${BASE_URL}/api/og`],
  },
};

export default function RechnerPage() {
  return (
    <ErrorBoundary>
      {/* useSearchParams im Rechner erfordert eine Suspense-Grenze, damit die
          Route statisch prerendern kann (CSR-Bailout nur für den dynamischen Teil). */}
      <Suspense fallback={null}>
        <PVRechner />
      </Suspense>
    </ErrorBoundary>
  );
}
