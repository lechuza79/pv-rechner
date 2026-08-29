// Feiertage und Schulferien im Redaktionskalender — als AUSKUNFT, nicht als
// Sperre.
//
// DER UNTERSCHIED ZUM BRIEFVERSAND, und er ist inhaltlich: Ein Anschreiben, das
// in einem Ferien-Postfach landet, ist verloren — deshalb verweigert der Versand
// dort. Ein Beitrag im Feed erreicht in den Ferien nur ein etwas anderes
// Publikum; ihn zu sperren wäre eine Sperre ohne Schaden dahinter. Und sie hätte
// einen Preis: Ein Platz, den die Automatik blockiert, wird zum verstrichenen
// Plan, und davon hat dieser Kalender schon genug Bauformen.
//
// Also: hinschreiben, was ist, und den Menschen entscheiden lassen.
//
// BUNDESWEIT GEDACHT, nicht je Land. Der Briefversand fragt „darf ich HEUTE nach
// Nidda schreiben" — eine Frage an ein Bundesland. Der Feed hat kein
// Bundesland; für ihn zählt, wie viele der sechzehn gerade Ferien haben. Ein
// Land in Ferien ist Rauschen, zwölf sind eine Aussage über die Reichweite.

import { FEIERTAGE, SCHULFERIEN, SCHULFERIEN_ABGEDECKT_BIS, ferienAm } from "./schulferien";

/** Die sechzehn Länderschlüssel, aus der Ferientabelle selbst. */
const LAENDER = Object.keys(SCHULFERIEN);

export type Tagesbefund = {
  /** Bundesweiter Feiertag, sonst null. */
  feiertagUeberall: string | null;
  /** Feiertag in einzelnen Ländern — Name und Anzahl. */
  feiertagRegional: { name: string; laender: number } | null;
  /** In wie vielen der sechzehn Länder Schulferien sind. */
  ferienLaender: number;
  /**
   * Reicht die Tabelle für diesen Tag?
   *
   * Läuft sie aus, sagt sie nicht „keine Ferien", sondern „ich weiß es nicht" —
   * und der Kalender muss das unterscheiden können. Eine leere Tabelle, die als
   * „nichts los" gelesen wird, ist gefährlicher als gar keine.
   */
  bekannt: boolean;
};

export function tagesbefund(iso: string): Tagesbefund {
  if (iso > SCHULFERIEN_ABGEDECKT_BIS) {
    return { feiertagUeberall: null, feiertagRegional: null, ferienLaender: 0, bekannt: false };
  }

  const bundesweit = FEIERTAGE["*"]?.find((f) => f.tag === iso)?.name ?? null;

  // Regionale Feiertage: derselbe Name kann in mehreren Ländern stehen.
  const regional = new Map<string, number>();
  for (const [land, liste] of Object.entries(FEIERTAGE)) {
    if (land === "*") continue;
    const treffer = liste.find((f) => f.tag === iso);
    if (treffer) regional.set(treffer.name, (regional.get(treffer.name) ?? 0) + 1);
  }
  const groesster = [...regional.entries()].sort((a, b) => b[1] - a[1])[0];

  const ferienLaender = LAENDER.filter((l) => ferienAm(l, iso)).length;

  return {
    feiertagUeberall: bundesweit,
    feiertagRegional: bundesweit || !groesster ? null : { name: groesster[0], laender: groesster[1] },
    ferienLaender,
    bekannt: true,
  };
}

/**
 * Der Satz, der im Kalender an einem Tag steht — oder nichts.
 *
 * Schweigt bei wenigen Ferienländern: Irgendwo in Deutschland hat immer jemand
 * Ferien, und ein Hinweis, der an zweihundert Tagen im Jahr erscheint, wird
 * weggelesen. Die Schwelle ist gegriffen und darf deshalb NICHTS sperren — sie
 * steuert nur, ob ein Satz sichtbar wird.
 */
export const FERIEN_AB_LAENDERN = 8;

export function tagesHinweis(b: Tagesbefund): string | null {
  if (!b.bekannt) return "Ferientermine für diesen Tag nicht erfasst";
  if (b.feiertagUeberall) return b.feiertagUeberall;
  if (b.feiertagRegional) {
    return `${b.feiertagRegional.name} (${b.feiertagRegional.laender} ${
      b.feiertagRegional.laender === 1 ? "Land" : "Länder"
    })`;
  }
  if (b.ferienLaender >= FERIEN_AB_LAENDERN) return `Ferien in ${b.ferienLaender} Ländern`;
  return null;
}
