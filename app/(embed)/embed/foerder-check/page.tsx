import type { Metadata } from "next";
import FoerderCheckWidget from "./client";

export const metadata: Metadata = {
  title: "Wärmepumpen-Förderung berechnen — Solar Check Widget",
  description:
    "Wie viel BEG-Förderung gibt es für den Einbau einer Wärmepumpe? Kosten, alte Heizung und Einkommen eingeben, Zuschuss sofort sehen. Von solar-check.io.",
  robots: { index: false, follow: false },
};

export default function FoerderCheckEmbedPage() {
  return <FoerderCheckWidget />;
}
