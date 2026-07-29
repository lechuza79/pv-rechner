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

import { fmtPvLeistung, fmtSpeicherKwh, fmtWattProKopf } from "./atlas-format";

export type AwardScopeLevel = "de" | "bundesland" | "landkreis";
export type Traeger = "buerger" | "gewerbe";
export type Messart = "proKopf" | "absolut";
export type SizeBand = "klein" | "mittel" | "gross";
export type Role = "gemeinde" | "stadt" | "grosse-kreisstadt" | "kreisfrei" | "hauptstadt";

/** Wie die Zahl angezeigt wird — die Einheit schreibt die Anzeige über den
 *  kanonischen Formatter, nie das Modul (lib/atlas-format.ts). */
export type MetricFormat = "wattProKopf" | "pvLeistung" | "count" | "countPer1000" | "whProKopf" | "speicherKwh";

/** Solar-/Speicher-/EE-Kennzahlen einer bewohnten Gemeinde, je Träger getrennt.
 *  Kommt aus dem Rollup `mastr_gemeinde_award` (ein DB-seitiger Lauf), Name +
 *  Bezeichnung aus `mastr_regions`. */
export type GemeindeStats = {
  regionId: string; // 8-stelliger AGS
  name: string;
  bezeichnung: string; // amtliche Bezeichnung → Rolle
  /** Letztes Pfadstück der Atlas-Seite. Damit lässt sich jede Ranglisten-Zeile
   *  verlinken, ohne je Zeile eine Abfrage zu fahren. */
  slug?: string | null;
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
  /** Bestaende zu Stichtagen (siehe lib/mastr-award-sql.ts). Optional, weil
   *  aeltere Aufrufer sie nicht setzen — wer sie braucht, prueft auf undefined. */
  solarKwp?: number;
  solarKwpLy?: number;
  solarKwpL3?: number;
  solarKwpL5?: number;
  privatDachKwpLy?: number;
  privatDachKwpL3?: number;
  privatDachKwpL5?: number;
  balkonCountLy?: number;
  batteriePrivatKwhLy?: number;
  freiflaecheKwpLy?: number;
  windKwpLy?: number;
};

// ─── Kategorien ────────────────────────────────────────────────────────────────

export type AwardCategory = {
  key: string;
  /**
   * Adresse der Ranking-Seite (`/solar-atlas/ranking/<slug>`). Nur Kategorien
   * mit Slug bekommen eine Seite.
   *
   * OHNE SEITE bleiben die absoluten BUERGER-Kategorien (Balkon-, Solardach-,
   * Speicher-"Hauptstadt"): Ihr Sieger ist gemessen an mastr_gemeinde_award
   * schlicht die einwohnerstaerkste Kommune — in BW, BY und NRW jeweils exakt,
   * und 6 bis 10 der ersten Zehn sind die zehn einwohnerstaerksten Orte. Eine
   * Rangliste daraus waere eine Einwohner-Rangliste mit anderem Titel.
   *
   * Fuer die STANDORT-Kategorien gilt das NICHT — dieselbe Messung ergab bei
   * Freiflaeche und Wind 0 von 10 Ueberschneidung mit den einwohnerstaerksten
   * Gemeinden, und der Sieger ist nie die groesste. Dort gewinnen Doerfer mit
   * einem Solarpark oder Windraedern; das ist eine echte Aussage.
   */
  slug?: string;
  /** Interner Kurzname (Backend-Ansichten). NICHT nach außen verwenden — siehe
   *  `bestleistung`/`thema`. */
  label: string;
  merit: string;
  /**
   * Klartext für die Außenkommunikation, als Nominalphrase: „die meisten
   * Balkonkraftwerke je 1.000 Einwohner".
   *
   * WARUM ES DAS GIBT (27.07.2026): Im Anschreiben stand vorher der interne
   * Titel — „Erlenbach a.Main ist Speicher-Hauptstadt im Landkreis Miltenberg".
   * Der sagt nicht, was gemessen wurde, klingt bei 9.717 Einwohnern nach
   * Marketing-Erfindung, und die Auszeichnung existiert öffentlich nirgends.
   * Eine Verwaltung liest so etwas als Werbung. Die nackte Messgröße ist
   * belegbar und wirkt stärker als jedes Kunstwort.
   */
  bestleistung: string;
  /** Dasselbe ohne Superlativ, für Platzierungen unterhalb von Platz 1:
   *  „Balkonkraftwerke je 1.000 Einwohner". */
  thema: string;
  /**
   * Dieselbe Messgröße im DATIV, für den Betreff („… bei Balkonkraftwerken je
   * 1.000 Einwohner"). Von Hand gepflegt statt aus `thema` abgeleitet: Deutsche
   * Kasusbildung per Regel produziert zuverlässig Murks („bei private
   * Solarleistung"), und ein Betreff ist das Erste, was ein Rathaus liest.
   */
  themaDativ: string;
  traeger: Traeger;
  messart: Messart;
  format: MetricFormat;
  metric: (g: GemeindeStats) => number | null;
  /** Dieselbe Messgroesse zum Stand Ende des letzten vollen Jahres. Nur wo ein
   *  Stichtagswert vorliegt — daraus faellt die Rangveraenderung. */
  metricVorjahr?: (g: GemeindeStats) => number | null;
};

