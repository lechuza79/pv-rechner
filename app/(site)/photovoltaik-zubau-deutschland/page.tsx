import Breadcrumb from "../../../components/Breadcrumb";
import { v } from "../../../lib/theme";
import { getNationalSolarByYear, type NationalSolarSeries } from "../../../lib/mastr-data";
import { pageMetadata } from "../../../lib/seo";
import ZubauDeutschlandClient from "./client";

// Datenstory zum bundesweiten PV-Zubau. In Hauptnav (PV-Förderung) + Sitemap.
// Redaktionelles Seiten-Muster wie die Ratgeber-Seiten (Wrapper + Typo-Tokens);
// der Header kommt zentral aus dem (site)-Layout, nicht von hier.
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

const S = {
  page: {
    background: v("--color-bg"),
    fontFamily: v("--font-text"),
    color: v("--color-text-primary"),
    minHeight: "100vh",
    padding: "20px 16px",
  },
  // Äußerer Rahmen etwas breiter als die Lesespalte, damit das Chart-Widget
  // bewusst über die Textbreite hinausragen darf (Breakout).
  // 20 (Header-Margin) + 20 (Seiten-Padding) + 10 = 50 px unter dem Header.
  wrap: { maxWidth: 880, margin: "0 auto", paddingTop: 10 },
  textCol: { maxWidth: v("--content-max-width"), margin: "0 auto" },
};

export default async function ZubauDeutschlandPage() {
  let series: NationalSolarSeries | null = null;
  try {
    series = await getNationalSolarByYear();
  } catch {
    series = null;
  }

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.textCol}>
          <Breadcrumb
            items={[
              { label: "Start", href: "/" },
              { label: "PV-Förderung", href: "/photovoltaik-foerderung" },
              { label: "Wie Förderung den Solarausbau geformt hat" },
            ]}
            jsonLd
          />
        </div>
        <ZubauDeutschlandClient series={series} />
      </div>
    </div>
  );
}
