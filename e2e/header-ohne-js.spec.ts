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
    await expect(nav.getByRole("link", { name: /Angebotscheck/ })).toHaveAttribute("href", "/angebot-pruefen");
    await nav.locator('[data-section="monitor"] > summary').click();
    await expect(nav.locator("details[open]")).toHaveCount(1);
    await expect(nav.getByRole("link", { name: /Atomstrom-Import/ })).toBeVisible();
  });

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
