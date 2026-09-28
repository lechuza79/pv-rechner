import { WIDGET_METADATA } from "../meta";
import GemeindeSolarWidget from "../client";
import { getRegionById } from "../../../../../lib/atlas";
import { getRegionAtlasData } from "../../../../../lib/mastr-data";
import { bundeslandByAgs } from "../../../../../lib/mastr-regions";
import { slugify } from "../../../../../lib/atlas-cities";

// Embeddable Gemeinde solar figures — the Outreach hook. A municipality drops
// this on its own site; it shows the same numbers as the atlas page, cookie-free
// and monthly-current. Server-rendered with ISR (data changes monthly), wrapping
// a client shell for theme + share/embed per the widget convention.
export const revalidate = 3600;
// Built on first request, then cached. The query form `?ags=…` lands here
// via the middleware rewrite (lib/embed-pfad-weiche.ts).
export function generateStaticParams() {
  return [];
}

export const metadata = WIDGET_METADATA;

export default async function GemeindeSolarEmbed(
  props: {
    params: Promise<{ ags: string }>;
  }
) {
  const params = await props.params;
  const ags = (params.ags ?? "").replace(/\D/g, "");
  // 8-digit AGS = a Gemeinde. Anything else has no per-inhabitant home page.
  if (ags.length !== 8) {
    return <GemeindeSolarWidget error="Keine gültige Gemeinde angegeben." />;
  }

  const region = await getRegionById(ags);
  if (!region || region.level !== "gemeinde") {
    return <GemeindeSolarWidget error="Diese Gemeinde kennen wir nicht." />;
  }

  const [atlas, kreis] = await Promise.all([
    getRegionAtlasData(ags),
    region.parent_region_id ? getRegionById(region.parent_region_id) : Promise.resolve(null),
  ]);
  const bl = bundeslandByAgs(ags.slice(0, 2));

  const kwpDach = atlas.solar.by_segment
    .filter((s) => s.segment !== "freiflaeche")
    .reduce((a, s) => a + s.kwp, 0);

  // Deep link to the live atlas page — "share = the live view of this widget".
  const blSlug = bl ? slugify(bl.name) : null;
  const atlasPath =
    blSlug && kreis?.slug && region.slug ? `/solar-atlas/${blSlug}/${kreis.slug}/${region.slug}` : null;

  return (
    <GemeindeSolarWidget
      name={region.name}
      bundesland={bl?.name ?? null}
      population={region.population}
      count={atlas.solar.total_count}
      kwp={atlas.solar.total_kwp}
      kwpDach={kwpDach}
      speicherKwh={atlas.speicher.kwh_batterie}
      dataAsOf={atlas.data_as_of}
      populationAsOf={region.population_as_of}
      ags={ags}
      atlasPath={atlasPath}
    />
  );
}
