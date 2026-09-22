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
// Zusätzlich alles, was auf „-kreis" ENDET: „im Wetteraukreis", „im
// Main-Taunus-Kreis", „im Eifelkreis Bitburg-Prüm". Das trat erst zutage, als
// der Anschreiben-Text den bereinigten Anzeigenamen benutzte — vorher stand
// immer die vorangestellte Gattung davor und traf die erste Alternative.
const MASKULIN = /^(Landkreis|Kreis|Regionalverband|Saalekreis|Ostalbkreis)\b|kreis\b/i;
// "Regionalverband" trifft das nicht: kein Wortende nach "Region".
const FEMININ = /^(Region|Städteregion|Verbandsgemeinde)\b/;
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

/**
 * Gattungswörter, die das amtliche Verzeichnis VOR den Kernnamen stellt.
 *
 * Eine Quelle für zwei Fragen, die sonst auseinanderlaufen: Welches Wort darf
 * beim Anzeigenamen wegfallen, wenn der Rest die Gattung schon trägt
 * (`regionDisplayName` in lib/atlas-format.ts) — und welches Wort bleibt übrig,
 * wenn man den Ortsnamen weglässt (`gattungPhrase` hier).
 */
export const VORANGESTELLTE_GATTUNG = [
  "Landkreis",
  "Kreis",
  "Region",
  "Städteregion",
  "Regionalverband",
  "Verbandsgemeinde",
] as const;

/**
 * Nur die GATTUNG mit ihrer Präposition: "im Landkreis", "im Kreis",
 * "in der Region", "in der Städteregion", "im Regionalverband".
 *
 * Für Stellen, an denen der Ortsname nichts beiträgt, weil der Leser ohnehin
 * dort sitzt — im Betreff des Kommunen-Anschreibens etwa kostet "Landkreis
 * Würzburg" nur Zeichen, die das Postfach abschneidet.
 *
 * WARUM NICHT FEST "im Landkreis" (der Fehler bis 31.07.2026): Nordrhein-
 * Westfalen und Schleswig-Holstein kennen keine Landkreise, sondern Kreise;
 * dazu kommen Region Hannover, Städteregion Aachen und Regionalverband
 * Saarbrücken. Rund 1.500 Gemeinden bekamen damit im Betreff eine
 * Verwaltungsebene genannt, die es in ihrem Bundesland nicht gibt.
 *
 * Trägt der Name kein vorangestelltes Gattungswort ("Saalekreis", eine
 * kreisfreie Stadt), gibt es nichts zu kürzen — dann steht der volle Name da.
 */
export function gattungPhrase(name: string): string {
  const idx = name.indexOf(" ");
  const erstes = idx > 0 ? name.slice(0, idx) : "";
  if (!(VORANGESTELLTE_GATTUNG as readonly string[]).includes(erstes)) return ortPhrase({ name });
  return `${ortPraeposition(erstes)} ${erstes}`;
}

/**
 * Der Ortsname ohne Unterscheidungszusatz: „Langen (Hessen)" → „Langen",
 * „Ilbesheim bei Landau in der Pfalz" → „Ilbesheim".
 *
 * WOFÜR: Für Texte, die die Gemeinde ÜBER SICH SELBST veröffentlichen soll.
 * Kein Ort schreibt den Zusatz in seine eigene Pressemeldung — er existiert nur,
 * um ihn von einem gleichnamigen Ort anderswo zu unterscheiden. Die
 * Anschreiben-Meldung trug ihn („In Langen (Hessen) sind 1.422 Solaranlagen…"),
 * und damit musste die Stadtkommunikation doch redigieren, obwohl der Brief
 * „fertig formuliert" verspricht. Nebenbei kostete der längste Zusatz 24
 * Zeichen im Betreff und war der einzige, der im Postfach abgeschnitten wurde.
 *
 * NICHT für Adressen, Verzeichnisse oder irgendetwas, das eindeutig sein muss —
 * dort ist der Zusatz die ganze Aussage.
 */
export function kurzOrtsname(name: string): string {
  const ohneKlammer = name.replace(/\s*\(.*?\)\s*$/, "").trim();
  // NUR „bei" wird abgeschnitten, NICHT „am", „an der" oder „i. d.". „Neustadt
  // an der Weinstraße" heißt auch vor Ort so; „Ilbesheim bei Landau in der
  // Pfalz" nennt sich selbst „Ilbesheim". Der Unterschied ist, ob der Zusatz
  // zum Namen gehört oder ihn nur von einem anderen Ort abgrenzt.
  const ohneZusatz = ohneKlammer.split(/\s+bei\s+/)[0].trim();
  return ohneZusatz.length >= 3 ? ohneZusatz : ohneKlammer || name;
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
