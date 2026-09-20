// Wo eine Landform in ihrem Quadrat wirklich sitzt.
//
// Die Umrisse sind je Land seitenverhältnistreu in ein Quadrat von 100 × 100
// eingepasst — ein breites, flaches Land füllt darin die Breite und lässt oben
// und unten Luft. Mecklenburg-Vorpommern reicht nur von 15 bis 85, Sachsen von
// 12 bis 88; Bayern und Hessen füllen die volle Höhe.
//
// WARUM DAS ZÄHLT: Die gefüllten Umrisse füllten von der Unterkante des
// QUADRATS aus. Bei Mecklenburg-Vorpommern mit 8 Prozent lag die Füllung damit
// vollständig unter der Landform — im Bild war schlicht nichts zu sehen, und die
// Zahl daneben behauptete trotzdem einen Wert. Dieselbe Fehlerklasse wie ein
// Balken, der eine andere Länge zeigt als seine Beschriftung.
//
// Und der zweite Grund: Die Form ersetzt ein Balkendiagramm (Betreiber,
// 28.08.2026), also brauchen die Formen eine gemeinsame Grundlinie. Zentriert im
// Quadrat stehen sie auf verschiedenen Höhen, und dann vergleicht man Füllstände
// über einer Linie, die es nicht gibt.

/** Die Grenzen einer Landform in den Koordinaten ihres Quadrats. */
export type UmrissBox = { x0: number; y0: number; breite: number; hoehe: number };

/**
 * Die Grenzen aus dem Pfad rechnen.
 *
 * Die Pfade bestehen ausschließlich aus `M`/`L`-Befehlen mit absoluten
 * Koordinatenpaaren und `Z` — kein Bogen, keine Kurve, keine relativen Befehle
 * (so erzeugt sie `npm run geo:umrisse`). Deshalb genügt es, die Zahlen paarweise
 * zu lesen. Käme je eine Kurve dazu, wären ihre Kontrollpunkte mitgezählt und
 * die Box zu groß — auffallen würde das als Form, die ihr Feld nicht ausfüllt.
 */
export function umrissBox(pfad: string): UmrissBox {
  const zahlen = pfad.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (zahlen.length < 4) return { x0: 0, y0: 0, breite: 100, hoehe: 100 };
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i + 1 < zahlen.length; i += 2) {
    xs.push(zahlen[i]);
    ys.push(zahlen[i + 1]);
  }
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return {
    x0,
    y0,
    breite: Math.max(...xs) - x0,
    hoehe: Math.max(...ys) - y0,
  };
}
