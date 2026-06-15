// City registry for the regional landing pages (/photovoltaik/[stadt]).
// Each city maps a URL slug to its MaStR region id (AGS), a regional PV yield,
// and — where it exists — the municipal funding program. Funding is curated by
// hand (no machine-readable source exists) and carries an explicit `stand`
// (as-of) plus source URL; programs change and budgets run dry mid-year.

export type Eligibility = "privat" | "gewerblich";

export interface FundingProgram {
  name: string;
  traeger: string;
  url: string;
  /** Human-readable as-of, e.g. "Juni 2026". Shown to the user. */
  stand: string;
  /** Budget is capped / first-come-first-served. */
  capped: boolean;
  eligibility: Eligibility[];
  /** Which costs the funding applies to (varies per program), e.g.
   *  "50 % der anerkannten Kosten (Material + Installation)". */
  coveredCosts: string;
  /** Optional overall cap, e.g. "max. 50.000 €". */
  maxFoerderung?: string;
  /** Headline rates shown as a list, e.g. {label:"PV-Anlage (Dach)", value:"50 %, max. 350 €/kWp"}. */
  rates: { label: string; value: string }[];
  conditions: string[];
  // Optional structured rates so the example calculations can show a concrete
  // funding amount. Left undefined for percentage-only programs.
  pvPerKwp?: number;
  speicherPerKwh?: number;
  /** Percentage of total cost, e.g. 0.2 for Frankfurt's 20 %. */
  percentOfCost?: number;
}

export interface AtlasCity {
  slug: string;
  name: string;
  /** MaStR region id = 5-digit Kreis/Stadt AGS. */
  ags: string;
  bundesland: string;
  /** Regional PV yield kWh per kWp (PVGIS ballpark, manual). */
  yieldKwhKwp: number;
  funding?: FundingProgram;
}

export const ATLAS_CITIES: AtlasCity[] = [
  {
    slug: "stuttgart",
    name: "Stuttgart",
    ags: "08111",
    bundesland: "Baden-Württemberg",
    yieldKwhKwp: 1090,
    funding: {
      name: "Stuttgarter Solaroffensive",
      traeger: "Landeshauptstadt Stuttgart",
      url: "https://www.stuttgart.de/solaroffensive",
      stand: "Juni 2026",
      capped: true,
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
      pvPerKwp: 350,
      speicherPerKwh: 100,
    },
  },
  {
    slug: "frankfurt",
    name: "Frankfurt am Main",
    ags: "06412",
    bundesland: "Hessen",
    yieldKwhKwp: 1050,
    funding: {
      name: "Frankfurter Klimabonus",
      traeger: "Stadt Frankfurt am Main",
      url: "https://frankfurt.de/themen/klima-und-energie/stadtklima/klimabonus",
      stand: "Juni 2026",
      capped: true,
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
      percentOfCost: 0.2,
    },
  },
];

export function cityBySlug(slug: string): AtlasCity | undefined {
  return ATLAS_CITIES.find((c) => c.slug === slug);
}
