/**
 * Rundet die Zahlen in einem SVG-Pfad auf eine feste Nachkommastellen-Zahl.
 *
 * Warum das nötig ist — der Hydration-Mismatch im Ringdiagramm der
 * Gemeindeseite (29.07.2026):
 *
 * Ein Kreisbogen wird über `Math.sin`/`Math.cos`/`atan2` berechnet. Die
 * Genauigkeit dieser Funktionen ist im ECMAScript-Standard bewusst NICHT
 * festgelegt — zwei Engines (der Node-Prozess, der serverseitig rendert, und
 * das Chromium, das hydriert) dürfen sich im letzten Bit unterscheiden, und
 * sie tun es. Wird der Pfad mit voller Genauigkeit ausgegeben, landet dieser
 * Unterschied sichtbar im `d`-Attribut:
 *
 *   Server: …-76.82147141311209…
 *   Client: …-76.8214714131121…
 *
 * React vergleicht beim Hydrieren die Zeichenketten, findet den Unterschied
 * und meldet ihn als Fehler in der Konsole. Der Rundgang (e2e/rundgang.spec.ts)
 * fällt dadurch durch — zu Recht, denn er prüft genau auf Konsolenfehler.
 *
 * Sichtbar wird das nur, wenn die Pfadausgabe ungerundet ist. d3-path rundet
 * seit Version 3.1 selbst auf drei Stellen, aber das ist eine Voreinstellung
 * einer transitiven Abhängigkeit — eine ältere (oder künftig andere) Fassung
 * gibt volle Genauigkeit aus, und der Fehler ist zurück, ohne dass jemand
 * etwas an unserem Code geändert hätte. Genau so trat er auf: mit einer
 * älteren @visx/shape-Fassung als der, die die Sperrdatei vorgibt.
 *
 * Deshalb runden wir selbst, statt uns auf die Voreinstellung zu verlassen.
 * Die Rechnung ist dieselbe wie in d3-path (`Math.round(x * k) / k`), damit
 * das Ergebnis bei einer bereits gerundeten Ausgabe unverändert bleibt — die
 * Funktion ist idempotent und ändert die Darstellung nicht.
 *
 * Nicht gelöst wird das über ein Unterdrücken der Warnung
 * (`suppressHydrationWarning`): Der Rundgang ist dafür da, Konsolenfehler zu
 * finden. Eine stummgeschaltete Abweichung ist keine behobene Abweichung.
 */

/**
 * Zahl-Token in einem SVG-Pfad: Vorzeichen, Ganzzahl-/Dezimalanteil,
 * optionaler Exponent. Alles andere im Pfad sind Befehlsbuchstaben und
 * Trennzeichen und bleibt unangetastet.
 */
const PATH_NUMBER = /-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[-+]?\d+)?/gi;

/**
 * Drei Nachkommastellen entsprechen bei den hier gezeichneten Diagrammen
 * (Kantenlänge im dreistelligen Pixelbereich) einem Tausendstel Pixel — weit
 * unterhalb der Auflösung jedes Bildschirms. Es ist zugleich die Voreinstellung
 * von d3-path, das Ergebnis bleibt dort also Zeichen für Zeichen dasselbe.
 */
const DEFAULT_DIGITS = 3;

export function roundSvgPath(d: string, digits: number = DEFAULT_DIGITS): string {
  const k = 10 ** digits;
  return d.replace(PATH_NUMBER, (token) => {
    const value = Number(token);
    // Kein gültiger Zahlenwert (kommt bei wohlgeformten Pfaden nicht vor):
    // unverändert lassen, statt einen Pfad zu zerstören.
    if (!Number.isFinite(value)) return token;
    return String(Math.round(value * k) / k);
  });
}
