// Kommunen-Solar-Award: welche Gemeinde führt in welcher Kategorie, je Ebene
// (Deutschland / Bundesland / Landkreis). Reine Rechenfunktionen — kein DB- und
// kein Next-Import, damit Server-Seiten, Admin-Ansicht und (später) das
// Badge-Widget dieselbe Quelle benutzen. Die Rangliste, die hier entsteht, ist
// dieselbe, aus der die Gemeinde-Detailseite später "Rang im Kreis" und den
// Nachbarvergleich zieht — es darf keine zweite geben.
//
// Ehrlichkeits-Regel (BLOCKER, aus dem Award-Konzept): absolute und Pro-Kopf-
// Rohzahlen werden von einem einzelnen Freiflächen-Solarpark vergiftet (eine
// 24-Einwohner-Gemeinde mit einem Park = absurder Wp/Kopf). Deshalb rechnet die
// Bürger-Merit-Achse auf DACHLEISTUNG (kwpDach, ohne Freifläche) UND nur oberhalb
// einer Einwohner-Schwelle. Jede Kategorie ist danach betitelt, was sie misst.

/** Solar-Kennzahlen einer bewohnten Gemeinde. kwpDach = alles außer Freifläche
 *  (kommt schon so aus dem Rollup `mastr_gemeinde_solar`). Die Balkon- und
 *  Zubau-Felder sind optional: solange der Rollup sie nicht trägt, sind die
 *  entsprechenden Kategorien schlicht "ohne Datengrundlage" statt falsch. */
export type GemeindeStats = {
  regionId: string; // 8-stelliger AGS
  population: number; // > 0 (unbewohnte sind im Rollup ausgefiltert)
  kwpAlle: number;
  kwpDach: number;
  balkonCount?: number;
  balkonKwp?: number;
  zubauKwpLastYear?: number;
  zubauCountLastYear?: number;
};

export type AwardScopeLevel = "de" | "bundesland" | "landkreis";

/** Steuert, mit welchem kanonischen Formatter die Zahl angezeigt wird — die
 *  Einheit wird NIE im Award-Modul geschrieben (siehe lib/atlas-format.ts). */
export type MetricFormat = "wattProKopf" | "pvLeistung" | "count" | "countPer1000";

export type AwardCategory = {
  key: string;
  /** Kurzer, ehrlicher Titel — sagt, was gemessen wird. */
  label: string;
  /** Eine Zeile: was diese Auszeichnung bedeutet (und was NICHT). */
  merit: string;
  /** Nenner ist die Einwohnerzahl. */
  perCapita: boolean;
  /** Unterliegt der Einwohner-Schwelle (nur sinnvoll bei Pro-Kopf-Kategorien:
   *  schützt vor Kleinst-Gemeinden mit absurdem Nenner). */
  minPopulation: boolean;
  format: MetricFormat;
  /** Die zu rankende Größe. `null` = Datengrundlage fehlt (optionales Feld nicht
   *  gesetzt) oder Nenner ungültig → Gemeinde ist in dieser Kategorie nicht
   *  wertbar. */
  metric: (g: GemeindeStats) => number | null;
};

const wpProKopf = (kwp: number, pop: number): number | null =>
  pop > 0 ? (kwp * 1000) / pop : null;

/** Die fünf Kategorien des Konzepts. Reihenfolge = Anzeigereihenfolge.
 *
 *  Bürger-Merit zuerst (Dach pro Kopf), dann die absolute Gesamtleistung
 *  (ehrlich inkl. Freifläche/Gewerbe), dann die beiden Balkon-Kategorien (park-
 *  immun, glaubwürdig absolut UND pro Kopf) und der Zubau. */
export const AWARD_CATEGORIES: AwardCategory[] = [
  {
    key: "solardach-spitzenreiter",
    label: "Solardach-Spitzenreiter",
    merit:
      "Meiste Dach-Solarleistung je Einwohner — was die Bürgerinnen und Bürger selbst aufs Dach gebracht haben (Freiflächen zählen nicht mit).",
    perCapita: true,
    minPopulation: true,
    format: "wattProKopf",
    metric: (g) => wpProKopf(g.kwpDach, g.population),
  },
  {
    key: "solar-standort",
    label: "Solar-Standort",
    merit:
      "Höchste gesamte installierte Solarleistung — inklusive Gewerbe- und Freiflächenanlagen. Misst den Standort, nicht das Bürger-Engagement.",
    perCapita: false,
    minPopulation: false,
    format: "pvLeistung",
    metric: (g) => (g.kwpAlle > 0 ? g.kwpAlle : null),
  },
  {
    key: "balkon-pionier",
    label: "Balkon-Pionier",
    merit:
      "Meiste Balkonkraftwerke je Einwohner — die sauberste Bürger-Kennzahl, unbeeinflusst von großen Anlagen.",
    perCapita: true,
    minPopulation: true,
    format: "countPer1000",
    metric: (g) =>
      g.balkonCount == null ? null : g.population > 0 ? (g.balkonCount * 1000) / g.population : null,
  },
  {
    key: "balkon-hauptstadt",
    label: "Balkon-Hauptstadt",
    merit: "Meiste Balkonkraftwerke insgesamt — absolute Zahl, park-immun.",
    perCapita: false,
    minPopulation: false,
    format: "count",
    metric: (g) => (g.balkonCount == null ? null : g.balkonCount > 0 ? g.balkonCount : null),
  },
  {
    key: "zubau-champion",
    label: "Zubau-Champion",
    merit: "Größter Solar-Zubau im letzten vollständigen Jahr (neu installierte Leistung).",
    perCapita: false,
    minPopulation: false,
    format: "pvLeistung",
    metric: (g) =>
      g.zubauKwpLastYear == null ? null : g.zubauKwpLastYear > 0 ? g.zubauKwpLastYear : null,
  },
];

