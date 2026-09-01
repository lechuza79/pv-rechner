import { test, expect } from "@playwright/test";
import {
  ERGEBNISSE,
  ergebnisBereit,
  ergebnisFingerabdruck,
  schalter,
  kernzahlen,
  reiter,
  abschnitte,
  editierbareWerte,
  wertSetzen,
} from "./ergebnis";

/**
 * Vier Urteile über jedes Ergebnis, alle ohne Wissen über den einzelnen Rechner:
 *
 *   1. Der geteilte Link liefert dasselbe Ergebnis wie der eben gerechnete.
 *   2. Jeder „rechnet mit"-Schalter bewegt wirklich eine Zahl — und zurück-
 *      geschaltet steht wieder der Ausgangswert da.
 *   3. Jeder Szenario-Reiter schaltet um und rechnet neu.
 *   4. Jeder Abschnitt lässt sich aufklappen und zeigt seinen Inhalt.
 *
 * Was das NICHT kann: beurteilen, ob eine Zahl RICHTIG ist. Das leisten die
 * Rechen-Tests (lib/__tests__) und der monatliche Rechenmodell-Council. Hier
 * geht es um „kaputt" und „wirkungslos" — und Letzteres ist die Klasse, die im
 * Browser am besten versteckt ist: Die Seite reagiert, sieht plausibel aus, und
 * die Eingabe kommt trotzdem nirgends an.
 */

