import "server-only";
import { getAncestors, getChildren, getRankingData, getRegionById, type AtlasChild, type AtlasRegion } from "../../../../lib/atlas";
import { getRegionAtlasData } from "../../../../lib/mastr-data";
import { loadDistrictContent, loadRegionContent } from "../../../../lib/district-monitor-server";
import { monitorContentForPreview } from "../../../../lib/monitor-content-preview";
import { districtSolarCells } from "../../../../lib/district-monitor";
import { regionMembers, regionRaceInput } from "../../../../lib/region-race";
import { LEVEL_TEXT } from "../../../../lib/region-level-text";
import { BEISPIEL_GEBIET, type Ebene } from "./werkstatt-bestand";
import type { VorschauDaten } from "./WerkstattVorschau";

// Data for the workshop previews — the regional page's own readers, nothing computed here.

export type Such = Record<string, string | string[] | undefined>;
export const eins = (x: string | string[] | undefined) => (Array.isArray(x) ? x[0] : x) ?? "";

function sortiert(kinder: AtlasChild[]) {
  return kinder.map((k) => ({ id: k.region_id, name: k.name })).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Resolve land → kreis → gemeinde from the URL, falling back to the example area of each step. */
export async function gebietsKette(ebene: Ebene, such: Such) {
  const de = await getRegionById("de");
  if (!de) throw new Error("Region Deutschland fehlt");
  if (ebene === "de") return { region: de, laender: [], kreise: [], gemeinden: [], land: "", kreis: "", gemeinde: "" };
  const laender = sortiert(await getChildren(de));
  const landWunsch = eins(such.land) || BEISPIEL_GEBIET.bundesland;
  const land = laender.some((l) => l.id === landWunsch) ? landWunsch : laender[0].id;
  const landRegion = await getRegionById(land);
  if (!landRegion) throw new Error(`Bundesland ${land} fehlt`);
  if (ebene === "bundesland") return { region: landRegion, laender, kreise: [], gemeinden: [], land, kreis: "", gemeinde: "" };
  const kreise = sortiert(await getChildren(landRegion));
  const kreisWunsch = eins(such.kreis) || BEISPIEL_GEBIET.landkreis;
  const kreis = kreise.some((k) => k.id === kreisWunsch) ? kreisWunsch : kreise[0]?.id ?? "";
  const kreisRegion = kreis ? await getRegionById(kreis) : null;
  if (!kreisRegion) return { region: null, laender, kreise, gemeinden: [], land, kreis, gemeinde: "" };
  if (ebene === "landkreis") return { region: kreisRegion, laender, kreise, gemeinden: [], land, kreis, gemeinde: "" };
  const gemeinden = sortiert(regionMembers(kreisRegion, await getChildren(kreisRegion)));
  const gemeindeWunsch = eins(such.gemeinde) || BEISPIEL_GEBIET.gemeinde;
  const gemeinde = gemeinden.some((g) => g.id === gemeindeWunsch) ? gemeindeWunsch : gemeinden[0]?.id ?? "";
  const gemeindeRegion = gemeinde ? await getRegionById(gemeinde) : null;
  return { region: gemeindeRegion, laender, kreise, gemeinden, land, kreis, gemeinde };
}

async function slugPfad(region: AtlasRegion) {
  const kette = [...(await getAncestors(region)).filter((a) => a.level !== "de"), region].filter((r) => r.level !== "de");
  return `/solar-atlas${kette.map((r) => `/${r.slug}`).join("")}`;
}

/** The same data path as the regional page (LandkreisSeite + RegionMonitorSection). */
export async function regionalDaten(region: AtlasRegion, mitRennen: boolean): Promise<VorschauDaten> {
  const level = region.level === "bundesland" || region.level === "de" ? region.level : "landkreis";
  const [atlas, children, ranking] = await Promise.all([getRegionAtlasData(region.region_id), getChildren(region), getRankingData(region)]);
  const stand = atlas.data_as_of;
  const towns = regionMembers(region, children);
  const townIds = new Set(towns.map((t) => t.region_id));
  const content = await monitorContentForPreview(
    level === "landkreis"
      ? loadDistrictContent(region.region_id, towns.map((t) => t.region_id), stand)
      : loadRegionContent(region.region_id, children.map((c) => c.region_id), stand),
  );
  return {
    art: "region",
    name: region.name,
    stand,
    prepared: content.prepared,
    monitor: {
      regionId: region.region_id,
      name: region.name,
      population: region.population,
      populationStand: region.population_as_of,
      cells: districtSolarCells(ranking.cells.filter((c) => townIds.has(c.region_id))),
      stand,
      monitor: content.monitor,
    },
    race: mitRennen && towns.length > 1
      ? { wording: LEVEL_TEXT[level].race, ...regionRaceInput({ towns, ranking, stand, basePath: await slugPfad(region) }) }
      : null,
  };
}

