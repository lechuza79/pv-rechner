import { test, expect } from "@playwright/test";

// Ein Widget, das WIR auf einer eigenen Seite einbetten, steckt in einem iframe
// — und ein iframe erbt von der Seite nichts. Drei Dinge fehlten deshalb
// gleichzeitig auf /atomstrom-import, alle drei nur im Browser zu sehen:
// die Tagesfarben (weiße Kachel auf dunklem Grund), der „nächste Schritt", der
// auf genau die Seite zeigte, die man gerade las, und ein Klick, der den
// Artikel IM Chart-Rahmen öffnete.
//
// Geprüft wird an der Stelle, an der ein Mensch es sieht: auf der Seite, im
// iframe, nach dem Laden.

test.describe("Widget auf eigener Seite", () => {
  test("trägt die Farben der Seite, nicht seine eigenen", async ({ page }) => {
    await page.goto("/atomstrom-import");

    const seitenGrund = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim(),
    );
    expect(seitenGrund).not.toBe("");

    const rahmen = page.frameLocator('iframe[src*="zubau-erneuerbare-atom"]');
    // Warten, bis das Widget steht — vorher gibt es nichts zu messen.
    await expect(rahmen.getByText(/^Zubau .+: Erneuerbare vs\. Atomkraft$/)).toBeVisible();

    await expect
      .poll(
        async () =>
          await rahmen.locator("body").evaluate((b) =>
            getComputedStyle(b.ownerDocument.documentElement)
              .getPropertyValue("--widget-bg")
              .trim(),
          ),
        { message: "Das eingebettete Widget übernimmt den Grundton der Seite" },
      )
      .toBe(seitenGrund);
  });

  test("zeigt keinen Knopf auf die Seite, die man gerade liest", async ({ page }) => {
    await page.goto("/atomstrom-import");

    // Zwei der drei Widgets hier führen laut Register nach /atomstrom-import —
    // eingebettet auf ebenjener Seite ist das kein nächster Schritt, sondern Lärm.
    for (const muster of ["strommix-anteil", "zubau-erneuerbare-atom"]) {
      const rahmen = page.frameLocator(`iframe[src*="${muster}"]`);
      await expect(rahmen.locator('a[href="/atomstrom-import"]')).toHaveCount(0);
    }
  });

  test("öffnet den nächsten Schritt im ganzen Fenster, nicht im Rahmen", async ({ page }) => {
    await page.goto("/atomstrom-import");

    // Das Strommix-Widget führt nach /strommix-deutschland — ein echter nächster
    // Schritt, der auf dieser Seite stehen bleibt.
    const rahmen = page.frameLocator('iframe[src*="embed/strommix?"]');
    const knopf = rahmen.locator('a[href="/strommix-deutschland"]');
    await expect(knopf).toHaveCount(1);
    // Ohne Ziel navigiert der Klick nur das iframe — der Artikel erschien dann
    // innerhalb des Charts.
    await expect(knopf).toHaveAttribute("target", "_top");
  });

  test("das Aktionsmenü bleibt vollständig in der Karte", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 760 });
    await page.goto("/atomstrom-import");

    const rahmen = page.frameLocator('iframe[src*="zubau-erneuerbare-atom"]');
    await expect(rahmen.getByText(/^Zubau .+: Erneuerbare vs\. Atomkraft$/)).toBeVisible();
    await rahmen.locator('button[title="Teilen"]').click();

    const menu = rahmen.locator('[role="menu"]');
    await expect(menu).toBeVisible();
    // Die Karte schneidet Überstehendes ab (overflow: hidden) — ein Menü, das
    // über ihren Rand hinausragt, ist im Embed sichtbar abgeschnitten.
    const passt = await menu.evaluate((m) => {
      const karte = m.closest("[style*='overflow']") ?? m.ownerDocument.body;
      const a = m.getBoundingClientRect();
      const b = karte.getBoundingClientRect();
      return a.left >= b.left - 1 && a.right <= b.right + 1;
    });
    expect(passt).toBe(true);
  });
});
