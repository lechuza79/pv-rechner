import type { Metadata } from "next";
import KostenrennenEmbed from "./client";

export const metadata: Metadata = {
  title: "Das Stromkosten-Rennen: mit oder ohne PV — Solar Check Widget",
  description:
    "Zwei gleiche Haushalte über 25 Jahre, einer ohne und einer mit PV-Anlage: Wer hat bis wann mehr für Strom bezahlt? Animiertes Rennen von solar-check.io.",
  robots: { index: false, follow: false },
};

export default function KostenrennenEmbedPage() {
  return <KostenrennenEmbed />;
}
