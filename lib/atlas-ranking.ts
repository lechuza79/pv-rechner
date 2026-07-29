// Ranking-Seiten des Solar-Atlas: die Ranglisten, die es bisher nur im Fenster
// auf der Gemeindeseite gab, als eigene Adressen.
//
// Warum überhaupt (Entscheidung 28.07.2026): Ein Rang, den man nur in einem
// Dialog sieht, lässt sich nicht teilen, nicht verlinken und nicht
// durchblättern. Für den Kommunen-Outreach ist genau das der Punkt — im
// Anschreiben steht „Platz 1 von 31", und es muss eine Seite geben, auf der das
// nachprüfbar steht.
//
// „Ranking" und nicht „Bestenliste": Das ist das Wort, das die Sache im
// Deutschen trägt (IW-Städteranking, Presse: „Solarkraft-Ranking"). „Bestenliste"
// meint laut DWDS ausdrücklich nur die Besten — unsere Listen führen jede
// Kommune, auch die letzte.
//
// NUR PRO-KOPF-KATEGORIEN bekommen ein Ranking (siehe `slug` in lib/awards.ts):
// Eine absolute Rangliste ist der Sache nach eine Einwohner-Rangliste.

import { AWARD_CATEGORIES, type AwardCategory, type GemeindeStats } from "./awards";

/** Kategorien mit öffentlicher Ranking-Seite, in Anzeigereihenfolge. */
export function rankingKategorien(): (AwardCategory & { slug: string })[] {
  return AWARD_CATEGORIES.filter((c): c is AwardCategory & { slug: string } => !!c.slug);
}

/** Buerger-Kategorien zuerst — sie sind das, wofuer eine Gemeinde etwas kann. */
export function rankingKategorienGruppiert(): {
  buerger: (AwardCategory & { slug: string })[];
  standort: (AwardCategory & { slug: string })[];
} {
  const alle = rankingKategorien();
  return {
    buerger: alle.filter((k) => k.traeger === "buerger"),
    standort: alle.filter((k) => k.traeger !== "buerger"),
  };
}

export function kategorieBySlug(slug: string): (AwardCategory & { slug: string }) | null {
  return rankingKategorien().find((c) => c.slug === slug) ?? null;
}

/** Ebene, auf der verglichen wird — abgeleitet aus der Länge des Pfads. */
export type RankingEbene = "de" | "bundesland" | "landkreis";

export function ebeneOf(regionId: string | null): RankingEbene {
  if (!regionId) return "de";
  return regionId.length >= 5 ? "landkreis" : "bundesland";
}

/**
 * Untergrenze der Einwohnerzahl. Dieselbe Schwelle wie beim Aufhänger im
 * Anschreiben (HOOK_MIN_POPULATION): Unter 2.000 Einwohnern kippt jede
 * Pro-Kopf-Zahl schon an einer einzelnen Anlage.
 */
export const RANKING_MIN_POPULATION = 2000;

export type RankingZeile = {
  regionId: string;
  name: string;
  platz: number;
  wert: number;
  /** Platz zum Stand Ende des letzten vollen Jahres, wenn die Kategorie einen
   *  Stichtagswert hat. */
  platzVorjahr: number | null;
  /** Positiv = nach vorn gerueckt. Der Wert IST die Zahl der Plaetze, nicht
   *  ihre Richtung: +3 heisst drei Plaetze besser als Ende letzten Jahres. */
  veraenderung: number | null;
};

/**
 * Die Rangliste einer Kategorie innerhalb eines Gebiets. Reine Funktion über den
 * vorberechneten Gemeinde-Zahlen — dieselbe Grundlage wie die Auszeichnung auf
 * der Gemeindeseite, damit Rang und Seite nie auseinanderlaufen.
 */
export function rankingRows(
  stats: GemeindeStats[],
  kategorie: AwardCategory,
  scopeId: string | null,
): RankingZeile[] {
  const rows = stats
    .filter((g) => {
      // Die Untergrenze gilt NUR fuer Pro-Kopf-Werte: Dort kippt die Zahl an
      // einer einzelnen Anlage. Bei absoluten Werten waere sie sogar falsch —
      // ein 700-Einwohner-Dorf mit einem 90-MWp-Solarpark gehoert in genau
      // diese Rangliste, nicht heraus.
      if (kategorie.messart === "proKopf" && g.population < RANKING_MIN_POPULATION) return false;
      if (scopeId && !g.regionId.startsWith(scopeId)) return false;
      const w = kategorie.metric(g);
      return w !== null && w > 0;
    })
    .map((g) => ({ regionId: g.regionId, name: g.name, wert: kategorie.metric(g) as number }))
    // Bei Gleichstand entscheidet der Name, damit die Reihenfolge zwischen zwei
    // Aufbauten dieselbe bleibt (sonst tauschen Zeilen ohne Datenänderung).
    .sort((a, b) => b.wert - a.wert || a.name.localeCompare(b.name, "de"));

  // Gleiche Werte bekommen denselben Platz; der nächste Platz überspringt die
  // Gleichstände (Sportrang). Alles andere wäre eine erfundene Reihenfolge.
  const platziert = vergebePlaetze(rows);

  // RANGVERAENDERUNG: derselbe Lauf noch einmal mit den Werten von Ende des
  // letzten vollen Jahres. Bewusst NICHT "Veränderung zum Vorjahr" genannt —
  // der Zeitraum reicht vom Jahresende bis heute, im Juli also sieben Monate.
  // Dieselbe Ehrlichkeit wie in der Ranglisten-Tabelle des Atlas.
  if (!kategorie.metricVorjahr) {
    return platziert.map((r) => ({ ...r, platzVorjahr: null, veraenderung: null }));
  }
  const vorjahr = stats
    .filter((g) => {
      if (kategorie.messart === "proKopf" && g.population < RANKING_MIN_POPULATION) return false;
      if (scopeId && !g.regionId.startsWith(scopeId)) return false;
      const w = kategorie.metricVorjahr!(g);
      return w !== null && w > 0;
    })
    .map((g) => ({ regionId: g.regionId, name: g.name, wert: kategorie.metricVorjahr!(g) as number }))
    .sort((a, b) => b.wert - a.wert || a.name.localeCompare(b.name, "de"));
  const platzVon = new Map(vergebePlaetze(vorjahr).map((r) => [r.regionId, r.platz]));

  return platziert.map((r) => {
    const alt = platzVon.get(r.regionId) ?? null;
    // Wer damals nicht gewertet war, ist nicht "aufgestiegen" — dann steht dort
    // nichts. Eine Null wäre eine Aussage, die wir nicht haben.
    return { ...r, platzVorjahr: alt, veraenderung: alt === null ? null : alt - r.platz };
  });
}

/** Sportrang: Gleichstände teilen sich den Platz, der nächste überspringt. */
function vergebePlaetze<T extends { wert: number }>(rows: T[]): (T & { platz: number })[] {
  let letzterWert: number | null = null;
  let letzterPlatz = 0;
  return rows.map((r, i) => {
    const platz = letzterWert !== null && r.wert === letzterWert ? letzterPlatz : i + 1;
    letzterWert = r.wert;
    letzterPlatz = platz;
    return { ...r, platz };
  });
}

/** Titel der Seite — „Ranking: X in Y" bzw. „… in Deutschland". */
export function rankingTitel(kategorie: AwardCategory, wo: string): string {
  const t = kategorie.thema;
  return `${t[0].toUpperCase()}${t.slice(1)} ${wo}`;
}
