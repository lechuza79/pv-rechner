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

/**
 * DIE VARIANTE IST EINE ZIELREGEL, KEIN VERSUCH — und das ist der Unterschied,
 * an dem die Auswertung hängt.
 *
 * Wer die Variante bekommt, entscheidet die Einwohnerzahl (oben): große
 * Verwaltungen den Widget-Absatz, kleine nur die Meldung. Die beiden Gruppen
 * unterscheiden sich damit NICHT im Text, sondern in der Gemeindegröße — eine
 * Stadt mit Pressestelle antwortet aus hundert Gründen anders als ein Dorf mit
 * drei Beschäftigten. Eine Gegenüberstellung der Rückmeldequoten sagt deshalb
 * nichts über den Text aus; sie vergleicht groß gegen klein.
 *
 * Das stand hier bis zum 20.08.2026 anders: Die Zahlen liefen als „Bilanz je
 * Variante" nebeneinander, mit dem ausdrücklichen Zweck, herauszufinden, ob das
 * Widget nachgefragt wird — und die Oberfläche versprach dazu, beide Fassungen
 * seien „sonst identisch, sonst wüssten wir hinterher nicht, woran eine Reaktion
 * lag". Der Satz beschreibt einen Versuchsaufbau, den es nie gab.
 *
 * Was hier zu sehen ist, ist eine VERTEILUNG: wie viele Briefe welcher Fassung
 * hinausgegangen sind. Ob die Ansprache trägt, beantwortet nicht diese Tabelle,
 * sondern die Frage, ob eine Gemeinde die Meldung veröffentlicht.
 */
export type VariantenVerteilung = {
  variante: AskVariante;
  versendet: number;
  antworten: number;
  widgetAnfragen: number;
};

export function verteile(
  zeilen: { versendet_variante: string | null; responded_at: string | null; widget_anfrage: boolean | null }[],
): VariantenVerteilung[] {
  return ASK_VARIANTEN.map((variante) => {
    const eigene = zeilen.filter((z) => z.versendet_variante === variante);
    return {
      variante,
      versendet: eigene.length,
      antworten: eigene.filter((z) => z.responded_at).length,
      widgetAnfragen: eigene.filter((z) => z.widget_anfrage).length,
    };
  });
}

/**
 * Die Erklärung im Cockpit — hier, weil sie eine Aussage über das Verfahren ist
 * und nicht über die Darstellung. Ein Satz, der die Zielregel als Versuch
 * beschreibt, ist an der Oberfläche nicht als falsch zu erkennen.
 */
export const VARIANTE_ERKLAERUNG =
  "Variante = welches der beiden Anschreiben diese Gemeinde bekommt. " +
  "Nur Meldung bietet ausschließlich den fertigen Pressetext an — ein Beteiligter, kein Technikaufwand. " +
  "Meldung + Widget hängt einen Absatz an, der zusätzlich das einbettbare Widget anbietet. " +
  `Wer was bekommt, entscheidet die Größe: ab ${WIDGET_AB_EINWOHNER.toLocaleString("de-DE")} Einwohnern ` +
  "oder mit belegter Pressestelle der Widget-Absatz, sonst nur die Meldung.";

export const VERTEILUNG_HINWEIS =
  "Das ist eine Verteilung, kein Vergleich: Die beiden Gruppen unterscheiden sich nach Gemeindegröße, " +
  "nicht nach Zufall. Ob die Ansprache trägt, zeigt sich daran, ob eine Gemeinde die Meldung veröffentlicht.";

/** Kurzer, sprechender Weiterleitungs-Token je Gemeinde. Aus dem Slug, damit
 *  der Link im Anschreiben lesbar bleibt (`solar-check.io/r/hoechberg`) — der
 *  AGS hängt nur bei Namensgleichheit hinten dran. */
export function refToken(slug: string | null, regionId: string, vergeben: Set<string>): string {
  const basis = (slug ?? regionId).toLowerCase().replace(/[^a-z0-9-]/g, "");
  const kandidat = basis || regionId;
  if (!vergeben.has(kandidat)) return kandidat;
  return `${kandidat}-${regionId.slice(-3)}`;
}
