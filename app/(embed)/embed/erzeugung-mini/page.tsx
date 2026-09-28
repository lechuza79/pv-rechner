import type { Metadata } from "next";
import ErzeugungEmbedAuto from "../erzeugung/auto";

export const metadata: Metadata = {
  title: "Stromerzeugung Deutschland (kompakt) — Solar Check Widget",
  description:
    "Kompakte Variante der Stromerzeugung-Live: Radial-Chart der letzten 24h ohne Auslastungs-Footer. Zum Einbetten in schmale Spalten.",
  robots: { index: false, follow: false },
};

// Static: `?auto=` is read in the browser (../erzeugung/auto.tsx), not from searchParams.
export default function ErzeugungMiniPage() {
  return <ErzeugungEmbedAuto compact />;
}
