// Größenklassen für die öffentlichen Ranglisten.
//
// WARUM ES SIE GIBT (29.07.2026): Eine Pro-Kopf-Rangliste über alle 10.742
// Kommunen belohnt den kleinen Nenner, nicht die Leistung. Gemessen an den
// echten Daten lagen in JEDER Bürger-Kategorie praktisch alle 100 Spitzenplätze
// unter 5.000 Einwohnern, beim Zubau die komplette Top 100 sogar unter 1.000
// (Median 180 Einwohner). In einem 150-Seelen-Dorf reichen drei neue Dächer für
// den Bundessieg, in Freiburg bräuchte es zweitausend — die Liste beantwortete
// damit nicht "wer baut am meisten", sondern "wo wohnen die wenigsten".
//
// Die Award-Logik (lib/awards.ts, für die Kommunen-Anschreiben) trennt seit
// jeher nach Größe; sie tut das über Terzile INNERHALB des Vergleichsgebiets.
// Für öffentliche Seiten taugt das nicht: Ein Terzil ist niemandem erklärbar und
// verschiebt sich je Landkreis. Hier stehen deshalb absolute Schwellen. Zwei
// Systeme mit Absicht — die Anschreiben vergleichen innerhalb eines Kreises, die
// Ranglisten bundesweit.
//
// HERKUNFT DER SCHWELLEN: 5.000 / 20.000 / 100.000 sind die Einwohner-Schwellen
// des BBSR-Stadt- und Gemeindetyps (bbsr.bund.de, Raumabgrenzungen → Gemeinden →
// Stadt- und Gemeindetyp, geprüft 29.07.2026).
//
// WARUM TROTZDEM NICHT "Kleinstadt"/"Mittelstadt": Beim BBSR entscheidet neben
// der Einwohnerzahl auch die zentralörtliche Funktion ("Gemeinden mit
// oberzentraler Funktion werden bereits ab 9.000 Einwohnern als Mittelstadt
// eingeordnet"). Diese Funktion liegt uns nicht vor. Eine Gemeinde als
// "Kleinstadt" zu bezeichnen wäre also eine Behauptung, die wir nicht prüfen
// können — die Klassen heißen deshalb nach ihrer Einwohnerspanne, was sie
// wirklich sind.

export type GroessenklasseSlug = "unter-5000" | "5000-20000" | "20000-100000" | "ab-100000";

export type Groessenklasse = {
  slug: GroessenklasseSlug;
  /** Kurz, für Umschalter und Kacheln. */
  label: string;
  /** Ausgeschrieben, für Überschriften und Fließtext. */
  langform: string;
  min: number;
  /** Obergrenze exklusiv; null = nach oben offen. */
  max: number | null;
};

export const GROESSENKLASSEN: Groessenklasse[] = [
  { slug: "unter-5000", label: "unter 5.000", langform: "Kommunen unter 5.000 Einwohnern", min: 0, max: 5_000 },
  { slug: "5000-20000", label: "5.000–20.000", langform: "Kommunen mit 5.000 bis 20.000 Einwohnern", min: 5_000, max: 20_000 },
  {
    slug: "20000-100000",
    label: "20.000–100.000",
    langform: "Kommunen mit 20.000 bis 100.000 Einwohnern",
    min: 20_000,
    max: 100_000,
  },
  { slug: "ab-100000", label: "ab 100.000", langform: "Kommunen ab 100.000 Einwohnern", min: 100_000, max: null },
];

export const GROESSENKLASSE_BY_SLUG: Record<string, Groessenklasse> = Object.fromEntries(
  GROESSENKLASSEN.map((k) => [k.slug, k]),
);

/** In welche Klasse ein Ort fällt. Null nur bei fehlender Einwohnerzahl — die
 *  gehört in keine Rangliste, weil sich ohne sie nichts pro Kopf rechnen lässt. */
export function klasseVon(population: number): Groessenklasse | null {
  if (!population || population <= 0) return null;
  return GROESSENKLASSEN.find((k) => population >= k.min && (k.max === null || population < k.max)) ?? null;
}
