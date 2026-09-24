/**
 * The precomputed data package behind one municipality page (new design).
 *
 * Built offline by scripts/gemeinde-paket.ts from ONE register edition, for
 * every town, with the same calculation functions as the reviewed prototype.
 * The page renders it; it never recalculates it.
 *
 * Every element that could not be built for a town is listed in `missing`
 * with a reason. The page must hide such an element and may say why — it must
 * never show a borrowed value (another town's, an older edition's) or a zero.
 *
 * Editions are separate on purpose: `registerStand` (installations),
 * `rangStand` (ranking lists) and the weather periods each carry their own
 * date; the page names them where the numbers stand.
 */
import type { SolarMonth } from "./story-monthly-solar";
import type { EnergyYear } from "./story-energy-year";
import type { MonthlyRank } from "./story-ranking-month";

/** Bump when the shape changes; the page refuses packages of another version. */
export const GEMEINDE_PAKET_VERSION = 2;

export type PaketLuecke = {
  bereich: "diagramme" | "geschichten" | "register" | "kreisvergleich" | "verlauf" | "zeitraeume" | "monat" | "wert" | "jahr" | "ranglisten";
  /** Month (YYYY-MM) or year for period-bound gaps. */
  zeitraum?: string;
  grund: string;
};

type OwnerSums = { count: number; kwp: number; speicher: number };
export type DistrictPeer = {
  region_id: string;
  name: string;
  slug: string;
  population: number | null;
  population_as_of: string | null;
  sums: Record<"alle" | "privat" | "gewerbe", OwnerSums> | Record<string, OwnerSums>;
  batteryCount: number;
};

export type MonitorObservation = {
  end: string;
  solarCounts: Record<string, number>;
  solarMix: { label: string; value: number }[];
  solarCount: number;
  solarKwp: number;
  solarAdditions: number;
  batteryCount: number;
  batteryKwh: number;
};

export type MonthValue = {
  euro: number;
  feedInEuro: number;
  totalMwh: number;
  unitCount: number;
  approximateTariffCount: number;
  unknownModeCount: number;
  commercialSelfUseUnknownCount: number;
};

export type PaketRang = MonthlyRank & {
  distinction: string | null;
  format: string;
  asOf: string;
  comparisonMonth: string | null;
  comparisonYear: string | null;
  changePeriod: string | null;
};

export type GemeindePaket = {
  version: number;
  ags: string;
  name: string;
  kreis: { ags: string; name: string };
  registerStand: string;
  rangStand: string;
  /** Date of the population figures (per-resident values, size classes). */
  einwohnerStand: string | null;
  gebautAm: string;
  /** Story concepts, selected exactly as the reviewed prototype selects them. */
  stories: unknown[];
  /** Municipal chart catalogue (charts.json of the prototype). */
  charts: { regionId: string; name: string; sourceDate: string; charts: { template: string; story: any }[]; availability: unknown[] } | null;
  register: {
    own: DistrictPeer;
    coverage: { topic: string; first: string; last: string; count: number }[];
    storage: { label: string; value: number; unit: string }[];
    series: unknown[];
    chartMix: unknown;
    /** Set when the Atlas sums and the discovery report disagree (different editions). */
    abweichung: string | null;
  } | null;
  /** `peers`: towns of the same size class in the district, at least three — else empty and listed in `missing`. */
  district: { populationMin: number | null; populationMaxExclusive: number | null; peers: DistrictPeer[]; districtPeers: DistrictPeer[] };
  monitorHistory: { method: string; observations: MonitorObservation[] } | null;
  monitorPeriods: {
    valuationAssumptionDate: string | null;
    privateSelfConsumption: number | null;
    weatherPoint: { latitude: number; longitude: number };
    monthly: { month: string; solar: SolarMonth; value: MonthValue | null }[];
    annual: EnergyYear[];
  } | null;
  rankings: PaketRang[];
  missing: PaketLuecke[];
};
