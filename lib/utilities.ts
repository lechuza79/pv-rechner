// Stadtwerke / Energieversorger: Gebiets-Aggregate + Rangrechnung.
//
// Reine Funktionen, kein DB-/Next-Import — dieselbe Trennung wie beim
// Kommunen-Award, damit Admin-Ansicht, API und Tests dieselbe Rechnung sehen.
//
// KERNGEDANKE: Ein Versorgungsgebiet ist rechnerisch eine große Gemeinde. Die
// Kennzahlen seiner Gemeinden werden aufsummiert, die Einwohner ebenso — heraus
// kommt derselbe Datensatz, mit dem der Kommunen-Award rechnet. Damit gelten
// Rangrechnung (`rankGemeinden`), Größenklassen (`populationTertiles`) und die
// Einheiten-Formatter unverändert. Es gibt KEINE zweite Rangquelle.
//
// GRENZEN DER ZAHLEN — bewusst im Modul, nicht nur in der Oberfläche:
//  1. Versorgungsgebiete sind nicht öffentlich dokumentiert. Netzbetreiber,
//     Grundversorger und Vertrieb haben verschiedene Gebiete, die sich
//     überschneiden. Jede Zuordnung trägt deshalb ihre Herkunft (`quelle`), und
//     jedes Aggregat trägt sichtbar mit, wie viel davon nur vermutet ist.
//  2. Die Anlagendaten kennen nur das Inbetriebnahme-JAHR, keine Monate. „Zubau"
//     ist deshalb immer das letzte vollständige Kalenderjahr — kein rollierendes
//     12-Monats-Fenster. Ein solches bräuchte Monatsauflösung im MaStR-Import.

import {
  AWARD_CATEGORY_BY_KEY,
  populationTertiles,
  rankGemeinden,
  sizeBandOf,
  type AwardCategory,
  type GemeindeStats,
  type SizeBand,
} from "./awards";

// ─── Datensatz ────────────────────────────────────────────────────────────────

export type UtilityTyp = "stadtwerk" | "regionalversorger" | "genossenschaft";

export const UTILITY_TYP_LABEL: Record<UtilityTyp, string> = {
  stadtwerk: "Stadtwerk",
  regionalversorger: "Regionalversorger",
  genossenschaft: "Energiegenossenschaft",
};

/** Rolle einer Gemeinde beim Versorger. Nur `sitz` und `versorgungsgebiet`
 *  gehen in die Gebiets-Summe ein — eine Beteiligung ist ein Eigentumsverhältnis,
 *  kein Versorgungsgebiet, und würde die Zahlen still aufblähen. */
export type ZuordnungRolle = "sitz" | "versorgungsgebiet" | "beteiligung";

export const ZUORDNUNG_ROLLE_LABEL: Record<ZuordnungRolle, string> = {
  sitz: "Sitz",
  versorgungsgebiet: "Versorgungsgebiet",
  beteiligung: "Beteiligung",
};

/** Gemeinden, die in die Gebiets-Summe zählen. */
export const AREA_ROLLEN: ZuordnungRolle[] = ["sitz", "versorgungsgebiet"];

/** Woher die Zuordnung stammt — steigt von unten nach oben in der Verlässlichkeit.
 *  `verlinkt`: auf der Gemeinde- oder Versorger-Website ausgewiesen.
 *  `recherchiert`: aus einer anderen belastbaren Quelle (Presse, Satzung).
 *  `vermutet`: plausibel, aber unbelegt. */
export type ZuordnungQuelle = "verlinkt" | "recherchiert" | "vermutet";

export const ZUORDNUNG_QUELLE_LABEL: Record<ZuordnungQuelle, string> = {
  verlinkt: "verlinkt",
  recherchiert: "recherchiert",
  vermutet: "vermutet",
};

export type UtilityRecord = {
  id: string;
  name: string;
  typ: UtilityTyp;
  website: string | null;
  kontaktEmail: string | null;
  kontaktseiteUrl: string | null;
  sitzGemeindeId: string | null;
  status: string;
  notiz: string | null;
};

