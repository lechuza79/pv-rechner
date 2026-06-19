// City registry for the regional landing pages.
// URL scheme is hierarchical Bundesland > Kommune:
//   /photovoltaik-foerderung/[bundesland]/[stadt]   (e.g. /…/bayern/wuerzburg)
// Each city maps a URL slug to its MaStR region id (AGS) and a regional PV
// yield. The municipal funding program (if any) lives in the standalone
// funding dataset (lib/funding-programs.ts) and is referenced by id, so the
// program data can also power an overview page and cross-program links.

import { getFundingProgram, type FundingStatus } from "./funding-programs";

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
  // ── Batch Juni 2026, Teil 2 (je 1 Recherche-Agent → offizielle Quelle) ──────
  // Deckt die bis dahin fehlenden Bundesländer ab (NI, SH, TH, ST, BB, MV, SL).
  { slug: "hannover", name: "Hannover", ags: "03241", bundesland: "Niedersachsen", yieldKwhKwp: 970, fundingId: "hannover-proklima" },
  { slug: "dresden", name: "Dresden", ags: "14612", bundesland: "Sachsen", yieldKwhKwp: 1030 },
  { slug: "dortmund", name: "Dortmund", ags: "05913", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 980, fundingId: "dortmund-pv" },
  { slug: "essen", name: "Essen", ags: "05113", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970, fundingId: "essen-solar" },
  { slug: "bonn", name: "Bonn", ags: "05314", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 1000, fundingId: "bonn-solares" },
  { slug: "kiel", name: "Kiel", ags: "01002", bundesland: "Schleswig-Holstein", yieldKwhKwp: 960 },
  { slug: "erfurt", name: "Erfurt", ags: "16051", bundesland: "Thüringen", yieldKwhKwp: 1010 },
  { slug: "magdeburg", name: "Magdeburg", ags: "15003", bundesland: "Sachsen-Anhalt", yieldKwhKwp: 1030 },
  { slug: "potsdam", name: "Potsdam", ags: "12054", bundesland: "Brandenburg", yieldKwhKwp: 1040, fundingId: "potsdam-klimaschutz" },
  { slug: "rostock", name: "Rostock", ags: "13003", bundesland: "Mecklenburg-Vorpommern", yieldKwhKwp: 990 },
  { slug: "saarbruecken", name: "Saarbrücken", ags: "10041", bundesland: "Saarland", yieldKwhKwp: 1060 },
  { slug: "augsburg", name: "Augsburg", ags: "09761", bundesland: "Bayern", yieldKwhKwp: 1080 },
  { slug: "kassel", name: "Kassel", ags: "06611", bundesland: "Hessen", yieldKwhKwp: 1010 },
  { slug: "luebeck", name: "Lübeck", ags: "01003", bundesland: "Schleswig-Holstein", yieldKwhKwp: 960 },
  { slug: "halle", name: "Halle (Saale)", ags: "15002", bundesland: "Sachsen-Anhalt", yieldKwhKwp: 1040 },
  // ── Batch Juni 2026, Teil 3: alle restlichen kreisfreien Städte (Katalog komplett) ──
  { slug: "amberg", name: "Amberg", ags: "09361", bundesland: "Bayern", yieldKwhKwp: 1060 },
  { slug: "ansbach", name: "Ansbach", ags: "09561", bundesland: "Bayern", yieldKwhKwp: 1050 },
  { slug: "aschaffenburg", name: "Aschaffenburg", ags: "09661", bundesland: "Bayern", yieldKwhKwp: 1030 },
  { slug: "baden-baden", name: "Baden-Baden", ags: "08211", bundesland: "Baden-Württemberg", yieldKwhKwp: 1070, fundingId: "baden-baden-pvplus" },
  { slug: "bamberg", name: "Bamberg", ags: "09461", bundesland: "Bayern", yieldKwhKwp: 1040 },
  { slug: "bayreuth", name: "Bayreuth", ags: "09462", bundesland: "Bayern", yieldKwhKwp: 1040 },
  { slug: "berlin", name: "Berlin", ags: "11000", bundesland: "Berlin", yieldKwhKwp: 1010, fundingId: "berlin-solarplus" },
  { slug: "bielefeld", name: "Bielefeld", ags: "05711", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970 },
  { slug: "bochum", name: "Bochum", ags: "05911", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970 },
  { slug: "bottrop", name: "Bottrop", ags: "05512", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970, fundingId: "bottrop-solaroffensive" },
  { slug: "brandenburg-havel", name: "Brandenburg an der Havel", ags: "12051", bundesland: "Brandenburg", yieldKwhKwp: 1010 },
  { slug: "braunschweig", name: "Braunschweig", ags: "03101", bundesland: "Niedersachsen", yieldKwhKwp: 970 },
  { slug: "bremerhaven", name: "Bremerhaven", ags: "04012", bundesland: "Bremen", yieldKwhKwp: 960 },
  { slug: "chemnitz", name: "Chemnitz", ags: "14511", bundesland: "Sachsen", yieldKwhKwp: 1020 },
  { slug: "coburg", name: "Coburg", ags: "09463", bundesland: "Bayern", yieldKwhKwp: 1030 },
  { slug: "cottbus", name: "Cottbus", ags: "12052", bundesland: "Brandenburg", yieldKwhKwp: 1020 },
  { slug: "delmenhorst", name: "Delmenhorst", ags: "03401", bundesland: "Niedersachsen", yieldKwhKwp: 960 },
  { slug: "dessau-rosslau", name: "Dessau-Roßlau", ags: "15001", bundesland: "Sachsen-Anhalt", yieldKwhKwp: 1010 },
  { slug: "duisburg", name: "Duisburg", ags: "05112", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970 },
  { slug: "emden", name: "Emden", ags: "03402", bundesland: "Niedersachsen", yieldKwhKwp: 960 },
  { slug: "erlangen", name: "Erlangen", ags: "09562", bundesland: "Bayern", yieldKwhKwp: 1050 },
  { slug: "flensburg", name: "Flensburg", ags: "01001", bundesland: "Schleswig-Holstein", yieldKwhKwp: 950 },
  { slug: "frankenthal", name: "Frankenthal (Pfalz)", ags: "07311", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1030 },
  { slug: "frankfurt-oder", name: "Frankfurt (Oder)", ags: "12053", bundesland: "Brandenburg", yieldKwhKwp: 1020 },
  { slug: "fuerth", name: "Fürth", ags: "09563", bundesland: "Bayern", yieldKwhKwp: 1050 },
  { slug: "gelsenkirchen", name: "Gelsenkirchen", ags: "05513", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970 },
  { slug: "gera", name: "Gera", ags: "16052", bundesland: "Thüringen", yieldKwhKwp: 1010 },
  { slug: "hagen", name: "Hagen", ags: "05914", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970 },
  { slug: "hamm", name: "Hamm", ags: "05915", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970 },
  { slug: "heilbronn", name: "Heilbronn", ags: "08121", bundesland: "Baden-Württemberg", yieldKwhKwp: 1070 },
  { slug: "herne", name: "Herne", ags: "05916", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970 },
  { slug: "hof", name: "Hof", ags: "09464", bundesland: "Bayern", yieldKwhKwp: 1030 },
  { slug: "ingolstadt", name: "Ingolstadt", ags: "09161", bundesland: "Bayern", yieldKwhKwp: 1070 },
  { slug: "jena", name: "Jena", ags: "16053", bundesland: "Thüringen", yieldKwhKwp: 1010 },
  { slug: "kaiserslautern", name: "Kaiserslautern", ags: "07312", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1020 },
  { slug: "kaufbeuren", name: "Kaufbeuren", ags: "09762", bundesland: "Bayern", yieldKwhKwp: 1080 },
  { slug: "kempten", name: "Kempten (Allgäu)", ags: "09763", bundesland: "Bayern", yieldKwhKwp: 1080 },
  { slug: "koblenz", name: "Koblenz", ags: "07111", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1010 },
  { slug: "krefeld", name: "Krefeld", ags: "05114", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970, fundingId: "krefeld-klimafreundlich" },
  { slug: "landau", name: "Landau in der Pfalz", ags: "07313", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1040 },
  { slug: "landshut", name: "Landshut", ags: "09261", bundesland: "Bayern", yieldKwhKwp: 1080 },
  { slug: "leverkusen", name: "Leverkusen", ags: "05316", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 980 },
  { slug: "ludwigshafen", name: "Ludwigshafen am Rhein", ags: "07314", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1030 },
  { slug: "memmingen", name: "Memmingen", ags: "09764", bundesland: "Bayern", yieldKwhKwp: 1080, fundingId: "memmingen-ee" },
  { slug: "moenchengladbach", name: "Mönchengladbach", ags: "05116", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970 },
  { slug: "muelheim", name: "Mülheim an der Ruhr", ags: "05117", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970 },
  { slug: "neumuenster", name: "Neumünster", ags: "01004", bundesland: "Schleswig-Holstein", yieldKwhKwp: 950 },
  { slug: "neustadt-weinstrasse", name: "Neustadt an der Weinstraße", ags: "07316", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1040 },
  { slug: "oberhausen", name: "Oberhausen", ags: "05119", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970 },
  { slug: "offenbach", name: "Offenbach am Main", ags: "06413", bundesland: "Hessen", yieldKwhKwp: 1020 },
  { slug: "oldenburg", name: "Oldenburg (Oldb)", ags: "03403", bundesland: "Niedersachsen", yieldKwhKwp: 960 },
  { slug: "osnabrueck", name: "Osnabrück", ags: "03404", bundesland: "Niedersachsen", yieldKwhKwp: 960, fundingId: "osnabrueck-saniert" },
  { slug: "passau", name: "Passau", ags: "09262", bundesland: "Bayern", yieldKwhKwp: 1070 },
  { slug: "pforzheim", name: "Pforzheim", ags: "08231", bundesland: "Baden-Württemberg", yieldKwhKwp: 1070 },
  { slug: "pirmasens", name: "Pirmasens", ags: "07317", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1020 },
  { slug: "remscheid", name: "Remscheid", ags: "05120", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970 },
  { slug: "rosenheim", name: "Rosenheim", ags: "09163", bundesland: "Bayern", yieldKwhKwp: 1080 },
  { slug: "salzgitter", name: "Salzgitter", ags: "03102", bundesland: "Niedersachsen", yieldKwhKwp: 970 },
  { slug: "schwabach", name: "Schwabach", ags: "09565", bundesland: "Bayern", yieldKwhKwp: 1050 },
  { slug: "schweinfurt", name: "Schweinfurt", ags: "09662", bundesland: "Bayern", yieldKwhKwp: 1030, fundingId: "schweinfurt-pv" },
  { slug: "schwerin", name: "Schwerin", ags: "13004", bundesland: "Mecklenburg-Vorpommern", yieldKwhKwp: 960, fundingId: "schwerin-pv" },
  { slug: "solingen", name: "Solingen", ags: "05122", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970 },
  { slug: "speyer", name: "Speyer", ags: "07318", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1040 },
  { slug: "straubing", name: "Straubing", ags: "09263", bundesland: "Bayern", yieldKwhKwp: 1080 },
  { slug: "suhl", name: "Suhl", ags: "16054", bundesland: "Thüringen", yieldKwhKwp: 1010 },
  { slug: "trier", name: "Trier", ags: "07211", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1020 },
  { slug: "ulm", name: "Ulm", ags: "08421", bundesland: "Baden-Württemberg", yieldKwhKwp: 1080 },
  { slug: "weiden", name: "Weiden i.d.OPf.", ags: "09363", bundesland: "Bayern", yieldKwhKwp: 1050 },
  { slug: "wilhelmshaven", name: "Wilhelmshaven", ags: "03405", bundesland: "Niedersachsen", yieldKwhKwp: 960 },
  { slug: "wolfsburg", name: "Wolfsburg", ags: "03103", bundesland: "Niedersachsen", yieldKwhKwp: 970, fundingId: "wolfsburg-pv" },
  { slug: "worms", name: "Worms", ags: "07319", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1030 },
  { slug: "wuppertal", name: "Wuppertal", ags: "05124", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970 },
  { slug: "zweibruecken", name: "Zweibrücken", ags: "07320", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1020 },
  // ── Landkreise mit eigenem (wiederkehrendem) Förderprogramm (Juni 2026) ──────
  { slug: "rhein-erft-kreis", name: "Rhein-Erft-Kreis", ags: "05362", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970, fundingId: "rhein-erft-energieoffensive" },
  { slug: "kreis-viersen", name: "Kreis Viersen", ags: "05166", bundesland: "Nordrhein-Westfalen", yieldKwhKwp: 970, fundingId: "viersen-klimaschutz" },
  { slug: "kreis-bergstrasse", name: "Kreis Bergstraße", ags: "06431", bundesland: "Hessen", yieldKwhKwp: 1030, fundingId: "bergstrasse-speicher" },
  { slug: "mayen-koblenz", name: "Landkreis Mayen-Koblenz", ags: "07137", bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1010, fundingId: "mayen-koblenz-speicher" },
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

