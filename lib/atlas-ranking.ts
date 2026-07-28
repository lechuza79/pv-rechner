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
      if (g.population < RANKING_MIN_POPULATION) return false;
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
