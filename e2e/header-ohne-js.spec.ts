import { test, expect } from "@playwright/test";

// The server-rendered fallback must remain usable before hydration and when
// scripts are unavailable. The enhanced menu shares its destinations.
test.describe("Navigation without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  for (const width of [375, 1280, 1440]) {
    test(`usable without horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/impressum");
      const fallback = page.locator(".sc-react-fallback");
      await fallback.locator(":scope > summary").click();
      await fallback.locator('[data-section="tools"] > summary').click();
      await expect(fallback.getByRole("link", { name: "Anlage durchrechnen", exact: true })).toBeVisible();
      const sizes = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      expect(sizes[0]).toBeLessThanOrEqual(sizes[1] + 1);
    });
  }
});

test.describe("Shared navigation", () => {
  test("mobile closes with Escape and restores focus and scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/impressum");
    const toggle = page.getByRole("button", { name: "Menü öffnen", exact: true });
    await toggle.click();
    await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeVisible();
    await page.locator('.sc-global-nav [data-section="tools"] > summary').click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeHidden();
    await expect(toggle).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  });

  test("desktop has one expanded section and a waiting-list destination", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/impressum");
    const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
    await nav.locator('[data-section="tools"] > summary').click();
    await expect(nav.getByRole("link", { name: /Warteliste/ })).toHaveAttribute("href", "/angebot-pruefen");
    await nav.locator('[data-section="monitor"] > summary').click();
    await expect(nav.locator("details[open]")).toHaveCount(1);
    await expect(nav.getByRole("link", { name: /Atomstrom-Import/ })).toBeVisible();
  });

  // The unit guard (lib/__tests__/nav-aktiv.test.ts) can only prove that every
  // entry sits in the group that owns its page. Whether the mark is then really
  // applied is decided by the design package's script, and only a browser sees
  // it — without this test the guard would be green while nothing lights up,
  // which is the very failure the rewrite of 20.09.2026 was about.
  //
  // WHEN YOU BREAK THIS ON PURPOSE TO CHECK IT, REBUILD. public/shared-nav/nav.js
  // is served from disk for the standalone HTML pages, but React pages IMPORT it,
  // so it is bundled at build time. Editing it under a running `next start`
  // changes nothing, and all three sabotages pass — measured 20.09.2026, and the
  // reason this note exists.
  for (const [pfad, gruppe] of [
    ["/photovoltaik-rechner", "tools"],
    ["/ratgeber/lohnt-sich-pv-mit-speicher", "knowledge"],
  ] as const) {
    test(`marks ${gruppe} and the exact entry on ${pfad}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(pfad);
      const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
      await expect(nav.locator(`[data-section="${gruppe}"] > summary`)).toHaveAttribute("aria-current", "true");
      await expect(nav.locator(`[data-section="${gruppe}"] a[href="${pfad}"]`).first())
        .toHaveAttribute("aria-current", "page");
      // Exactly one group is marked — two lit menu points hide where the page lives.
      await expect(nav.locator('[data-section] > summary[aria-current="true"]')).toHaveCount(1);
    });
  }

  for (const width of [375, 768, 1024, 1280, 1281, 1440]) {
    test(`no overflow after hydration at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/impressum");
      if (width > 1280) {
        await expect(page.locator("header[data-global-nav] > .sc-nav-login")).toBeVisible();
      } else {
        await expect(page.getByRole("button", { name: "Menü öffnen", exact: true })).toBeVisible();
      }
      const sizes = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      expect(sizes[0]).toBeLessThanOrEqual(sizes[1] + 1);
    });
  }
});
