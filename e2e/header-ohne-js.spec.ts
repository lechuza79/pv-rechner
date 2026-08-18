import { test, expect } from "@playwright/test";

// Der Kopfbereich muss OHNE JavaScript richtig liegen.
//
// Bis zum 18.08.2026 entschied der Zustand der Komponente über das Layout:
// `isDesktop` startet auf `true`, also lieferte der Server auf JEDEM Gerät die
// Desktop-Leiste. Auf 375 px riss die das Dokument auf 791 px auf — die Seite
// ließ sich beim Laden seitlich schieben, bis die Hydratation es korrigierte.
//
// Warum die Prüfung mit abgeschaltetem JavaScript läuft: Mit JavaScript ist der
// Fehler unsichtbar. Die Korrektur kommt so schnell, dass ein normaler Test
// immer den reparierten Zustand misst — genau deshalb ist er so lange
// unbemerkt geblieben. Ohne JavaScript sieht man, was der Server tatsächlich
// ausliefert, und das ist der Zustand, den ein Besucher im ersten Moment hat.

test.describe("Kopfbereich ohne JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("läuft auf einem schmalen Schirm nicht über", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/impressum");

    const { klient, dokument } = await page.evaluate(() => ({
      klient: document.documentElement.clientWidth,
      dokument: document.documentElement.scrollWidth,
    }));

    expect(
      dokument,
      `Dokument ist ${dokument}px breit bei ${klient}px Fenster — die Seite scrollt seitlich`,
    ).toBeLessThanOrEqual(klient + 1);
  });

  test("zeigt schmal den Burger und breit die Navigation", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/impressum");
    await expect(page.locator(".hdr-burger")).toBeVisible();
    await expect(page.locator(".hdr-nav")).toBeHidden();

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator(".hdr-nav")).toBeVisible();
    await expect(page.locator(".hdr-burger")).toBeHidden();
  });

  // Am Umschaltpunkt darf weder beides noch nichts stehen. Ein Tippfehler in
  // einer der beiden Medienabfragen (999 vs. 1000) erzeugt genau so eine Lücke,
  // und sie trifft nur einen schmalen Breitenbereich — im Alltag also niemanden,
  // der es meldet.
  for (const breite of [999, 1000]) {
    test(`bei ${breite}px steht genau eine Variante`, async ({ page }) => {
      await page.setViewportSize({ width: breite, height: 800 });
      await page.goto("/impressum");

      const navDa = await page.locator(".hdr-nav").isVisible();
      const burgerDa = await page.locator(".hdr-burger").isVisible();
      expect(navDa && burgerDa, `bei ${breite}px sind beide sichtbar`).toBe(false);
      expect(!navDa && !burgerDa, `bei ${breite}px ist keine sichtbar`).toBe(false);
    });
  }
});

test.describe("Kopfbereich mit JavaScript", () => {
  test("das Menü öffnet und schließt weiterhin", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/impressum");

    await expect(page.locator(".hdr-menu")).toHaveCount(0);
    await page.locator(".hdr-burger").click();
    await expect(page.locator("nav.hdr-menu")).toBeVisible();

    // Schließen über denselben Knopf (zeigt dann ein ×). Das ist der Weg, den
    // ein Nutzer tatsächlich hat: Das Menü ist auf einem 812-px-Schirm rund
    // 808 px hoch und verdeckt die Abdunkelung vollständig — ein "Klick
    // daneben" existiert dort nicht. Beim Umbau am 18.08.2026 gemessen; der
    // Schließen-Knopf trägt es, deshalb bleibt es hier bei der Beobachtung.
    await page.locator(".hdr-burger").click();
    await expect(page.locator(".hdr-menu")).toHaveCount(0);
  });
});
