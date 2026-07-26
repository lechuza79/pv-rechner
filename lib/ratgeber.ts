// Registry of the editorial guide pages ("Ratgeber"). One list feeds the
// overview page (/ratgeber), the header link's active state, and each guide's
// breadcrumb — so a new guide only needs a row here plus its page.
//
// Keep it a plain list (no over-engineering): slug + title + teaser. Order is
// the display order on the overview.

export interface RatgeberEntry {
  /** Path under the site root, e.g. "/ratgeber/lohnt-sich-pv-mit-speicher". */
  slug: string;
  /** Card + breadcrumb title. */
  title: string;
  /** One–two sentence teaser for the overview card. */
  teaser: string;
}

export const RATGEBER: RatgeberEntry[] = [
  {
    slug: "/ratgeber/lohnt-sich-pv-mit-speicher",
    title: "Lohnt sich PV mit Speicher?",
    teaser:
      "Der ehrliche Realitätscheck: wann sich ein Batteriespeicher zur PV-Anlage rechnet und wann nicht — mit live gerechneter Beispielrechnung auf Basis aktueller Marktpreise.",
  },
  {
    slug: "/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung",
    title: "Lohnt sich PV ohne Einspeisevergütung?",
    teaser:
      "Die Einspeisevergütung für Neuanlagen soll ab 2027 fallen — trägt sich Photovoltaik dann noch? Mit Beispielrechnung bei Vergütung null und dem Blick auf den Eigenverbrauch.",
  },
  {
    slug: "/ratgeber/waermepumpe-foerderung-2026",
    title: "Wärmepumpen-Förderung 2026: Wie viel Zuschuss gibt es?",
    teaser:
      "Grundförderung, Klima-Bonus, Einkommens-Bonus: Wie sich der BEG-Zuschuss für den Heizungstausch zusammensetzt — mit live gerechneten Beispielfällen und dem Förder-Check zum selbst Ausprobieren.",
  },
  {
    slug: "/ratgeber/gasheizung-oder-waermepumpe",
    title: "Gasheizung oder Wärmepumpe: Was rechnet sich noch?",
    teaser:
      "Das neue Heizungsgesetz erlaubt Gasheizungen wieder — aber die Grüngas-Pflicht macht sie ab 2029 zur Kostenfalle. Die ehrliche Rechnung über 20 Jahre, umschaltbar zwischen teilsaniertem und unsaniertem Altbau.",
  },
];

/** Guide entry for a given path, or undefined if the path isn't a guide. */
export function ratgeberBySlug(slug: string): RatgeberEntry | undefined {
  return RATGEBER.find((r) => r.slug === slug);
}
