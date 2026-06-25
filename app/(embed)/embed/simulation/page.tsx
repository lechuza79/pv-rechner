import type { Metadata } from "next";
import SimulationWidget from "./client";

export const metadata: Metadata = {
  title: "PV-Ertrag jetzt — Solar Check Widget",
  description:
    "Live-Photovoltaikertrag nach Postleitzahl: was eine PV-Anlage gerade beim aktuellen Wetter liefert. Von solar-check.io.",
  robots: { index: false, follow: false },
};

export default function SimulationEmbedPage({
  searchParams,
}: {
  searchParams?: { plz?: string };
}) {
  return <SimulationWidget plz={searchParams?.plz ?? ""} />;
}
