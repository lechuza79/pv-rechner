// Standalone funding-program dataset — the single source of truth for PV /
// storage subsidies across all levels (Bund → Land → Landkreis → Kommune).
// Region pages reference programs by id; an overview page can render the whole
// set. Curated by hand (no machine-readable source exists), each entry carries
// a `stand` (as-of), `source`, `status` and a `verified` flag. Programs change
// and budgets run dry mid-year — treat `status` as a point-in-time snapshot.

export type Eligibility = "privat" | "gewerblich";
export type FundingLevel = "bund" | "land" | "landkreis" | "kommune";
export type FundingStatus = "aktiv" | "ausgeschoepft" | "pausiert" | "eingestellt" | "unsicher";

export interface FundingProgram {
  id: string;
  name: string;
  traeger: string;
  level: FundingLevel;
  /** Display region, e.g. "Stuttgart", "Berlin", "bundesweit". */
  region: string;
  /** Bundesland for grouping on the overview page; omitted for federal programs. */
  bundesland?: string;
  /** Geo key for PLZ→AGS matching: an AGS prefix the location's 8-digit AGS must
   *  start with. Land = 2-digit, Kreis/kreisfreie Stadt = 5-digit, Gemeinde =
   *  8-digit. Omitted for bund (matches everywhere). */
  agsCode?: string;
  url: string;
  /** Human-readable as-of, e.g. "Juni 2026". */
  stand: string;
  status: FundingStatus;
  /** Budget capped / first-come-first-served. */
  capped: boolean;
  /** Confirmed against the official source (vs. only aggregator portals). */
  verified: boolean;
  eligibility: Eligibility[];
  /**
   * Bedingungen als LESBARE Sätze — eine Bedingung je Eintrag.
   *
   * Regeln (aus der Überarbeitung der Frankfurter Karte, 16.08.2026; gelten für
   * ALLE Programme, nicht nur für neue):
   *
   * 1. **Eine Aussage je Eintrag.** Kein Semikolon-Anhängsel, das eine zweite
   *    Sache behauptet. „… keine Mittel mehr; die übrigen Bausteine sind davon
   *    nicht betroffen" ist zwei Bedingungen in einer Zeile — die zweite ist
   *    Beruhigung, die niemand gesucht hat, und sie treibt die Zeile über drei
   *    Zeilen Umbruch.
   * 2. **Aktiv und kurz.** „Balkonkraftwerke werden nicht mehr gefördert" statt
   *    „Für Balkonkraftwerke stehen keine Mittel mehr zur Verfügung".
   * 3. **Was NICHT gilt, gehört nicht in die Liste**, außer es ist der Kern der
   *    Bedingung. Wer eine Ausnahme erklärt, erklärt meist die Regel schlecht.
   * 4. **Keine Herleitung.** Aktenzeichen, Richtliniennummern und „laut Nr. 1.1"
   *    gehören in den Beleg beim Prüfdatum, nicht vor die Augen des Lesers.
   * 5. **Der Antragszeitpunkt steht immer drin** — er ist die einzige Bedingung,
   *    deren Verletzung die ganze Förderung kostet.
   *
   * Wer den Wortlaut ändert, ändert ihn auch in `lib/funding-conditions.ts`
   * (dort steht er zeichengleich als Beleg) — der Test schlägt sonst an, und
   * genau dafür ist er da.
   */
  /** Which costs the funding applies to — varies per program. */
  coveredCosts: string;
  /** Optional overall cap, e.g. "max. 50.000 €". */
  maxFoerderung?: string;
  rates: { label: string; value: string }[];
  conditions: string[];
  /** Ids of other programs this one can be combined with (rendered as links). */
  combinableWith: string[];
  // Structured rates so example calculations can show a concrete amount.
  pvPerKwp?: number;
  /** Flat base amount added before the per-kWp part (e.g. Düsseldorf 1.000 €). */
  pvSockel?: number;
  speicherPerKwh?: number;
  /** Share of total cost, e.g. 0.2 for 20 %. */
  percentOfCost?: number;
  /** Total € cap on the PV-per-kWp part (matches the "max. … €" in rates). */
  pvCap?: number;
  /** Total € cap on the storage part. */
  speicherCap?: number;
  /** Tiered flat amounts by kWp (e.g. Köln): first tier whose `upTo` the size
   *  does not exceed wins. Use a large `upTo` for the open top tier. */
  pvTiers?: { upTo: number; amount: number }[];
  /** Tiered flat amounts by kWh storage. */
  speicherTiers?: { upTo: number; amount: number }[];
  /** Minimum storage kWh below which no storage funding is paid. */
  speicherMin?: number;
  // ── Provenance (DB-only; undefined in the code seed) ─────────────────────────
  /** ISO date the program was last verified (Wächter) or last written (resync
   *  fallback = updated_at). Surfaced as "Zuletzt geprüft" and as sitemap lastmod.
   *  Set by lib/funding-data.ts from the funding_programs row, not by the seed. */
  lastVerified?: string;
}

/**
 * Display label for a program's provenance. Prefers the DB verification date
 * ("Zuletzt geprüft: 18.06.2026") and falls back to the editorial `stand`
 * ("Stand: Juni 2026") for code-seed entries. Appends "· unbestätigt" when the
 * program is not confirmed against the official source.
 */
export function fundingStandLabel(p: FundingProgram): string {
  const unbestaetigt = p.verified ? "" : " · unbestätigt";
  if (p.lastVerified) {
    const d = new Date(p.lastVerified);
    if (!isNaN(d.getTime())) {
      return `Zuletzt geprüft: ${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}${unbestaetigt}`;
    }
  }
  return `Stand: ${p.stand}${unbestaetigt}`;
}

// Bund applies everywhere and combines with every regional program.
const BUND = ["bund-nullsteuer", "bund-kfw270"];

