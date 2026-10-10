import { test, expect } from "@playwright/test";

// On-site charts use the shared native widget. The remaining external strommix
// frame must still navigate the parent page when following its next step.
const growthChart = (page: import("@playwright/test").Page) =>
  page.locator('article[data-widget-id="welt-zubaurennen"]');

test.describe("Widget auf eigener Seite", () => {
  test("uses the native dark widget without a separate iframe", async ({ page }) => {
    await page.goto("/atomstrom-import");
    const chart = growthChart(page);
    await expect(chart).toBeVisible();
    await expect(chart).toHaveAttribute("data-story-scheme", "dark");
    await expect(page.locator('iframe[src*="zubau-erneuerbare-atom"]')).toHaveCount(0);
    const channels = await chart.evaluate(node => getComputedStyle(node).backgroundColor.match(/\d+/g)?.slice(0,3).map(Number));
    expect(channels).toHaveLength(3);
    expect(Math.max(...channels!)).toBeLessThan(100);
  });

  test("shows no next-step link back to the current page", async ({ page }) => {
    await page.goto("/atomstrom-import");
    const chart = growthChart(page);
    await expect(chart).toBeVisible();
    await expect(chart.locator('a[href="/atomstrom-import"]')).toHaveCount(0);
  });

  test("opens the remaining embedded next step in the parent window", async ({ page }) => {
    await page.goto("/atomstrom-import");
    const frame = page.frameLocator('iframe[src*="embed/strommix?"]');
    const link = frame.locator('a[href="/strommix-deutschland"]');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("target", "_top");
  });

  test("keeps the native options menu inside the mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width:375, height:760 });
    await page.goto("/atomstrom-import");
    const chart = growthChart(page);
    await expect(chart).toBeVisible();
    await chart.getByRole("button", {name:/^Optionen für/}).click();
    const menu = chart.getByRole("menu");
    await expect(menu).toBeVisible();
    expect(await menu.evaluate(node => {
      const rect=node.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
    })).toBe(true);
    await expect(menu.getByRole("menuitem", {name:"Aktueller Stand als Bild",exact:true})).toBeVisible();
  });
});
