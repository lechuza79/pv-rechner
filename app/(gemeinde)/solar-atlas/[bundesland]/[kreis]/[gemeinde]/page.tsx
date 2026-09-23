import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveSlugPath, getRegionById } from "../../../../../../lib/atlas";
import { anzeigeOrtsname, istKreisfrei, istStadtstaat } from "../../../../../../lib/atlas-orte";
import { bundeslandByAgs } from "../../../../../../lib/mastr-regions";
import { gemeindeGeo } from "../../../../../../lib/atlas-geo";
import { ladeGemeindePaket } from "../../../../../../lib/gemeinde-paket-server";
import GemeindeSeite from "../../../../../../components/gemeinde/GemeindeSeite";
import { vergleichsBasisPfad } from "../../../../../../lib/atlas-ranking";
import { gemeindeMetadata } from "../../../../../../components/gemeinde/gemeinde-metadata";

/**
 * The municipality page (approved design, 09/2026). Replaced the old Atlas
 * town page at the same address; metadata and index rules are the old page's
 * (components/gemeinde/gemeinde-metadata.ts). Content from the town's
 * precomputed package (lib/gemeinde-paket-server.ts), refreshed monthly
 * (scripts/gemeinde-monatslauf.ts).
 */
// One day: the package changes with the monthly run, and invalidating by
// route pattern does not reach pages built on demand (lib/atlas-revalidate-routen.ts).
export const revalidate = 86400;
export function generateStaticParams() {
  return [];
}

type Params = { bundesland: string; kreis: string; gemeinde: string };

export async function generateMetadata(props: { params: Promise<Params> }): Promise<Metadata> {
  return gemeindeMetadata(await props.params, { vorschau: false });
}

export default async function GemeindePage(props: { params: Promise<Params> }) {
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
        name: anzeigeOrtsname(region.name),
        ags: region.region_id,
        plz: geo?.plz ?? null,
        lat: geo && Number.isFinite(geo.lat) ? geo.lat : null,
        lon: geo && Number.isFinite(geo.lon) ? geo.lon : null,
        pfad,
        liveUrl: `/solar-atlas/${params.bundesland}/${params.kreis}/${params.gemeinde}`,
        landName: bl?.name ?? params.bundesland,
        // Town rows of the ranking link below the district, by the one rule.
        kreisBase: `${vergleichsBasisPfad("gemeinde", params.bundesland, params.kreis)}/`,
      }}
    />
  );
}
