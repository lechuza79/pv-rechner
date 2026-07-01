import type { Metadata } from "next";
import KennzahlWidget, { Metric } from "./client";
import type { Energietraeger } from "../../../../lib/mastr-data";

export const metadata: Metadata = {
  title: "Kennzahl (Anlagenbestand) — Solar Check Widget",
  description:
    "Installierte Leistung bzw. Anzahl der EE-Anlagen in Deutschland aus dem Marktstammdatenregister. Live-Daten via solar-check.io.",
  robots: { index: false, follow: false },
};

const METRICS: Metric[] = ["leistung", "anlagen"];
const TRAEGER: Energietraeger[] = ["gesamt", "solar", "wind", "biomasse", "wasser", "speicher"];

export default function KennzahlEmbedPage({
  searchParams,
}: {
  searchParams?: { metric?: string; traeger?: string };
}) {
  const metric = (METRICS as string[]).includes(searchParams?.metric ?? "")
    ? (searchParams!.metric as Metric)
    : "leistung";
  const traeger = (TRAEGER as string[]).includes(searchParams?.traeger ?? "")
    ? (searchParams!.traeger as Energietraeger)
    : "gesamt";
  return <KennzahlWidget metric={metric} traeger={traeger} />;
}
