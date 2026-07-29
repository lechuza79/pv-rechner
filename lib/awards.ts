// Kommunen-Solar-Award: Sieger je Kategorie × Vergleichsgruppe × geografischem
// Bezug. Reine Rechenfunktionen — kein DB-/Next-Import, damit Backend-Ansicht,
// Atlas-Seite und (später) das Badge dieselbe Rangliste benutzen. Es darf keine
// zweite geben.
//
// Das Modell ist an echten Daten verifiziert (2026-07-25):
//  - Pro Kopf NUR bei Haushalts-Kategorien (privates Dach, Balkon, private
//    Batterie). Bei Großanlagen (Freifläche, Wind, Biomasse, Wasser) ist „pro
//    Kopf" nachweislich absurd (Büttel: 24 Ew, 100 MWp Park → 4,2 Mio Wp/Kopf) —
//    deshalb gibt es dort schlicht keine Pro-Kopf-Kategorie, nur absolut.
//  - Rollen-Achse (kreisfrei/Hauptstadt) fängt die Städte, Größen-Drittel die
//    Dörfer. Größengrenzen kommen aus der Verteilung (Terzile), nicht gesetzt.
//
// Ausnahme vom „kein Import": die kanonischen Einheiten-Formatter (rein, ohne
// DB/Next) — Einheiten werden nie handgeschrieben (Zahlen-Korrektheit-BLOCKER).

import { fmtMixLeistung, fmtPvLeistung, fmtSpeicherKwh, fmtWattProKopf } from "./atlas-format";

export type AwardScopeLevel = "de" | "bundesland" | "landkreis";
export type Traeger = "buerger" | "gewerbe";
export type Messart = "proKopf" | "absolut";
export type SizeBand = "klein" | "mittel" | "gross";
export type Role = "gemeinde" | "stadt" | "grosse-kreisstadt" | "kreisfrei" | "hauptstadt";

/** Wie die Zahl angezeigt wird — die Einheit schreibt die Anzeige über den
 *  kanonischen Formatter, nie das Modul (lib/atlas-format.ts). */
export type MetricFormat =
  | "wattProKopf"
  | "pvLeistung"
  | "mixLeistung"
  | "count"
  | "countPer1000"
  | "whProKopf"
  | "speicherKwh";

/** Solar-/Speicher-/EE-Kennzahlen einer bewohnten Gemeinde, je Träger getrennt.
 *  Kommt aus dem Rollup `mastr_gemeinde_award` (ein DB-seitiger Lauf), Name +
 *  Bezeichnung aus `mastr_regions`. */
export type GemeindeStats = {
  regionId: string; // 8-stelliger AGS
  name: string;
  bezeichnung: string; // amtliche Bezeichnung → Rolle
  population: number;
  privatDachKwp: number;
  gewerbeDachKwp: number;
  freiflaecheKwp: number;
  balkonCount: number;
  balkonKwp: number;
  batteriePrivatKwh: number;
  batterieGewerbeKwh: number;
  windKwp: number;
  biomasseKwp: number;
  wasserKwp: number;
  solarZubauKwp: number;
};

// ─── Kategorien ────────────────────────────────────────────────────────────────

export type AwardCategory = {
  key: string;
  label: string;
  merit: string;
  traeger: Traeger;
  messart: Messart;
  format: MetricFormat;
  metric: (g: GemeindeStats) => number | null;
};

const perCapita = (val: number, pop: number): number | null => (pop > 0 ? (val * 1000) / pop : null);
const pos = (n: number): number | null => (n > 0 ? n : null);

