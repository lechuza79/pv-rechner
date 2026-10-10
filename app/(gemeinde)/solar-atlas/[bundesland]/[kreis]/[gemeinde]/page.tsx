import {associationBreadcrumb} from '../../../../../../lib/verband-reference-server';
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { aufbauBericht, messe, neueUhr } from "../../../../../../lib/aufbau-uhr";
import { resolveSlugPath, getRegionById } from "../../../../../../lib/atlas";
import { anzeigeOrtsname, istKreisfrei, istStadtstaat, ortsseitenPfad } from "../../../../../../lib/atlas-orte";
import { bundeslandByAgs } from "../../../../../../lib/mastr-regions";
import { gemeindeGeo } from "../../../../../../lib/atlas-geo";
import { ladeGemeindePaket } from "../../../../../../lib/gemeinde-paket-server";
import { getFundingPrograms } from "../../../../../../lib/funding-data";
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
  // Stopwatch per read (lib/aufbau-uhr.ts): a slow first build of a town page
  // logs where its time went under [atlas-aufbau], like the district page.
  const uhr = neueUhr(Date.now());
  // The funding catalogue is read by GemeindeSeite; started first, before even
  // the address, because it depends on nothing (getFundingPrograms joins a
  // running read). Guarded by lib/__tests__/atlas-seite-parallel.test.ts.
  const foerderung = getFundingPrograms();
  void foerderung.catch(() => {});
  messe(uhr, "foerderkatalog", foerderung);
  const adresse = resolveSlugPath([params.bundesland, params.kreis, params.gemeinde]);
  messe(uhr, "adresse", adresse);
  const region = await adresse;
  if (!region || region.level !== "gemeinde") notFound();

  const reads = {
    paket: ladeGemeindePaket(region.region_id),
    kreis: region.parent_region_id ? getRegionById(region.parent_region_id) : Promise.resolve(null),
    geo: gemeindeGeo(region.region_id),
  };
  for (const [name, p] of Object.entries(reads)) messe(uhr, name, p);
  const seite = `/solar-atlas/${params.bundesland}/${params.kreis}/${params.gemeinde}`;
  after(() => {
    const bericht = aufbauBericht(uhr, seite, Date.now());
    if (bericht) console.warn(bericht);
  });
  const [paket, kreis, geo] = await Promise.all([reads.paket, reads.kreis, reads.geo]);
  if (!paket) notFound();

  const bl = bundeslandByAgs(region.region_id.slice(0, 2));
  const kreisfrei = istKreisfrei(region.region_id, kreis, region.name);
  const stadtstaat = istStadtstaat(region.region_id);
  const association=await associationBreadcrumb(region.region_id,`/solar-atlas/${params.bundesland}/${params.kreis}`);
  const pfad = [
    { name: "Solar-Atlas", href: "/solar-atlas" },
    // Berlin and Hamburg would otherwise name themselves three times, a
    // kreisfreie Stadt twice — the same rule as the live page.
    ...(stadtstaat ? [] : [{ name: bl?.name ?? params.bundesland, href: `/solar-atlas/${params.bundesland}` }]),
    ...(kreisfrei || stadtstaat ? [] : [{ name: kreis?.name ?? params.kreis, href: `/solar-atlas/${params.bundesland}/${params.kreis}` }]),
  ];

  if(association)pfad.push(association);

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
        liveUrl: ortsseitenPfad(region.region_id, params.bundesland, params.kreis, params.gemeinde),
        landName: bl?.name ?? params.bundesland,
        // Town rows of the ranking link below the district, by the one rule.
        kreisBase: `${vergleichsBasisPfad("gemeinde", params.bundesland, params.kreis)}/`,
      }}
    />
  );
}
