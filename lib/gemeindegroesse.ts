// Größenklassen für die öffentlichen Ranglisten.
//
// WARUM ES SIE GIBT (29.07.2026): Eine Pro-Kopf-Rangliste über alle 10.742
// Kommunen belohnt den kleinen Nenner, nicht die Leistung. Gemessen an den
// echten Daten lagen in JEDER Bürger-Kategorie praktisch alle 100 Spitzenplätze
// unter 5.000 Einwohnern, beim Zubau die komplette Top 100 sogar unter 1.000
// (Median 180 Einwohner). In einem 150-Seelen-Dorf reichen drei neue Dächer für
// den Bundessieg, in Freiburg bräuchte es zweitausend.
//
// SCHNITT UND BENENNUNG FOLGEN DER SOLARBUNDESLIGA (solarbundesliga.de, 2001
// bis 2017 bundesweit; Kategorien geprüft am 30.07.2026 über
// de.wikipedia.org/wiki/Solarbundesliga): "Großstädte mit über 100.000",
// "Mittelstädte (20.000–99.999 Einwohner)", "Kleinstädte (5.000–19.999)",
// "Gemeinden von 1.000–4.999", "Kleingemeinden mit unter 999 Einwohnern". Deren
// Begründung ist dieselbe wie unsere: für große Städte sind hohe Pro-Kopf-Werte
// schwerer zu erreichen.
//
// Der zusätzliche Schnitt bei 1.000 ist der wichtige Teil. Er trennt den
// 91-Einwohner-Weiler vom 3.000-Einwohner-Dorf — genau dort saß der Effekt, der
// die Listen unbrauchbar machte. Die oberen drei Schwellen (5.000 / 20.000 /
// 100.000) sind identisch mit denen des BBSR-Stadt- und Gemeindetyps.
//
// ZUR BENENNUNG: Entscheidung des Betreibers (30.07.2026) — natürliche Sprache
// vor amtlicher Bezeichnung. "Kleinstadt" ist deshalb hier eine Größenklasse,
// keine Aussage über den Rechtsstatus eines Ortes: Unter 5.000 Einwohnern tragen
// 390 Orte amtlich "Stadt" (die kleinste ist Arnis mit 251), und zwischen 20.000
// und 100.000 gibt es 37 echte Gemeinden (Seevetal hat 44.158). Wer die amtliche
// Bezeichnung eines einzelnen Ortes braucht, nimmt `bezeichnung` aus
// mastr_regions — nicht diese Klasse.

export type GroessenklasseSlug =
  | "kleingemeinden"
  | "gemeinden"
  | "kleinstaedte"
  | "mittelstaedte"
  | "grossstaedte";

export type Groessenklasse = {
  slug: GroessenklasseSlug;
  /** Sammelbegriff im Plural — trägt Umschalter, Kacheln und Fließtext. */
  label: string;
  /** Einzahl, für Spaltenköpfe ("Kleinstadt"). */
  einzahl: string;
  /** Die Einwohnerspanne als Text, immer sichtbar neben dem Namen — der Name
   *  allein sagt nicht, wo die Grenze liegt. */
  spanne: string;
  min: number;
  /** Obergrenze exklusiv; null = nach oben offen. */
  max: number | null;
};

export const GROESSENKLASSEN: Groessenklasse[] = [
  {
    // "Dörfer" statt "Kleingemeinden": Unter 1.000 Einwohnern sind nur 14 von
    // 3.798 Orten amtlich Städte (die kleinste ist Arnis mit 251). Entscheidung
    // des Betreibers am 31.07.2026: Alltagssprache vor amtlicher Bezeichnung.
    slug: "kleingemeinden",
    label: "Dörfer",
    einzahl: "Dorf",
    spanne: "unter 1.000",
    min: 0,
    max: 1_000,
  },
  {
    // "Kleine Gemeinden", damit "Gemeinden" nicht zweimal untereinander steht —
    // die naechste Stufe heisst "Gemeinden und Kleinstaedte".
    slug: "gemeinden",
    label: "Kleine Gemeinden",
    einzahl: "Kleine Gemeinde",
    spanne: "1.000–5.000",
    min: 1_000,
    max: 5_000,
  },
  {
    slug: "kleinstaedte",
    // NICHT nur "Kleinstädte": In dieser Spanne sind gemessen 45 % der Orte
    // amtlich Städte und 55 % Gemeinden. "Kleinstadt" wuerde also fuer die
    // Mehrheit etwas behaupten, was nicht stimmt — und ein 5.000-Einwohner-Ort
    // liest sich als "Kleinstadt" schlicht falsch.
    label: "Gemeinden und Kleinstädte",
    einzahl: "Gemeinde oder Kleinstadt",
    spanne: "5.000–20.000",
    min: 5_000,
    max: 20_000,
  },
  {
    slug: "mittelstaedte",
    // NICHT "Mittelstädte": fachlich korrekt (so heisst die Klasse beim BBSR und
    // in der Solarbundesliga), aber im Alltag sagt das niemand — "Kleinstadt"
    // und "Grossstadt" schon, "Mittelstadt" ist Planer-Sprache.
    label: "Mittelgroße Städte",
    einzahl: "Mittelgroße Stadt",
    spanne: "20.000–100.000",
    min: 20_000,
    max: 100_000,
  },
  { slug: "grossstaedte", label: "Großstädte", einzahl: "Großstadt", spanne: "ab 100.000", min: 100_000, max: null },
];

export const GROESSENKLASSE_BY_SLUG: Record<string, Groessenklasse> = Object.fromEntries(
  GROESSENKLASSEN.map((k) => [k.slug, k]),
);

/** "Kleinstädte (5.000–20.000 Einwohner)" — Name UND Spanne, weil der Name
 *  allein die Grenze nicht verrät. */
export function klasseLangform(k: Groessenklasse): string {
  return `${k.label} (${k.spanne} Einwohner)`;
}

/** In welche Klasse ein Ort fällt. Null nur bei fehlender Einwohnerzahl — die
 *  gehört in keine Rangliste, weil sich ohne sie nichts pro Kopf rechnen lässt. */
export function klasseVon(population: number): Groessenklasse | null {
  if (!population || population <= 0) return null;
  return GROESSENKLASSEN.find((k) => population >= k.min && (k.max === null || population < k.max)) ?? null;
}
