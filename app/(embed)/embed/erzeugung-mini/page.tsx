import type { Metadata } from "next";
import ErzeugungWidget from "../erzeugung/client";

export const metadata: Metadata = {
  title: "Stromerzeugung Deutschland (kompakt) — Solar Check Widget",
  description:
    "Kompakte Variante der Stromerzeugung-Live: Radial-Chart der letzten 24h ohne Auslastungs-Footer. Zum Einbetten in schmale Spalten.",
  robots: { index: false, follow: false },
};

export default function ErzeugungMiniPage() {
  return <ErzeugungWidget compact />;
}
