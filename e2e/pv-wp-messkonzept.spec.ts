import { test, expect } from "@playwright/test";
import { DEFAULT_PRICES } from "../lib/prices-config";
import { DEFAULT_FEED_IN } from "../lib/feedin-config";
import { klickBisWirkung } from "./klick";

// The heat-pump metering comparison: three options, a recommendation that never
// promotes a second meter without its conversion cost, and the cost input.
const url = "/photovoltaik-rechner?a=4&ck=4&s=4&p=0&n=1&wp=ja&wf=140&wi=1&wh=hk_neu&wht=2&ea=nein&flow=emp&ht=0&da=0&az=sued";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/prices", r => r.fulfill({ json: DEFAULT_PRICES }));
  await page.route("**/api/feedin", r => r.fulfill({ json: DEFAULT_FEED_IN }));
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("heat-pump metering compares three options and reacts to the conversion cost", async ({ page }) => {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const block = page.getByTestId("wp-messkonzept");
  await expect(block).toBeVisible({ timeout: 60000 });
  await expect(block.locator("[data-messkonzept]")).toHaveCount(3);
  await expect(block.locator("[data-messkonzept=gemeinsam]")).toContainText("bis");
  // Without an entered conversion cost no second meter is marked as recommended.
  await expect(block.locator("[data-messkonzept=kaskade]")).not.toHaveAttribute("aria-current", "true");
  await expect(block.locator("[data-messkonzept=getrennt]")).not.toHaveAttribute("aria-current", "true");

  const edit = block.getByRole("button", { name: /bearbeiten/ });
  await klickBisWirkung(edit, block.getByRole("textbox"), "Umbaukosten bearbeiten");
  await block.getByRole("textbox").fill("20000");
  await block.getByRole("textbox").press("Enter");
  await expect(block.locator("[data-messkonzept=kaskade]")).toContainText("20.000 € Umbau");
  await expect(block.locator("[data-messkonzept=gemeinsam]")).toHaveAttribute("aria-current", "true");
});