export type UtilityMembership = {
  utilityId: string;
  regionId: string; // 8-stelliger AGS
  rolle: ZuordnungRolle;
  quelle: ZuordnungQuelle;
};

// ─── Gebiets-Aggregat ─────────────────────────────────────────────────────────

/** Ein Versorger mit seinem aufsummierten Gebiet.
 *  `stats` hat bewusst die Form einer Gemeinde (`GemeindeStats`), damit die
 *  Rangrechnung des Kommunen-Awards unverändert darauf läuft. */
export type UtilityArea = {
  utility: UtilityRecord;
  /** Die Summe des Gebiets, in Gemeinde-Form. `regionId` = Versorger-ID. */
  stats: GemeindeStats;
  /** Bundesland-AGS (2-stellig) — vom Sitz, ersatzweise von der Mehrheit der
   *  zugeordneten Gemeinden. Gebiete können Landesgrenzen kreuzen; das ist eine
   *  Vereinfachung und wird als solche angezeigt. */
  bundeslandAgs: string | null;
  /** Kreuzt das Gebiet Landesgrenzen? Dann ist die Bundesland-Einordnung grob. */
  mehrereBundeslaender: boolean;
  /** Zugeordnete Gemeinden mit Gebiets-Rolle (Beteiligungen zählen nicht mit). */
  gemeindeCount: number;
  /** Zuordnungen je Herkunft — die Näherungs-Angabe der Anzeige. */
  quellen: Record<ZuordnungQuelle, number>;
  /** Anteil vermuteter Zuordnungen, 0..1. */
  vermutetAnteil: number;
  /** Gemeinden, die auch mindestens einem ANDEREN Versorger zugeordnet sind. */
  ueberlappend: number;
  /** Zugeordnete Gemeinden ohne Kennzahlen (unbewohnt/kein Datensatz) — sie
   *  fehlen in der Summe, also gehört die Zahl sichtbar dazu. */
  ohneDaten: number;
  /** Solar gesamt (Dach privat + gewerblich + Freifläche + Balkon), kWp. */
  solarKwp: number;
  /** Alle Erzeugerarten zusammen, kW — Technologie-Mix, KEIN Peak. */
  erzeugungKw: number;
  /** Batteriekapazität gesamt (privat + gewerblich), kWh. */
  speicherKwh: number;
  /** Solar-Zubau des letzten vollständigen Jahres, kWp. */
  zubauKwp: number;
};

const LEER_QUELLEN: Record<ZuordnungQuelle, number> = { verlinkt: 0, recherchiert: 0, vermutet: 0 };

const NULL_STATS = (id: string, name: string): GemeindeStats => ({
  regionId: id,
  name,
  bezeichnung: "Versorgungsgebiet",
  population: 0,
  privatDachKwp: 0,
  gewerbeDachKwp: 0,
  freiflaecheKwp: 0,
  balkonCount: 0,
  balkonKwp: 0,
  batteriePrivatKwh: 0,
  batterieGewerbeKwh: 0,
  windKwp: 0,
  biomasseKwp: 0,
  wasserKwp: 0,
  solarZubauKwp: 0,
});

