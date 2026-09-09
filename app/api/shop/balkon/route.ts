import { NextResponse } from "next/server";
import { holeSolakonAngebote, type ShopAngebote } from "../../../../lib/shop-solakon";

/**
 * Die Balkonkraftwerk-Angebote unserer Partner-Shops.
 *
 * WARUM ÜBER UNS UND NICHT AUS DEM BROWSER: Ein Abruf direkt beim Shop schickte
 * die IP-Adresse jedes Besuchers dorthin, ohne dass er etwas angeklickt hat.
 * Dieselbe Regel wie bei jeder anderen fremden Quelle im Projekt (Legal-Regel 2):
 * fremde Dienste laufen über eine eigene Route, nie über den Browser des Nutzers.
 *
 * DIE HALTBARKEIT IST EINE PREISFRAGE, KEINE TECHNISCHE. Preise ändern sich im
 * Tagesrhythmus (Aktionen, Streichpreise), Verfügbarkeit schneller. Sechs Stunden
 * ist der Kompromiss: frisch genug, dass der Preis stimmt, träge genug, dass ein
 * Crawler den Shop nicht über uns unter Last setzt. Ein abgelaufener Eintrag darf
 * noch einen Tag lang ausgeliefert werden, während wir neu holen — sonst hängt
 * jeder Besucher an der Antwortzeit eines fremden Servers.
 */
const CACHE = "public, s-maxage=21600, stale-while-revalidate=86400";

/**
 * Fehlschlag: KURZ zwischenspeichern, aber nicht gar nicht.
 *
 * Ohne jede Haltbarkeit würde jeder einzelne Aufruf einen fehlgeschlagenen
 * Abruf beim Shop auslösen, solange der Shop hängt — genau der Rückstau, gegen
 * den die Zeitbudgets im Projekt gebaut sind. Fünf Minuten reichen, damit sich
 * eine kurze Störung nicht vervielfacht, und sind kurz genug, dass eine behobene
 * Störung schnell wieder durchkommt.
 */
const CACHE_FEHLER = "public, s-maxage=300";

/** Nach zehn Sekunden geben wir auf — der Rechner funktioniert auch ohne Angebot. */
const ZEITBUDGET_MS = 10_000;

export async function GET() {
  const abbruch = new AbortController();
  const uhr = setTimeout(() => abbruch.abort(), ZEITBUDGET_MS);

  try {
    const daten: ShopAngebote = await holeSolakonAngebote(abbruch.signal);
    return NextResponse.json(daten, { headers: { "Cache-Control": CACHE } });
  } catch (e) {
    // KEINE leere Liste als Erfolg ausgeben: „der Shop hat gerade nichts" und
    // „wir kamen nicht durch" sind zwei verschiedene Auskünfte, und die Anzeige
    // muss sie unterscheiden können — sonst verschwindet der Block stillschweigend.
    return NextResponse.json(
      { fehler: e instanceof Error ? e.message : "Abruf fehlgeschlagen" },
      { status: 502, headers: { "Cache-Control": CACHE_FEHLER } },
    );
  } finally {
    clearTimeout(uhr);
  }
}
