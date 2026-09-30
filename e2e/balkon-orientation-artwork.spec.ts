import { test, expect } from '@playwright/test';

for (const width of [375, 1280]) test(`unknown orientation and early result artwork at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/shop/balkon', route => route.fulfill({ json: { angebote: [] } }));
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (value: string) => sessionStorage.setItem('result-link', value) } }));
  const artwork = page.waitForResponse('**/funding-check-neon-result.webp');
  await page.goto('/balkonkraftwerk/rechner', { waitUntil: 'domcontentloaded' });
  expect((await (await artwork).body()).length).toBeLessThan(100_000);
  await expect(page.locator('[data-flow-nav]')).toHaveAttribute('data-flow-bereit', '1', { timeout: 30000 });
  await page.locator('[data-flow-group=personen]').filter({ hasText: /^1 Person$/ }).click();
  await page.locator('[data-flow-group=anwesenheit]').filter({ hasText: 'Teils zuhause' }).click();
  await page.locator('[data-flow-next]').click();
  const choices = page.locator('.wp-text-options');
  await expect(choices.locator('.sc-option-card')).toHaveCount(5);
  expect(await choices.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(width > 600 ? 2 : 1);
  await page.getByRole('button', { name: /Weiß noch nicht/ }).click();
  await page.screenshot({ path: `/tmp/bkw-orientation-${width}.png`, animations: 'disabled' });
  await page.locator('[data-flow-next]').click();
  await expect(page.locator('#bkw-ueberblick')).toContainText('Ausrichtung noch offen');
  await expect(page.locator('.wp-profit-illustration img')).toHaveJSProperty('naturalWidth', 640);
  await page.getByRole('region', { name: 'Ergebnisaktionen' }).getByRole('button', { name: 'Link zu diesem Ergebnis kopieren', exact: true }).click();
  const link = new URL((await page.evaluate(() => sessionStorage.getItem('result-link')))!);
  expect(link.searchParams.get('au')).toBe('unknown');
  await page.goto(link.toString(), { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#bkw-ueberblick')).toContainText('Ausrichtung noch offen');
});
