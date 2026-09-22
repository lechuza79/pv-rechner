import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveSlugPath, getRegionById } from "../../../../../../lib/atlas";
import { istKreisfrei, istStadtstaat } from "../../../../../../lib/atlas-orte";
import { bundeslandByAgs } from "../../../../../../lib/mastr-regions";
import { gemeindeGeo } from "../../../../../../lib/atlas-geo";
import { ladeGemeindePaket } from "../../../../../../lib/gemeinde-paket-server";
import GemeindeSeite from "../../../../../../components/gemeinde/GemeindeSeite";

/**
 * PREVIEW of the new municipality page, for acceptance before the switch.
 *
 * Same address pattern as the live page under a separate prefix, so every
 * town can be looked at. Never indexed (markup AND header, see next.config.js)
 * and not in the sitemap; the live route stays unchanged until the switch
 * (docs/gemeindeseite-integration.md).
 */
// One day: the package changes with the monthly run, and invalidating by
// route pattern does not reach pages built on demand (lib/atlas-revalidate-routen.ts).
export const revalidate = 86400;
export function generateStaticParams() {
  return [];
}

type Params = { bundesland: string; kreis: string; gemeinde: string };

export async function generateMetadata(props: { params: Promise<Params> }): Promise<Metadata> {
  const params = await props.params;
  const region = await resolveSlugPath([params.bundesland, params.kreis, params.gemeinde]);
  return {
    title: region ? `Vorschau: ${region.name} – Energie von hier | Solar Check` : "Vorschau | Solar Check",
    robots: { index: false, follow: false },
  };
}

export default async function GemeindeVorschau(props: { params: Promise<Params> }) {
  const params = await props.params;
  const region = await resolveSlugPath([params.bundesland, params.kreis, params.gemeinde]);
  if (!region || region.level !== "gemeinde") notFound();

  const [paket, kreis, geo] = await Promise.all([
    ladeGemeindePaket(region.region_id),
    region.parent_region_id ? getRegionById(region.parent_region_id) : Promise.resolve(null),
    gemeindeGeo(region.region_id),
  ]);
  if (!paket) notFound();

  const bl = bundeslandByAgs(region.region_id.slice(0, 2));
  const kreisfrei = istKreisfrei(region.region_id, kreis, region.name);
  const stadtstaat = istStadtstaat(region.region_id);
  const pfad = [
    { name: "Solar-Atlas", href: "/solar-atlas" },
    // Berlin and Hamburg would otherwise name themselves three times, a
    // kreisfreie Stadt twice — the same rule as the live page.
    ...(stadtstaat ? [] : [{ name: bl?.name ?? params.bundesland, href: `/solar-atlas/${params.bundesland}` }]),
    ...(kreisfrei || stadtstaat ? [] : [{ name: kreis?.name ?? params.kreis, href: `/solar-atlas/${params.bundesland}/${params.kreis}` }]),
  ];

  return (
    <GemeindeSeite
      paket={paket}
      ort={{
        name: region.name,
        ags: region.region_id,
        plz: geo?.plz ?? null,
        lat: geo && Number.isFinite(geo.lat) ? geo.lat : null,
        lon: geo && Number.isFinite(geo.lon) ? geo.lon : null,
        pfad,
        liveUrl: `/solar-atlas/${params.bundesland}/${params.kreis}/${params.gemeinde}`,
        landName: bl?.name ?? params.bundesland,
        kreisBase: `/solar-atlas/${params.bundesland}/${params.kreis}/`,
      }}
    />
  );
}
