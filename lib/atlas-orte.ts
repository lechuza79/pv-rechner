// Ortsangaben und Ebenen-Identität im Solar-Atlas — EINE Quelle.
//
// Warum das hier zentral steht (Juli 2026): Beides war über die Atlas-Seiten
// verstreut und driftete auseinander. Die Präposition wurde einmal aus der
// amtlichen Bezeichnung abgeleitet und einmal fest getippt ("im " + Kreisname),
// woraus "Top Kommunen im Stuttgart" wurde. Und die Frage, ob der Elternteil
// einer Region in Wahrheit die Region selbst ist, wurde stellenweise beantwortet
// — erst für die Rangliste, später für die Tendenz, die Karte, die Breadcrumb
// und die strukturierten Daten, jedes Mal einzeln und jedes Mal unvollständig.

/** Region-Merkmale, die für Ortsangaben gebraucht werden. */
export type OrtRegion = {
  name: string;
  level?: string | null;
};

// Die Präposition hängt am NAMEN, nicht an der amtlichen Bezeichnung — der Name
// ist das, was auf der Seite steht. Aus der Bezeichnung abgeleitet ergab es bei
// drei Kreisen Unsinn: "im Region Hannover" und "im Städteregion Aachen" (beide
// tragen die Bezeichnung "Landkreis"/"Kreis") sowie "in Regionalverband
// Saarbrücken" (Bezeichnung "Regionalverband").
const MASKULIN = /^(Landkreis|Kreis|Regionalverband|Saalekreis|Ostalbkreis)\b/;
const FEMININ = /^(Region|Städteregion)\b/; // "Regionalverband" trifft das nicht: kein Wortende nach "Region"
// Genau ein Bundesland trägt einen Artikel: das Saarland → "im Saarland".
// Alle übrigen fünfzehn stehen artikellos ("in Bayern", "in Sachsen-Anhalt").
const MIT_ARTIKEL = /^Saarland$/;

/**
 * Nur die Präposition — für Stellen, an denen der Ortsname getrennt gesetzt
 * wird (etwa als Auswahlfeld hinter dem Wort).
 */
export function ortPraeposition(name: string): "in" | "im" | "in der" {
  if (MASKULIN.test(name) || MIT_ARTIKEL.test(name)) return "im";
  if (FEMININ.test(name)) return "in der";
  return "in";
}

/**
 * Ortsangabe für Überschriften und Fließtext: "in Deutschland", "in Bayern",
 * "im Landkreis Würzburg", "in der Region Hannover", "im Saarland",
 * "in Stuttgart".
 */
export function ortPhrase(region: OrtRegion): string {
  if (region.level === "de") return "in Deutschland";
  return `${ortPraeposition(region.name)} ${region.name}`;
}

/** Gattungswort der untergeordneten Ebene, mit korrektem Numerus. */
export function childNoun(childLevel: string | null, anzahl?: number): string {
  const eins = anzahl === 1;
  if (childLevel === "bundesland") return eins ? "Bundesland" : "Bundesländer";
  if (childLevel === "landkreis") return eins ? "Kreis" : "Kreise";
  return eins ? "Gemeinde" : "Gemeinden";
}

/**
 * Kreisfreie Stadt: Sie IST ihr eigener Landkreis. Jeder Vergleich mit dem
 * „Landkreis" wäre ein Vergleich mit sich selbst.
 */
export function istKreisfrei(
  gemeindeRegionId: string,
  kreis: { region_id: string; name: string } | null | undefined,
  gemeindeName: string,
): boolean {
  return !!kreis && kreis.region_id === gemeindeRegionId.slice(0, 5) && kreis.name === gemeindeName;
}

/**
 * Stadtstaat ohne Kreisgliederung (Berlin, Hamburg): Bundesland, Kreis und
 * Gemeinde sind dieselbe Fläche — der Selbstvergleich sitzt also eine Ebene
 * höher als bei einer kreisfreien Stadt und bleibt bestehen, wenn man nur den
 * Kreis überspringt ("Tendenz gegenüber dem Durchschnitt in Berlin").
 *
 * Erkennungsmerkmal sind die Kreisziffern "000" im Gemeindeschlüssel. Gegen die
 * Daten geprüft (28.07.2026): Genau Hamburg (02000) und Berlin (11000) tragen
 * sie, jedes andere Bundesland beginnt bei 001 oder höher. Bremen zählt bewusst
 * NICHT dazu — dort ist Bremerhaven ein echter zweiter Kreis, der Vergleich mit
 * dem Bundesland also keiner mit sich selbst.
 */
export function istStadtstaat(regionId: string): boolean {
  return regionId.length >= 5 && regionId.slice(2, 5) === "000";
}
