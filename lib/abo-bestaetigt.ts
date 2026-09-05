/**
 * Der Parameter, mit dem die Ortsseite erfährt, dass gerade eine Anmeldung
 * bestätigt wurde.
 *
 * EIGENES MODUL, obwohl es nur eine Zeichenkette ist: Er wird an zwei Stellen
 * gebraucht, die auf verschiedenen Seiten der Server-Grenze liegen — die
 * Bestätigungsseite hängt ihn an die Weiterleitung, die Abo-Box liest ihn im
 * Browser. Läge er in der Datenschicht, zöge die Abo-Box deren Server-Sperre
 * mit; läge er in der Abo-Box, importierte die Bestätigungsseite eine
 * Client-Komponente. Dieselbe Trennung wie bei den Technik-Konstanten.
 *
 * Zweimal getippt wäre er die Sorte Fehler, die still bleibt: Ein Tippfehler
 * auf einer der beiden Seiten führt zu einer Weiterleitung, die funktioniert,
 * aber keine Bestätigung zeigt.
 */
export const ABO_BESTAETIGT_PARAM = "abo";
