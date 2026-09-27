import { test, expect } from "@playwright/test";

const result = "/balkonkraftwerk/rechner?pe=1&an=teils&au=sued_flach";

test("missing people remain unanswered", async ({ page }) => {
  await page.goto("/balkonkraftwerk/rechner?an=teils&au=sued_flach", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Balkonkraftwerk-Rechner", exact: true })).toBeVisible();
  await expect(page.locator('[data-flow-group="personen"][aria-pressed="true"]')).toHaveCount(0);
});

test("result settings cancel, apply and retain values", async ({ page }) => {
  await page.goto(result, { waitUntil: 'domcontentloaded' });
  await page.getByRole("button", { name: /Dein Balkonkraftwerk/ }).click();
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
  await page.goto(result, { waitUntil: 'domcontentloaded' });
  const heading = page.getByRole("button", { name: /Dein Balkonkraftwerk/ });
  await expect(heading).toHaveAttribute("aria-expanded", "false");
  const toast = page.locator('.fu[role="status"]');
  await expect(toast).toBeVisible();
  await expect.poll(async () => {
    const box = await toast.boundingBox();
    return !!box && box.x >= 0 && box.x + box.width <= width;
  }).toBe(true);
  await page.getByRole("switch", { name: "Speicher mitrechnen" }).click();
  await heading.click();
  await expect(heading).toHaveAttribute("aria-expanded", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/bkw-result-${width}.png`, fullPage: true });
});

test("result uses the WP composition and keeps scenario changes as drafts", async ({ page }) => {
  await page.goto(result, { waitUntil: 'domcontentloaded' });
  const hero = page.locator('.wp-result-hero');
  await hero.waitFor({ state: 'visible', timeout: 60000 });
  await expect(hero).toContainText('Anschaffung nach Förderung und Reststrom');
  await expect(page.locator('.wp-personal-race svg').first()).toBeVisible();
  await expect(page.locator('.wp-result-stats')).toContainText('Autarkie');
  await hero.getByRole('button', { name: 'realistischer Preisentwicklung' }).click();
  const modal = page.getByRole('dialog', { name: 'Preise und Preisentwicklung' });
  await expect(modal.getByRole('button', { name: 'Ergebnis neu berechnen' })).toHaveAttribute('aria-disabled', 'true');
  await modal.getByRole('tab', { name: /Optimistisch/i }).click();
  await modal.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(hero).toContainText('realistischer Preisentwicklung');
  await hero.getByRole('button', { name: 'realistischer Preisentwicklung' }).click();
  await modal.getByRole('tab', { name: /Optimistisch/i }).click();
  await modal.getByRole('button', { name: 'Ergebnis neu berechnen' }).click();
  await expect(hero).toContainText('optimistischer Preisentwicklung');
});

test("sharing restores the displayed calculation", async ({ page }) => {
  await page.route('**/api/shop/balkon', route => route.fulfill({ json: {
    abgerufenIso: '2026-09-27T08:00:00Z',
    angebote: [{ id: 'share-set', haendler: 'solakon', haendlerName: 'Solakon', produkt: 'onBasic',
      moduleWp: 1000, inverterW: 800, speicherKwh: 0, preis: 600, streichpreis: null,
      lieferbar: true, url: 'https://www.solakon.de/products/onpower?variant=share-set', bildUrl: null, variante: 'Test' }],
  } }));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { sessionStorage.setItem('test-result-link', value); } } });
  });
  await page.goto(result + '&set=duo&sp=none&sc=optimistic&inv=999&strom=0.41&verbrauch=4200&funding=0', { waitUntil: 'domcontentloaded' });
  // Capture the settled shop-backed result, not the temporary model fallback.
  await expect(page.locator('section[aria-label="Berechnet mit"]')).toBeVisible();
  const amount = page.locator('.wp-result-count-space');
  await amount.waitFor({ state: 'attached', timeout: 60000 });
  await expect(amount).not.toHaveText('0');
  const before = await amount.textContent();
  await page.getByRole('button', { name: 'Link zu diesem Ergebnis kopieren' }).click();
  const link = await page.evaluate(() => sessionStorage.getItem('test-result-link'));
  expect(link).toContain('inv=999');
  expect(link).toContain('verbrauch=4200');
  await page.goto(link!, { waitUntil: 'domcontentloaded' });
  await amount.waitFor({ state: 'attached', timeout: 60000 });
  await expect(amount).toHaveText(before!);
  await expect(page.locator('.wp-result-hero')).toContainText('optimistischer Preisentwicklung');
});
