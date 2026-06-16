// Standalone funding-program dataset — the single source of truth for PV /
// storage subsidies across all levels (Bund → Land → Landkreis → Kommune).
// Region pages reference programs by id; an overview page can render the whole
// set. Curated by hand (no machine-readable source exists), each entry carries
// a `stand` (as-of), `source`, `status` and a `verified` flag. Programs change
// and budgets run dry mid-year — treat `status` as a point-in-time snapshot.

export type Eligibility = "privat" | "gewerblich";
export type FundingLevel = "bund" | "land" | "landkreis" | "kommune";
export type FundingStatus = "aktiv" | "ausgeschoepft" | "eingestellt" | "unsicher";

export interface FundingProgram {
  id: string;
  name: string;
  traeger: string;
  level: FundingLevel;
  /** Display region, e.g. "Stuttgart", "Berlin", "bundesweit". */
  region: string;
  /** Bundesland for grouping on the overview page; omitted for federal programs. */
  bundesland?: string;
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
  speicherPerKwh?: number;
  /** Share of total cost, e.g. 0.2 for 20 %. */
  percentOfCost?: number;
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
    level: "land", region: "Berlin", bundesland: "Berlin",
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
    traeger: "Landeshauptstadt Stuttgart", level: "kommune", region: "Stuttgart", bundesland: "Baden-Württemberg",
    url: "https://www.stuttgart.de/solaroffensive", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "50 % der anerkannten Kosten (Material + Installation)",
    rates: [
      { label: "PV-Anlage (Dach)", value: "50 %, max. 350 €/kWp" },
      { label: "PV an Fassade / Gründach", value: "max. 450 €/kWp" },
      { label: "Volleinspeisung (≥ 10 Jahre)", value: "100 %, max. 600 €/kWp" },
      { label: "Batteriespeicher", value: "100 €/kWh" },
      { label: "Balkonkraftwerk", value: "200 € pauschal" },
    ],
    conditions: [
      "Antrag vor Kauf bzw. Installation — keine rückwirkende Förderung",
      "Mit Bundesförderung kombinierbar",
      "Gebäude im Stadtgebiet Stuttgart",
    ],
    combinableWith: BUND,
    pvPerKwp: 350, speicherPerKwh: 100,
  },
  "karlsruhe-klimabonus": {
    id: "karlsruhe-klimabonus", name: "Karlsruher Klima-Bonus",
    traeger: "Stadt Karlsruhe", level: "kommune", region: "Karlsruhe", bundesland: "Baden-Württemberg",
    url: "https://www.karlsruhe.de", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: false,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp",
    rates: [{ label: "PV-Anlage", value: "250 €/kWp, max. 2.500 €" }],
    conditions: ["Antrag vor Arbeitsbeginn", "Fachbetrieb-Pflicht"],
    combinableWith: BUND,
    pvPerKwp: 250,
  },
  "regensburg-effizient": {
    id: "regensburg-effizient", name: "Regensburg effizient",
    traeger: "Stadt Regensburg", level: "kommune", region: "Regensburg", bundesland: "Bayern",
    url: "https://www.regensburg.de", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: false,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp",
    rates: [{ label: "PV-Anlage", value: "100 €/kWp, max. 1.500 €" }],
    conditions: ["Antrag vor Montage"],
    combinableWith: BUND,
    pvPerKwp: 100,
  },
  "wuerzburg-klimastadt": {
    id: "wuerzburg-klimastadt", name: "Klimastadt Würzburg",
    traeger: "Stadt Würzburg", level: "kommune", region: "Würzburg", bundesland: "Bayern",
    url: "https://www.wuerzburg.de", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: false,
    eligibility: ["privat"],
    coveredCosts: "Zuschuss je kWp",
    rates: [
      { label: "PV-Anlage", value: "150 €/kWp, max. 1.500 €" },
      { label: "Vollbelegungs-Bonus", value: "+50 €/kWp, max. 500 €" },
      { label: "Denkmal", value: "200 €/kWp" },
    ],
    conditions: [
      "Antrag vor Installation",
      "Mindestgröße 0,04 kWp je m² Wohnfläche",
    ],
    combinableWith: BUND,
    pvPerKwp: 150,
  },
  "frankfurt-klimabonus": {
    id: "frankfurt-klimabonus", name: "Frankfurter Klimabonus",
    traeger: "Stadt Frankfurt am Main", level: "kommune", region: "Frankfurt am Main", bundesland: "Hessen",
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
    traeger: "Wissenschaftsstadt Darmstadt", level: "kommune", region: "Darmstadt", bundesland: "Hessen",
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
    pvPerKwp: 200,
  },
  "badhomburg-energiespar": {
    id: "badhomburg-energiespar", name: "Energiesparförderung",
    traeger: "Stadt Bad Homburg", level: "kommune", region: "Bad Homburg", bundesland: "Hessen",
    url: "https://www.bad-homburg.de", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: false,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp + je kWh Speicher",
    rates: [
      { label: "PV-Anlage", value: "300 €/kWp, max. 6.000 €" },
      { label: "Batteriespeicher", value: "300 €/kWh, max. 3.000 €" },
    ],
    conditions: ["Mieter ausdrücklich antragsberechtigt"],
    combinableWith: BUND,
    pvPerKwp: 300, speicherPerKwh: 300,
  },
  "koeln-pv": {
    id: "koeln-pv", name: "Klimafreundliches Wohnen & Arbeiten",
    traeger: "Stadt Köln", level: "kommune", region: "Köln", bundesland: "Nordrhein-Westfalen",
    url: "https://www.stadt-koeln.de", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss für PV + Speicher (gedeckelt)",
    rates: [
      { label: "PV-Anlage", value: "bis 2.500 €" },
      { label: "Batteriespeicher", value: "bis 1.300 €" },
    ],
    conditions: ["Solange Mittel reichen (Budget 8 Mio. € 2026)"],
    combinableWith: BUND,
  },
  "duesseldorf-klimafreundlich": {
    id: "duesseldorf-klimafreundlich", name: "Klimafreundliches Wohnen und Arbeiten",
    traeger: "Stadt Düsseldorf", level: "kommune", region: "Düsseldorf", bundesland: "Nordrhein-Westfalen",
    url: "https://www.duesseldorf.de", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Sockel + je kWp + je kWh Speicher",
    rates: [
      { label: "PV-Anlage", value: "1.000 € + 200 €/kWp, max. 10.000 €" },
      { label: "Batteriespeicher", value: "250 €/kWh, max. 10.000 €" },
    ],
    conditions: ["Antrag vor Beginn"],
    combinableWith: BUND,
    pvPerKwp: 200, speicherPerKwh: 250,
  },
  "hannover-proklima": {
    id: "hannover-proklima", name: "proKlima (enercity-Fonds)",
    traeger: "Region Hannover", level: "landkreis", region: "Region Hannover", bundesland: "Niedersachsen",
    url: "https://www.proklima-hannover.de", stand: "Juni 2026",
    status: "aktiv", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp",
    rates: [
      { label: "PV-Anlage (Dach)", value: "100 €/kWp, max. 1.000 €" },
      { label: "PV auf Gründach", value: "200 €/kWp, max. 6.000 €" },
    ],
    conditions: ["Nur im Fördergebiet (Hannover + 5 Umlandkommunen)", "Mit BEG kombinierbar"],
    combinableWith: BUND,
    pvPerKwp: 100,
  },

  // ── Kommune – aktuell ausgeschöpft / eingestellt (zur Lagebeurteilung) ───────
  "bonn-solares": {
    id: "bonn-solares", name: "Solares Bonn", traeger: "Stadt Bonn",
    level: "kommune", region: "Bonn", bundesland: "Nordrhein-Westfalen", url: "https://www.bonn.de",
    stand: "Juni 2026", status: "ausgeschoepft", capped: true, verified: true,
    eligibility: ["privat", "gewerblich"],
    coveredCosts: "Zuschuss je kWp (Budget 2026 erschöpft)",
    rates: [{ label: "PV-Anlage", value: "100 – 300 €/kWp" }],
    conditions: ["Antragstellung derzeit gesperrt"],
    combinableWith: BUND,
  },
  "goettingen-klimafonds": {
    id: "goettingen-klimafonds", name: "KlimaFonds Göttingen",
    traeger: "Stadt Göttingen", level: "kommune", region: "Göttingen", bundesland: "Niedersachsen",
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
};

export function getFundingProgram(id: string): FundingProgram | undefined {
  return FUNDING_PROGRAMS[id];
}

export function allFundingPrograms(): FundingProgram[] {
  return Object.values(FUNDING_PROGRAMS);
}
