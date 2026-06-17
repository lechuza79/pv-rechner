// City registry for the regional landing pages.
// URL scheme is hierarchical Bundesland > Kommune:
//   /photovoltaik-foerderung/[bundesland]/[stadt]   (e.g. /…/bayern/wuerzburg)
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
  // ── Batch Juni 2026 (je 1 Recherche-Agent → offizielle Quelle) ──────────────
  { slug: "muenchen", name: "München", ags: "09162", bundesland: "Bayern", yieldKwhKwp: 1040, fundingId: "muenchen-fkg" },
  { slug: "nuernberg", name: "Nürnberg", ags: "09564", bundesland: "Bayern", yieldKwhKwp: 1050 },
  { slug: "freiburg", name: "Freiburg im Breisgau", ags: "08311", bundesland: "Baden-Württemberg", yieldKwhKwp: 1090, fundingId: "freiburg-stromerzeugung" },
  { slug: "heidelberg", name: "Heidelberg", ags: "08221", bundesland: "Baden-Württemberg", yieldKwhKwp: 1040, fundingId: "heidelberg-rev" },
  { slug: "mannheim", name: "Mannheim", ags: "08222", bundesland: "Baden-Württemberg", yieldKwhKwp: 1060, fundingId: "mannheim-solarbonus" },
  { slug: "muenster", name: "Münster", ags: "05515", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 960, fundingId: "muenster-klimafreundlich" },
  { slug: "aachen", name: "Aachen", ags: "05334", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 960 },
  { slug: "wiesbaden", name: "Wiesbaden", ags: "06414", bundesland: "Hessen", yieldKwhKwp: 1030, fundingId: "wiesbaden-eswe-speicher" },
  { slug: "mainz", name: "Mainz", ags: "07315", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1040, fundingId: "mainz-kipki-speicher" },
  { slug: "leipzig", name: "Leipzig", ags: "14713", bundesland: "Sachsen", yieldKwhKwp: 1000 },
  { slug: "hamburg", name: "Hamburg", ags: "02000", bundesland: "Hamburg", yieldKwhKwp: 950 },
  { slug: "bremen", name: "Bremen", ags: "04011", bundesland: "Bremen", yieldKwhKwp: 960, fundingId: "bremen-rundumshaus" },
];

export function cityBySlug(slug: string): AtlasCity | undefined {
  return ATLAS_CITIES.find((c) => c.slug === slug);
}

/** Transliterating slugifier — shared so anchor ids, paths and redirects all
 *  agree on the same Bundesland slug (e.g. "Baden-Württemberg" → "baden-wuerttemberg"). */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function bundeslandSlug(city: AtlasCity): string {
  return slugify(city.bundesland);
}

/** Canonical path of a city's funding landing page (Bundesland > Kommune). */
export function cityPath(city: AtlasCity): string {
  return `/photovoltaik-foerderung/${slugify(city.bundesland)}/${city.slug}`;
}

/** All cities whose Bundesland slug matches (for the Bundesland landing page). */
export function citiesInBundesland(blSlug: string): AtlasCity[] {
  return ATLAS_CITIES.filter((c) => slugify(c.bundesland) === blSlug);
}

/** Distinct Bundesländer that currently have at least one city page. */
export function bundeslaenderWithCities(): { name: string; slug: string }[] {
  const bySlug = new Map<string, string>();
  for (const c of ATLAS_CITIES) bySlug.set(slugify(c.bundesland), c.bundesland);
  return Array.from(bySlug, ([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name, "de"));
}