export const FUNDING_PROGRAMS: Record<string, FundingProgram> = {
  // ── Bund (gilt überall) ──────────────────────────────────────────────────
  "bund-nullsteuer": {
    id: "bund-nullsteuer", name: "0 % Mehrwertsteuer auf PV & Speicher",
    traeger: "Bund", level: "bund", region: "bundesweit",
    url: "https://www.bundesfinanzministerium.de", stand: "Juni 2026",
    status: "aktiv", capped: false, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "0 % USt auf Kauf + Installation (Anlagen bis 30 kWp)",
    rates: [{ label: "Umsatzsteuer", value: "0 %" }],
    conditions: ["Wohngebäude", "Anlage bis 30 kWp"],
    combinableWith: ["bund-kfw270"],
  },
  "bund-kfw270": {
    id: "bund-kfw270", name: "KfW 270 – Erneuerbare Energien",
    traeger: "KfW", level: "bund", region: "bundesweit",
    url: "https://www.kfw.de/270", stand: "Juni 2026",
    status: "aktiv", capped: false, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "zinsgünstiger Kredit bis 100 % der Investition (kein Zuschuss)",
    rates: [{ label: "Finanzierung", value: "Kredit, kein Zuschuss" }],
    conditions: ["Antrag vor Vorhabenbeginn über die Hausbank"],
    combinableWith: ["bund-nullsteuer"],
  },

  // ── Land ───────────────────────────────────────────────────────────────────
  "berlin-solarplus": {
    id: "berlin-solarplus", name: "SolarPLUS", traeger: "IBB / Land Berlin",
    level: "land", region: "Berlin", bundesland: "Berlin", agsCode: "11",
    url: "https://www.berlin.de/solarcity/", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Pauschalen für Speicher, Zählerschrank, Denkmal-PV",
    rates: [
      { label: "Speicher (mit neuer PV)", value: "500 – 4.750 € (nach kWp)" },
      { label: "Zählerschrank", value: "750 € pauschal" },
      { label: "Denkmalgerechte PV", value: "600 – 5.700 €" },
    ],
    conditions: [
      "Projektstart erst nach Förderzusage",
      "Recycling-Zusage beim Speicher",
      "Balkonkraftwerke 2026 nicht mehr gefördert",
    ],
    combinableWith: BUND,
  },

  // ── Kommune – aktiv & solide ────────────────────────────────────────────────
  "stuttgart-solaroffensive": {
    id: "stuttgart-solaroffensive", name: "Stuttgarter Solaroffensive",
    traeger: "Landeshauptstadt Stuttgart", level: "kommune", region: "Stuttgart", bundesland: "Baden-Württemberg", agsCode: "08111",
    // Am 05.08.2026 aus der Förderrichtlinie selbst abgeschrieben (Fassung vom
    // 1. Mai 2026, Anlage 1 zu 229/2026 BV; Volltext in docs/quellen/). Vorher
    // standen hier zwei Ungewissheiten als Anzeigetext ("Satz 2026 neu justiert",
    // "ggf. eingestellt") — die Richtlinie beantwortet beide.
    url: "https://www.stuttgart.de/solaroffensive", stand: "August 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "nur Begleitmaßnahmen (Elektrik, Gerüst, Statik…) + Speicher — NICHT die Module",
    rates: [
      { label: "Begleitmaßnahmen Dach-PV", value: "max. 300 €/kWp" },
      { label: "Begleitmaßnahmen Fassade / über Dachbegrünung", value: "max. 400 €/kWp" },
      { label: "PV gesamt", value: "50 % der förderfähigen Kosten, max. 30.000 € je Antrag" },
      { label: "Batteriespeicher", value: "100 €/kWh nutzbarer Kapazität, max. 15.000 € je Antrag" },
    ],
    conditions: [
      "PV-Zuschuss nur für Begleitmaßnahmen (Ertüchtigung der Elektrik und des Zählerplatzes, Gerüst, Statik, Verlegung von Bauteilen, Dachhaut, Blitzschutz) — Module, Montagesysteme und Wechselrichter selbst sind nicht förderfähig",
      "Speicher nur zusammen mit einer neu errichteten PV-Anlage; gefördert wird höchstens 1,0 kWh je kWp (bei 10 kWp also max. 10 kWh)",
      "Der erhöhte Satz von 400 €/kWp gilt nur, wenn die Anlage in die Gründachfläche integriert ist — getrennte Bereiche für PV und Begrünung reichen nicht",
      "Antrag zwingend vor Beauftragung; Eigenleistung ist nicht förderfähig, nur Ausführung durch eine Fachfirma",
      "Anlagen, die aufgrund bestehender Vorschriften errichtet werden müssen (z. B. die PV-Pflicht des Landes), sind nicht förderfähig",
      "Mit BAFA/KfW/L-Bank kombinierbar (deren Mittel werden abgezogen)",
      "Mit gültiger Stuttgarter FamilienCard oder Wohngeldbezug erhöht sich die Gesamtförderung auf Nachweis pauschal um 10 %",
      "Steckersolar-Geräte sind nicht Teil dieser Richtlinie",
    ],
    combinableWith: BUND,
  },
  "karlsruhe-klimabonus": {
    id: "karlsruhe-klimabonus", name: "Karlsruher Klima-Bonus",
    traeger: "Stadt Karlsruhe", level: "kommune", region: "Karlsruhe", bundesland: "Baden-Württemberg", agsCode: "08212",
    url: "https://www.karlsruhe.de", stand: "Mai 2026",
    status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp (Wohngebäude im Stadtkreis)",
    rates: [
      { label: "PV-Anlage", value: "250 €/kWp, max. 2.500 €" },
      { label: "Fassaden-PV / PVT-Bonus", value: "+100 €/kWp, max. 1.000 €" },
    ],
    conditions: [
      "Fördertopf 2026 ausgeschöpft — Neustart 2027 mit ggf. geänderten Sätzen",
      "Kein Speicher gefördert",
      "Antrag nach Installation, Fachbetrieb-Pflicht",
    ],
    combinableWith: BUND,
    pvPerKwp: 250, pvCap: 2500,
  },
  "regensburg-effizient": {
    id: "regensburg-effizient", name: "Regensburg effizient",
    traeger: "Stadt Regensburg", level: "kommune", region: "Regensburg", bundesland: "Bayern", agsCode: "09362",
    // Richtlinie der Stadt Regensburg zum Förderprogramm `Regensburg effizient´ —
    // Förderung der Photovoltaik, vom 1. Januar 2026 (PDF, am 03.08.2026 gelesen,
    // Volltext in docs/quellen/). Tabelle 1 kennt GENAU ZWEI Positionen:
    // PV-Anlage 100 €/kWp (max. 1.500 €) und 200 € Zuschuss bei Denkmal oder
    // Fassade. Die Wörter Speicher, Batterie und kWh kommen im gesamten
    // Richtlinientext nicht vor — der frühere Speicher-Satz (150 €/kWh, max.
    // 1.500 €) hat Regensburger Nutzern bis zu 1.500 € zu viel versprochen.
    // Nur die Nullsteuer bleibt als kombinierbar stehen: Punkt 2 e) schließt die
    // Kombination mit anderen INVESTIVEN Förderprogrammen des Bundes und des
    // Freistaats aus (KfW 270 ist eines), während die Umsatzsteuer ein
    // Steuersatz ist und kein Förderprogramm.
    url: "https://www.regensburg.de/greendeal/mitmachen/staedtische-foerderungen-zum-klimaschutz",
    stand: "August 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp — Batteriespeicher fördert die Stadt nicht",
    rates: [
      { label: "PV-Anlage", value: "100 €/kWp, max. 1.500 €" },
      { label: "Denkmalgeschütztes Gebäude oder Fassade", value: "+200 € pauschal" },
    ],
    conditions: [
      "Antrag muss vor Kauf/Baubeginn bewilligt sein",
      "Pro Gebäude wird eine Maßnahme gefördert; die Anlage muss mindestens fünf Jahre im Stadtgebiet betrieben werden",
      "Reine Freiflächenanlagen und Balkonkraftwerke sind nicht förderfähig",
      "Keine Doppelförderung mit anderen investiven Programmen des Bundes oder des Freistaats Bayern; Einnahmen aus dem EEG bleiben unberührt",
    ],
    combinableWith: ["bund-nullsteuer"],
    pvPerKwp: 100, pvCap: 1500,
  },
  "wuerzburg-klimastadt": {
    id: "wuerzburg-klimastadt", name: "Klimastadt Würzburg",
    traeger: "Stadt Würzburg", level: "kommune", region: "Würzburg", bundesland: "Bayern", agsCode: "09663",
    url: "https://www.wuerzburg.de/themen/umwelt-klima/foerderungen-und-beratungen/photovoltaik",
    // Am 05.08.2026 an der Trägerseite abgeschrieben (Förderseite Photovoltaik und
    // Übersicht „Förderung Klimaschutz und Klimaanpassung", beide wuerzburg.de).
    // Beide Seiten nennen ÜBEREINSTIMMEND genau vier PV-Bausteine — und darunter ist
    // KEINE gewöhnliche Dach-PV: Wer in Würzburg ein Einfamilienhausdach belegt, bekommt
    // von der Stadt nichts. Wir haben hier bis heute „Dach-PV (Vollbelegung) 150 €/kWp"
    // und einen Denkmalschutz-Baustein versprochen; beides gibt es nicht (mehr).
    // Zielgruppe ist bei allen vier Bausteinen Eigentümer/WEG/Mehrfamilienhaus.
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp für vier Sonderfälle (Gebäudeversorgung im MFH, Fassade, PVT, PV auf Gründach) — gewöhnliche Dach-PV wird nicht gefördert",
    rates: [
      { label: "Gemeinschaftliche Gebäudeversorgung (MFH)", value: "2.000 € + 150 €/kWp, max. 5.000 €" },
      { label: "PV an Fassade", value: "250 €/kWp, max. 5.000 €" },
      { label: "PVT-Kollektoren (Strom + Wärme)", value: "250 €/kWp, max. 5.000 €" },
      { label: "PV mit Dachbegrünung", value: "150 €/kWp, max. 3.000 €" },
    ],
    conditions: [
      "Eine gewöhnliche Dachanlage ohne Gründach ist nicht förderfähig — die vier Bausteine decken nur Gebäudeversorgung im Mehrfamilienhaus, Fassade, PVT und PV über einer Dachbegrünung",
      "Zielgruppe aller vier Bausteine: Gebäudeeigentümer, Wohnungseigentümergemeinschaften und Mehrfamilienhäuser",
      "Antrag + Bescheid vor Maßnahmenbeginn; kein Speicher gefördert",
      "Programm zum 25.04.2026 zu „KlimaStadt Würzburg“ umgebaut; die Dachbegrünung selbst ist ein eigener Baustein und mit dem PV-Baustein kombinierbar",
      "Bund/Land kumulierbar, max. 90 % der Kosten",
    ],
    combinableWith: BUND,
  },
  "frankfurt-klimabonus": {
    id: "frankfurt-klimabonus", name: "Frankfurter Klimabonus",
    traeger: "Stadt Frankfurt am Main", level: "kommune", region: "Frankfurt am Main", bundesland: "Hessen", agsCode: "06412",
    url: "https://frankfurt.de/themen/klima-und-energie/stadtklima/klimabonus",
    stand: "Juli 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "20 % von Material- und Arbeitskosten",
    maxFoerderung: "max. 100.000 €",
    rates: [
      { label: "PV-Anlage", value: "20 % (30 % als Solar-Gründach)" },
      { label: "Batteriespeicher + Ladesäule", value: "20 %" },
      { label: "Gemeinschaftsprojekte", value: "+5 Prozentpunkte" },
      { label: "Balkonkraftwerk", value: "derzeit keine Mittel" },
    ],
    conditions: [
      "Erst nach Zuwendungsbescheid mit der Maßnahme beginnen",
      "Online-Antrag mit Registrierung",
      "Grundstück im Stadtgebiet Frankfurt",
      "Batteriespeicher und Ladesäulen nur in Kombination mit einer neuen PV-Anlage",
      "Balkonkraftwerke werden seit dem 03.06.2025 nicht mehr gefördert",
    ],
    combinableWith: BUND,
    percentOfCost: 0.2,
  },
  "darmstadt-pv": {
    id: "darmstadt-pv", name: "Förderprogramm Photovoltaik",
    traeger: "Wissenschaftsstadt Darmstadt", level: "kommune", region: "Darmstadt", bundesland: "Hessen", agsCode: "06411",
    // Am 03.08.2026 an der Trägerseite geprüft: Sätze unverändert, Programm läuft,
    // kein Hinweis auf ausgeschöpfte Mittel. Geändert wurde nur der Link — er zeigte
    // auf die Stadt-Startseite und führte damit nirgendwohin.
    url: "https://www.darmstadt.de/leben/umwelt/foerderprogramme",
    stand: "August 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp (Anschaffung + Installation)",
    rates: [
      { label: "PV-Anlage (Dach/Fassade)", value: "200 €/kWp, max. 6.000 €" },
      { label: "Balkonkraftwerk", value: "200 – 400 € (max. 50 %)" },
    ],
    conditions: [
      "Freiwillige Leistung, kein Rechtsanspruch",
      "Hier wird der Antrag erst NACH Inbetriebnahme und Registrierung im Marktstammdatenregister gestellt — anders als bei den meisten anderen Programmen",
      "Die Anlage muss im eigenen Eigentum stehen; Rechnungsdatum der Module nach dem 28.06.2022",
    ],
    combinableWith: BUND,
    pvPerKwp: 200, pvCap: 6000,
  },
  "badhomburg-energiespar": {
    id: "badhomburg-energiespar", name: "Energiesparförderung",
    traeger: "Stadt Bad Homburg", level: "kommune", region: "Bad Homburg", bundesland: "Hessen", agsCode: "06434003",
    url: "https://www.bad-homburg.de", stand: "Juni 2026",
    status: "unsicher", capped: true, verified: false,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp + je kWh Speicher (Mittel ggf. ausgeschöpft)",
    rates: [
      { label: "PV-Anlage", value: "300 €/kWp, max. 6.000 €" },
      { label: "Batteriespeicher", value: "300 €/kWh, max. 3.000 €" },
    ],
    conditions: [
      "Mieter ausdrücklich antragsberechtigt",
      "Beträge gemäß Richtlinie 2022; Haushaltsmittel laut mehreren Quellen derzeit ausgeschöpft — vor Antrag bei der Stadt prüfen",
    ],
    combinableWith: BUND,
    pvPerKwp: 300, speicherPerKwh: 300, pvCap: 6000, speicherCap: 3000,
  },
  "koeln-pv": {
    id: "koeln-pv", name: "Klimafreundliches Wohnen & Arbeiten",
    traeger: "Stadt Köln", level: "kommune", region: "Köln", bundesland: "Nordrhein-Westfalen", agsCode: "05315",
    url: "https://www.stadt-koeln.de/klimafreundliches-wohnen-und-arbeiten", stand: "August 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Staffel-Pauschalen, max. 60 % der Kosten",
    rates: [
      { label: "PV-Anlage", value: "1.500–2.500 € (nach kWp)" },
      { label: "Batteriespeicher", value: "500–1.300 € (nach kWh)" },
    ],
    conditions: ["Solange Mittel reichen (Budget 8 Mio. € 2026)", "Speicher ab 3 kWh"],
    combinableWith: BUND,
    pvTiers: [
      { upTo: 5, amount: 1500 },
      { upTo: 9, amount: 2000 },
      { upTo: 14, amount: 2300 },
      { upTo: 999, amount: 2500 },
    ],
    speicherTiers: [
      { upTo: 7, amount: 500 },
      { upTo: 11, amount: 1000 },
      { upTo: 999, amount: 1300 },
    ],
    speicherMin: 3,
  },
  "duesseldorf-klimafreundlich": {
    id: "duesseldorf-klimafreundlich", name: "Klimafreundliches Wohnen und Arbeiten",
    traeger: "Stadt Düsseldorf", level: "kommune", region: "Düsseldorf", bundesland: "Nordrhein-Westfalen", agsCode: "05111",
    url: "https://www.duesseldorf.de/stadtrecht/1/19/19-303", stand: "Juni 2026",
    status: "pausiert", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Sockel + je kWp + je kWh Speicher, max. 50 % der Kosten",
    rates: [
      { label: "PV-Anlage", value: "1.000 € + 200 €/kWp, max. 10.000 €" },
      { label: "Batteriespeicher", value: "250 €/kWh, max. 10.000 €" },
    ],
    conditions: [
      "Aktuell keine neuen Anträge — Programm wird überarbeitet (Stand Juni 2026)",
      "Speicher max. das 1,5-fache der kWp, mit 10-Jahres-Garantie",
      "Förderung max. 50 % der Gesamtkosten",
    ],
    combinableWith: BUND,
    pvSockel: 1000, pvPerKwp: 200, speicherPerKwh: 250, pvCap: 10000, speicherCap: 10000,
  },
  "hannover-proklima": {
    id: "hannover-proklima", name: "proKlima (enercity-Fonds)",
    traeger: "Region Hannover", level: "landkreis", region: "Region Hannover", bundesland: "Niedersachsen", agsCode: "03241",
    url: "https://www.proklima-hannover.de/wohngebaeude/foerderangebote/solarstrom/dachvolltoll/", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp bei voller Dachbelegung (Baustein DachVollToll)",
    rates: [
      { label: "Dach-PV (Vollbelegung)", value: "100 €/kWp, max. 2.000 €" },
      { label: "Bonus Energiemanagement", value: "500 € (mit Speicher + Smart Meter + dynamischem Tarif)" },
    ],
    conditions: [
      "Nur im Fördergebiet (Hannover + Hemmingen, Laatzen, Langenhagen, Ronnenberg, Seelze)",
      "Volle Belegung aller geeigneten Dachflächen, mindestens 2 kWp",
      "Antrag vor Maßnahmenbeginn; mit BEG kombinierbar",
    ],
    combinableWith: BUND,
    // Info-only: proKlima gilt nur in 6 der ~21 Gemeinden der Region Hannover.
    // Der Kreis-AGS 03241 würde per Präfix-Match den ganzen Landkreis treffen
    // (z. B. Burgdorf, das NICHT förderfähig ist) → falscher €-Abzug. Bis eine
    // exakte 8-stellige AGS-Allowlist der Fördergemeinden hinterlegt ist, wird
    // das Programm nur als Hinweis angezeigt und NICHT automatisch abgezogen.
  },

  // ── Kommune – aktuell ausgeschöpft / eingestellt (zur Lagebeurteilung) ───────
  "bonn-solares": {
    id: "bonn-solares", name: "Solares Bonn", traeger: "Bundesstadt Bonn",
    level: "kommune", region: "Bonn", bundesland: "Nordrhein-Westfalen", agsCode: "05314",
    url: "https://www.bonn.de/themen-entdecken/klima/klima-foerderprogramme/foerderprogramm-solares-bonn.php",
    stand: "Juni 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp (Budget 2026 erschöpft)",
    maxFoerderung: "max. 25.000 € je Objekt (Denkmal 27.500 €)",
    rates: [
      { label: "Dach-PV Wohngebäude (Vollbelegung)", value: "100 €/kWp" },
      { label: "Mehrfamilienhaus / Fassade / Denkmal", value: "bis 300 €/kWp" },
    ],
    conditions: [
      "Mittel 2026 ausgeschöpft — Wiedereröffnung üblicherweise zum Jahresbeginn",
      "Antrag vor Beauftragung; nur Bestandsgebäude (fertiggestellt bis 31.12.2021)",
      "Standardsatz nur bei voller Belegung der geeigneten Dachfläche",
    ],
    combinableWith: BUND,
  },
  "goettingen-klimafonds": {
    id: "goettingen-klimafonds", name: "KlimaFonds Göttingen",
    traeger: "Stadt Göttingen", level: "kommune", region: "Göttingen", bundesland: "Niedersachsen", agsCode: "03159016",
    url: "https://nachhaltigkeit.goettingen.de", stand: "Juni 2026",
    status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp + je kWh (Topf seit Juni 2026 leer)",
    rates: [
      { label: "PV-Anlage (≥ 5 kWp)", value: "150 €/kWp" },
      { label: "Batteriespeicher", value: "100 €/kWh, max. 1.200 €" },
    ],
    conditions: ["Modul 'Energie erzeugen' aktuell ausgeschöpft"],
    combinableWith: BUND,
  },

  // ── Batch Juni 2026 (je 1 Recherche-Agent → offizielle Quelle) ──────────────
  "freiburg-stromerzeugung": {
    id: "freiburg-stromerzeugung", name: "Klimafreundlich Wohnen – Stromerzeugung",
    traeger: "Stadt Freiburg im Breisgau", level: "kommune", region: "Freiburg im Breisgau", bundesland: "Baden-Württemberg", agsCode: "08311",
    url: "https://www.freiburg.de/pb/232441.html", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp für Dach-PV (nur Anteil über der Solarpflicht-Mindestgröße)",
    rates: [
      { label: "Dach-PV (Vollbelegung)", value: "150 €/kWp, max. 1.500 €" },
      { label: "Bonus Gründach/Fassade/Denkmal", value: "+150 €/kWp, max. 1.500 €" },
      { label: "Balkonmodul (Mieter)", value: "150 € (mit Freiburg-Pass 300 €)" },
    ],
    conditions: [
      "Gefördert nur der Anlagenteil über der gesetzlichen Solarpflicht-Mindestgröße",
      "Antrag bis 6 Monate nach Inbetriebnahme; Ausführung durch Fachbetrieb",
      "Batteriespeicher seit Juni 2025 nicht mehr gefördert",
      "Mit BEG kumulierbar, max. 60 % der Kosten",
    ],
    combinableWith: BUND,
    pvPerKwp: 150, pvCap: 1500,
  },
  // Der Status stand bis zum 14.08.2026 auf „unsicher", weil zwei städtische
  // Seiten sich zu widersprechen schienen. Sie tun es nicht: Die Übersichtsseite
  // trägt oben einen Kasten „Förderstopp — einige Förderprogramme sind derzeit
  // ausgesetzt", der drei ANDERE Programme meint (Energieeffizienz in
  // Unternehmen/Vereinen, Wassermanagement, Mobilität); direkt darunter steht
  // beim PV-Programm „Antragstellung ab 1. Juli 2026 wieder möglich". Der
  // Widerspruch war ein falsch zugeordneter Seitenkopf — Council 3/3 am
  // 14.08.2026, adversarialer Prüfer eingeschlossen.
  //
  // BEWUSST OHNE automatischen Abzug (kein pvPerKwp): Der Zuschuss hängt am
  // Anlagenteil ÜBER der PV-Pflicht BW, und der Topf ist mit dem
  // Starkregen-Programm geteilt (250.000 € im Nachtragshaushalt 2026, kein
  // Rechtsanspruch). Ein automatisch abgezogener Betrag wäre ein Geldversprechen,
  // das die Richtlinie in dieser Form nicht gibt.
  "heidelberg-rev": {
    id: "heidelberg-rev", name: "Rationelle Energieverwendung – Photovoltaik",
    traeger: "Stadt Heidelberg", level: "kommune", region: "Heidelberg", bundesland: "Baden-Württemberg", agsCode: "08221",
    url: "https://www.heidelberg.de/hd/HD/Leben/foerderbaustein+_photovoltaikanlagen_.html", stand: "August 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp (Dach + Fassade), max. 10.000 € je Objekt; kein Speicher",
    rates: [
      { label: "Dach-PV (bis 100 kWp)", value: "100 €/kWp, max. 10.000 €" },
      { label: "Fassade / aufgeständert auf Gründach oder über Parkplatz (bis 50 kWp)", value: "200 €/kWp, max. 10.000 €" },
      { label: "Mieterstrom / gemeinschaftliche Gebäudeversorgung", value: "50 % der investiven Kosten, max. 2.500 €" },
    ],
    conditions: [
      "Gefördert nur der Anlagenteil über der PV-Pflicht Baden-Württemberg (Pauschalnachweis 0,06 kWp je m² überbauter Grundstücksfläche); Anlagen außerhalb der PV-Pflicht werden vollständig gefördert",
      "kein Batteriespeicher, keine Wallbox und keine steckerfertigen Anlagen gefördert",
      "Antrag vor Kauf/Installation: bis zur Bewilligung darf kein Liefer- oder Leistungsvertrag geschlossen sein",
      "Anlage muss mindestens 15 Jahre in Heidelberg betrieben werden; Zuschüsse unter 150 € werden nicht bewilligt",
      "Mittel begrenzt und mit dem Programm Starkregen- und Hochwasserschutz geteilt (250.000 € im Nachtragshaushalt 2026); kein Rechtsanspruch",
    ],
    combinableWith: BUND,
  },
  "mannheim-solarbonus": {
    id: "mannheim-solarbonus", name: "SolarBonus Mannheim",
    traeger: "Stadt Mannheim / Klimaschutzagentur", level: "kommune", region: "Mannheim", bundesland: "Baden-Württemberg", agsCode: "08222",
    // Am 07.08.2026 aus der Förderrichtlinie selbst abgeschrieben — bis dahin stand hier
    // nur, was die Presse-Mitteilung der Stadt hergab (verified: false). Volltext im Repo:
    // docs/quellen/Mannheim_SolarBonus_Foerderrichtlinie_2026-03-11.pdf (Beschluss des
    // Gemeinderats vom 11.03.2026, ersetzt die Fassung vom 01.04.2025).
    // Die Programmseite selbst ist eine JS-Anwendung ohne Text im Quelltext; die Sätze
    // stehen zusätzlich in ihrer Datenschnittstelle (api.klima-ma.de/api/subsidies,
    // Eintrag "SolarBonus 2026 der Stadt Mannheim"). Achtung: die .html-Variante des
    // Pfades antwortet mit einem Serverfehler — die hier hinterlegte Adresse trägt.
    // WIDERSPRUCH zwischen zwei Trägerquellen bei der Fassade: Die Seitenübersicht nennt
    // max. 3.750 €, die Richtlinie unter 3.4 max. 3.000 €. Wir folgen der Richtlinie —
    // sie ist der Gemeinderatsbeschluss, die Übersicht nur seine Zusammenfassung.
    url: "https://www.klima-ma.de/foerderprogramme", stand: "August 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp — nur Bestandswohngebäude (Bauantrag vor dem 01.05.2022) und nur in Sonderfällen: Mehrfamilienhaus mit Mieterstrom, Gründach, Denkmal, Fassade oder gemeinnütziger Verein. Ein gewöhnliches Ein-/Zweifamilienhaus-Dach wird nicht gefördert",
    rates: [
      { label: "Mehrfamilienhaus ab 3 Wohneinheiten (Vollbelegung oder ab 20 kWp), nur mit Mieterstrom oder gemeinschaftlicher Gebäudeversorgung", value: "120 €/kWp, max. 2.400 €" },
      { label: "PV auf Dachbegrünung", value: "260 €/kWp, max. 4.000 €" },
      { label: "PV auf denkmalgeschütztem Gebäude", value: "300 €/kWp, max. 4.500 €" },
      { label: "Fassaden-PV und Solarzäune (ab 1,5 kWp)", value: "250 €/kWp, max. 3.000 €" },
      { label: "PV auf Gebäuden gemeinnütziger Vereine (Vollbelegung oder ab 30 kWp)", value: "140 €/kWp, max. 4.200 €" },
      { label: "Umsetzung des Mieterstrom-/Betriebskonzepts (MFH, WEG)", value: "50 % der Kosten, max. 3.000 €" },
    ],
    conditions: [
      "Nur für Gebäude, für die der Bauantrag vor dem 01.05.2022 gestellt wurde — Neubauten sind ausgeschlossen (Nr. 1.1 der Richtlinie)",
      "Ein-/Zweifamilienhäuser nur bei begrüntem Dach oder Denkmalschutz förderfähig; ein gewöhnliches Dach bekommt nichts",
      "Beim Mehrfamilienhaus ist ein gleichzeitig umgesetztes Mieterstrommodell oder eine gemeinschaftliche Gebäudeversorgung zwingende Voraussetzung, nicht nur ein Zusatzbaustein",
      "Antragsberechtigt sind private Wohngebäudeeigentümer samt Eigentümergemeinschaften sowie eingetragene gemeinnützige Vereine",
      "Antrag vor der Beauftragung; nach der vorläufigen Zusage bleiben 12 Monate für Installation und Verwendungsnachweis",
      "Nur Anlagen von Fachbetrieben; selbst beschaffte Anlagenteile und über Mietmodelle finanzierte Anlagen sind ausgeschlossen",
      "Einmalig je PV-Anlage und Objekt; nicht mit dem Balkon-SolarBonus der Stadt kombinierbar",
      "Mittel werden erst bei vollständigem Antrag reserviert und nur im Rahmen des Haushalts vergeben",
    ],
    combinableWith: BUND,
  },
  "muenster-klimafreundlich": {
    id: "muenster-klimafreundlich", name: "Klimafreundliche Wohngebäude – Photovoltaik",
    traeger: "Stadt Münster", level: "kommune", region: "Münster", bundesland: "Nordrhein-Westfalen", agsCode: "05515",
    url: "https://www.stadt-muenster.de/klima/foerderprogramm", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp — nur Gründach-PV, Mehrfamilienhaus oder Fassade (nicht Standard-EFH-Schrägdach)",
    rates: [{ label: "PV (Gründach / MFH / Fassade)", value: "300 €/kWp" }],
    conditions: [
      "Nur PV auf Gründach, Mehrfamilienhaus (ab 3 Wohneinheiten) oder Fassade — nicht auf normalem Einfamilienhaus-Schrägdach",
      "kein Batteriespeicher gefördert",
      "Antrag vor Maßnahmenbeginn",
    ],
    combinableWith: BUND,
  },
  "wiesbaden-eswe-speicher": {
    id: "wiesbaden-eswe-speicher", name: "ESWE Solar-Speicherbatterie",
    traeger: "ESWE Versorgungs AG / Klimaschutzagentur Wiesbaden", level: "kommune", region: "Wiesbaden", bundesland: "Hessen", agsCode: "06414",
    url: "https://ksa-wiesbaden.de/foerderung/eswe-solar-speicherbatterie/", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: false,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss für Batteriespeicher mit neuer PV (nur ESWE-Kunden)",
    rates: [
      { label: "Speicher bis 3 kWh", value: "500 €" },
      { label: "Speicher bis 6 kWh", value: "750 €" },
      { label: "Speicher über 6 kWh", value: "1.000 €" },
    ],
    conditions: [
      "Nur zusammen mit neuer, netzgekoppelter PV-Anlage; Speicher allein nicht förderfähig",
      "Antragsteller muss ESWE-Kunde sein (Strom + Gas/Wärme) — daher nicht pauschal eingerechnet",
      "Antrag vor Maßnahmenbeginn; Speicher mind. 10 Jahre betreiben",
      "Früheres reines PV-Programm der Stadt zum 01.07.2024 eingestellt",
    ],
    combinableWith: BUND,
  },
  "mainz-kipki-speicher": {
    id: "mainz-kipki-speicher", name: "Photovoltaik-Batteriespeicher (KIPKI)",
    traeger: "Mainzer Stiftung für Klimaschutz / Stadt Mainz", level: "kommune", region: "Mainz", bundesland: "Rheinland-Pfalz", agsCode: "07315",
    url: "https://www.mainzer-stiftung.de/foerderprogramme/photovoltaik-batteriespeicher/", stand: "Juni 2026",
    status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWh Speicher (mit neuer PV)",
    rates: [{ label: "Batteriespeicher", value: "150 €/kWh, max. 1.500 €" }],
    conditions: [
      "Mittel ausgeschöpft, keine Neuanträge; für 2026 keine Fortführung geplant",
      "nur mit neuer PV-Anlage ab 3 kWp, Speicher max. 1:1 zur PV-Leistung",
      "Antrag vor Baubeginn",
    ],
    combinableWith: BUND,
  },
  "muenchen-fkg": {
    id: "muenchen-fkg", name: "Förderprogramm Klimaneutrale Gebäude (FKG)",
    traeger: "Landeshauptstadt München", level: "kommune", region: "München", bundesland: "Bayern", agsCode: "09162",
    url: "https://stadt.muenchen.de/service/info/sachgebiet-forderprogramm-klimaneutrale-gebaude/10414150/", stand: "Juni 2026",
    status: "eingestellt", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Dach-PV seit Dez. 2024 nicht mehr förderfähig — nur noch Balkonkraftwerke",
    rates: [{ label: "Balkonkraftwerk", value: "0,40 €/Wp, max. 320 € (mit München-Pass 0,50 €/Wp, max. 400 €)" }],
    conditions: [
      "Für Dach-Photovoltaik seit dem 18.12.2024 keine neuen Anträge mehr möglich",
      "nur noch Stecker-Solargeräte (Balkonkraftwerke) werden gefördert",
    ],
    combinableWith: BUND,
  },
  "bremen-rundumshaus": {
    id: "bremen-rundumshaus", name: "Rund ums Haus – PV nach Plan",
    traeger: "BAB Bremer Aufbau-Bank (Land Bremen)", level: "land", region: "Bremen", bundesland: "Bremen", agsCode: "04",
    url: "https://www.bab-bremen.de/de/page/programm/rund-ums-haus", stand: "Juni 2026",
    status: "aktiv", capped: false, verified: true,
    eligibility: ["privat"],
    coveredCosts: "zinsgünstiges Darlehen bis 100 % der Kosten (kein Zuschuss)",
    rates: [{ label: "Finanzierung", value: "Darlehen bis 50.000 €, kein Zuschuss" }],
    conditions: [
      "Antrag vor Maßnahmenbeginn — keine Aufträge vor der Förderzusage",
      "Annuitätendarlehen, Laufzeit bis 10 Jahre, für Wohngebäude im Land Bremen (inkl. Bremerhaven)",
      "kommunaler swb-Zuschuss ggf. zusätzlich (separat beim Versorger)",
    ],
    combinableWith: BUND,
  },

  // ── Batch Juni 2026, Teil 2 ────────────────────────────────────────────────
  "potsdam-klimaschutz": {
    id: "potsdam-klimaschutz", name: "Klimaschutzförderprogramm Potsdam",
    traeger: "Landeshauptstadt Potsdam", level: "kommune", region: "Potsdam", bundesland: "Brandenburg", agsCode: "12054",
    url: "https://www.potsdam.de/de/beantragung-einer-zuwendung-aus-dem-klimaschutzfoerderprogramm-der-landeshauptstadt-potsdam",
    // Am 05.08.2026 gegen die „Potsdamer Klimaschutzförderrichtlinie" vom 26.03.2026
    // geprüft (Schlussfassung als PDF auf potsdam.de, Volltext in docs/quellen/).
    // Die abgezogenen Werte (200 €/kWp, Deckel 1.200 €, 1.000 € Speicher ab 5 kWh)
    // stehen dort zellgleich. Korrigiert wurden drei Anzeigedetails: die
    // Steckersolar-Grenze (die Richtlinie kennt 0,8 kW Wechselrichter und 2,0 kW
    // Modulleistung, nicht 0,6 kWp), das unbelegte „ab 6 kWp" und die fehlende
    // neue Pauschale für Speicher an Steckersolar-Geräten.
    stand: "August 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp für Dach-/Fassaden-PV + Pauschale für Batteriespeicher",
    rates: [
      { label: "PV (Dach oder Fassade)", value: "200 €/kWp, max. 1.200 € je Objekt" },
      { label: "Batteriespeicher (ab 5 kWh nutzbar)", value: "1.000 € pauschal je Objekt" },
      { label: "Steckersolar (Wechselrichter bis 0,8 kW, Module bis 2,0 kW)", value: "250 € pauschal" },
      { label: "Speicher für Steckersolar (ab 3 kWh)", value: "500 € pauschal" },
    ],
    conditions: [
      "Energieberatung eines zertifizierten Energieberaters vor Antragstellung und Umsetzung erforderlich",
      "Antrag vor Maßnahmenbeginn; zertifizierter Ökostrom-Tarif als Voraussetzung",
      "nur für Privatpersonen mit Wohnsitz/Immobilie in Potsdam",
      "Nicht förderfähig an Passivhäusern Plus/Premium und KfW-Effizienzhäusern 40plus",
      "Je Haushalt und Jahr wird dieselbe Maßnahme nur einmal gefördert",
    ],
    combinableWith: BUND,
    pvPerKwp: 200, pvCap: 1200,
    speicherTiers: [{ upTo: 999, amount: 1000 }], speicherMin: 5,
  },
  "dortmund-pv": {
    id: "dortmund-pv", name: "Förderung von Photovoltaik auf Ein- und Zweifamilienhäusern",
    traeger: "Stadt Dortmund", level: "kommune", region: "Dortmund", bundesland: "Nordrhein-Westfalen", agsCode: "05913",
    url: "https://www.dortmund.de/services/foerderung-von-photovoltaikanlagen-auf-ein-und-zweifamilienhaeusern.html",
    stand: "Juni 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale je Anlage (selbstgenutztes Ein-/Zweifamilienhaus, ab 5 kWp)",
    rates: [{ label: "PV-Anlage (ab 5 kWp)", value: "1.000 € pauschal" }],
    conditions: [
      "Förderung zum 05.06.2026 wegen hoher Nachfrage gestoppt — derzeit keine Neuanträge",
      "Haushaltseinkommen max. 75.000 € (ledig) bzw. 150.000 € (zusammen veranlagt)",
      "Antrag vor Auftragsvergabe; kein Speicher gefördert",
    ],
    combinableWith: BUND,
  },
  "essen-solar": {
    id: "essen-solar", name: "Förderprogramm Photovoltaik- und Solaranlagen",
    traeger: "Stadt Essen", level: "kommune", region: "Essen", bundesland: "Nordrhein-Westfalen", agsCode: "05113",
    url: "https://www.essen.de/leben/umwelt/klima/klimaschutz/solarfoederung.de.html",
    stand: "Juli 2026", status: "eingestellt", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Sockel + Zuschuss je kWp (Dach-PV); Programm derzeit ausgesetzt",
    rates: [
      { label: "Dach-PV", value: "500 € + 100 €/kWp, max. 4.000 €" },
      { label: "Gründach / Fassade", value: "+100 €/kWp" },
    ],
    conditions: [
      "Antragsannahme wegen der Haushaltslage ausgesetzt — Neuauflage nicht terminiert",
      "bereits bewilligte Anträge bleiben gültig",
      "Antrag galt vor Maßnahmenbeginn",
    ],
    combinableWith: BUND,
    pvSockel: 500, pvPerKwp: 100, pvCap: 4000,
  },

  // ── Batch Juni 2026, Teil 3 (Katalog-Vervollständigung kreisfreie Städte) ────
  "schweinfurt-pv": {
    id: "schweinfurt-pv", name: "Förderprogramm Photovoltaik & Batteriespeicher",
    traeger: "Stadt Schweinfurt", level: "kommune", region: "Schweinfurt", bundesland: "Bayern", agsCode: "09662",
    url: "https://www.schweinfurt.de/leben-freizeit/umwelt/klimaschutzkonzept/6002.Foerderprogramme.html",
    stand: "Juli 2026", status: "eingestellt", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp + je kWh Speicher (neu angeschaffte Anlage)",
    rates: [
      { label: "PV-Anlage", value: "100 €/kWp, max. 1.000 €" },
      { label: "Batteriespeicher (ab 3 kWh)", value: "300 € + 100 €/kWh, max. 1.000 €" },
    ],
    conditions: [
      "Neu angeschaffte Anlage; Kauf/Auftrag nach dem 03.05.2022",
      "Speicher nur aus eigener PV gespeist; zweistufiger Antrag",
      "Städtische Förderseite steht auf Haushaltsjahr 2024 und ist offline (404); mehrere Quellen (2025/2026) melden kein eigenes kommunales Programm mehr — gilt als eingestellt",
    ],
    combinableWith: BUND,
    pvPerKwp: 100, pvCap: 1000,
    speicherPerKwh: 100, speicherMin: 3, speicherCap: 1000,
  },
  "osnabrueck-saniert": {
    id: "osnabrueck-saniert", name: "Osnabrück saniert – Photovoltaik",
    traeger: "Stadt Osnabrück", level: "kommune", region: "Osnabrück", bundesland: "Niedersachsen", agsCode: "03404",
    url: "https://bauen.osnabrueck.de/de/sanieren-modernisieren/osnabrueck-saniert/",
    stand: "Juni 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss für den Anlagenteil über 8 kWp (oder 30 % der Kosten)",
    maxFoerderung: "max. 20.000 € je Sanierungsobjekt",
    rates: [
      { label: "PV-Anlage", value: "400 €/kWp für Leistung über 8 kWp, oder 30 % der Kosten" },
    ],
    conditions: [
      "Antrag vor Auftragsvergabe; Windhundverfahren, kein Rechtsanspruch",
      "Gefördert wird nur der kWp-Anteil oberhalb von 8 kWp",
      "Auftrag binnen 12 Wochen nach Bewilligung, Fertigstellung binnen 18 Monaten",
    ],
    combinableWith: BUND,
  },
  "memmingen-ee": {
    id: "memmingen-ee", name: "Förderprogramm Erneuerbare Energien",
    traeger: "Stadt Memmingen", level: "kommune", region: "Memmingen", bundesland: "Bayern", agsCode: "09764",
    // Die Förderseite der Stadt trägt am 03.08.2026 wörtlich: „Fördertopf für 2026
    // für das Förderprogramm Klimaschutz ist ausgeschöpft. Bitte stellen Sie keine
    // Anträge mehr." Der Jahrestopf umfasste 12.000 € für alle Maßnahmen zusammen
    // (Richtlinie Klimaschutz 2026, in Kraft seit 10.06.2026, Anträge ab 15.06.2026).
    url: "https://www.memmingen.de/hier-leben/umwelt-klimaschutz/foerderung.html",
    stand: "August 2026",
    status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss für Batteriespeicher, Balkonsolar und Wallbox — nicht die Dach-PV selbst (Topf 2026 leer)",
    rates: [
      { label: "Batteriespeicher", value: "20 %, max. 750 €" },
      { label: "Balkonsolar", value: "50 %, max. 100 €" },
    ],
    conditions: [
      "Der Fördertopf 2026 ist ausgeschöpft; die Stadt bittet ausdrücklich darum, keine Anträge mehr zu stellen",
      "Reine Dach-PV wird nicht bezuschusst — nur Speicher, Balkonsolar, Wallbox",
      "Installation durch Fachbetrieb; Antrag online (Windhundverfahren)",
    ],
    combinableWith: BUND,
  },
  "baden-baden-pvplus": {
    id: "baden-baden-pvplus", name: "PV plus",
    traeger: "Stadtwerke Baden-Baden", level: "kommune", region: "Baden-Baden", bundesland: "Baden-Württemberg", agsCode: "08211",
    url: "https://www.stadtwerke-baden-baden.de/de/bauherren-planer/foerderprogramme/photovoltaikanlage.php",
    stand: "Juni 2026", status: "aktiv", capped: false, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschalbonus für Stromkunden der Stadtwerke (Kauf/Pacht über die Stadtwerke)",
    rates: [{ label: "PV-Anlage", value: "1.000 € (über 4 Jahre als Stromgutschrift)" }],
    conditions: [
      "Nur Strom-Bestandskunden der Stadtwerke Baden-Baden",
      "PV-Anlage bei den Stadtwerken kaufen oder pachten",
      "Nicht für frei beauftragte Anlagen — daher nicht pauschal eingerechnet",
    ],
    combinableWith: BUND,
  },
  "schwerin-pv": {
    id: "schwerin-pv", name: "Förderprogramm Photovoltaik-Anlagen",
    traeger: "Stadtwerke Schwerin", level: "kommune", region: "Schwerin", bundesland: "Mecklenburg-Vorpommern", agsCode: "13004",
    url: "https://www.stadtwerke-schwerin.de/service/foerderprogramme",
    stand: "Juni 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale für PV + Speicher (nur Stromkunden der Stadtwerke)",
    maxFoerderung: "max. 600 € je Anlage",
    rates: [
      { label: "PV-Anlage (bis 20 kWp)", value: "500 € pauschal" },
      { label: "Batteriespeicher (mit PV)", value: "+100 € pauschal" },
    ],
    conditions: [
      "Nur Stromkunden der Stadtwerke Schwerin, Eigentümer der Immobilie",
      "Kontingent: max. 10 Anlagen pro Jahr — kann unterjährig erschöpft sein",
      "Kundenbindung — daher nicht pauschal eingerechnet",
    ],
    combinableWith: BUND,
  },
  "wolfsburg-pv": {
    id: "wolfsburg-pv", name: "Förderung der Solarstromerzeugung",
    traeger: "Stadt Wolfsburg", level: "kommune", region: "Wolfsburg", bundesland: "Niedersachsen", agsCode: "03103",
    url: "https://www.wolfsburg.de/newsroom/2026/04/photovoltaik-foerderprogramm",
    stand: "Juni 2026", status: "pausiert", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale nach Anlagengröße + Speicher (max. 50 % der Kosten)",
    maxFoerderung: "max. 2.000 € je Wohneinheit",
    rates: [
      { label: "PV-Anlage", value: "700 € (<6 kWp) / 1.000 € (6–12 kWp) / 1.500 € (ab 12 kWp)" },
      { label: "Batteriespeicher (ab 3 kWh)", value: "+500 €" },
    ],
    conditions: [
      "Antrag nur im jährlichen Fenster — 2026 vom 14.05. bis 14.06., aktuell geschlossen",
      "nur Bestandsgebäude; Losverfahren bei Überzeichnung",
      "max. 50 % der Kosten",
    ],
    combinableWith: BUND,
    pvTiers: [{ upTo: 6, amount: 700 }, { upTo: 12, amount: 1000 }, { upTo: 999, amount: 1500 }],
    speicherTiers: [{ upTo: 999, amount: 500 }], speicherMin: 3,
  },
  "bottrop-solaroffensive": {
    id: "bottrop-solaroffensive", name: "Solaroffensive Bottrop",
    traeger: "Stadt Bottrop", level: "kommune", region: "Bottrop", bundesland: "Nordrhein-Westfalen", agsCode: "05512",
    url: "https://www.bottrop.de/klima-umwelt-natur/solarenergie-foerderung/solaroffensive/solaroffensive.php",
    stand: "Juni 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Pauschale + je kWh Speicher (PV nur mit Batteriespeicher)",
    maxFoerderung: "max. 1.000 € je Anlage (50 % der Kosten)",
    rates: [{ label: "PV-Anlage + Speicher", value: "300 € + 100 €/kWh, max. 1.000 €" }],
    conditions: [
      "Fördertopf derzeit ausgeschöpft — keine Antragsannahme",
      "PV nur in Kombination mit Batteriespeicher; Antrag vor Maßnahmenbeginn",
    ],
    combinableWith: BUND,
  },
  "krefeld-klimafreundlich": {
    id: "krefeld-klimafreundlich", name: "Klimafreundliches Wohnen in Krefeld",
    traeger: "Stadt Krefeld", level: "kommune", region: "Krefeld", bundesland: "Nordrhein-Westfalen", agsCode: "05114",
    url: "https://www.krefeld.de/de/umwelt/foerderprogramm-klimafreundliches-wohnen-in-krefeld/",
    stand: "Juni 2026", status: "ausgeschoepft", capped: true, verified: false,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp + je kWh Speicher (allgemeiner Topf seit 12/2024 leer)",
    rates: [
      { label: "PV-Anlage", value: "100 €/kWp, max. 1.000 €" },
      { label: "Batteriespeicher", value: "200 €/kWh, max. 2.000 €" },
    ],
    conditions: [
      "Allgemeine Förderung seit 04.12.2024 ausgeschöpft — Überarbeitung für 2026 angekündigt",
      "offen nur für Balkonkraftwerke + einkommensschwache Haushalte",
    ],
    combinableWith: BUND,
    pvPerKwp: 100, pvCap: 1000, speicherPerKwh: 200, speicherCap: 2000,
  },

  // ── Landkreise (eigenes, wiederkehrendes Programm; aktuell ausgeschöpft) ──────
  "rhein-erft-energieoffensive": {
    id: "rhein-erft-energieoffensive", name: "Energieoffensive Rhein-Erft-Kreis",
    traeger: "Rhein-Erft-Kreis", level: "landkreis", region: "Rhein-Erft-Kreis", bundesland: "Nordrhein-Westfalen", agsCode: "05362",
    url: "https://www.rhein-erft-kreis.de/infrastruktur/energieoffensive.php",
    stand: "Juni 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Pauschale für PV + Speicher (Jahresprogramm)",
    maxFoerderung: "max. 1.500 € je Haushalt",
    rates: [
      { label: "PV-Anlage (ab 5 kWp)", value: "1.000 €" },
      { label: "Batteriespeicher", value: "500 €" },
    ],
    conditions: [
      "Jahresprogramm — Budget 2026 (1 Mio. €) seit 18.03.2026 erschöpft (Förderampel rot)",
      "Antrag vor Maßnahmenbeginn; Neuauflage üblicherweise zum Jahresbeginn",
    ],
    combinableWith: BUND,
  },
  "viersen-klimaschutz": {
    id: "viersen-klimaschutz", name: "Förderprogramm Klimaschutz Kreis Viersen",
    traeger: "Kreis Viersen", level: "landkreis", region: "Kreis Viersen", bundesland: "Nordrhein-Westfalen", agsCode: "05166",
    url: "https://www.kreis-viersen.de/themen/klima/klimaschutz/foerderprogramm-klimaschutz",
    stand: "Juni 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp Dach-PV ODER je kWh Speicher (nicht kombinierbar)",
    maxFoerderung: "max. 1.000 € je Position",
    rates: [
      { label: "Dach-PV", value: "200 €/kWp, max. 1.000 €" },
      { label: "Batteriespeicher", value: "200 €/kWh, max. 1.000 €" },
    ],
    conditions: [
      "Programm zum 13.04.2026 beendet (Budget erschöpft); Neuauflage offen",
      "PV und Speicher nicht kombinierbar — nur eine Position je Antrag",
    ],
    combinableWith: BUND,
  },
  "bergstrasse-speicher": {
    id: "bergstrasse-speicher", name: "PV-Stromspeicher-Förderprogramm",
    traeger: "Kreis Bergstraße", level: "landkreis", region: "Kreis Bergstraße", bundesland: "Hessen", agsCode: "06431",
    url: "https://www.kreis-bergstrasse.de/themen-projekte/nachhaltigkeit/klimaschutz/",
    stand: "Juli 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWh Batteriespeicher (PV ab 2 kWp Voraussetzung)",
    maxFoerderung: "max. 3.000 € (max. 50 % der Kosten)",
    rates: [{ label: "Batteriespeicher (ab 3 kWh)", value: "180 €/kWh, max. 3.000 €" }],
    conditions: [
      "Keine Antragsannahme: Der 2024er-Topf ist erschöpft, 2025 gab es kein Programm, und für 2026 ist keines aufgelegt (am 28.07.2026 an den Seiten des Kreises geprüft)",
      "Beträge stammen aus der 2024er-Runde und gelten nur als Anhaltspunkt für eine mögliche Neuauflage",
      "PV-Anlage ab 2 kWp Voraussetzung; max. 50 % der Kosten",
    ],
    combinableWith: BUND,
    speicherPerKwh: 180, speicherCap: 3000, speicherMin: 3,
  },
  "mayen-koblenz-speicher": {
    id: "mayen-koblenz-speicher", name: "Solarspeicher-Förderprogramm",
    traeger: "Landkreis Mayen-Koblenz", level: "landkreis", region: "Landkreis Mayen-Koblenz", bundesland: "Rheinland-Pfalz", agsCode: "07137",
    url: "https://www.kvmyk.de/themen/klima/klimaschutzmassnahmen/",
    stand: "Juli 2026", status: "eingestellt", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWh Batteriespeicher (mit PV)",
    rates: [{ label: "Batteriespeicher", value: "200 €/kWh" }],
    conditions: [
      "Bisherige Runde ausgeschöpft, Antragstellung derzeit nicht möglich",
      "Neuauflage angekündigt — vor Antrag beim Kreis prüfen",
    ],
    combinableWith: BUND,
  },
};

