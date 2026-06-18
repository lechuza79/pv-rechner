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
    url: "https://www.stuttgart.de/solaroffensive", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: false,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "nur Begleitmaßnahmen (Elektrik, Gerüst, Statik…) + Speicher — NICHT die Module",
    rates: [
      { label: "Begleitmaßnahmen Dach-PV", value: "max. 300 €/kWp (50 % der Kosten)" },
      { label: "Begleitmaßnahmen Fassade/Gründach", value: "max. 400 €/kWp" },
      { label: "Batteriespeicher", value: "gefördert (Satz 2026 neu justiert)" },
      { label: "Balkonkraftwerk", value: "Förderung 2026 ggf. eingestellt" },
    ],
    conditions: [
      "PV-Zuschuss nur für Begleitmaßnahmen (Elektrik, Zählerplatz, Gerüst, Statik) — Module/Wechselrichter selbst nicht förderfähig",
      "Antrag zwingend vor Beauftragung; Ausführung durch Fachfirma",
      "Förderregeln zum Mai 2026 überarbeitet — Speichersatz vor Antrag offiziell prüfen",
      "Mit BAFA/KfW/L-Bank kombinierbar (deren Mittel werden abgezogen)",
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
    url: "https://www.greendeal-regensburg.de", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp + je kWh Speicher",
    rates: [
      { label: "PV-Anlage", value: "100 €/kWp, max. 1.500 €" },
      { label: "Gründach / Fassade / Denkmal", value: "+200 € pauschal" },
      { label: "Batteriespeicher (ab 4 kWh)", value: "150 €/kWh, max. 1.500 €" },
    ],
    conditions: [
      "Antrag muss vor Kauf/Baubeginn bewilligt sein",
      "Speicher nur mit PV (ab 1,25 kWp), min. 4 kWh nutzbar",
    ],
    combinableWith: BUND,
    pvPerKwp: 100, pvCap: 1500,
    speicherPerKwh: 150, speicherCap: 1500, speicherMin: 4,
  },
  "wuerzburg-klimastadt": {
    id: "wuerzburg-klimastadt", name: "Klimastadt Würzburg",
    traeger: "Stadt Würzburg", level: "kommune", region: "Würzburg", bundesland: "Bayern", agsCode: "09663",
    url: "https://www.wuerzburg.de/themen/umwelt-klima/foerderungen-und-beratungen/photovoltaik",
    stand: "Juni 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp für Dach-PV (Vollbelegung) + Bausteine (Fassade, Gründach, Mieterstrom, Denkmal)",
    rates: [
      { label: "Dach-PV (Vollbelegung)", value: "150 €/kWp, max. 1.500 €" },
      { label: "Fassaden-PV / Gründach", value: "150 €/kWp, max. 1.500 €" },
      { label: "Mieterstrom", value: "2.000 € + 150 €/kWp, max. 4.000 €" },
      { label: "Denkmalschutz-PV", value: "200 €/kWp, max. 2.000 €" },
    ],
    conditions: [
      "Dach-PV ab Mindestgröße 0,04 kWp je m² Wohnfläche; Vollbelegungs-Bonus +50 €/kWp (max. +500 €)",
      "Antrag + Bescheid vor Maßnahmenbeginn; kein Speicher gefördert",
      "Bund/Land kumulierbar, max. 90 % der Kosten",
    ],
    combinableWith: BUND,
    pvPerKwp: 150, pvCap: 1500,
  },
  "frankfurt-klimabonus": {
    id: "frankfurt-klimabonus", name: "Frankfurter Klimabonus",
    traeger: "Stadt Frankfurt am Main", level: "kommune", region: "Frankfurt am Main", bundesland: "Hessen", agsCode: "06412",
    url: "https://frankfurt.de/themen/klima-und-energie/stadtklima/klimabonus",
    stand: "Juni 2026", status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "20 % von Material- und Arbeitskosten",
    maxFoerderung: "max. 50.000 € je Maßnahmenbereich",
    rates: [
      { label: "PV-Anlage", value: "20 % (30 % mit Dachbegrünung)" },
      { label: "Batteriespeicher + Wallbox", value: "20 %" },
      { label: "Balkonkraftwerk", value: "50 % (75 % mit Frankfurt-Pass)" },
    ],
    conditions: [
      "Erst nach Zuwendungsbescheid mit der Maßnahme beginnen",
      "Online-Antrag mit Registrierung",
      "Grundstück im Stadtgebiet Frankfurt",
    ],
    combinableWith: BUND,
    percentOfCost: 0.2,
  },
  "darmstadt-pv": {
    id: "darmstadt-pv", name: "Förderprogramm Photovoltaik",
    traeger: "Wissenschaftsstadt Darmstadt", level: "kommune", region: "Darmstadt", bundesland: "Hessen", agsCode: "06411",
    url: "https://www.darmstadt.de", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp (Anschaffung + Installation)",
    rates: [
      { label: "PV-Anlage (Dach/Fassade)", value: "200 €/kWp, max. 6.000 €" },
      { label: "Balkonkraftwerk", value: "200 – 400 € (max. 50 %)" },
    ],
    conditions: ["Freiwillige Leistung, kein Rechtsanspruch"],
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
    url: "https://www.stadt-koeln.de", stand: "Juni 2026",
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
    coveredCosts: "Zuschuss je kWp bei voller Dachbelegung (Baustein \u201eDachVollToll\u201c)",
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
    pvPerKwp: 100, pvCap: 2000,
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
  "heidelberg-rev": {
    id: "heidelberg-rev", name: "Rationelle Energieverwendung – Photovoltaik",
    traeger: "Stadt Heidelberg", level: "kommune", region: "Heidelberg", bundesland: "Baden-Württemberg", agsCode: "08221",
    url: "https://www.heidelberg.de/hd/HD/Leben/foerderbaustein+_photovoltaikanlagen_.html", stand: "Juni 2026",
    status: "unsicher", capped: true, verified: false,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp (Dach + Fassade); kein Speicher",
    rates: [
      { label: "Dach-PV", value: "100 €/kWp" },
      { label: "Fassade / aufgeständert auf Gründach", value: "200 €/kWp" },
      { label: "Mieterstrom", value: "50 %, max. 2.500 €" },
    ],
    conditions: [
      "Stand unsicher: zwei städtische Seiten widersprechen sich (pausiert vs. aktiv) — vor Antrag direkt prüfen",
      "kein Batteriespeicher und keine Wallbox gefördert",
      "Antrag vor Kauf/Installation",
    ],
    combinableWith: BUND,
  },
  "mannheim-solarbonus": {
    id: "mannheim-solarbonus", name: "SolarBonus Mannheim",
    traeger: "Stadt Mannheim / Klimaschutzagentur", level: "kommune", region: "Mannheim", bundesland: "Baden-Württemberg", agsCode: "08222",
    url: "https://www.klima-ma.de/eigentuemer-mieter/foerderprogramme.html", stand: "Juni 2026",
    status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp (Wohngebäude im Bestand)",
    rates: [
      { label: "Aufdach", value: "160 €/kWp, max. 2.400 €" },
      { label: "auf Dachbegrünung", value: "280 €/kWp, max. 4.200 €" },
      { label: "Fassade / Denkmal", value: "250–300 €/kWp" },
    ],
    conditions: [
      "Mittel seit Mitte 2025 erschöpft — neue Anträge nur auf Warteliste",
      "Antrag vor Beauftragung; Ausführung durch Fachbetrieb",
      "nur Wohngebäude mit Bauantrag vor dem 01.05.2022",
    ],
    combinableWith: BUND,
    pvPerKwp: 160, pvCap: 2400,
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
    stand: "Juni 2026", status: "aktiv", capped: true, verified: false,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp für Dach-PV + Pauschale für Batteriespeicher",
    rates: [
      { label: "Dach-PV", value: "200 €/kWp, max. 1.200 € (ab 6 kWp)" },
      { label: "Batteriespeicher (ab 5 kWh)", value: "1.000 € pauschal" },
      { label: "Steckersolar (bis 0,6 kWp)", value: "250 € pauschal" },
    ],
    conditions: [
      "Energieberatung (z. B. Verbraucherzentrale) vor der Antragstellung erforderlich",
      "Antrag vor Maßnahmenbeginn; zertifizierter Ökostrom-Tarif als Voraussetzung",
      "nur für Privatpersonen mit Wohnsitz/Immobilie in Potsdam",
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
    stand: "Juni 2026", status: "pausiert", capped: true, verified: true,
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
  if (f.speicherPerKwh && speicherKwh > 0) {
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
