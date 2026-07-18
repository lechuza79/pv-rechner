import Header from "../../../components/Header";
import { v } from "../../../lib/theme";
import { getNationalSolarByYear, type NationalSolarSeries } from "../../../lib/mastr-data";
import ZubauDeutschlandClient from "./client";

// Datenstory zum bundesweiten PV-Zubau — noindex, bis die Seite final abgenommen
// ist (dann Metadata + Sitemap-Eintrag ergänzen).
export const metadata = {
  title: "Photovoltaik-Zubau in Deutschland – wie Förderung die Kurve formte | Solar Check",
  description:
    "25 Jahre Solar-Zubau in Deutschland auf einer Zeitachse: Einspeisevergütung, Strompreis und die politischen Weichenstellungen, die den Ausbau beschleunigt und ausgebremst haben.",
  robots: { index: false, follow: false },
};

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
