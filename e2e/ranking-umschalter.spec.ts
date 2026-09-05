import { test, expect } from "@playwright/test";

/**
 * KEIN UMSCHALTER-EINTRAG, DER INS LEERE FUEHRT.
 *
 * In einem Landkreis gibt es per Definition keine kreisfreie Stadt und fast nie
 * eine Landeshauptstadt oder Grossstadt. Der Vergleichs-Umschalter bot sie
 * trotzdem an; ein Klick landete auf einer leeren Liste. Gemessen am 05.09.2026
 * waren 36 von 70 Kombinationen aus Groessenklasse und Landkreis leer.
 *
 * Der Test klickt jeden angebotenen Vergleich durch und verlangt, dass jeder
 * eine Liste zeigt — die Gegenprobe zur Bundesliste stellt sicher, dass nicht
 * einfach alles weggefiltert wurde.
 */
const KREIS = "/solar-atlas/ranking/solarleistung-je-einwohner/bayern/landkreis-kelheim";
const BUND = "/solar-atlas/ranking/solarleistung-je-einwohner";

async function vergleiche(page: import("@playwright/test").Page) {
  return page.locator('a[href*="/solar-atlas/ranking/solarleistung-je-einwohner/"]').evaluateAll((as) =>
    Array.from(
      new Set(
        as
          .map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? "")
          .filter((h) => /\/(doerfer|kleine-gemeinden|gemeinden-und-kleinstaedte|mittelgrosse-staedte|grossstaedte|landeshauptstaedte|kreisfreie-staedte)(\/|$)/.test(h)),
      ),
    ),
  );
}

test.describe("Ranglisten-Umschalter", () => {
  test("im Landkreis fuehrt jeder angebotene Vergleich auf eine gefuellte Liste", async ({ page }) => {
    await page.goto(KREIS);
    const links = await vergleiche(page);
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) {
      await page.goto(href);
      await expect(page.locator(".atlas-rank-row").first(), `leere Liste hinter ${href}`).toBeVisible();
    }
  });

  test("bundesweit bleiben alle sieben Vergleiche stehen", async ({ page }) => {
    // Die Gegenprobe: Der Filter darf nur wegnehmen, was hier wirklich leer ist.
    await page.goto(BUND);
    expect((await vergleiche(page)).length).toBe(7);
  });
});
