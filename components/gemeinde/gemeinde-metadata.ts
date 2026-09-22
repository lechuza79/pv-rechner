import type { Metadata } from "next";
import { resolveSlugPath } from "../../lib/atlas";
import { getRegionAtlasData } from "../../lib/mastr-data";
import { pageMetadata } from "../../lib/seo";
import { atlasSeitenTitel } from "../../lib/atlas-titel";
import { atlasIsIndexable, atlasLevelReleased, atlasOrtEinzelfreigabe, atlasRobots, GEMEINDE_MIN_ANLAGEN } from "../../lib/atlas-index";
import { verlinkendeGemeinden } from "../../lib/atlas-outreach-freigabe";
import { istStadtstaat } from "../../lib/atlas-orte";

export type GemeindeParams = { bundesland: string; kreis: string; gemeinde: string };

/**
 * Title, description, canonical address and index rule of a municipality
 * page — the old page's rules unchanged (generateMetadata of
 * app/(site)/solar-atlas/[bundesland]/[kreis]/[gemeinde]), so the switch to
 * the new design changes nothing a search engine reads except the content.
 * `vorschau` keeps the preview out of every index regardless.
 */
export async function gemeindeMetadata(params: GemeindeParams, { vorschau }: { vorschau: boolean }): Promise<Metadata> {
  const region = await resolveSlugPath([params.bundesland, params.kreis, params.gemeinde]);
  if (!region) return { robots: atlasRobots(false) };
  const kreisfrei = params.kreis === params.gemeinde;
  const bezugsebene = istStadtstaat(region.region_id) ? "Bundesgebiet" : kreisfrei ? "Bundesland" : "Landkreis";
  const angeschrieben = await verlinkendeGemeinden();
  const einzeln = atlasOrtEinzelfreigabe(region.region_id) || angeschrieben.includes(region.region_id);
  const anlagen = atlasLevelReleased("gemeinde") || einzeln ? (await getRegionAtlasData(region.region_id)).solar.total_count : 0;
  const meta = pageMetadata({
    title: atlasSeitenTitel({ name: region.name, level: "gemeinde" }),
    description: `Photovoltaik in ${region.name}: Anlagenzahl, installierte Leistung und jährlicher Zubau aus dem Marktstammdatenregister — je Einwohner und im Vergleich zum ${bezugsebene}.`,
    path: `/solar-atlas/${params.bundesland}/${params.kreis}/${params.gemeinde}`,
  });
  return {
    ...meta,
    ...(vorschau ? { title: `Vorschau: ${String(meta.title)}` } : {}),
    robots: vorschau ? { index: false, follow: false } : atlasRobots(einzeln ? anlagen >= GEMEINDE_MIN_ANLAGEN : atlasIsIndexable("gemeinde", anlagen)),
  };
}