export const AWARD_CATEGORIES: AwardCategory[] = [
  // Bürger, pro Kopf — verifiziert aussagekräftig (skaliert mit Haushalten).
  {
    key: "dach-privat-pk",
    label: "Solardach-Spitzenreiter",
    merit: "Meiste private Dach-Solarleistung je Einwohner.",
    traeger: "buerger",
    messart: "proKopf",
    format: "wattProKopf",
    metric: (g) => perCapita(g.privatDachKwp, g.population),
  },
  {
    key: "balkon-pk",
    label: "Balkon-Pionier",
    merit: "Meiste Balkonkraftwerke je 1.000 Einwohner — die sauberste Bürgerzahl.",
    traeger: "buerger",
    messart: "proKopf",
    format: "countPer1000",
    metric: (g) => perCapita(g.balkonCount, g.population),
  },
  {
    key: "batterie-privat-pk",
    label: "Speicher-Vorreiter",
    merit: "Meiste private Batteriekapazität je Einwohner.",
    traeger: "buerger",
    messart: "proKopf",
    format: "whProKopf",
    metric: (g) => perCapita(g.batteriePrivatKwh, g.population),
  },
  // Bürger, absolut — belohnt die großen Städte-Bürgerschaften.
  {
    key: "balkon-abs",
    label: "Balkon-Hauptstadt",
    merit: "Meiste Balkonkraftwerke insgesamt.",
    traeger: "buerger",
    messart: "absolut",
    format: "count",
    metric: (g) => pos(g.balkonCount),
  },
  {
    key: "dach-privat-abs",
    label: "Solardach-Hauptstadt",
    merit: "Meiste private Dach-Solarleistung insgesamt — Bürger-Solar auf den Dächern, kein Gewerbe/Park.",
    traeger: "buerger",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.privatDachKwp),
  },
  {
    key: "batterie-privat-abs",
    label: "Speicher-Hauptstadt",
    merit: "Meiste private Batteriekapazität insgesamt.",
    traeger: "buerger",
    messart: "absolut",
    format: "speicherKwh",
    metric: (g) => pos(g.batteriePrivatKwh),
  },
  // Gewerbe / Standort, absolut — pro Kopf hier verifiziert absurd, daher nur so.
  {
    key: "solar-standort",
    label: "Solar-Standort",
    merit: "Höchste gewerbliche + Freiflächen-Solarleistung. Misst den Standort, nicht die Bürger.",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.gewerbeDachKwp + g.freiflaecheKwp),
  },
  {
    key: "freiflaeche-standort",
    label: "Freiflächen-Standort",
    merit: "Höchste Freiflächen-Solarleistung (Solarparks).",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.freiflaecheKwp),
  },
  {
    key: "gewerbespeicher-abs",
    label: "Gewerbespeicher-Standort",
    merit: "Höchste gewerbliche Batteriekapazität.",
    traeger: "gewerbe",
    messart: "absolut",
    format: "speicherKwh",
    metric: (g) => pos(g.batterieGewerbeKwh),
  },
  // Wind, Biomasse, Wasser: kW/MW/GW ohne „p". „Peak" ist die Nennleistung von
  // Solarmodulen unter Testbedingungen — ein Windrad oder ein Biomasse-Block hat
  // keine. Diese drei standen bis 07/2026 auf der Solar-Einheit und zeigten damit
  // „MWp" über einer Windleistung; gefunden beim Aufbau der Versorger-Aggregate.
  {
    key: "wind-standort",
    label: "Wind-Standort",
    merit: "Höchste installierte Windleistung.",
    traeger: "gewerbe",
    messart: "absolut",
    format: "mixLeistung",
    metric: (g) => pos(g.windKwp),
  },
  {
    key: "biomasse-standort",
    label: "Biomasse-Standort",
    merit: "Höchste installierte Biomasseleistung.",
    traeger: "gewerbe",
    messart: "absolut",
    format: "mixLeistung",
    metric: (g) => pos(g.biomasseKwp),
  },
  {
    key: "wasser-standort",
    label: "Wasserkraft-Standort",
    merit: "Höchste installierte Wasserkraftleistung.",
    traeger: "gewerbe",
    messart: "absolut",
    format: "mixLeistung",
    metric: (g) => pos(g.wasserKwp),
  },
  // Dynamik.
  {
    key: "zubau",
    label: "Zubau-Champion",
    merit: "Größter Solar-Zubau im letzten vollständigen Jahr.",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.solarZubauKwp),
  },
];

export const AWARD_CATEGORY_BY_KEY: Record<string, AwardCategory> = Object.fromEntries(
  AWARD_CATEGORIES.map((c) => [c.key, c]),
);

/** Bekannte Solar-Freiflächen-Doppelzählungen (MaStR, gemessen von der Dedup-
 *  Session 2026-07-25): dieselbe Anlage steht in zwei Nachbargemeinden desselben
 *  Kreises mit IDENTISCHEM krummem kWp — also Doppelzählung, kein echter Split.
 *  Behandlung: HALBIEREN. Jede der beiden behält kwp/2 (Summe über beide = eine
 *  Nennleistung), weil der physische Host im Register nicht bestimmbar ist. Wert
 *  hier = abzuziehende kWp (halber Park). Betrifft nur `freiflaecheKwp` →
 *  Kategorien Solar-Standort + Freiflächen-Standort (keine Aufhänger).
 *  Feste geprüfte Liste; regelbasierte Auto-Erkennung (identischer, NICHT runder
 *  kWp in >1 Gemeinde desselben Kreises) gehört später in den MaStR-Wächter. */
