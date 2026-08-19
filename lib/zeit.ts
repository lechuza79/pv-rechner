// Der KALENDERTAG, an dem wir gerade sind — deutscher Kalendertag, nicht UTC.
//
// WARUM DAS EINE EIGENE FUNKTION IST: `new Date().toISOString().slice(0,10)`
// liest sich wie „heute" und ist es zwischen 00:00 und 02:00 deutscher
// Sommerzeit nicht — dann steht dort der Vortag. Überall, wo ein Datum gegen
// eine Frist oder einen Zeitraum verglichen wird (Schulferien, Antragsfristen,
// Stichtage), verschiebt das den Wechsel um einen Tag, und zwar in einem
// Zeitfenster, in dem niemand hinsieht. Derselbe Fehler ist bei der
// Balkon-Monatsfrist schon einmal aufgetreten.
//
// Für ZEITSTEMPEL (wann ist etwas passiert) bleibt UTC richtig — die Funktion
// hier ist ausschließlich für Kalendertage.

/** „2026-08-19" — der laufende Kalendertag in Deutschland. */
export function heuteInBerlin(jetzt: Date = new Date()): string {
  // `sv-SE` formatiert als YYYY-MM-DD; das ist der kürzeste zuverlässige Weg
  // zu einem ISO-Datum in einer bestimmten Zeitzone, ohne eine Bibliothek.
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(jetzt);
}

/**
 * Der Zeitzonen-Versatz Deutschlands als „+02:00" bzw. „+01:00".
 *
 * Für Zeitstempel, die eine Datenbank lesen soll: Ein Datum ohne Versatz gilt
 * dort als UTC, und ein „Tagesbeginn" wäre damit zwei Stunden zu spät.
 */
export function berlinOffset(jetzt: Date = new Date()): string {
  const teile = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    timeZoneName: "longOffset",
  }).formatToParts(jetzt);
  const name = teile.find((t) => t.type === "timeZoneName")?.value ?? "GMT+01:00";
  return name.replace("GMT", "") || "+01:00";
}

/** Wochentag in Deutschland, 0 = Sonntag. */
export function wochentagInBerlin(jetzt: Date = new Date()): number {
  const kurz = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", weekday: "short" }).format(jetzt);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(kurz);
}
