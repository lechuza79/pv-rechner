// Ask-Variante je Gemeinde: Was fragen wir überhaupt?
//
// WARUM ES ZWEI VARIANTEN GIBT: Der ursprüngliche Ask war „bettet unser Widget
// ein". Für eine Verwaltung heißt das CMS-Zugriff, IT und
// Datenschutzbeauftragter — vier Beteiligte für ein kostenloses Angebot ohne
// Frist. So etwas setzt sich intern gegen nichts durch.
//
// Der primäre Ask ist deshalb eine FERTIGE MELDUNG: Die Auszeichnung ist
// verwendbare Lokalnachricht mit amtlicher Quelle. Ein Beteiligter, kein
// iframe, keine Datenschutzprüfung — und der Link auf uns steht als echtes
// <a> im HTML der Gemeindeseite. Das Widget bleibt als dauerhafte Alternative,
// aber nur dort, wo jemand sitzt, der es umsetzen kann.

export type AskVariante = "nur_meldung" | "meldung_plus_widget";

/** Ab hier hat eine Verwaltung erfahrungsgemäß eine Pressestelle oder ein
 *  Klimaschutzmanagement. Gemessen am 27.07.2026: Über 20.000 Einwohner trifft
 *  33 % der Versandliste und damit die angepeilte 30/70-Verteilung.
 *
 *  Die naheliegende Alternative — „hat eine Pressestelle im Menü" — wurde
 *  geprüft und verworfen: Sie fände nur 13 % und erkennt von 33 großen
 *  Gemeinden lediglich 9, weil große Portale ihre Struktur nicht im Menü
 *  zeigen. Die Einwohnerzahl ist unvollständiger im Signal, aber vollständig
 *  in der Abdeckung — und das schlägt hier. */
export const WIDGET_AB_EINWOHNER = 20_000;

/**
 * Variante bestimmen.
 *
 * `operativeStelle` = im Impressum ist eine Redaktions-/Pressestelle NAMENTLICH
 * benannt (nicht die gesetzliche Vertretung). Wo wir das belegt haben, gibt es
 * die Person wirklich — dann bekommt auch eine kleinere Gemeinde den
 * Widget-Absatz. Das sind wenige Fälle, aber es sind die sicheren.
 */
export function askVariante(o: { population: number | null; operativeStelle?: boolean }): AskVariante {
  if ((o.population ?? 0) > WIDGET_AB_EINWOHNER) return "meldung_plus_widget";
  if (o.operativeStelle) return "meldung_plus_widget";
  return "nur_meldung";
}

export const ASK_VARIANTEN: AskVariante[] = ["nur_meldung", "meldung_plus_widget"];

export const ASK_LABEL: Record<AskVariante, string> = {
  nur_meldung: "Nur Meldung",
  meldung_plus_widget: "Meldung + Widget",
};

/** Kennzahlen einer Variante für die Auswertung. Zweck: nach einem Durchgang
 *  wissen, ob das Widget überhaupt nachgefragt wird. */
export type VariantenBilanz = {
  variante: AskVariante;
  versendet: number;
  klicks: number;
  /** Gemeinden mit mindestens einem Klick — aussagekräftiger als die reine
   *  Klicksumme, die ein einzelner Sicherheits-Scanner hochtreiben kann. */
  gemeindenMitKlick: number;
  antworten: number;
  widgetAnfragen: number;
};

export function bilanziere(
  zeilen: { versendet_variante: string | null; ref_klicks: number | null; responded_at: string | null; widget_anfrage: boolean | null }[],
): VariantenBilanz[] {
  return ASK_VARIANTEN.map((variante) => {
    const eigene = zeilen.filter((z) => z.versendet_variante === variante);
    return {
      variante,
      versendet: eigene.length,
      klicks: eigene.reduce((s, z) => s + (z.ref_klicks ?? 0), 0),
      gemeindenMitKlick: eigene.filter((z) => (z.ref_klicks ?? 0) > 0).length,
      antworten: eigene.filter((z) => z.responded_at).length,
      widgetAnfragen: eigene.filter((z) => z.widget_anfrage).length,
    };
  });
}

/** Kurzer, sprechender Weiterleitungs-Token je Gemeinde. Aus dem Slug, damit
 *  der Link im Anschreiben lesbar bleibt (`solar-check.io/r/hoechberg`) — der
 *  AGS hängt nur bei Namensgleichheit hinten dran. */
export function refToken(slug: string | null, regionId: string, vergeben: Set<string>): string {
  const basis = (slug ?? regionId).toLowerCase().replace(/[^a-z0-9-]/g, "");
  const kandidat = basis || regionId;
  if (!vergeben.has(kandidat)) return kandidat;
  return `${kandidat}-${regionId.slice(-3)}`;
}
