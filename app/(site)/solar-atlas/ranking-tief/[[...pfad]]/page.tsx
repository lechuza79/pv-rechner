/**
 * DIESELBE RANGLISTE, NUR OHNE ABLAGE — und niemand sieht diese Adresse.
 *
 * Die Ranglisten wohnen unter `/solar-atlas/ranking`. Zeigt eine Adresse auf die
 * Ebene INNERHALB eines Landkreises, schiebt die Middleware sie hierher — als
 * Umschreibung, nicht als Weiterleitung: Die Adresse im Browser bleibt
 * unveraendert, jeder geteilte oder verlinkte Ranglisten-Link haelt.
 *
 * Der einzige Unterschied zur Schwesterroute steht zwei Zeilen weiter unten: Sie
 * legt ihr Ergebnis sieben Tage ab, diese gar nicht. Warum, steht in
 * `lib/ranking-tiefe.ts` — kurz: 3.679 verschiedene Adressen bei 3.806
 * Aufrufen, jede Ablage also fuer einen zweiten Aufruf, der nie kommt.
 *
 * Seite, Metadaten und jede Zeile Inhalt kommen unveraendert aus der
 * Schwesterroute. Eine Kopie waere hier der Fehler: Sie wuerde beim ersten
 * Umbau der Ranglisten auseinanderlaufen, und niemand saehe es.
 */
export { default, generateMetadata } from "../../ranking/[[...pfad]]/page";

// Kein Vorab-Rendern und keine Ablage: bei jedem Aufruf frisch gebaut.
export const dynamic = "force-dynamic";
