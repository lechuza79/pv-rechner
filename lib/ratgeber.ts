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
  /**
   * Date of the last substantive edit (YYYY-MM-DD) — feeds <lastmod> in the
   * sitemap. Deliberately hand-maintained: it is a historical fact per guide,
   * not something to derive from build time. A build-time date would be "now"
   * on every deploy, and a sitemap whose lastmod is always current is a signal
   * Google learns to ignore.
   *
   * WHY IT EXISTS (27.07.2026): the guides moved under /ratgeber/ on 25.07. and
   * carried no lastmod at all. Google had last fetched the sitemap on 22.07.
   * and reported the new URLs as "URL ist Google nicht bekannt" — no date, no
   * reason to look again. Bump this line when a guide's content really changes;
   * leave it alone for typos and styling.
   */
  updated: string;
}

export const RATGEBER: RatgeberEntry[] = [
  {
    slug: "/ratgeber/lohnt-sich-pv-mit-speicher",
    title: "Lohnt sich PV mit Speicher?",
    teaser:
      "Der ehrliche Realitätscheck: wann sich ein Batteriespeicher zur PV-Anlage rechnet und wann nicht — mit live gerechneter Beispielrechnung auf Basis aktueller Marktpreise.",
    updated: "2026-07-26",
  },
  {
    slug: "/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung",
    title: "Lohnt sich PV ohne Einspeisevergütung?",
    teaser:
      "Die Einspeisevergütung für Neuanlagen soll ab 2027 fallen — trägt sich Photovoltaik dann noch? Mit Beispielrechnung bei Vergütung null und dem Blick auf den Eigenverbrauch.",
    updated: "2026-07-26",
  },
  {
    slug: "/ratgeber/waermepumpe-foerderung-2026",
    title: "Wärmepumpen-Förderung 2026: Wie viel Zuschuss gibt es?",
    teaser:
      "Grundförderung, Klima-Bonus, Einkommens-Bonus: Wie sich der BEG-Zuschuss für den Heizungstausch zusammensetzt — mit live gerechneten Beispielfällen und dem Förder-Check zum selbst Ausprobieren.",
    updated: "2026-07-26",
  },
  {
    // Deliberately a top-level slug (keyword URL), not /ratgeber/… — the
    // registry accepts any path and still feeds overview, breadcrumb, sitemap.
    slug: "/photovoltaik-neigungswinkel",
    title: "Neigungswinkel & Ausrichtung: Was dein Dach wirklich bringt",
    teaser:
      "Die Ertrags-Tabelle für jede Kombination aus Dachneigung und Ausrichtung — aus PVGIS-Daten der EU-Kommission, mit Schnell-Check für dein Dach. Und warum ein vermeintlich falsches Dach fast nie ein Ausschlusskriterium ist.",
    updated: "2026-08-04",
  },
  {
    slug: "/ratgeber/gasheizung-oder-waermepumpe",
    title: "Gasheizung oder Wärmepumpe: Was rechnet sich noch?",
    teaser:
      "Das neue Heizungsgesetz erlaubt Gasheizungen wieder — aber die Grüngas-Pflicht macht sie ab 2029 zur Kostenfalle. Die ehrliche Rechnung über 20 Jahre, umschaltbar zwischen teilsaniertem und unsaniertem Altbau.",
    updated: "2026-07-27",
  },
];

/** Guide entry for a given path, or undefined if the path isn't a guide. */
export function ratgeberBySlug(slug: string): RatgeberEntry | undefined {
  return RATGEBER.find((r) => r.slug === slug);
}
