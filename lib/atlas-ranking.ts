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
import type { RankingFeld } from "./ranking-felder";

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
  // Zubau zuerst — dieselbe Reihenfolge wie in der Navigation, damit Uebersicht
  // und Umschalter nicht widersprechen. Begruendung an rankingNav().
  const zubauZuerst = (a: AwardCategory & { slug: string }, b: AwardCategory & { slug: string }) =>
    Number(!a.slug.startsWith("zubau-")) - Number(!b.slug.startsWith("zubau-"));
  return {
    buerger: alle.filter((k) => k.traeger === "buerger").sort(zubauZuerst),
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
 * KEINE Einwohner-Untergrenze mehr.
 *
 * Sie lag bei 2.000 und schloss 5.627 von 10.742 Gemeinden aus — mehr als die
 * Hälfte, damit ein paar Ausreißer nicht oben stehen. Beim Nachmessen war der
 * Grund für diese Ausreißer aber ein anderer: Nicht der kleine Nenner, sondern
 * falsch etikettierte Anlagen. Die zehn Spitzenreiter der ungefilterten Liste
 * hatten „private" Dächer mit im Schnitt 107, 58 und 55 kWp — Gewerbehallen.
 * Dagegen hilft `plausibel` an der Kategorie (Größenprüfung), und die trifft
 * 17 Gemeinden statt 5.627.
 *
 * Und ohne Untergrenze wird die Liste NICHT zur Liste der kleinsten Orte:
 * Von den ersten hundert liegen 41 % zwischen 500 und 2.000 Einwohnern, die
 * Median-Einwohnerzahl ist 991, und der Zusammenhang zwischen Wert und
 * Ortsgröße bleibt bei −0,23. Es sind echte Spitzenreiter.
 *
 * Was die Zahl braucht, ist Kontext statt Ausschluss: Die Einwohnerzahl steht
 * in jeder Zeile, dann ordnet der Leser „48 Einwohner" selbst ein.
 */
export const RANKING_MIN_POPULATION = 0;

export type RankingZeile = {
  regionId: string;
  name: string;
  /** Steht in der Zeile: Ohne Untergrenze ordnet erst sie „48 Einwohner" ein. */
  population: number;
  /** Die absolute Menge hinter der Zahl („1 Balkonkraftwerk"), wo die Kategorie
   *  eine kennt. Ohne sie liest sich eine Rate groesser, als sie ist. */
  basis: string | null;
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
  /** Gegen wen verglichen wird (Groessenklasse oder Rolle). Ohne Feld liefert die
   *  Funktion alle — gebraucht fuer die Standort-Kategorien, wo die Ortsgroesse
   *  nichts erklaert. */
  feld?: RankingFeld | null,
): RankingZeile[] {
  const imFeld = (g: GemeindeStats) => !feld || feld.gilt(g);
  const rows = stats
    .filter((g) => {
      if (scopeId && !g.regionId.startsWith(scopeId)) return false;
      if (!imFeld(g)) return false;
      // Sieht die Anlage nach dem aus, was die Kategorie behauptet? Ersetzt die
      // frühere Einwohner-Untergrenze (Begründung an RANKING_MIN_POPULATION).
      if (kategorie.plausibel && !kategorie.plausibel(g)) return false;
      const w = kategorie.metric(g);
      return w !== null && w > 0;
    })
    .map((g) => ({
      regionId: g.regionId,
      name: g.name,
      population: g.population,
      basis: kategorie.basis ? kategorie.basis(g) : null,
      wert: kategorie.metric(g) as number,
    }))
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
      if (scopeId && !g.regionId.startsWith(scopeId)) return false;
      // Dieselbe Klasse wie oben — sonst waere die Rangveraenderung gegen ein
      // anderes Teilnehmerfeld gerechnet und jeder Ort schiene gesprungen.
      if (!imFeld(g)) return false;
      if (kategorie.plausibel && !kategorie.plausibel(g)) return false;
      const w = kategorie.metricVorjahr!(g);
      return w !== null && w > 0;
    })
    // Nur das, was der Vorjahres-Lauf braucht: Platz und Gleichstands-Entscheid.
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