const perCapita = (val: number, pop: number): number | null => (pop > 0 ? (val * 1000) / pop : null);
const pos = (n: number): number | null => (n > 0 ? n : null);

export const AWARD_CATEGORIES: AwardCategory[] = [
  // Bürger, pro Kopf — verifiziert aussagekräftig (skaliert mit Haushalten).
  {
    key: "dach-privat-pk",
    slug: "solarleistung-je-einwohner",
    label: "Solardach-Spitzenreiter",
    merit: "Meiste private Dach-Solarleistung je Einwohner.",
    bestleistung: "die meiste private Solarleistung auf den Dächern je Einwohner",
    thema: "private Solarleistung auf den Dächern je Einwohner",
    themaDativ: "Solarleistung auf privaten Dächern je Einwohner",
    traeger: "buerger",
    messart: "proKopf",
    format: "wattProKopf",
    metric: (g) => perCapita(g.privatDachKwp, g.population),
    metricVorjahr: (g) => perCapita(g.privatDachKwpLy ?? 0, g.population),
  },
  {
    key: "balkon-pk",
    slug: "balkonkraftwerke-je-einwohner",
    label: "Balkon-Pionier",
    merit: "Meiste Balkonkraftwerke je 1.000 Einwohner — die sauberste Bürgerzahl.",
    bestleistung: "die meisten Balkonkraftwerke je 1.000 Einwohner",
    thema: "Balkonkraftwerke je 1.000 Einwohner",
    themaDativ: "Balkonkraftwerken je 1.000 Einwohner",
    traeger: "buerger",
    messart: "proKopf",
    format: "countPer1000",
    metric: (g) => perCapita(g.balkonCount, g.population),
    metricVorjahr: (g) => perCapita(g.balkonCountLy ?? 0, g.population),
  },
  {
    key: "batterie-privat-pk",
    slug: "speicherkapazitaet-je-einwohner",
    label: "Speicher-Vorreiter",
    merit: "Meiste private Batteriekapazität je Einwohner.",
    bestleistung: "die meiste private Speicherkapazität je Einwohner",
    thema: "private Speicherkapazität je Einwohner",
    themaDativ: "privater Speicherkapazität je Einwohner",
    traeger: "buerger",
    messart: "proKopf",
    format: "whProKopf",
    metric: (g) => perCapita(g.batteriePrivatKwh, g.population),
    metricVorjahr: (g) => perCapita(g.batteriePrivatKwhLy ?? 0, g.population),
  },
  // Zubau-Tempo je Einwohner ueber mehrere Zeitraeume. Absolut waere es wieder
  // eine Einwohner-Rangliste; RELATIV ("+300 %") gewinnt, wer bei fast null
  // angefangen hat. Je Einwohner zugebaute Leistung ist beides nicht.
  {
    key: "tempo-1j",
    slug: "zubau-1-jahr-je-einwohner",
    label: "Tempo 1 Jahr",
    merit: "Meiste je Einwohner zugebaute Solarleistung im letzten vollen Jahr.",
    bestleistung: "den größten Zubau auf privaten Dächern je Einwohner im letzten Jahr",
    thema: "Zubau auf privaten Dächern je Einwohner, letztes Jahr",
    themaDativ: "Solar-Zubau je Einwohner im letzten Jahr",
    traeger: "buerger",
    messart: "proKopf",
    format: "wattProKopf",
    metric: (g) => perCapita(Math.max(0, g.privatDachKwp - (g.privatDachKwpLy ?? 0)), g.population),
  },
  {
    key: "tempo-3j",
    slug: "zubau-3-jahre-je-einwohner",
    label: "Tempo 3 Jahre",
    merit: "Meiste je Einwohner zugebaute Solarleistung in den letzten drei Jahren.",
    bestleistung: "den größten Zubau auf privaten Dächern je Einwohner in drei Jahren",
    thema: "Zubau auf privaten Dächern je Einwohner, drei Jahre",
    themaDativ: "Solar-Zubau je Einwohner in drei Jahren",
    traeger: "buerger",
    messart: "proKopf",
    format: "wattProKopf",
    metric: (g) => perCapita(Math.max(0, g.privatDachKwp - (g.privatDachKwpL3 ?? 0)), g.population),
  },
  {
    key: "tempo-5j",
    slug: "zubau-5-jahre-je-einwohner",
    label: "Tempo 5 Jahre",
    merit: "Meiste je Einwohner zugebaute Solarleistung in den letzten fünf Jahren.",
    bestleistung: "den größten Zubau auf privaten Dächern je Einwohner in fünf Jahren",
    thema: "Zubau auf privaten Dächern je Einwohner, fünf Jahre",
    themaDativ: "Solar-Zubau je Einwohner in fünf Jahren",
    traeger: "buerger",
    messart: "proKopf",
    format: "wattProKopf",
    metric: (g) => perCapita(Math.max(0, g.privatDachKwp - (g.privatDachKwpL5 ?? 0)), g.population),
  },
  // Bürger, absolut — belohnt die großen Städte-Bürgerschaften.
  {
    key: "balkon-abs",
    label: "Balkon-Hauptstadt",
    merit: "Meiste Balkonkraftwerke insgesamt.",
    bestleistung: "die meisten Balkonkraftwerke insgesamt",
    thema: "Balkonkraftwerke insgesamt",
    themaDativ: "Balkonkraftwerken",
    traeger: "buerger",
    messart: "absolut",
    format: "count",
    metric: (g) => pos(g.balkonCount),
  },
  {
    key: "dach-privat-abs",
    label: "Solardach-Hauptstadt",
    merit: "Meiste private Dach-Solarleistung insgesamt — Bürger-Solar auf den Dächern, kein Gewerbe/Park.",
    bestleistung: "die meiste private Solarleistung auf den Dächern",
    thema: "private Solarleistung auf den Dächern",
    themaDativ: "Solarleistung auf privaten Dächern",
    traeger: "buerger",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.privatDachKwp),
  },
  {
    key: "batterie-privat-abs",
    label: "Speicher-Hauptstadt",
    merit: "Meiste private Batteriekapazität insgesamt.",
    bestleistung: "die meiste private Speicherkapazität",
    thema: "private Speicherkapazität",
    themaDativ: "privater Speicherkapazität",
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
    bestleistung: "die meiste installierte Solarleistung insgesamt",
    thema: "installierte Solarleistung insgesamt",
    themaDativ: "installierter Solarleistung",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.gewerbeDachKwp + g.freiflaecheKwp),
  },
  {
    key: "freiflaeche-standort",
    slug: "freiflaechen-solar",
    label: "Freiflächen-Standort",
    merit: "Höchste Freiflächen-Solarleistung (Solarparks).",
    bestleistung: "die meiste Solarleistung auf Freiflächen",
    thema: "Solarleistung auf Freiflächen",
    themaDativ: "Solarleistung auf Freiflächen",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.freiflaecheKwp),
    metricVorjahr: (g) => pos(g.freiflaecheKwpLy ?? 0),
  },
  {
    key: "gewerbespeicher-abs",
    label: "Gewerbespeicher-Standort",
    merit: "Höchste gewerbliche Batteriekapazität.",
    bestleistung: "die meiste gewerbliche Speicherkapazität",
    thema: "gewerbliche Speicherkapazität",
    themaDativ: "gewerblicher Speicherkapazität",
    traeger: "gewerbe",
    messart: "absolut",
    format: "speicherKwh",
    metric: (g) => pos(g.batterieGewerbeKwh),
  },
  {
    key: "wind-standort",
    slug: "windleistung",
    label: "Wind-Standort",
    merit: "Höchste installierte Windleistung.",
    bestleistung: "die meiste Windleistung",
    thema: "Windleistung",
    themaDativ: "Windleistung",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.windKwp),
    metricVorjahr: (g) => pos(g.windKwpLy ?? 0),
  },
  {
    key: "biomasse-standort",
    label: "Biomasse-Standort",
    merit: "Höchste installierte Biomasseleistung.",
    bestleistung: "die meiste Biomasseleistung",
    thema: "Biomasseleistung",
    themaDativ: "Biomasseleistung",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.biomasseKwp),
  },
  {
    key: "wasser-standort",
    label: "Wasserkraft-Standort",
    merit: "Höchste installierte Wasserkraftleistung.",
    bestleistung: "die meiste Wasserkraftleistung",
    thema: "Wasserkraftleistung",
    themaDativ: "Wasserkraftleistung",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => pos(g.wasserKwp),
  },
  // Dynamik.
  {
    key: "zubau",
    slug: "solar-zubau",
    label: "Zubau-Champion",
    merit: "Größter Solar-Zubau im letzten vollständigen Jahr.",
    bestleistung: "den größten Solar-Zubau im letzten Jahr",
    thema: "Solar-Zubau im letzten Jahr",
    themaDativ: "Solar-Zubau im letzten Jahr",
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
