import { test, expect } from "@playwright/test";

// Der Vergleichs-Modus des Zubau-Widgets: Deutschland lässt sich zu jedem Land
// dazuschalten. Geprüft wird, was man nur im Browser sieht — dass die Kachel
// beim Einschalten wächst statt zu springen, dass der Prozentwert erst beim
// Überfahren erscheint (dauerhaft stand er neben dem Größenverhältnis und sagte
// dasselbe zweimal), und dass auf Handybreite nichts über die Karte hinausragt.

async function chinaMitDeutschland(page: import("@playwright/test").Page) {
  await page.goto("/embed/zubau-erneuerbare-atom");
  await expect(page.getByText("Erneuerbare vs. Atomkraft", { exact: true })).toBeVisible();
  await page.locator("button").filter({ hasText: "Weltweit" }).first().click();
  await page.locator('button:has-text("China")').last().click();
  await page.locator('button[role="switch"]').click();
  // Die Kachel klappt auf (0,28 s). Wer währenddessen hovert, verliert den
  // Zeiger wieder: Das Element wandert unter ihm weg, und der Effekt sieht wie
  // ein Fehler aus, obwohl nur zu früh gemessen wurde.
  await warteBisRuhig(page);
}

/** Wartet, bis die Kachelhöhe zwei Messungen lang gleich bleibt. */
async function warteBisRuhig(page: import("@playwright/test").Page) {
  const hoehe = () =>
    page.locator(".sc-aufklapp").first().evaluate((el) => Math.round(el.getBoundingClientRect().height));
  let vorher = -1;
  for (let i = 0; i < 20; i++) {
    const jetzt = await hoehe();
    if (jetzt === vorher && jetzt > 0) return;
    vorher = jetzt;
    await page.waitForTimeout(60);
  }
}

test.describe("Zubau-Widget: Deutschland im Vergleich", () => {
  test("die Abweichung erscheint erst beim Überfahren", async ({ page }) => {
    await chinaMitDeutschland(page);

    const wert = page.locator('span[tabindex="0"]').first();
    const delta = wert.locator("span").nth(1);
    await expect(delta).toHaveText("−92 %");
    // Vorhanden, aber unsichtbar: Sie steht im Markup (und damit für
    // Screenreader), zeigt sich aber erst auf Nachfrage.
    await expect(delta).toHaveCSS("opacity", "0");

    await wert.hover();
    await expect(delta).toHaveCSS("opacity", "1");

    // Und über die Tastatur, nicht nur mit der Maus.
    await page.mouse.move(0, 0);
    await expect(delta).toHaveCSS("opacity", "0");
    await wert.focus();
    await expect(delta).toHaveCSS("opacity", "1");
  });

  test("die Kachel wächst, statt zu springen", async ({ page }) => {
    await page.goto("/embed/zubau-erneuerbare-atom");
    await expect(page.getByText("Erneuerbare vs. Atomkraft", { exact: true })).toBeVisible();

    const klapp = page.locator(".sc-aufklapp").first();
    // Zu: das Raster gibt der Zeile keine Höhe.
    await expect(klapp).toHaveAttribute("data-offen", "nein");
    await expect(klapp).toHaveCSS("transition", /grid-template-rows/);

    await page.locator('button[role="switch"]').click();
    await expect(klapp).toHaveAttribute("data-offen", "ja");
    await expect(klapp).not.toHaveCSS("grid-template-rows", "0px");
  });

  test("auf Handybreite ragt nichts über die Karte", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await chinaMitDeutschland(page);

    const ueberlauf = await page.evaluate(() => {
      const karte = document.body.querySelector("div > div") as HTMLElement;
      const rand = karte.getBoundingClientRect();
      const raus: string[] = [];
      karte.querySelectorAll<HTMLElement>("*").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0) return;
        // Die Quellen-Kante steht bewusst auf dem Rand.
        if (el.getAttribute("title")?.startsWith("Quelle:")) return;
        if (r.right > rand.right + 1 || r.left < rand.left - 1) {
          raus.push(`${el.tagName}: ${(el.textContent ?? "").trim().slice(0, 30)}`);
        }
      });
      return raus;
    });
    expect(ueberlauf).toEqual([]);
  });
});
