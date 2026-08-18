import { expect, type Page } from "@playwright/test";

/**
 * Einen Frage-Flow durchklicken, bis das Ergebnis erscheint.
 *
 * Warum das geteilt gehört: Seit die Rechner auf den gemeinsamen
 * Navigations-Baustein umgestellt sind, startet KEIN Schritt mehr mit einer
 * Vorauswahl (Betreiber-Vorgabe 05.08.2026). Blindes „achtmal Weiter klicken"
 * kommt damit nicht mehr durch — der Knopf ist gesperrt, bis gewählt wurde.
 * Genau daran sind gleich drei Tests gleichzeitig hängengeblieben, jeder mit
 * seiner eigenen Kopie derselben Schleife. Eine Stelle, die weiß, wie man einen
 * Flow bedient, ist billiger als drei, die es je zur Hälfte wissen.
 *
 * Was der Helfer tut, Schritt für Schritt:
 *   1. Warten, bis der Schritt bedienbar ist — Auswahlkarten ODER ein freier
 *      Weiter-Knopf. Ohne dieses Warten greift der erste Durchlauf ins Leere:
 *      `evaluateAll` wartet NICHT auf Elemente und liefert dann eine leere
 *      Liste, es wird nichts gewählt, und die Schleife dreht sich am gesperrten
 *      Knopf fest. Genau dieser Fehler hat einen Testlauf gekostet.
 *   2. Je FRAGE eine Option wählen. Ein Schritt kann mehrere tragen (Personen
 *      und Nutzungsprofil); `data-flow-group` trennt sie. Ohne das Attribut
 *      gehören alle Optionen zur selben Frage.
 *   3. Weiter klicken.
 *
 * Schritte ohne Auswahl (Dach mit „Weiß ich nicht", Großverbraucher als
 * Ein/Aus-Frage) gehen einfach durch — dort ist Weiter von sich aus frei.
 */
export async function durchDenFlow(page: Page, maxSchritte = 12): Promise<void> {
  for (let i = 0; i < maxSchritte; i++) {
    // Über `data-flow-next` statt über die Beschriftung: Der Baustein meldet
    // sich damit selbst an, und die Beschriftung wechselt je Schritt („Weiter",
    // „Berechnen", „Ergebnis anzeigen"). Vor allem aber trägt der GESPERRTE
    // Knopf einen erklärenden Vorlese-Namen („Weiter — Bitte erst eine
    // Anlagengröße wählen"), auf den kein verankertes Namensmuster passt: Der
    // Helfer fand dann gar keinen Knopf und kehrte wortlos zurück, während der
    // Test noch im ersten Schritt stand.
    const weiter = page.locator("[data-flow-next]:visible").first();
    if (!(await weiter.count())) return; // kein Flow mehr — Ergebnis erreicht

    // Auf Bedienbarkeit warten: entweder es gibt Optionen, oder Weiter ist
    // bereits frei. Beides zusammen kann nicht ewig ausbleiben; bleibt es aus,
    // ist das ein echter Befund und soll auch als solcher auffallen.
    await expect
      .poll(
        async () =>
          (await page.locator("[data-flow-option]:visible").count()) > 0 ||
          (await weiter.getAttribute("aria-disabled")) !== "true",
        { timeout: 15_000 },
      )
      .toBe(true);

    const offen = await page.locator("[data-flow-option]:visible").evaluateAll((els) => {
      const beantwortet = new Set(
        els
          .filter((e) => e.getAttribute("aria-pressed") === "true")
          .map((e) => e.getAttribute("data-flow-group") || ""),
      );
      const ersteJeFrage = new Map<string, string>();
      for (const e of els) {
        const frage = e.getAttribute("data-flow-group") || "";
        if (beantwortet.has(frage) || ersteJeFrage.has(frage)) continue;
        ersteJeFrage.set(frage, e.getAttribute("data-flow-option") || "");
      }
      return [...ersteJeFrage.values()];
    });

    for (const label of offen) {
      const option = page.locator(`[data-flow-option="${label.replace(/"/g, '\\"')}"]:visible`).first();
      // Wiederholen statt einmal klicken: Der Knopf steht ab dem
      // servergerenderten HTML da, reagiert aber erst, wenn React ihn
      // übernommen hat — ein Klick in dieses Fenster ist verloren.
      await expect(async () => {
        await option.click();
        await expect(option).toHaveAttribute("aria-pressed", "true", { timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
    }

    await weiter.click();
    await page.waitForTimeout(150);
  }
}
