import type { Metadata } from "next";
import GruengasHeizkostenWidget from "./client";

export const metadata: Metadata = {
  title: "Wärmepumpe vs. Gasheizung mit Grüngas-Pflicht — Solar Check Widget",
  description:
    "Heizkosten je Kilowattstunde Wärme bis 2045: eine neue Gasheizung wird durch die Grüngas-Pflicht (Heizungsgesetz) Jahr für Jahr teurer, die Wärmepumpe bleibt günstig. Von solar-check.io.",
  robots: { index: false, follow: false },
};

export default function GruengasHeizkostenEmbedPage() {
  return <GruengasHeizkostenWidget />;
}
