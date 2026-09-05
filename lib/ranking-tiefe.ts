/**
 * WELCHE RANGLISTEN-ADRESSE LOHNT DIE ABLAGE — und welche nicht.
 *
 * Gemessen am 05.09.2026 ueber 24 h: 3.806 Ranglisten-Aufbauten verteilten sich
 * auf 3.679 VERSCHIEDENE Adressen, also 1,03 Aufrufe je Adresse. Jeder dieser
 * Aufbauten wird zusaetzlich in den Zwischenspeicher geschrieben (nachgemessen:
 * der zweite Abruf derselben Adresse kommt als Treffer zurueck) — 3.700
 * Ablagen am Tag fuer Seiten, die kein zweites Mal gelesen werden. Ablagen sind
 * laut eigener Kostenerhebung der groesste Posten der Rechnung.
 *
 * Die oberen Ebenen sind der andere Fall: bundesweite Listen und Landeslisten
 * sind wenige Adressen mit echten Wiederholungen, sie behalten ihre Ablage.
 *
 * ES WIRD NICHTS GELOESCHT. Jede Kreis-Rangliste bleibt vollstaendig erreichbar,
 * sie wird nur bei jedem Aufruf frisch gebaut statt abgelegt — gemessen 0,2 bis
 * 0,4 Sekunden, also das, was ein Besucher heute auch schon zahlt, wenn er der
 * erste auf dieser Adresse ist.
 */

/**
 * Die Vergleichsfelder, wie sie in der Adresse stehen.
 *
 * Bewusst als eigene, flache Liste statt eines Imports: Diese Datei wird von der
 * Middleware gelesen und liefe sonst mit dem halben Datenmodell im Edge-Buendel.
 * `lib/__tests__/ranking-tiefe.test.ts` haelt sie gegen die echten Felder — eine
 * zweite Liste ist nur dann keine zweite Wahrheit, wenn ein Test sie festnagelt.
 */
export const RANKING_FELD_SLUGS = [
  "doerfer",
  "kleine-gemeinden",
  "gemeinden-und-kleinstaedte",
  "mittelgrosse-staedte",
  "grossstaedte",
  "landeshauptstaedte",
  "kreisfreie-staedte",
];

/**
 * Zeigt diese Adresse eine Rangliste INNERHALB eines Landkreises?
 *
 * Aufbau der Adresse: <kategorie>[/<vergleichsfeld>][/<bundesland>[/<kreis>]][/seite-n].
 * Die Zahl der Segmente allein reicht nicht — „kategorie/doerfer" und
 * „kategorie/bayern" sind beide zwei lang. Deshalb wird das Vergleichsfeld an
 * seinem Namen erkannt und herausgenommen; was dann noch zwei Segmente hat, ist
 * Land plus Kreis.
 */
export function istKreisEbene(pfad: string[]): boolean {
  const rest = [...pfad];
  rest.shift(); // Kategorie
  if (/^seite-\d{1,4}$/.test(rest[rest.length - 1] ?? "")) rest.pop();
  if (rest[0] && RANKING_FELD_SLUGS.includes(rest[0])) rest.shift();
  return rest.length === 2;
}

/** Aus einer vollen Adresse — alles hinter „/solar-atlas/ranking/". */
export function istKreisRangliste(pathname: string): boolean {
  const basis = "/solar-atlas/ranking/";
  if (!pathname.startsWith(basis)) return false;
  const teile = pathname.slice(basis.length).split("/").filter(Boolean);
  return teile.length > 0 && istKreisEbene(teile);
}
