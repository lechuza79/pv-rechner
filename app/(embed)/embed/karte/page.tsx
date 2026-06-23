import type { Metadata } from "next";
import KarteWidget from "./client";

export const metadata: Metadata = {
  title: "PV-Anlagen in Deutschland — Solar Check Widget",
  description:
    "Photovoltaik-Bestand je Region aus dem Marktstammdatenregister als interaktive Deutschlandkarte. Live von solar-check.io.",
  robots: { index: false, follow: false },
};

export default function KarteEmbedPage() {
  return <KarteWidget />;
}
