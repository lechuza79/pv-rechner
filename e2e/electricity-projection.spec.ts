import { test, expect } from '@playwright/test';
import { ergebnisBereit } from './ergebnis';

for (const width of [320, 375]) for (const path of [
  '/photovoltaik-rechner?a=1&s=1&p=2&n=1&ht=2&da=0&az=sued',
  '/balkonkraftwerk/rechner?pe=1&an=teils&au=sued_flach',
]) test(`shared source and rate at ${width}px in ${path}`, async ({ page }) => {
  page.on('pageerror', error => console.error('Calculator runtime error:', error.message));
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  if (path.startsWith('/photovoltaik')) await ergebnisBereit(page, 'amortisiert sich in');
  {
    await page.getByRole('button', { name: 'realistischer Preisentwicklung', exact: true }).click({ timeout: 60000 });
  }
  const tabs = page.getByRole('tablist', { name: 'Strompreis-Szenario' });
  await expect(tabs).toBeVisible({ timeout: 60000 });
  await expect(tabs.getByRole('tab', { name: /Realistisch/ })).toContainText('+1,41 %/Jahr');
  await expect(tabs.getByRole('tab', { name: /Vorsichtig/ })).toContainText('+0,41 %/Jahr');
  await expect(tabs.getByRole('tab', { name: /Optimistisch/ })).toContainText('+2,41 %/Jahr');
  await expect(page.getByRole('link', { name: 'Quelle: Umweltbundesamt' }).first()).toHaveAttribute('href', /umweltbundesamt.de/);
  await tabs.getByRole('tab', { name: /Optimistisch/ }).click();
  await expect(tabs.getByRole('tab', { name: /Optimistisch/ })).toHaveAttribute('aria-selected', 'true', { timeout: 30000 });
  await expect(page.getByText(/keine Vorhersage/).first()).toBeVisible();
  for (const tab of await tabs.getByRole('tab').all()) {
    const box = await tab.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
  }
  await page.screenshot({ path: `/tmp/price-source-${path.startsWith('/balkon') ? 'bkw' : 'pv'}-${width}.png`, fullPage: false });
});