export const AWARD_CATEGORY_BY_KEY: Record<string, AwardCategory> = Object.fromEntries(
  AWARD_CATEGORIES.map((c) => [c.key, c]),
);

export type AwardOptions = {
  /** Einwohner-Schwelle für Pro-Kopf-Kategorien. Der zentrale Stellknopf beim
   *  Festzurren: zu niedrig → Kleinst-Gemeinden mit einem einzigen Ausreißer
   *  gewinnen; zu hoch → echte kleine Vorreiter fallen raus. */
  minPopulation: number;
};

export const DEFAULT_AWARD_OPTIONS: AwardOptions = {
  minPopulation: 2000,
};

/** Zu welcher Region der jeweiligen Ebene gehört die Gemeinde? Aus dem AGS:
 *  2 Ziffern = Bundesland, 5 Ziffern = Landkreis. */
export function scopeIdOf(regionId: string, level: AwardScopeLevel): string {
  if (level === "de") return "de";
  if (level === "bundesland") return regionId.slice(0, 2);
  return regionId.slice(0, 5);
}

/** Ist die Gemeinde in dieser Kategorie überhaupt wertbar? */
export function isEligible(g: GemeindeStats, cat: AwardCategory, opts: AwardOptions): boolean {
  const m = cat.metric(g);
  if (m == null || m <= 0) return false;
  if (cat.minPopulation && g.population < opts.minPopulation) return false;
  return true;
}

export type RankedGemeinde = {
  regionId: string;
  rank: number; // 1-basiert
  value: number; // die gerankte Kennzahl (roh, ohne Einheit)
  population: number;
};

/** Rangliste innerhalb einer schon auf die Ebene gefilterten Menge. Absteigend
 *  nach Kennzahl; nicht wertbare Gemeinden fallen raus. Deterministisch: bei
 *  Gleichstand entscheidet der AGS, damit die Reihenfolge stabil bleibt. */
export function rankGemeinden(
  gemeinden: GemeindeStats[],
  cat: AwardCategory,
  opts: AwardOptions,
): RankedGemeinde[] {
  const eligible = gemeinden
    .filter((g) => isEligible(g, cat, opts))
    .map((g) => ({ g, value: cat.metric(g) as number }));
  eligible.sort((a, b) => b.value - a.value || a.g.regionId.localeCompare(b.g.regionId));
  return eligible.map((e, i) => ({
    regionId: e.g.regionId,
    rank: i + 1,
    value: e.value,
    population: e.g.population,
  }));
}

export type ScopeRanking = {
  scopeId: string;
  level: AwardScopeLevel;
  entries: RankedGemeinde[]; // vollständige Rangliste dieser Region (top zuerst)
  total: number; // Anzahl wertbarer Gemeinden im Scope
};

/** Gruppiert die Gemeinden nach der gewählten Ebene und rankt jede Gruppe. Für
 *  Ebene "de" gibt es genau eine Gruppe. */
export function rankByScope(
  gemeinden: GemeindeStats[],
  cat: AwardCategory,
  level: AwardScopeLevel,
  opts: AwardOptions,
): ScopeRanking[] {
  const groups = new Map<string, GemeindeStats[]>();
  for (const g of gemeinden) {
    const id = scopeIdOf(g.regionId, level);
    const arr = groups.get(id);
    if (arr) arr.push(g);
    else groups.set(id, [g]);
  }
  const out: ScopeRanking[] = [];
  for (const [scopeId, list] of Array.from(groups.entries())) {
    const entries = rankGemeinden(list, cat, opts);
    if (entries.length === 0) continue;
    out.push({ scopeId, level, entries, total: entries.length });
  }
  // Stabile Reihenfolge der Scopes (nach ID), für reproduzierbare Ausgaben.
  out.sort((a, b) => a.scopeId.localeCompare(b.scopeId));
  return out;
}

/** Die Sieger (Rang 1) je Region einer Ebene. */
export function scopeWinners(
  gemeinden: GemeindeStats[],
  cat: AwardCategory,
  level: AwardScopeLevel,
  opts: AwardOptions,
): { scopeId: string; winner: RankedGemeinde; total: number }[] {
  return rankByScope(gemeinden, cat, level, opts).map((s) => ({
    scopeId: s.scopeId,
    winner: s.entries[0],
    total: s.total,
  }));
}

/** Hat die Kategorie in dieser Grundgesamtheit überhaupt eine Datengrundlage?
 *  (Balkon/Zubau sind erst nach der Rollup-Erweiterung befüllt.) Erkennt es
 *  daran, ob IRGENDEINE Gemeinde einen Wert liefert. */
export function categoryHasData(gemeinden: GemeindeStats[], cat: AwardCategory): boolean {
  return gemeinden.some((g) => cat.metric(g) != null);
}
