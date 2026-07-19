import type { Metadata } from "next";
import GemeindeSolarleistungEmbed from "./client";
import { getRegionById } from "../../../../lib/atlas";
import { getRegionAtlasData } from "../../../../lib/mastr-data";
import { gemeindeGeo } from "../../../../lib/atlas-geo";
import { bundeslandByAgs } from "../../../../lib/mastr-regions";
import { slugify } from "../../../../lib/atlas-cities";

// Einbettbares Widget: standortgenaue 24-Stunden-Simulation der Solarleistung des
// Gemeinde-Bestands (Open-Meteo-Wetter × MaStR-Leistung, kein Messwert). Server-
// gerendert mit ISR; die Simulation selbst rechnet die Client-Hülle live.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Solarleistung der Gemeinde (simuliert) — Solar Check Widget",
  description:
    "Tagesverlauf der Solarleistung einer Gemeinde, simuliert aus dem Wetter am Standort und dem Anlagenbestand. Cookiefrei einbettbar via solar-check.io.",
  robots: { index: false, follow: false },
};

export default async function GemeindeSolarleistungEmbedPage({
  searchParams,
}: {
  searchParams?: { ags?: string };
}) {
  const ags = (searchParams?.ags ?? "").replace(/\D/g, "");
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
