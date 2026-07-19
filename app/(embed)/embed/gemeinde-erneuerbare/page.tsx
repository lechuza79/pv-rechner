import type { Metadata } from "next";
import GemeindeErneuerbareEmbed from "./client";
import { getRegionById } from "../../../../lib/atlas";
import { getRegionAtlasData } from "../../../../lib/mastr-data";
import { bundeslandByAgs } from "../../../../lib/mastr-regions";
import { slugify } from "../../../../lib/atlas-cities";

// Einbettbares Widget: installierte erneuerbare Leistung nach Technologie je
// Gemeinde (MaStR). Server-gerendert mit ISR (Daten ändern sich monatlich),
// Client-Hülle für Theme + Teilen/Einbetten nach der Widget-Konvention.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Erneuerbare Leistung in der Gemeinde — Solar Check Widget",
  description:
    "Installierte erneuerbare Leistung nach Technologie einer Gemeinde aus dem Marktstammdatenregister. Cookiefrei einbettbar via solar-check.io.",
  robots: { index: false, follow: false },
};

export default async function GemeindeErneuerbareEmbedPage({
  searchParams,
}: {
  searchParams?: { ags?: string };
}) {
  const ags = (searchParams?.ags ?? "").replace(/\D/g, "");
  if (ags.length !== 8) {
    return <GemeindeErneuerbareEmbed error="Keine gültige Gemeinde angegeben." />;
  }

  const region = await getRegionById(ags);
  if (!region || region.level !== "gemeinde") {
    return <GemeindeErneuerbareEmbed error="Diese Gemeinde kennen wir nicht." />;
  }

  const [atlas, kreis] = await Promise.all([
    getRegionAtlasData(ags),
    region.parent_region_id ? getRegionById(region.parent_region_id) : Promise.resolve(null),
  ]);
  const bl = bundeslandByAgs(ags.slice(0, 2));
  const blSlug = bl ? slugify(bl.name) : null;
  const atlasPath =
    blSlug && kreis?.slug && region.slug ? `/solar-atlas/${blSlug}/${kreis.slug}/${region.slug}` : "";

  return (
    <GemeindeErneuerbareEmbed
      name={region.name}
      solarKwp={atlas.solar.total_kwp}
      generators={atlas.generators}
      speicherKwh={atlas.speicher.kwh_batterie}
      liveUrl={`https://solar-check.io${atlasPath}`}
    />
  );
}
