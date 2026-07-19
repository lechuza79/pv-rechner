import type { Metadata } from "next";
import RegionAnlagentypEmbed from "./client";
import { getRegionSummary } from "../../../../lib/mastr-data";
import { bundeslandByAgs } from "../../../../lib/mastr-regions";
import { buildAnlagentypSegments } from "../../../../lib/anlagentyp";
import { slugify } from "../../../../lib/atlas-cities";

// Einbettbares Widget: installierte Solarleistung nach Anlagentyp (private
// Dächer / Gewerbe / Freifläche) eines Bundeslands — echte MaStR-Daten.
// Parametrisiert über den 2-stelligen Bundesland-AGS (?bl=13).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Solarleistung nach Anlagentyp (Bundesland) — Solar Check Widget",
  description:
    "Installierte Solarleistung eines Bundeslands nach Anlagentyp aus dem Marktstammdatenregister. Cookiefrei einbettbar via solar-check.io.",
  robots: { index: false, follow: false },
};

export default async function RegionAnlagentypEmbedPage({
  searchParams,
}: {
  searchParams?: { bl?: string };
}) {
  const ags = (searchParams?.bl ?? "").replace(/\D/g, "").slice(0, 2);
  const bl = ags.length === 2 ? bundeslandByAgs(ags) : undefined;
  if (!bl) {
    return <RegionAnlagentypEmbed error="Kein gültiges Bundesland angegeben." />;
  }

  try {
    const summary = await getRegionSummary(ags, "solar");
    const segments = buildAnlagentypSegments(summary.by_segment);
    return (
      <RegionAnlagentypEmbed
        name={bl.name}
        segments={segments}
        liveUrl={`https://solar-check.io/photovoltaik-foerderung/${slugify(bl.name)}`}
      />
    );
  } catch {
    return <RegionAnlagentypEmbed error="Für dieses Bundesland liegen keine Bestandsdaten vor." />;
  }
}
