import { test, expect } from "@playwright/test";
import { DEFAULT_PRICES } from "../lib/prices-config";
import { DEFAULT_FEED_IN } from "../lib/feedin-config";

// A tooltip opened while the page is still scrolling must stay open and follow
// its trigger. It closed on every scroll event before, so a click during a
// smooth scroll (html has scroll-behavior: smooth) lost the help text.
const url = "/photovoltaik-rechner?a=4&ck=4&s=4&p=0&n=1&wp=ja&wf=140&wi=1&wh=hk_neu&wht=2&ea=nein&flow=emp&ht=0&da=0&az=sued";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/prices", r => r.fulfill({ json: DEFAULT_PRICES }));
  await page.route("**/api/feedin", r => r.fulfill({ json: DEFAULT_FEED_IN }));
});

test("tooltip survives scrolling while its trigger stays visible, closes once it leaves", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const trigger = page.getByRole("button", { name: "Mehr Infos", exact: true }).first();
  await expect(trigger).toBeVisible({ timeout: 60000 });
  await trigger.scrollIntoViewIfNeeded();
  const tooltip = page.getByRole("tooltip");
  // Prove the click registered (hydration) before testing scroll behaviour.
  await expect(async () => {
    if (!(await tooltip.isVisible())) await trigger.click();
    await expect(tooltip).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });

  // Small scroll: trigger stays in view, tooltip stays open and moves with it.
  const before = await tooltip.boundingBox();
  await page.evaluate(() => window.scrollBy({ top: 40, behavior: "instant" as ScrollBehavior }));
  await expect(tooltip).toBeVisible();
  await expect.poll(async () => (await tooltip.boundingBox())!.y).toBeLessThan(before!.y - 20);

  // Large scroll: trigger leaves the viewport, tooltip closes.
  await page.evaluate(() => window.scrollBy({ top: 5000, behavior: "instant" as ScrollBehavior }));
  await expect(tooltip).toHaveCount(0);
});

test("reduced motion disables smooth page scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("smooth");
});
