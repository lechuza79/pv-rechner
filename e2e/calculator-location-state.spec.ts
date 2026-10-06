import { test, expect } from '@playwright/test';

for (const width of [375, 1280]) {
  test(`remembered postcode is visible and clearing invalidates confirmation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.addInitScript(() => localStorage.setItem('sc-plz', '97204'));
    await page.route('**/plz.json', route => route.fulfill({ json: { '97204': [49.8, 9.9], '10115': [52.5, 13.4] } }));
    await page.route('**/api/pvgis?**', route => route.fulfill({ json: { annual: 1099 } }));
    await page.goto('/balkonkraftwerk/rechner', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-flow-nav]')).toHaveAttribute('data-flow-bereit', '1');
    await page.locator('[data-flow-group=personen]').filter({ hasText: /^1 Person$/ }).click();
    await page.locator('[data-flow-group=anwesenheit]').filter({ hasText: 'Teils zuhause' }).click();
    const field = page.getByRole('textbox', { name: 'Postleitzahl', exact: true });
    await expect(field).toHaveValue('97204');
    await expect(page.getByRole('status').filter({ hasText: 'Gespeicherter Standort 97204' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Geprüft', exact: true })).toBeVisible();
    const colors = await field.evaluate(el => ({ fg: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }));
    const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
    expect((luminance(colors.fg) + .05) / (luminance(colors.bg) + .05)).toBeGreaterThanOrEqual(4.5);
    await field.fill('');
    await expect(page.getByRole('button', { name: 'Geprüft', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Standort prüfen', exact: true })).toBeDisabled();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/pvgis?**', async route => { await gate; await route.fulfill({ json: { annual: 1100 } }); });
    await field.fill('10115');
    const requested = page.waitForRequest('**/api/pvgis?**');
    await page.getByRole('button', { name: 'Standort prüfen', exact: true }).click();
    await requested;
    await field.fill('');
    const response = page.waitForResponse('**/api/pvgis?**');
    release();
    await response;
    await expect(field).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Geprüft', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Standort prüfen', exact: true })).toBeDisabled();
  });
}
