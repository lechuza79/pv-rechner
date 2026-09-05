// Wann an einem Tag gesendet wird.
//
// DIE UHRZEIT IST EINE SETZUNG, KEIN BEFUND — und das steht hier, weil sie sonst
// beim nächsten Lesen wie eine Erkenntnis aussieht. Recherchiert am 01.09.2026:
//
//   · Für den deutschsprachigen Markt gibt es KEINE eigene Erhebung. Alles, was
//     auf deutschen Seiten steht, ist die Auslegung globaler Datensätze.
//   · LinkedIns eigener deutscher Beitrag zur Frage sagt dazu wörtlich „Es steht
//     also keine maßgebliche Studie dahinter" und schließt mit dem Rat zu testen.
//   · Die beiden großen Erhebungen widersprechen einander in BEIDEN Dimensionen:
//     Metricool (673.658 Beiträge) findet Mo–Do 9–12 Uhr, Buffer (4,8 Mio) findet
//     Mi–Fr 15–20 Uhr und nennt Montag und Dienstag ausdrücklich schwach.
//   · Metricool sagt nicht, in welcher ZEITZONE gerechnet wurde, und Buffers
//     Datensatz sind Buffer-Kunden, also überwiegend Marketing-Konten mit
//     US-Arbeitstag. „16 Uhr" ist dort womöglich schlicht eine amerikanische
//     Mittagszeit, und für einen deutschen Absender damit nicht übertragbar.
//
// Gewählt sind 11 Uhr: im Fenster der einen Erhebung, die die Uhrzeit als
// Hauptbefund führt, und im „mittags"-Fenster von LinkedIns deutschem Beitrag.
// Der Beitrag hat dann den ganzen deutschen Arbeitstag zum Laufen.
//
// DIESELBE BEWEISLAGE WIE BEIM WOCHENTAG (siehe Redaktionsplan): messbar ist das
// für uns nie. Wir kommen an LinkedIns Reichweitenzahlen nicht heran, und selbst
// mit ihnen bräuchte ein Unterschied von zehn Prozent Hunderte Beiträge je
// Zeitfenster. Wer aus den ersten zwanzig Beiträgen eine „beste Uhrzeit" abliest,
// liest Rauschen.

/** Die gesetzte Zielzeit. Minuten, seit Mitternacht gerechnet. */
export const ZIELZEIT_MINUTEN = 11 * 60;

/**
 * Wie weit um die Zielzeit gestreut wird, in Minuten nach jeder Seite.
 *
 * WARUM ÜBERHAUPT GESTREUT: Drei Beiträge pro Woche, jeder auf die Minute um
 * 11:00 — das ist als Muster erkennbar, und zwar für jeden, der die Beiträge
 * nebeneinander sieht. Ein Kanal, dem man den Automaten ansieht, wird auch als
 * Automat gelesen. Die Streuung kostet nichts und nimmt das Muster heraus.
 */
export const STREUUNG_MINUTEN = 23;

/**
 * Der Zeitpunkt für einen Tag — „10:47", „11:09".
 *
 * ABGELEITET, NICHT GEWÜRFELT. Ein echter Zufallswert wäre bei jedem Aufbau der
 * Seite ein anderer: Der Kalender zeigte für denselben Tag mal 10:47 und mal
 * 11:09, und niemand könnte sagen, welche Zeit denn nun gilt. Aus dem Datum
 * abgeleitet ist der Wert stabil, ohne Ablage auskommend und prüfbar — dieselbe
 * Überlegung, aus der die Rechenmodule dieses Projekts keine Uhr haben.
 *
 * Der gespeicherte Platz trägt seine Zeit trotzdem selbst mit: Wer sie von Hand
 * ändert, will nicht, dass die Formel sie beim nächsten Aufbau überschreibt.
 */
export function zeitpunktFuer(iso: string): string {
  const minuten = ZIELZEIT_MINUTEN + versatz(iso);
  const h = Math.floor(minuten / 60);
  const m = minuten % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Der Versatz in Minuten, aus dem Datum.
 *
 * Glatte Minuten werden übersprungen: 11:00, 10:45 und 11:15 sehen aus wie
 * gestellt, und genau das soll die Streuung ja vermeiden. Ein Wert, der auf
 * einer Viertelstunde landet, rückt deshalb um eine Minute weiter.
 */
function versatz(iso: string): number {
  // DURCHMISCHT, nicht bloß aufsummiert. Die erste Fassung rechnete
  // `h * 31 + zeichencode` und ergab damit einen fast linearen Wert: Zwei
  // benachbarte Tage unterscheiden sich nur im letzten Zeichen, und der floss
  // ungebrochen durch. Gemessen kamen für den 1., 3., 4. und 8. September
  // 10:56, 10:58, 10:59 und 11:03 heraus — eine Reihe, die man nach drei
  // Beiträgen sieht, also genau das Muster, gegen das gestreut wird.
  // Die Mischschritte (Verschieben und XOR) sorgen dafür, dass ein Zeichen
  // Unterschied den ganzen Wert ändert.
  let h = 0x811c9dc5;
  for (const zeichen of iso) {
    h ^= zeichen.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
    h ^= h >>> 15;
  }
  h = (h ^ (h >>> 13)) >>> 0;
  let v = (h % (2 * STREUUNG_MINUTEN + 1)) - STREUUNG_MINUTEN;
  const minute = (((ZIELZEIT_MINUTEN + v) % 60) + 60) % 60;
  if (minute % 5 === 0) v += 1;
  return v;
}

/** Ist das eine Uhrzeit in der Form „HH:MM"? */
export function istUhrzeit(wert: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(wert);
}