export function getFundingProgram(id: string): FundingProgram | undefined {
  return FUNDING_PROGRAMS[id];
}

export function allFundingPrograms(): FundingProgram[] {
  return Object.values(FUNDING_PROGRAMS);
}

/** Bundesländer that have a Land-level program (from the seed — used to also
 *  give those a Bundesland page even without cities, e.g. Berlin). */
export function landProgramBundeslaender(): { name: string; slug: string }[] {
  const out = new Map<string, string>();
  for (const p of Object.values(FUNDING_PROGRAMS)) {
    if (p.level === "land" && p.bundesland) out.set(blSlug(p.bundesland), p.bundesland);
  }
  return Array.from(out, ([slug, name]) => ({ slug, name }));
}

// Local transliterating slugifier (kept here to avoid an import cycle with
// atlas-cities). Must match atlas-cities.slugify.
function blSlug(s: string): string {
  return s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Programs applicable at a location, given its 8-digit Gemeinde-AGS.
 * Bund applies everywhere; Land/Kreis/Kommune match when the location's AGS
 * starts with the program's agsCode (2/5/8-digit). Ordered Bund → Land →
 * Kreis → Kommune (broadest first).
 */
const LEVEL_ORDER: Record<FundingLevel, number> = { bund: 0, land: 1, landkreis: 2, kommune: 3 };

/** Pure: programs from `list` applicable at `ags`, ordered broadest-first.
 *  Works on any program list — the code seed or the DB-loaded set. */
export function matchFundingForAgs(list: FundingProgram[], ags: string): FundingProgram[] {
  return list
    .filter((p) => (p.level === "bund" ? true : !!p.agsCode && ags.startsWith(p.agsCode)))
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

/** Convenience over the code seed (tests + fallback). DB-backed callers use
 *  {@link matchFundingForAgs} with the loaded program list instead. */
export function fundingForAgs(ags: string): FundingProgram[] {
  return matchFundingForAgs(allFundingPrograms(), ags);
}

/** Pick the first tier whose `upTo` the value fits into; falls back to the last. */
function tierAmount(tiers: { upTo: number; amount: number }[], value: number): number {
  for (const t of tiers) if (value <= t.upTo) return t.amount;
  return tiers[tiers.length - 1].amount;
}

export type FundingAmount = {
  /** Grant in € the program yields for this system (0 if not computable). */
  total: number;
  /** A concrete € amount could be derived (structured rule present). */
  computable: boolean;
  /** Program currently accepts applications (status === "aktiv"). */
  active: boolean;
};

/**
 * Computes the € grant a single program yields for a given PV system — the one
 * place this math lives, shared by the city pages and the interactive rechner.
 * `total` is purely the rule's output; callers decide whether to subtract it
 * (typically only when `computable && active`). `bruttoCost` is only used for
 * percent-of-cost programs.
 */
export function fundingAmount(
  f: FundingProgram | undefined,
  kwp: number,
  speicherKwh: number,
  bruttoCost: number,
): FundingAmount {
  const computable = !!(f && (f.percentOfCost || f.pvPerKwp || f.pvTiers || f.speicherPerKwh || f.speicherTiers));
  const active = f?.status === "aktiv";
  if (!f || !computable) return { total: 0, computable: false, active };

  if (f.percentOfCost) {
    return { total: Math.round(bruttoCost * f.percentOfCost), computable: true, active };
  }
  let pv = 0;
  if (f.pvPerKwp) {
    pv = (f.pvSockel ?? 0) + kwp * f.pvPerKwp;
    if (f.pvCap) pv = Math.min(pv, f.pvCap);
  } else if (f.pvTiers) {
    pv = tierAmount(f.pvTiers, kwp);
  }
  let sp = 0;
  if (f.speicherPerKwh && speicherKwh >= (f.speicherMin ?? 0) && speicherKwh > 0) {
    sp = speicherKwh * f.speicherPerKwh;
    if (f.speicherCap) sp = Math.min(sp, f.speicherCap);
  } else if (f.speicherTiers && speicherKwh >= (f.speicherMin ?? 0)) {
    sp = tierAmount(f.speicherTiers, speicherKwh);
  }
  return { total: Math.round(pv + sp), computable: true, active };
}

/**
 * Total stackable grant across a set of programs (e.g. the result of
 * {@link fundingForAgs}) for one system. Only active & computable programs
 * contribute; the sum is capped at the gross cost. Returns the contributing
 * programs so the UI can name them.
 */
export function stackFunding(
  programs: FundingProgram[],
  kwp: number,
  speicherKwh: number,
  bruttoCost: number,
): { total: number; applied: { program: FundingProgram; amount: number }[] } {
  const applied: { program: FundingProgram; amount: number }[] = [];
  let total = 0;
  for (const p of programs) {
    const a = fundingAmount(p, kwp, speicherKwh, bruttoCost);
    if (a.computable && a.active && a.total > 0) {
      applied.push({ program: p, amount: a.total });
      total += a.total;
    }
  }
  return { total: Math.min(total, bruttoCost), applied };
}
