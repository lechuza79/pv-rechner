import { test, expect } from "@playwright/test";

const result = "/balkonkraftwerk/rechner?pe=1&an=teils&au=sued_flach";

test("missing people remain unanswered", async ({ page }) => {
  await page.goto("/balkonkraftwerk/rechner?an=teils&au=sued_flach");
  await expect(page.getByRole("heading", { name: "Balkonkraftwerk-Rechner", exact: true })).toBeVisible();
  await expect(page.locator('[data-flow-group="personen"][aria-pressed="true"]')).toHaveCount(0);
});

test("result settings cancel, apply and retain values", async ({ page }) => {
  await page.goto(result);
  const opener = page.getByRole("button", { name: /Deine Rechengrundlagen/ });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Deine Rechengrundlagen" });
  const apply = dialog.getByRole("button", { name: "Ergebnis neu berechnen" });
  await expect(apply).toHaveAttribute("aria-disabled", "true");
  await dialog.getByRole("button", { name: / kWh bearbeiten/ }).click();
  await dialog.locator("input").fill("4200");
  await dialog.locator("input").press("Enter");
  await dialog.getByRole("button", { name: "Abbrechen" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(opener).not.toContainText("4.200");
  await opener.click();
  await dialog.getByRole("button", { name: / kWh bearbeiten/ }).click();
  await dialog.locator("input").fill("4200");
  await dialog.locator("input").press("Enter");
  await apply.click();
  await expect(dialog).not.toBeVisible();
  await expect(opener).toContainText("4.200");
  await opener.click();
  await expect(dialog.getByRole("button", { name: /4.200 kWh bearbeiten/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

for (const width of [320, 375, 1280]) test(`standard result layout at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(result);
  const heading = page.getByRole("button", { name: /Dein Balkonkraftwerk/ });
  await expect(heading).toHaveAttribute("aria-expanded", "true");
  const toast = page.getByRole("status");
  await expect(toast).toBeVisible();
  await expect.poll(async () => {
    const box = await toast.boundingBox();
    return !!box && box.x >= 0 && box.x + box.width <= width;
  }).toBe(true);
  await page.getByRole("switch", { name: "Speicher mitrechnen" }).click();
  await heading.click();
  await expect(heading).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/bkw-result-${width}.png`, fullPage: true });
});
