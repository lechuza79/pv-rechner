/**
 * WELCHE SEITEN NACH DEM MONATLICHEN DATENLAUF FÜR UNGÜLTIG ERKLÄRT WERDEN.
 *
 * Diese Liste steht hier und nicht in der Route, damit ein Test sie gegen den
 * Dateibaum halten kann. Der Grund ist eine Fehlerklasse, die von aussen
 * unsichtbar ist: Wer eine Atlas-Route umbenennt oder eine neue mit langer
 * Haltbarkeit anlegt und diese Liste vergisst, bekommt keinen Fehler, keinen
 * roten Test und keine kaputte Seite — nur eine Seite, die nach dem Datenlauf
 * die Zahlen des Vormonats weiterzeigt. Genau die Sorte Fehler, die die
 * Projektanweisung als die schwerste des Projekts bezeichnet.
 *
 * Die Angabe ist das Next-Routenmuster, nicht die fertige Adresse: Ein Muster
 * deckt alle 11.000 Gemeindeadressen auf einmal ab, eine Adressliste müsste
 * gepflegt werden und würde veralten.
 */
export const ATLAS_REVALIDATE_ROUTEN = [
  "/solar-atlas/[[...pfad]]",
  "/solar-atlas/[bundesland]/[kreis]/[gemeinde]",
  "/solar-atlas/ranking/[[...pfad]]",
] as const;

/**
 * DER GEMEINSAME MARKER ALLER ATLAS-DATEN — und der Weg, der wirklich wirkt.
 *
 * Am 26.08.2026 auf Produktion gemessen: Das Ungültig-Erklären über die
 * Routenmuster oben wirkt NICHT. Alle drei Ebenen (Gemeinde, Bundesland,
 * Rangliste) lieferten davor und danach unverändert einen Cache-Treffer,
 * über anderthalb Minuten hinweg beobachtet — und die Schnittstelle meldete
 * dabei Erfolg. Der Grund: Die Atlas-Seiten entstehen erst beim Zugriff
 * (die Liste der vorab gebauten Seiten ist leer), also kennt das Framework
 * die konkreten Adressen gar nicht, auf die das Muster passen müsste.
 *
 * Deshalb hängt die Invalidierung an den DATEN statt an den Adressen: Jede
 * zwischengespeicherte Atlas-Abfrage trägt diesen Marker, und ein einziger
 * Aufruf erklärt alles für ungültig, was daran hängt — unabhängig davon, wie
 * viele Adressen daraus entstanden sind.
 *
 * Die Routenmuster bleiben zusätzlich stehen: Sie kosten nichts, und falls das
 * Framework sie später doch bedient, schadet der zweite Weg nicht. Verlassen
 * darf man sich nur auf den Marker.
 */
export const ATLAS_DATEN_TAG = "atlas-daten";

/**
 * Ab welcher Haltbarkeit eine Seite zwingend in die Liste oben gehört.
 *
 * Bis zu einem Tag verfällt eine Seite von selbst schnell genug, dass der
 * Datenlauf sie ohne Zutun einholt — so lief es bis zum 26.08.2026 für alle
 * Atlas-Seiten. Darüber ist das Ungültig-Erklären die einzige Stelle, an der
 * neue Zahlen sichtbar werden.
 */
export const REVALIDATE_PFLICHT_AB_SEKUNDEN = 86_400;
