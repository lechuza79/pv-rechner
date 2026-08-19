/**
 * Mehrere Abrufe gleichzeitig — für die Läufe, die tausende fremde Seiten holen.
 *
 * WARUM (18.08.2026): URL-Suche und Screening arbeiteten eine Gemeinde nach der
 * anderen ab. Bei rund 9.600 offenen Gemeinden und gut zwei Sekunden je Abruf
 * sind das über sechs Stunden für einen Durchgang — die Zeit steckt fast
 * vollständig im Warten auf fremde Server, nicht in unserer Rechnung.
 *
 * RÜCKSICHT BLEIBT: Die Gleichzeitigkeit verteilt sich über VERSCHIEDENE
 * Gemeinden. Jede einzelne Verwaltung bekommt weiterhin höchstens eine Anfrage
 * zur Zeit — wir werden also nicht schneller gegenüber dem einzelnen Server,
 * sondern nur gegenüber der Liste. Das ist der Unterschied zwischen zügig und
 * lästig, und er ist der Grund, warum die Reihenfolge hier nicht gemischt wird.
 */
export async function inSchueben<T>(
  aufgaben: T[],
  gleichzeitig: number,
  arbeite: (aufgabe: T, index: number) => Promise<void>,
): Promise<void> {
  let naechster = 0;
  const arbeiter = Array.from({ length: Math.max(1, gleichzeitig) }, async () => {
    for (;;) {
      const i = naechster++;
      if (i >= aufgaben.length) return;
      // Ein Fehlschlag darf den Arbeiter nicht beenden — sonst schrumpft der
      // Lauf still auf weniger Arbeiter, je länger er läuft, und niemand sieht
      // warum er immer langsamer wird.
      try {
        await arbeite(aufgaben[i], i);
      } catch (err) {
        console.error(`  Aufgabe ${i} abgebrochen: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  });
  await Promise.all(arbeiter);
}
