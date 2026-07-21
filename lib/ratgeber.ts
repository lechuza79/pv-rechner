// Registry of the editorial guide pages ("Ratgeber"). One list feeds the
// overview page (/ratgeber), the header link's active state, and each guide's
// breadcrumb — so a new guide only needs a row here plus its page.
//
// Keep it a plain list (no over-engineering): slug + title + teaser. Order is
// the display order on the overview.

export interface RatgeberEntry {
  /** Path under the site root, e.g. "/lohnt-sich-pv-mit-speicher". */
  slug: string;
  /** Card + breadcrumb title. */
  title: string;
  /** One–two sentence teaser for the overview card. */
  teaser: string;
}

export const RATGEBER: RatgeberEntry[] = [
  {
    slug: "/lohnt-sich-pv-mit-speicher",
    title: "Lohnt sich PV mit Speicher?",
    teaser:
      "Der ehrliche Realitätscheck: wann sich ein Batteriespeicher zur PV-Anlage rechnet und wann nicht — mit live gerechneter Beispielrechnung auf Basis aktueller Marktpreise.",
  },
  {
    slug: "/lohnt-sich-pv-ohne-einspeiseverguetung",
    title: "Lohnt sich PV ohne Einspeisevergütung?",
    teaser:
      "Die Einspeisevergütung für Neuanlagen soll ab 2027 fallen — trägt sich Photovoltaik dann noch? Mit Beispielrechnung bei Vergütung null und dem Blick auf den Eigenverbrauch.",
  },
];

/** Guide entry for a given path, or undefined if the path isn't a guide. */
export function ratgeberBySlug(slug: string): RatgeberEntry | undefined {
  return RATGEBER.find((r) => r.slug === slug);
}