// ── "Live" = only regions whose own funding program currently accepts
// applications (status "aktiv"). Policy (User, Juni 2026): we publish a page
// only for regions WITH an active program; regions whose program is exhausted/
// paused/discontinued, or that never had one, stay in the registry (archive,
// re-enabled later for SEO) but get NO live page. Existence is code-driven via
// the program status; page CONTENT still comes from the DB. Flip these filters
// to include inactive programs to re-expand the catalog.

/** True if the city has its own program and that program is currently active. */
export function isCityLive(c: AtlasCity): boolean {
  return !!c.fundingId && getFundingProgram(c.fundingId)?.status === "aktiv";
}

/** Cities with a live (active) program — drives page generation, sitemap, listings. */
export function liveCities(): AtlasCity[] {
  return ATLAS_CITIES.filter(isCityLive);
}

/** Live cities in a Bundesland (by slug). */
export function liveCitiesInBundesland(blSlug: string): AtlasCity[] {
  return liveCities().filter((c) => slugify(c.bundesland) === blSlug);
}

/** Bundesländer that have at least one live city (Land-level programs handled separately). */
export function liveBundeslaender(): { name: string; slug: string }[] {
  const bySlug = new Map<string, string>();
  for (const c of liveCities()) bySlug.set(slugify(c.bundesland), c.bundesland);
  return Array.from(bySlug, ([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

// ── Archive = regions whose own program exists but currently does NOT accept
// applications (exhausted / paused / discontinued). Unlike "no program at all",
// these still warrant a page: it carries the (now inactive) program terms, the
// MaStR stock and the federal fallback, so the URL stays useful for SEO without
// promising money that isn't there. "unsicher" is deliberately excluded — we do
// not publish program data we don't trust. Archive pages render with a status
// badge and compute their example amounts WITHOUT the inactive grant.
const ARCHIVE_STATUSES: FundingStatus[] = ["ausgeschoepft", "pausiert", "eingestellt"];

/** True if the city's own program is inactive but published as an archive page. */
export function isCityArchived(c: AtlasCity): boolean {
  const s = c.fundingId ? getFundingProgram(c.fundingId)?.status : undefined;
  return !!s && ARCHIVE_STATUSES.includes(s);
}

/** Cities with an inactive (archived) program. */
export function archivedCities(): AtlasCity[] {
  return ATLAS_CITIES.filter(isCityArchived);
}

/** A city gets a published page when its program is live OR archived. */
export function isCityPublished(c: AtlasCity): boolean {
  return isCityLive(c) || isCityArchived(c);
}

/** Cities that get a page (live + archived) — drives page generation & sitemap. */
export function publishedCities(): AtlasCity[] {
  return ATLAS_CITIES.filter(isCityPublished);
}

/** Published cities in a Bundesland (by slug), active programs listed first. */
export function publishedCitiesInBundesland(blSlug: string): AtlasCity[] {
  return publishedCities()
    .filter((c) => slugify(c.bundesland) === blSlug)
    .sort((a, b) => Number(isCityLive(b)) - Number(isCityLive(a)));
}

/** Bundesländer with at least one published city (live or archived). */
export function publishedBundeslaender(): { name: string; slug: string }[] {
  const bySlug = new Map<string, string>();
  for (const c of publishedCities()) bySlug.set(slugify(c.bundesland), c.bundesland);
  return Array.from(bySlug, ([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name, "de"));
}