// ─── Navigation ──────────────────────────────────────────────────────────────

/**
 * Die Kategorien als MENÜ, nicht als flache Liste.
 *
 * Warum: Die drei Zubau-Zeiträume sind nicht drei Themen, sondern eines mit drei
 * Einstellungen. Als gleichrangige Knöpfe nebeneinander machten sie die Reihe
 * doppelt so lang und ließen "Zubau" dreimal auftauchen. Sie stehen jetzt unter
 * EINEM Punkt, die Zeiträume erscheinen erst darunter, wenn er gewählt ist.
 *
 * Die Kurzlabels tragen nur das Thema — was genau gemessen wird (je Einwohner,
 * welcher Zeitraum), sagt die Überschrift der Seite darunter.
 */
export type RankingNavPunkt = {
  /** Kurz fürs Menü. */
  label: string;
  /** Die Kategorie, auf die der Punkt führt (bei Zubau: der Standard-Zeitraum). */
  slug: string;
  /** Weitere Einstellungen desselben Themas, als zweite Ebene. */
  zeitraeume?: { label: string; slug: string }[];
};

const KURZ: Record<string, string> = {
  "solarleistung-je-einwohner": "Solarleistung",
  "balkonkraftwerke-je-einwohner": "Balkonkraftwerke",
  "speicherkapazitaet-je-einwohner": "Speicher",
  "solarleistung-gesamt": "Solar gesamt",
  "freiflaechen-solar": "Freifläche",
  windleistung: "Wind",
  "solar-zubau": "Zubau gesamt",
};

const ZUBAU_ZEITRAEUME = [
  { label: "1 Jahr", slug: "zubau-1-jahr-je-einwohner" },
  { label: "3 Jahre", slug: "zubau-3-jahre-je-einwohner" },
  { label: "5 Jahre", slug: "zubau-5-jahre-je-einwohner" },
];

export function rankingNav(): { buerger: RankingNavPunkt[]; standort: RankingNavPunkt[] } {
  const { buerger, standort } = rankingKategorienGruppiert();
  const zubauSlugs = new Set(ZUBAU_ZEITRAEUME.map((z) => z.slug));
  const einzeln = (k: AwardCategory & { slug: string }): RankingNavPunkt => ({
    label: KURZ[k.slug] ?? k.thema,
    slug: k.slug,
  });
  // ZUBAU ZUERST. Der Bestand belohnt, wer frueh angefangen hat; der Zubau
  // belohnt, wer JETZT baut — und nur das kann eine Gemeinde noch entscheiden.
  // Dieselbe Begruendung wie beim Wattbewerb, dem bundesweiten Staedte-Wettbewerb
  // auf denselben Registerdaten: "Der Spielstand haengt jedoch nie vom Startwert
  // ab, sondern immer und grundsaetzlich nur vom Zubau."
  return {
    buerger: [
      ...(buerger.some((k) => zubauSlugs.has(k.slug))
        ? [{ label: "Zubau", slug: ZUBAU_ZEITRAEUME[1].slug, zeitraeume: ZUBAU_ZEITRAEUME }]
        : []),
      ...buerger.filter((k) => !zubauSlugs.has(k.slug)).map(einzeln),
    ],
    standort: standort.map(einzeln),
  };
}

/** Zu welchem Menüpunkt gehört eine Kategorie? Für die aktive Markierung. */
export function navPunktVon(slug: string): RankingNavPunkt | null {
  const { buerger, standort } = rankingNav();
  return (
    [...buerger, ...standort].find((p) => p.slug === slug || p.zeitraeume?.some((z) => z.slug === slug)) ?? null
  );
}
