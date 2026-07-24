import type { Metadata } from "next";
import ZubauEmbed from "./client";
import { getNationalSolarByYear, type NationalSolarSeries } from "../../../../lib/mastr-data";

// Einbettbares Widget: nationaler PV-Zubau pro Jahr mit Einspeisevergütung +
// Strompreis und interaktiver Ereignis-Timeline. Server-gerendert mit ISR
// (Zubaudaten ändern sich monatlich), Client-Hülle für Theme + Teilen/Einbetten.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Photovoltaik-Zubau in Deutschland — Solar Check Widget",
  description:
    "Jährlicher PV-Zubau in Deutschland mit Einspeisevergütung und Strompreis, aus dem Marktstammdatenregister. Cookiefrei einbettbar via solar-check.io.",
  robots: { index: false, follow: false },
};

export default async function ZubauEmbedPage() {
  let series: NationalSolarSeries | null = null;
  try {
    series = await getNationalSolarByYear();
  } catch {
    series = null;
  }
  return <ZubauEmbed series={series} />;
}
