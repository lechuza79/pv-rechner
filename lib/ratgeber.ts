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
    // Unter dem Themen-Cluster /balkonkraftwerk: „balkonkraftwerk anmelden" ist mit 27.100 Suchen
    // im Monat das größte Keyword im ganzen Balkon-Umfeld (DataForSEO 08/2026,
    // Schwierigkeit 17) — und der Wettbewerb besteht fast nur aus Shop-Blogs,
    // die erklären, DASS man muss, statt WIE es geht und woran es scheitert.
    slug: "/balkonkraftwerk/ratgeber/anmelden",
    title: "Balkonkraftwerk anmelden: Frist, Angaben und die drei Fallen",
    teaser:
      "Seit 2024 genügt eine Registrierung im Marktstammdatenregister — der Netzbetreiber bekommt sie automatisch. Was du bereithalten musst, wann die Frist läuft und warum der Begriff Inbetriebnahme etwas anderes bedeutet, als die meisten denken.",
    updated: "2026-08-17",
  },
  {
    // Vierte Seite im Balkon-Cluster. Zielt auf die INFO-Keywords, die eine
    // echte Frage stellen („lohnt sich ein balkonkraftwerk", „balkonkraftwerk
    // mit speicher sinnvoll" — zusammen rund 3.600 Suchen im Monat bei
    // Schwierigkeit 0–6, DataForSEO 18.08.2026). Ausdrücklich NICHT auf
    // „balkonkraftwerk mit speicher" (135.000/Monat): Diese Suchergebnisseite
    // besteht zu 80 % aus Shops plus drei Produktkarussellen — dort gewinnt,
    // wer verkauft. Messung und Begründung: docs/balkon-vergleichsseite-konzept.md.
    slug: "/balkonkraftwerk/ratgeber/mit-speicher",
    title: "Lohnt sich ein Balkonkraftwerk mit Speicher?",
    teaser:
      "Der Speicher verdoppelt die Anschaffung ungefähr und hält deutlich kürzer als die Module — er muss sich also für sich rechnen. Wann er das tut und wann nicht, hier durchgerechnet: mit dem Wirkungsgrad eines real vermessenen Systems statt dem aus dem Datenblatt.",
    updated: "2026-08-19",
  },
  {
    // Top-Level-Keyword-Slug wie /photovoltaik-neigungswinkel: die historische
    // Tabelle ist das Alleinstellungsmerkmal, „einspeisevergütung tabelle" das
    // erreichbare Keyword (DataForSEO 08/2026: 1.600/Monat, geringe Konkurrenz).
    slug: "/einspeiseverguetung-tabelle",
    title: "Einspeisevergütung: aktuelle Sätze & Tabelle seit 2000",
    teaser:
      "Alle Vergütungssätze zum Nachschlagen: aktuelle Werte, Halbjahres-Sätze seit 2022, die amtliche Monatstabelle 2012–2022 für Bestandsanlagen und die Jahreswerte zurück bis 2000 — mit dem Verlaufs-Chart und seinen Weichenstellungen.",
    updated: "2026-08-06",
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