/** Häufigster Wert einer Liste (erste Fundstelle bei Gleichstand). */
function haeufigster(werte: string[]): string | null {
  const zaehler = new Map<string, number>();
  for (const w of werte) zaehler.set(w, (zaehler.get(w) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [w, n] of Array.from(zaehler.entries())) {
    if (n > bestN) {
      best = w;
      bestN = n;
    }
  }
  return best;
}

/**
 * Ein Versorgungsgebiet aufsummieren.
 *
 * `statsByRegion` sind die Gemeinde-Kennzahlen (dieselben, mit denen der
 * Kommunen-Award rechnet — inklusive der dort schon abgezogenen
 * Freiflächen-Doppelzählungen). `mehrfachZugeordnet` enthält die Gemeinden, die
 * mehr als einem Versorger zugeordnet sind; daraus entsteht der
 * Überschneidungs-Hinweis.
 */
export function aggregateArea(
  utility: UtilityRecord,
  memberships: UtilityMembership[],
  statsByRegion: Map<string, GemeindeStats>,
  mehrfachZugeordnet: Set<string> = new Set(),
): UtilityArea {
  const gebiet = memberships.filter(
    (m) => m.utilityId === utility.id && AREA_ROLLEN.includes(m.rolle),
  );

  const stats = NULL_STATS(utility.id, utility.name);
  const quellen = { ...LEER_QUELLEN };
  let ohneDaten = 0;
  let ueberlappend = 0;
  const laender: string[] = [];

  for (const m of gebiet) {
    quellen[m.quelle]++;
    if (mehrfachZugeordnet.has(m.regionId)) ueberlappend++;
    laender.push(m.regionId.slice(0, 2));

    const g = statsByRegion.get(m.regionId);
    if (!g) {
      ohneDaten++;
      continue;
    }
    stats.population += g.population;
    stats.privatDachKwp += g.privatDachKwp;
    stats.gewerbeDachKwp += g.gewerbeDachKwp;
    stats.freiflaecheKwp += g.freiflaecheKwp;
    stats.balkonCount += g.balkonCount;
    stats.balkonKwp += g.balkonKwp;
    stats.batteriePrivatKwh += g.batteriePrivatKwh;
    stats.batterieGewerbeKwh += g.batterieGewerbeKwh;
    stats.windKwp += g.windKwp;
    stats.biomasseKwp += g.biomasseKwp;
    stats.wasserKwp += g.wasserKwp;
    stats.solarZubauKwp += g.solarZubauKwp;
  }

  const solarKwp = stats.privatDachKwp + stats.gewerbeDachKwp + stats.freiflaecheKwp + stats.balkonKwp;
  const sitzLand = utility.sitzGemeindeId ? utility.sitzGemeindeId.slice(0, 2) : null;
  const eindeutigeLaender = new Set(laender);

  return {
    utility,
    stats,
    bundeslandAgs: sitzLand ?? haeufigster(laender),
    mehrereBundeslaender: eindeutigeLaender.size > 1,
    gemeindeCount: gebiet.length,
    quellen,
    vermutetAnteil: gebiet.length > 0 ? quellen.vermutet / gebiet.length : 0,
    ueberlappend,
    ohneDaten,
    solarKwp,
    erzeugungKw: solarKwp + stats.windKwp + stats.biomasseKwp + stats.wasserKwp,
    speicherKwh: stats.batteriePrivatKwh + stats.batterieGewerbeKwh,
    zubauKwp: stats.solarZubauKwp,
  };
}

/** Gemeinden, die mehr als einem Versorger im GEBIET zugeordnet sind. */
export function findOverlaps(memberships: UtilityMembership[]): Set<string> {
  const zaehler = new Map<string, Set<string>>();
  for (const m of memberships) {
    if (!AREA_ROLLEN.includes(m.rolle)) continue;
    const set = zaehler.get(m.regionId) ?? new Set<string>();
    set.add(m.utilityId);
    zaehler.set(m.regionId, set);
  }
  const out = new Set<string>();
  for (const [regionId, utilities] of Array.from(zaehler.entries())) {
    if (utilities.size > 1) out.add(regionId);
  }
  return out;
}

// ─── Kategorien ───────────────────────────────────────────────────────────────

/** Zwei Kennzahlen, die es nur auf Gebiets-Ebene gibt. Alles Übrige wird aus dem
 *  Kommunen-Award wiederverwendet (gleiche Metrik, gleiche Rangrechnung). */
const GEBIETS_KATEGORIEN: AwardCategory[] = [
  {
    key: "erzeugung-gesamt",
    label: "Erzeugungsleistung im Gebiet",
    merit: "Installierte Leistung aller Erzeugerarten im Versorgungsgebiet.",
    traeger: "gewerbe",
    messart: "absolut",
    // Technologie-Mix → kW/MW/GW, kein Peak.
    format: "mixLeistung",
    metric: (g) =>
      g.privatDachKwp + g.gewerbeDachKwp + g.freiflaecheKwp + g.balkonKwp + g.windKwp + g.biomasseKwp + g.wasserKwp ||
      null,
  },
  {
    key: "solar-gesamt",
    label: "Solarleistung im Gebiet",
    merit: "Installierte Photovoltaik im Versorgungsgebiet, alle Segmente.",
    traeger: "gewerbe",
    messart: "absolut",
    format: "pvLeistung",
    metric: (g) => g.privatDachKwp + g.gewerbeDachKwp + g.freiflaecheKwp + g.balkonKwp || null,
  },
];

/** Aus dem Kommunen-Award übernommene Kategorien — identische Metrik, identische
 *  Rangrechnung. Nur die ANSPRACHE ist eine andere (siehe UTILITY_LABEL). */
const UEBERNOMMENE_KEYS = [
  "dach-privat-pk",
  "balkon-pk",
  "batterie-privat-pk",
  "zubau",
  "freiflaeche-standort",
  "wind-standort",
  "biomasse-standort",
  "wasser-standort",
  "gewerbespeicher-abs",
];

export const UTILITY_CATEGORIES: AwardCategory[] = [
  ...GEBIETS_KATEGORIEN,
  ...UEBERNOMMENE_KEYS.map((k) => AWARD_CATEGORY_BY_KEY[k]).filter(Boolean),
];

export const UTILITY_CATEGORY_BY_KEY: Record<string, AwardCategory> = Object.fromEntries(
  UTILITY_CATEGORIES.map((c) => [c.key, c]),
);

/** Sachliche Bezeichnung für die Versorger-Ansprache. Die Award-Titel der
 *  Gemeinden („Solardach-Spitzenreiter") sind Wettbewerbs-Namen und passen nicht
 *  in ein B2B-Gespräch — die RECHNUNG ist dieselbe, nur die Wortwahl nicht.
 *
 *  Die Bezeichnung wiederholt NICHT, was der Formatter schon sagt: der Wert steht
 *  davor. „14,3 je 1.000 Ew. Balkonkraftwerke je 1.000 Einwohner" ist derselbe
 *  Fehler wie eine doppelte Einheit, nur in Worten. */
export const UTILITY_LABEL: Record<string, string> = {
  "erzeugung-gesamt": "Erzeugungsleistung im Gebiet",
  "solar-gesamt": "Solarleistung im Gebiet",
  // „Wp" allein sagt nicht, dass es je Einwohner ist — hier gehört es dazu.
  "dach-privat-pk": "private Dach-Solarleistung je Einwohner",
  // Der Formatter schreibt bereits „je 1.000 Ew." bzw. „Wh/Kopf".
  "balkon-pk": "Balkonkraftwerke",
  "batterie-privat-pk": "private Speicherkapazität",
  zubau: "Solar-Zubau im Gebiet",
  "freiflaeche-standort": "Freiflächen-Solarleistung",
  "wind-standort": "Windleistung im Gebiet",
  "biomasse-standort": "Biomasseleistung im Gebiet",
  "wasser-standort": "Wasserkraftleistung im Gebiet",
  "gewerbespeicher-abs": "gewerbliche Speicherkapazität",
};

export const utilityCategoryLabel = (key: string): string =>
  UTILITY_LABEL[key] ?? UTILITY_CATEGORY_BY_KEY[key]?.label ?? key;

// ─── Rangrechnung ─────────────────────────────────────────────────────────────

export type UtilityScope = "bund" | "land";

export const SCOPE_LABEL: Record<UtilityScope, string> = { bund: "bundesweit", land: "im Bundesland" };

export type UtilityPlacement = {
  categoryKey: string;
  scope: UtilityScope;
  scopeId: string; // "de" oder 2-stelliger Bundesland-AGS
  /** Größenklasse, in der verglichen wurde — null = alle Größen zusammen. */
  sizeBand: SizeBand | null;
  rank: number;
  total: number;
  value: number;
};

/** Untergrenze für Pro-Kopf-Vergleiche: unter dieser Einwohnerzahl ist ein
 *  Pro-Kopf-Wert eher ein Nenner-Artefakt als ein Ausbaustand. Gleiche Schwelle
 *  wie im Kommunen-Aufhänger. */
export const UTILITY_MIN_POPULATION = 2000;

/**
 * Alle Platzierungen je Versorger: Kategorie × (bundesweit | Bundesland) ×
 * (alle Größen | Größenklasse).
 *
 * Die Größenklassen-Grenzen kommen aus der Verteilung der ERFASSTEN Versorger
 * (Terzile der Einwohner im Gebiet), nicht aus gesetzten Zahlen — so wächst die
 * Einteilung mit dem Datenbestand, statt ihn zu verzerren.
 */
export function computeUtilityPlacements(areas: UtilityArea[]): Map<string, UtilityPlacement[]> {
  const out = new Map<string, UtilityPlacement[]>();
  const push = (id: string, p: UtilityPlacement) => {
    const arr = out.get(id);
    if (arr) arr.push(p);
    else out.set(id, [p]);
  };

  const bewertbar = areas.filter((a) => a.gemeindeCount > 0);
  if (bewertbar.length === 0) return out;

  const t = populationTertiles(bewertbar.map((a) => a.stats));
  const bandOf = (a: UtilityArea): SizeBand => sizeBandOf(a.stats.population, t.c1, t.c2);

  for (const cat of UTILITY_CATEGORIES) {
    const floor = cat.messart === "proKopf" ? UTILITY_MIN_POPULATION : 0;
    const pool = bewertbar.filter((a) => a.stats.population >= floor);

    // Vier Vergleichsgruppen-Achsen: bundesweit/Land × alle/Größenklasse.
    const gruppen = new Map<string, { scope: UtilityScope; scopeId: string; sizeBand: SizeBand | null; areas: UtilityArea[] }>();
    for (const a of pool) {
      const kombis: { scope: UtilityScope; scopeId: string; sizeBand: SizeBand | null }[] = [
        { scope: "bund", scopeId: "de", sizeBand: null },
        { scope: "bund", scopeId: "de", sizeBand: bandOf(a) },
      ];
      if (a.bundeslandAgs) {
        kombis.push({ scope: "land", scopeId: a.bundeslandAgs, sizeBand: null });
        kombis.push({ scope: "land", scopeId: a.bundeslandAgs, sizeBand: bandOf(a) });
      }
      for (const k of kombis) {
        const key = [k.scope, k.scopeId, k.sizeBand ?? ""].join("|");
        const eintrag = gruppen.get(key);
        if (eintrag) eintrag.areas.push(a);
        else gruppen.set(key, { ...k, areas: [a] });
      }
    }

    for (const g of Array.from(gruppen.values())) {
      const ranked = rankGemeinden(
        g.areas.map((a) => a.stats),
        cat,
      );
      for (const r of ranked) {
        push(r.regionId, {
          categoryKey: cat.key,
          scope: g.scope,
          scopeId: g.scopeId,
          sizeBand: g.sizeBand,
          rank: r.rank,
          total: ranked.length,
          value: r.value,
        });
      }
    }
  }
  return out;
}

/** Größenklasse eines Versorgers innerhalb der erfassten Menge. */
export function utilitySizeBand(area: UtilityArea, areas: UtilityArea[]): SizeBand {
  const t = populationTertiles(areas.filter((a) => a.gemeindeCount > 0).map((a) => a.stats));
  return sizeBandOf(area.stats.population, t.c1, t.c2);
}
