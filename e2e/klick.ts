import { expect, type Locator } from "@playwright/test";

/**
 * Klicken und die WIRKUNG nachweisen — sonst noch einmal.
 *
 * WARUM DAS NÖTIG IST (gemessen 20.09.2026, `ortsgeschichte-karte.spec.ts`):
 * Ein servergerenderter Knopf ist vollständig anklickbar, bevor React ihn
 * übernommen hat — er ist sichtbar, ruhig, nicht gesperrt, und nichts liegt
 * darüber. Playwrights Prüfung auf Bedienbarkeit ist damit erfüllt; dass am
 * Knopf noch kein Handler hängt, kann sie nicht sehen. Der Klick wird in
 * diesem Fenster STUMM verschluckt: kein Fehler, keine Meldung, nur ein
 * Fenster, das nicht aufgeht.
 *
 * Nachgemessen an der Geschichten-Karte, mit einem Zeitstempel für den Klick
 * und einem für den Augenblick, in dem der Knopf seinen Handler bekommt:
 *
 *   grüner Lauf: Klick bei 295 ms, Handler ab 263 ms  → Wirkung
 *   roter Lauf:  Klick bei 206 ms, Handler ab 293 ms  → nichts
 *
 * Es sind also rund fünfzig bis hundert Millisekunden, und genau die verliert
 * man unter zwei Arbeitern: Beide Browser holen dieselben großen Skriptpakete
 * gleichzeitig vom selben Server, die Übernahme rutscht nach hinten, und der
 * Klick kommt zu früh. Mit einem Arbeiter gewinnt er das Rennen fast immer —
 * deshalb sah es wie ein Parallelitätsproblem aus und war ein Zeitproblem.
 *
 * LÄNGER WARTEN HILFT NICHT, und das ist gemessen, nicht angenommen: Mit einem
 * einzigen Klick und zwanzig Sekunden Wartezeit darauf blieben dieselben zwei
 * Prüfungen rot — jeder Lauf dauerte 23 s und endete doch ohne Fenster. Ein
 * verlorener Klick ist verloren; das Ereignis hatte nie einen Empfänger. Nur
 * ein zweiter Klick holt ihn zurück — dieselbe Einsicht, aus der `waehle` und
 * `weiterKlicken` in `flows.ts` entstanden sind.
 *
 * VOR DEM EINCHECKEN DREIMAL ABSICHTLICH KAPUTTGEMACHT, jedes Mal rot gesehen
 * und auf dem Rückweg wieder grün: Wiederholung ausgebaut · ein Klick mit
 * vollem Zeitlimit statt der Schleife · die Wirkung auf etwas gerichtet, das es
 * nicht gibt (dort musste die Meldung unten erscheinen, nicht ein nacktes
 * „Timeout while waiting on the predicate").
 *
 * ERST PRÜFEN, DANN KLICKEN: Hat der erste Klick gewirkt, liegt das Fenster
 * über dem Knopf. Ein zweiter Versuch käme dann gar nicht mehr an ihn heran
 * und liefe ins Zeitlimit, obwohl längst alles in Ordnung ist.
 *
 * @param knopf   Was angeklickt wird.
 * @param wirkung Was danach sichtbar sein muss. Der BEWEIS, dass der Klick
 *                angekommen ist — nicht bloß eine Wartemarke.
 * @param was     Für die Fehlermeldung: wofür der Klick gut sein sollte.
 */
export async function klickBisWirkung(knopf: Locator, wirkung: Locator, was: string) {
  try {
    await expect(async () => {
      // Schon da? Dann war ein früherer Versuch erfolgreich, und ein weiterer
      // Klick wäre schädlich (siehe oben).
      if (await wirkung.isVisible()) return;
      // Eigenes, kurzes Zeitlimit am Klick — BLOCKER, dieselbe Begründung wie
      // in `waehle`: Ohne das erbt er den TEST-Timeout und frisst das ganze
      // Budget der Wiederhol-Schleife, die dann kein einziges Mal anläuft.
      await knopf.click({ timeout: 3_000 });
      await expect(wirkung).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
  } catch {
    const zustand = await knopf
      .evaluate((e) => ({
        sichtbar: (e as HTMLElement).offsetParent !== null,
        deaktiviert: (e as HTMLButtonElement).disabled,
        // Hängt überhaupt ein React-Handler daran? Steht hier „nein", ist die
        // Seite nach 20 s nicht interaktiv geworden — dann ist nicht der Klick
        // das Problem, sondern die Übernahme durch React.
        handler: Object.keys(e).some((k) => k.startsWith("__reactProps$")) ? "ja" : "nein",
      }))
      .catch(() => null);
    throw new Error(
      `Klick blieb wirkungslos: ${was} wurde 20 s lang nicht sichtbar. ` +
        `Zustand des Knopfes: ${JSON.stringify(zustand)}.`,
    );
  }
}
