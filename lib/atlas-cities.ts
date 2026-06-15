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
  /** Headline rates shown as a list, e.g. {label:"PV-Anlage (Dach)", value:"50 %, max. 300 €/kWp"}. */
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
      url: "https://www.stuttgart.de/leben/umwelt/energie/foerderprogramm-energie.php",
      stand: "Juni 2026",
      capped: true,
      eligibility: ["privat", "gewerblich"],
      rates: [
        { label: "PV-Anlage (Dach)", value: "50 %, max. 300 €/kWp" },
        { label: "PV an der Fassade", value: "max. 450 €/kWp" },
        { label: "Batteriespeicher", value: "100 €/kWh" },
      ],
      conditions: [
        "Antrag vor Montage stellen",
        "Nur Installations-, keine Materialkosten",
        "Gebäude im Stadtgebiet Stuttgart",
      ],
      pvPerKwp: 300,
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
      url: "https://frankfurt.de/themen/umwelt-und-gruen/energie/foerderprogramme",
      stand: "Juni 2026",
      capped: true,
      eligibility: ["privat"],
      rates: [
        { label: "PV-Anlage + Speicher", value: "20 % der Installationskosten" },
      ],
      conditions: [
        "Mindestens 4 kWp Anlagenleistung",
        "Antrag vor Auftragsvergabe",
        "Gebäude im Stadtgebiet Frankfurt",
      ],
      percentOfCost: 0.2,
    },
  },
];

export function cityBySlug(slug: string): AtlasCity | undefined {
  return ATLAS_CITIES.find((c) => c.slug === slug);
}
