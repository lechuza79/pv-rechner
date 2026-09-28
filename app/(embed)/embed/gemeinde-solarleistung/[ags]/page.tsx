import { WIDGET_METADATA } from "../meta";
import GemeindeSolarleistungEmbed from "../client";
import { getRegionById } from "../../../../../lib/atlas";
import { getRegionAtlasData } from "../../../../../lib/mastr-data";
import { gemeindeGeo } from "../../../../../lib/atlas-geo";
import { bundeslandByAgs } from "../../../../../lib/mastr-regions";
import { slugify } from "../../../../../lib/atlas-cities";

// Einbettbares Widget: standortgenaue 24-Stunden-Simulation der Solarleistung des
// Gemeinde-Bestands (Open-Meteo-Wetter × MaStR-Leistung, kein Messwert). Server-
// gerendert mit ISR; die Simulation selbst rechnet die Client-Hülle live.
export const revalidate = 3600;
// Built on first request, then cached. The query form `?ags=…` lands here
// via the middleware rewrite (lib/embed-pfad-weiche.ts).
export function generateStaticParams() {
  return [];
}

export const metadata = WIDGET_METADATA;

export default async function GemeindeSolarleistungEmbedPage(
  props: {
    params: Promise<{ ags: string }>;
  }
) {
  const params = await props.params;
  const ags = (params.ags ?? "").replace(/\D/g, "");
  if (ags.length !== 8) {
    return <GemeindeSolarleistungEmbed error="Keine gültige Gemeinde angegeben." />;
  }

  const region = await getRegionById(ags);
  if (!region || region.level !== "gemeinde") {
    return <GemeindeSolarleistungEmbed error="Diese Gemeinde kennen wir nicht." />;
  }

  const [atlas, kreis, geo] = await Promise.all([
    getRegionAtlasData(ags),
    region.parent_region_id ? getRegionById(region.parent_region_id) : Promise.resolve(null),
    gemeindeGeo(ags),
  ]);
  const bl = bundeslandByAgs(ags.slice(0, 2));
  const blSlug = bl ? slugify(bl.name) : null;
  const atlasPath =
    blSlug && kreis?.slug && region.slug ? `/solar-atlas/${blSlug}/${kreis.slug}/${region.slug}` : "";

  const lat = Number.isFinite(geo?.lat) ? geo?.lat : undefined;
  const lon = Number.isFinite(geo?.lon) ? geo?.lon : undefined;

  return (
    <GemeindeSolarleistungEmbed
      name={region.name}
      lat={lat}
      lon={lon}
      totalKwp={atlas.solar.total_kwp}
      liveUrl={`https://solar-check.io${atlasPath}`}
    />
  );
}
