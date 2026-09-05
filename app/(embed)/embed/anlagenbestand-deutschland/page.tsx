import type { Metadata } from "next";
import AnlagenbestandEmbed from "./client";
import { anlagenbestand } from "../../../../lib/anlagenbestand-server";
import type { Anlagenbestand } from "../../../../lib/anlagenbestand";

// Einbettbares Widget: der deutsche Solaranlagen-Bestand nach Anlagentyp,
// Stückzahl gegen Leistung. Server-gerendert mit ISR — der Bestand ändert sich
// nur, wenn der monatliche Registerauszug neu eingelesen wird.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Solaranlagen in Deutschland — Solar Check Widget",
  description:
    "Wie viele Solaranlagen in Deutschland gemeldet sind, mit welcher Leistung und wie sich beides auf Balkonkraftwerke, Dächer und Freiflächen verteilt. Cookiefrei einbettbar via solar-check.io.",
  robots: { index: false, follow: false },
};

export default async function AnlagenbestandEmbedPage() {
  let bestand: Anlagenbestand | null = null;
  try {
    bestand = await anlagenbestand();
  } catch {
    bestand = null;
  }
  return <AnlagenbestandEmbed bestand={bestand} />;
}