export const FREIFLAECHE_DEDUP_ABZUG: Record<string, number> = {
  "09471154": 19999.3 / 2, "09471172": 19999.3 / 2, // Lisberg / Pommersfelden
  "09478120": 9993.0 / 2, "09478165": 9993.0 / 2, // Ebensfeld / Bad Staffelstein
  "01059051": 9974.6 / 2, "01059158": 9974.6 / 2, // Klein Rheide / Schafflund
  "09778157": 4693.5 / 2, "09778219": 4693.5 / 2, // Kirchhaslach / Woringen
  "07235074": 3612.0 / 2, "07235094": 3612.0 / 2, // Leiwen / Newel
  "09278118": 1579.5 / 2, "09278144": 1579.5 / 2, // Bogen / Laberweinting
  "13071092": 1499.5 / 2, "13071101": 1499.5 / 2, // Malchin / Möllenhagen
  "05358004": 1440.0 / 2, "05358036": 1440.0 / 2, // Aldenhoven / Linnich
  "09277124": 1296.8 / 2, "09277151": 1296.8 / 2, // Hebertsfelden / Unterdietfurt
  "09275128": 1249.7 / 2, "09275135": 1249.7 / 2, // Hutthurm / Neukirchen vorm Wald
};

/** Freiflächen-Leistung einer Gemeinde nach Abzug bekannter Doppelzählungen. */
export function dedupFreiflaeche(regionId: string, freiflaecheKwp: number): number {
  const abzug = FREIFLAECHE_DEDUP_ABZUG[regionId] ?? 0;
  return Math.max(0, freiflaecheKwp - abzug);
}

/** Belegwert einer Kategorie anzeigefertig — Einheit aus dem kanonischen Atlas-
 *  Formatter (nie handgeschrieben, außer den dimensionslosen Zähl-/Pro-Kopf-Fällen). */
export function formatAwardValue(value: number, format: MetricFormat): string {
  switch (format) {
    case "wattProKopf":
      return fmtWattProKopf(value);
    case "pvLeistung":
      return fmtPvLeistung(value);
    case "mixLeistung":
      return fmtMixLeistung(value);
    case "speicherKwh":
      return fmtSpeicherKwh(value);
    case "count":
      return `${Math.round(value).toLocaleString("de-DE")} Anlagen`;
    case "countPer1000":
      return `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} je 1.000 Ew.`;
    case "whProKopf":
      return `${Math.round(value).toLocaleString("de-DE")} Wh/Kopf`;
  }
}

// ─── Rolle (Vergleichsgruppe) ───────────────────────────────────────────────────

/** Die 16 Landeshauptstädte — fixe, bekannte Liste (ändert sich nicht). Als
 *  Rolle ein Querschnitt: eine Hauptstadt ist meist auch kreisfrei, wird aber
 *  ihrer Hauptstadt-Gruppe zugeordnet (Hauptstadt gegen Hauptstadt). */
const HAUPTSTAEDTE = new Set([
  "Stuttgart", "München", "Berlin", "Potsdam", "Bremen", "Hamburg", "Wiesbaden",
  "Schwerin", "Hannover", "Düsseldorf", "Mainz", "Saarbrücken", "Dresden",
  "Magdeburg", "Kiel", "Erfurt",
]);

export const ROLE_LABELS: Record<Role, string> = {
  gemeinde: "Gemeinden",
  stadt: "Städte & Märkte",
  "grosse-kreisstadt": "Große Kreisstädte",
  kreisfrei: "Kreisfreie Städte",
  hauptstadt: "Landeshauptstädte",
};

/** Amtliche Rolle einer Gemeinde. Aus der Bezeichnung (mastr_regions), plus die
 *  fixe Hauptstadt-Liste als Querschnitt. */
export function roleOf(g: GemeindeStats): Role {
  if (g.population > 50000 && HAUPTSTAEDTE.has(g.name)) return "hauptstadt";
  const b = g.bezeichnung;
  if (b === "Kreisfreie Stadt" || b === "Stadtkreis") return "kreisfrei";
  if (b === "Große Kreisstadt") return "grosse-kreisstadt";
  if (b === "Stadt" || b === "Markt") return "stadt";
  return "gemeinde";
}

