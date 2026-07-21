import Header from "../../../components/Header";
import { v } from "../../../lib/theme";
import { getNationalSolarByYear, type NationalSolarSeries } from "../../../lib/mastr-data";
import { pageMetadata } from "../../../lib/seo";
import ZubauDeutschlandClient from "./client";

// Datenstory zum bundesweiten PV-Zubau. In Hauptnav (PV-Förderung) + Sitemap.
export const metadata = pageMetadata({
  path: "/photovoltaik-zubau-deutschland",
  title: "Photovoltaik-Zubau in Deutschland – wie Förderung die Kurve formte",
  description:
    "25 Jahre Solar-Zubau in Deutschland auf einer Zeitachse: Einspeisevergütung, Strompreis und die politischen Weichenstellungen, die den Ausbau beschleunigt und ausgebremst haben.",
  ogImageTitle: "PV-Zubau in Deutschland",
  ogImageSubtitle: "Wie Förderung den Solarausbau geformt hat",
});

// ISR: die Zubaudaten ändern sich nur beim monatlichen MaStR-Refresh.
export const revalidate = 3600;

export default async function ZubauDeutschlandPage() {
  let series: NationalSolarSeries | null = null;
  try {
    series = await getNationalSolarByYear();
  } catch {
    series = null;
  }

  return (
    <div style={{ background: v("--color-bg"), minHeight: "100vh", fontFamily: v("--font-text") }}>
      <Header />
      <main style={{ padding: "24px 16px" }}>
        <ZubauDeutschlandClient series={series} />
      </main>
    </div>
  );
}
