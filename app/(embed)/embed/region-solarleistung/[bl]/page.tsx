import { WIDGET_METADATA } from "../meta";
import RegionSolarleistungEmbed from "../client";
import { getRegionSummary } from "../../../../../lib/mastr-data";
import { bundeslandByAgs } from "../../../../../lib/mastr-regions";
import { BL_CENTROID } from "../../../../../lib/bl-centroids";
import { slugify } from "../../../../../lib/atlas-cities";

// Einbettbares Widget: simulierte Momentan-Solarleistung des Anlagenbestands
// eines Bundeslands (Open-Meteo-Wetter am Landes-Mittelpunkt × MaStR-Leistung,
// kein Messwert). Parametrisiert über den 2-stelligen Bundesland-AGS (?bl=13).
export const revalidate = 3600;
// Built on first request, then cached. The query form `?bl=…` lands here
// via the middleware rewrite (lib/embed-pfad-weiche.ts).
export function generateStaticParams() {
  return [];
}

export const metadata = WIDGET_METADATA;

export default async function RegionSolarleistungEmbedPage(
  props: {
    params: Promise<{ bl: string }>;
  }
) {
  const params = await props.params;
  const ags = (params.bl ?? "").replace(/\D/g, "").slice(0, 2);
  const bl = ags.length === 2 ? bundeslandByAgs(ags) : undefined;
  const centroid = BL_CENTROID[ags];
  if (!bl || !centroid) {
    return <RegionSolarleistungEmbed error="Kein gültiges Bundesland angegeben." />;
  }

  let totalKwp = 0;
  try {
    const summary = await getRegionSummary(ags, "solar");
    totalKwp = summary.total_kwp;
  } catch {
    // total bleibt 0 → Widget zeigt Fehlerhinweis
  }

  return (
    <RegionSolarleistungEmbed
      name={bl.name}
      lat={centroid.lat}
      lon={centroid.lon}
      totalKwp={totalKwp}
      liveUrl={`https://solar-check.io/photovoltaik-foerderung/${slugify(bl.name)}`}
    />
  );
}