// ─── Größen-Drittel (Terzile) ────────────────────────────────────────────────────

export const SIZE_LABELS: Record<SizeBand, string> = {
  klein: "kleine",
  mittel: "mittlere",
  gross: "große",
};

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  const i = (sortedAsc.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (i - lo);
}

/** Terzil-Grenzen der Einwohnerzahl über eine Menge — die Größenklassen-Grenzen
 *  kommen so aus der Verteilung selbst, nicht aus einer gesetzten Zahl. */
export function populationTertiles(gemeinden: GemeindeStats[]): { c1: number; c2: number } {
  const pops = gemeinden.map((g) => g.population).sort((a, b) => a - b);
  return { c1: Math.round(quantile(pops, 1 / 3)), c2: Math.round(quantile(pops, 2 / 3)) };
}

export function sizeBandOf(population: number, c1: number, c2: number): SizeBand {
  if (population < c1) return "klein";
  if (population < c2) return "mittel";
  return "gross";
}

// ─── Rangrechnung ────────────────────────────────────────────────────────────────

export function scopeIdOf(regionId: string, level: AwardScopeLevel): string {
  if (level === "de") return "de";
  if (level === "bundesland") return regionId.slice(0, 2);
  return regionId.slice(0, 5);
}

export type RankedGemeinde = {
  regionId: string;
  name: string;
  rank: number;
  value: number;
  population: number;
};

/** Rangliste einer schon gefilterten Menge, absteigend; Gleichstand nach AGS
 *  (stabil). Nicht wertbare (Kennzahl 0/leer) fallen raus. */
export function rankGemeinden(gemeinden: GemeindeStats[], cat: AwardCategory): RankedGemeinde[] {
  const scored = gemeinden
    .map((g) => ({ g, value: cat.metric(g) }))
    .filter((e): e is { g: GemeindeStats; value: number } => e.value != null && e.value > 0);
  scored.sort((a, b) => b.value - a.value || a.g.regionId.localeCompare(b.g.regionId));
  return scored.map((e, i) => ({
    regionId: e.g.regionId,
    name: e.g.name,
    rank: i + 1,
    value: e.value,
    population: e.g.population,
  }));
}

export type ViewOptions = {
  level: AwardScopeLevel;
  splitByRole: boolean;
  splitBySize: boolean;
  minPopulation?: number;
};

export type WinnerGroup = {
  scopeId: string;
  role: Role | null;
  sizeBand: SizeBand | null;
  winner: RankedGemeinde;
  total: number;
};

/** Der Kern: Sieger je Kombination aus geografischem Bezug, optional Rolle und
 *  optional Größen-Drittel. Die Größengrenzen werden über die GESAMTE wertbare
 *  Menge gebildet (stabile Klassendefinition überall), nicht je Region. */
export function computeWinners(
  gemeinden: GemeindeStats[],
  cat: AwardCategory,
  opts: ViewOptions,
): WinnerGroup[] {
  const floor = opts.minPopulation ?? 0;
  const pool = gemeinden.filter((g) => {
    const m = cat.metric(g);
    return m != null && m > 0 && g.population >= floor;
  });

  const t = opts.splitBySize ? populationTertiles(pool) : { c1: 0, c2: 0 };

  const groups = new Map<string, GemeindeStats[]>();
  const meta = new Map<string, { scopeId: string; role: Role | null; sizeBand: SizeBand | null }>();
  for (const g of pool) {
    const scopeId = scopeIdOf(g.regionId, opts.level);
    const role = opts.splitByRole ? roleOf(g) : null;
    const sizeBand = opts.splitBySize ? sizeBandOf(g.population, t.c1, t.c2) : null;
    const key = [scopeId, role ?? "", sizeBand ?? ""].join("|");
    const arr = groups.get(key);
    if (arr) arr.push(g);
    else {
      groups.set(key, [g]);
      meta.set(key, { scopeId, role, sizeBand });
    }
  }

  const out: WinnerGroup[] = [];
  for (const [key, list] of Array.from(groups.entries())) {
    const ranked = rankGemeinden(list, cat);
    if (ranked.length === 0) continue;
    const m = meta.get(key)!;
    out.push({ scopeId: m.scopeId, role: m.role, sizeBand: m.sizeBand, winner: ranked[0], total: ranked.length });
  }
  return out;
}