for (const erg of ERGEBNISSE) {
  test.describe(`Ergebnis „${erg.name}"`, () => {
    test.setTimeout(180_000);

    test("der geteilte Link liefert dasselbe Ergebnis", async ({ page }) => {
      await page.goto(erg.pfad);
      await ergebnisBereit(page, erg.enthaelt);
      const zuerst = await ergebnisFingerabdruck(page);

      // Neu laden ist der Kern: Genau hier fällt auf, wenn ein Wert nur im
      // Arbeitsspeicher lebt und nicht in der Adresse — die Fehlerklasse, die
      // am 22.08.2026 die Dachform verschwinden ließ. Ein Empfänger des Links
      // rechnet dann etwas anderes als der Absender, ohne dass es jemand sieht.
      await page.reload();
      await ergebnisBereit(page, erg.enthaelt);
      const danach = await ergebnisFingerabdruck(page);

      expect(danach, "Nach dem Neuladen stehen andere Zahlen da").toBe(zuerst);
    });

    /**
     * Der Knopf „Link kopieren" muss einen Link liefern, der dasselbe Ergebnis
     * zeigt — auch nach einer Änderung im Ergebnis.
     *
     * Das ist die eigentliche Zusage des Teilens, und sie ist strenger als das
     * bloße Neuladen: Der PV-Rechner hält seinen Zustand im Arbeitsspeicher und
     * schreibt ihn erst beim Teilen in eine Adresse. Ob dabei ALLES mitkommt,
     * sieht man nur, wenn man vorher etwas verstellt — hier das Szenario, das
     * jede Zahl darunter umrechnet.
     */
    test("der selbst erzeugte Teilen-Link trägt den geänderten Zustand", async ({ page, context }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto(erg.pfad);
      await ergebnisBereit(page, erg.enthaelt);

      // Etwas verstellen — und zwar irgendetwas, das die Zahlen umrechnet.
      //
      // Zuerst das Szenario, weil es alles darunter umrechnet. Wo der
      // Umschalter eingeklappt ist und deshalb nicht sichtbar (Wärmepumpe),
      // wird stattdessen ein Wert von Hand gesetzt. Diese Ausweichstelle ist
      // der Grund, warum dieser Test überhaupt läuft: Bis zum 26.08.2026 hat er
      // sich beim Wärmepumpen-Rechner stillschweigend übersprungen — und ein
      // übersprungener Test ist von einem bestandenen im Protokoll kaum zu
      // unterscheiden.
      const reiterListe = await reiter(page);
      if (reiterListe.length >= 2) {
        const anderes = reiterListe.findIndex((r) => !r.aktiv);
        await page.locator('[role="tab"]:visible').nth(anderes).click();
      } else {
        const werte = await editierbareWerte(page);
        test.skip(
          werte.length === 0,
          "weder Szenario-Umschalter noch editierbarer Wert — hier lässt sich nichts verstellen",
        );
        const ziel = werte[0];
        const roh = ziel.text.replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".");
        const alt = Number.parseFloat(roh);
        test.skip(!Number.isFinite(alt) || alt <= 0, `„${ziel.label}" trägt keine lesbare Zahl`);
        await wertSetzen(page, ziel.label, String(Math.round(alt * 1.5)));
      }
      await ergebnisBereit(page, erg.enthaelt);
      const erwartet = await kernzahlen(page, erg.kernzahlen);

      const kopieren = page.getByTitle("Link kopieren").first();
      test.skip((await kopieren.count()) === 0, "dieses Ergebnis hat keinen Knopf zum Linkkopieren");
      await kopieren.click();
      const link = await page.evaluate(() => navigator.clipboard.readText());
      expect(link, "Der Teilen-Knopf hat keinen Link in die Zwischenablage gelegt").toContain("/");

      await page.goto(link);
      await ergebnisBereit(page, erg.enthaelt);
      expect(
        await kernzahlen(page, erg.kernzahlen),
        `Der geteilte Link zeigt ein anderes Ergebnis als die Seite, auf der er erzeugt wurde. ` +
          `Ein Empfänger rechnet dann etwas anderes als der Absender — und keiner von beiden sieht es.`,
      ).toBe(erwartet);
    });

    test("jeder Schalter bewegt eine Zahl — und zurück", async ({ page }) => {
      await page.goto(erg.pfad);
      await ergebnisBereit(page, erg.enthaelt);

      const liste = await schalter(page);
      test.skip(liste.length === 0, "dieses Ergebnis hat keine Ein/Aus-Schalter");

      for (const s of liste) {
        const knopf = page.locator(`[role="switch"][aria-label="${s.label.replace(/"/g, '\\"')}"]:visible`).first();
        if ((await knopf.count()) === 0) continue; // Schalter erst durch eine frühere Umschaltung entstanden
        const vorher = await kernzahlen(page, erg.kernzahlen);

        await knopf.click();
        await expect(knopf).toHaveAttribute("aria-checked", String(!s.an));
        await ergebnisBereit(page, erg.enthaelt);
        const umgelegt = await kernzahlen(page, erg.kernzahlen);
        expect(
          umgelegt,
          `Der Schalter „${s.label}" lässt die Kernzahlen unverändert (${vorher}) — er schaltet, ` +
            `aber er rechnet nicht mit. Am Abdruck der GANZEN Seite fällt das nicht auf: Die ` +
            `Zusammenfassungszeile des Abschnitts bewegt sich mit, das Ergebnis nicht.`,
        ).not.toBe(vorher);

        // Zurückgeschaltet muss der Ausgangszustand wiederkommen. Ein Schalter,
        // der die Eingaben beim Ausschalten verwirft, ist ein Einwegschalter —
        // die Konvention verlangt ausdrücklich, dass die Werte ruhen und nicht
        // zurückgesetzt werden.
        await knopf.click();
        await expect(knopf).toHaveAttribute("aria-checked", String(s.an));
        await ergebnisBereit(page, erg.enthaelt);
        expect(
          await kernzahlen(page, erg.kernzahlen),
          `Nach dem Zurückschalten von „${s.label}" steht ein anderes Ergebnis da als vorher — ` +
            `der Schalter hat Eingaben verworfen statt sie ruhen zu lassen.`,
        ).toBe(vorher);
      }
    });

    /**
     * Ein von Hand eingetragener Wert muss im Ergebnis ankommen.
     *
     * Das ist die Bedienung, mit der jemand seine EIGENEN Annahmen einträgt —
     * ein Angebot, das er vorliegen hat, sein tatsächlicher Strompreis. Kommt
     * sie nicht an, rechnet die Seite weiter mit unserer Schätzung und zeigt
     * trotzdem die eingetippte Zahl an: der Fehler, den man am wenigsten
     * bemerkt, weil alles danach plausibel aussieht.
     *
     * Geprüft wird der ERSTE editierbare Wert des Ergebnisses. Alle wären
     * schöner, kosten aber je Wert einen vollen Neuaufbau — und die Bauweise
     * ist bei allen dieselbe.
     */
    test("ein von Hand gesetzter Wert kommt im Ergebnis an", async ({ page }) => {
      await page.goto(erg.pfad);
      await ergebnisBereit(page, erg.enthaelt);

      const werte = await editierbareWerte(page);
      test.skip(werte.length === 0, "dieses Ergebnis hat keine editierbaren Werte");

      const vorher = await kernzahlen(page, erg.kernzahlen);
      const ziel = werte[0];
      // Die Zahl aus der Beschriftung lesen und deutlich verändern — ein
      // kleiner Unterschied könnte an einer Rundung hängenbleiben.
      const roh = ziel.text.replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".");
      const alt = Number.parseFloat(roh);
      test.skip(!Number.isFinite(alt) || alt <= 0, `„${ziel.label}" trägt keine lesbare Zahl`);
      const neuerWert = String(Math.round(alt * 1.5));

      await wertSetzen(page, ziel.label, neuerWert);
      await ergebnisBereit(page, erg.enthaelt);

      expect(
        await kernzahlen(page, erg.kernzahlen),
        `„${ziel.label}" von ${alt} auf ${neuerWert} gesetzt — die Kernzahlen bleiben gleich. ` +
          `Die Eingabe wird angezeigt, aber nicht gerechnet.`,
      ).not.toBe(vorher);
    });

    test("jeder Szenario-Reiter rechnet neu", async ({ page }) => {
      await page.goto(erg.pfad);
      await ergebnisBereit(page, erg.enthaelt);

      const liste = await reiter(page);
      test.skip(liste.length === 0, "dieses Ergebnis hat keine Szenario-Reiter");

      const gesehen = new Set<string>();
      for (const [i, r] of liste.entries()) {
        const tab = page.locator('[role="tab"]:visible').nth(i);
        await tab.click();
        await expect(tab).toHaveAttribute("aria-selected", "true");
        await ergebnisBereit(page, erg.enthaelt);
        const abdruck = await kernzahlen(page, erg.kernzahlen);
        expect(
          gesehen.has(abdruck),
          `Der Reiter „${r.label}" liefert dieselben Zahlen wie ein anderer — ` +
            `dann ist die Szenario-Wahl folgenlos.`,
        ).toBe(false);
        gesehen.add(abdruck);
      }
    });

    test("jeder Abschnitt klappt auf und zeigt Inhalt", async ({ page }) => {
      await page.goto(erg.pfad);
      await ergebnisBereit(page, erg.enthaelt);

      const liste = await abschnitte(page);
      test.skip(liste.length === 0, "dieses Ergebnis hat keine aufklappbaren Abschnitte");

      // Über die POSITION angesprochen, nicht über die Überschrift: Manche
      // dieser Knöpfe tragen nur ein Symbol und gar keinen Text (die „?"-Knöpfe
      // der Erklärungen), und eine Suche nach leerem Text greift den
      // erstbesten — der Läufer prüfte dann etwas anderes, als er meldete.
      for (const [i, a] of liste.entries()) {
        if (a.offen) continue;
        const kopf = page.locator("button[aria-expanded]:visible").nth(i);
        if ((await kopf.count()) === 0) continue;
        await kopf.click();
        const zustand = await kopf.getAttribute("aria-expanded");
        if (zustand !== "true") continue; // ausgeschalteter Posten: klappt bewusst nicht auf

        // Nennt die Kopfzeile einen Inhaltsbereich, muss es ihn auch geben —
        // sonst ist die Angabe für Screenreader ein Verweis ins Leere. Ohne
        // Angabe genügt, dass sichtbar mehr dasteht als vorher: `aria-controls`
        // ist für einen Aufklapper nicht vorgeschrieben, und es zur Pflicht zu
        // erklären wäre eine erfundene Regel.
        const bereich = await kopf.getAttribute("aria-controls");
        if (bereich) {
          // Über das Attribut adressiert, nicht als Auswahlausdruck: React
          // vergibt Kennungen mit Doppelpunkten, und die sind in einem
          // CSS-Ausdruck ungültig — daran scheiterte der erste Lauf.
          await expect(
            page.locator(`[id="${bereich}"]`),
            `Abschnitt „${a.titel || "(ohne Überschrift)"}" verweist auf einen Inhaltsbereich, den es nicht gibt`,
          ).toBeVisible();
        }
      }
    });
  });
}
