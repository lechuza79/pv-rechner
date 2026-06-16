// City registry for the regional landing pages (/photovoltaik/[stadt]).
// Each city maps a URL slug to its MaStR region id (AGS) and a regional PV
// yield. The municipal funding program (if any) lives in the standalone
// funding dataset (lib/funding-programs.ts) and is referenced by id, so the
// program data can also power an overview page and cross-program links.

export interface AtlasCity {
  slug: string;
  name: string;
  /** MaStR region id = 5-digit Kreis/Stadt AGS. */
  ags: string;
  bundesland: string;
  /** Regional PV yield kWh per kWp (PVGIS ballpark, manual). */
  yieldKwhKwp: number;
  /** Id into FUNDING_PROGRAMS, if the city has its own program. */
  fundingId?: string;
}

export const ATLAS_CITIES: AtlasCity[] = [
  {
    slug: "stuttgart",
    name: "Stuttgart",
    ags: "08111",
    bundesland: "Baden-Württemberg",
    yieldKwhKwp: 1090,
    fundingId: "stuttgart-solaroffensive",
  },
  {
    slug: "frankfurt",
    name: "Frankfurt am Main",
    ags: "06412",
    bundesland: "Hessen",
    yieldKwhKwp: 1050,
    fundingId: "frankfurt-klimabonus",
  },
  {
    slug: "karlsruhe",
    name: "Karlsruhe",
    ags: "08212",
    bundesland: "Baden-Württemberg",
    yieldKwhKwp: 1090,
    fundingId: "karlsruhe-klimabonus",
  },
  {
    slug: "regensburg",
    name: "Regensburg",
    ags: "09362",
    bundesland: "Bayern",
    yieldKwhKwp: 1080,
    fundingId: "regensburg-effizient",
  },
  {
    slug: "wuerzburg",
    name: "Würzburg",
    ags: "09663",
    bundesland: "Bayern",
    yieldKwhKwp: 1060,
    fundingId: "wuerzburg-klimastadt",
  },
  {
    slug: "darmstadt",
    name: "Darmstadt",
    ags: "06411",
    bundesland: "Hessen",
    yieldKwhKwp: 1060,
    fundingId: "darmstadt-pv",
  },
  {
    slug: "koeln",
    name: "Köln",
    ags: "05315",
    bundesland: "Nordrhein-Westfalen",
    yieldKwhKwp: 1000,
    fundingId: "koeln-pv",
  },
  {
    slug: "duesseldorf",
    name: "Düsseldorf",
    ags: "05111",
    bundesland: "Nordrhein-Westfalen",
    yieldKwhKwp: 1000,
    fundingId: "duesseldorf-klimafreundlich",
  },
];

export function cityBySlug(slug: string): AtlasCity | undefined {
  return ATLAS_CITIES.find((c) => c.slug === slug);
}
