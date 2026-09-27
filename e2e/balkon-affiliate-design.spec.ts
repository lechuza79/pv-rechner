import { test, expect } from '@playwright/test';
const path = '/balkonkraftwerk/rechner?pe=1&an=teils&au=sued_flach';
// Layout and interaction assertions must not depend on the merchant's latency.
// Merchant parsing and ranking are covered independently by shop-angebot tests.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/shop/balkon', route => route.fulfill({ json: {
    abgerufenIso: '2026-09-26T08:00:00Z',
    angebote: [0, 1, 2].map(index => ({
      id: `test-${index}`, haendler: 'solakon', haendlerName: 'Solakon', produkt: 'onPower',
      moduleWp: 2000, inverterW: 800, speicherKwh: index * 2.11, preis: 600 + index * 500,
      streichpreis: null, lieferbar: true, url: `https://www.solakon.de/products/onpower?variant=test-${index}`,
      bildUrl: null, variante: `Testvariante ${index}`,
    })),
  } }));
});
for (const width of [375, 569, 1280]) test(`shared affiliate design at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (value: string) => sessionStorage.setItem('copied-product', value) } }));
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  const cards = page.locator('.bkw-offers .wp-product-card');
  await expect(cards).toHaveCount(3, { timeout: 60000 });
  const first = cards.first();
  await first.scrollIntoViewIfNeeded();
  await expect(first.getByText('ANZEIGE', { exact: true })).toBeVisible();
  const image = await first.locator('.wp-product-image').boundingBox();
  const ad = await first.getByText('ANZEIGE', { exact: true }).boundingBox();
  expect(ad!.x).toBeGreaterThan(image!.x + image!.width / 2);
  expect(ad!.y).toBeLessThan(image!.y + 40);
  await expect(first.getByRole('link', { name: 'Zum Shop' })).toHaveAttribute('rel', /sponsored/);
  await first.getByRole('button', { name: 'Produktlink kopieren' }).click();
  expect(await page.evaluate(() => sessionStorage.getItem('copied-product'))).toContain('ref=lsqpyrpl');
  await first.getByRole('button', { name: 'Produkt weiterleiten' }).click();
  await expect(page.getByRole('dialog', { name: 'Balkonkraftwerk weiterleiten' })).toBeVisible();
  await page.keyboard.press('Escape');
  await first.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `/tmp/bkw-affiliate-${width}.png` });
  const trust = page.locator('.bkw-offers .wp-product-trust');
  await trust.scrollIntoViewIfNeeded();
  await expect(trust.getByText('Sebastian Schäder')).toBeVisible();
  await expect(trust.locator('img')).toHaveAttribute('src', '/sebastian-schaeder.webp');
  await expect(trust).toContainText('nicht nach unserer Provision');
  await page.screenshot({ path: `/tmp/bkw-trust-${width}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (width === 569) {
    await first.locator('.wp-product-image').scrollIntoViewIfNeeded();
    const before = await first.boundingBox();
    const frame = await first.locator('.wp-product-image').boundingBox();
    const y = frame!.y + frame!.height / 2;
    const startX = frame!.x + frame!.width * 0.85;
    await page.mouse.move(startX, y); await page.mouse.down();
    await page.mouse.move(Math.max(10, frame!.x), y, { steps: 15 }); await page.mouse.up();
    await expect.poll(async () => (await first.boundingBox())!.x).toBeLessThan(before!.x - 100);
  }
});

test('WP uses the same affiliate contract with a deterministic catalogue', async ({ page }) => {
  await page.setViewportSize({ width: 569, height: 900 });
  await page.route('**/api/wp-geraete?**', route => route.fulfill({ json: {
    abgerufenIso: new Date().toISOString(), auswahlAus: 3,
    empfehlungen: [1, 2, 3].map(id => ({ geeignet: true, befunde: [], geraet: {
      id: String(id), name: `Test-Wärmepumpe ${id}, 12 kW`, marke: 'Test', leistungKw: 12,
      herkunft: 'ausgeschrieben', bauart: 'luft-wasser', preisEur: 5000 + id * 100,
      versandEur: 0, link: `https://example.test/produkt/${id}`, bildUrl: null,
      lieferbar: true, vorlaufMaxC: 65, kaeltemittel: 'r290', aufbau: 'monoblock', umfang: 'geraet',
    } })),
  } }));
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.wp-product-card')).toHaveCount(3);
  const bkwCard = await page.locator('.wp-product-card').first().evaluate(el => ({
    background: getComputedStyle(el).backgroundColor,
    radius: getComputedStyle(el).borderRadius,
    width: el.getBoundingClientRect().width,
  }));
  await page.goto('/waermepumpe-rechner?e=1&hz=hk_neu&pe=4', { waitUntil: 'domcontentloaded' });
  const cards = page.locator('.wp-product-card');
  await expect(cards).toHaveCount(3, { timeout: 60000 });
  const wpCard = await cards.first().evaluate(el => ({
    background: getComputedStyle(el).backgroundColor,
    radius: getComputedStyle(el).borderRadius,
    width: el.getBoundingClientRect().width,
  }));
  expect(bkwCard).toEqual(wpCard);
  const first = cards.first();
  await first.scrollIntoViewIfNeeded();
  await expect(first.getByText('ANZEIGE', { exact: true })).toBeVisible();
  await expect(first.locator('.wp-product-copy')).toBeVisible();
  await first.locator('.wp-product-forward').click();
  await expect(page.getByRole('dialog', { name: 'An deinen Heizungsbauer weiterleiten' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.wp-product-trust')).toContainText('Sebastian Schäder');
  await expect(page.locator('.wp-product-disclosure')).toContainText('Heizungsdiscount24');
});

test('BKW result supports funding follow-up and shared chart inspection', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 569, height: 900 });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'realistischer Preisentwicklung', exact: true })).toBeVisible();
  const amount = page.locator('.bkw-profit-amount');
  await expect(amount).toContainText('vs. ausschließlich Netzstrom');
  const funding = page.getByRole('button', { name: 'Förderung prüfen', exact: true });
  await funding.click();
  const location = page.locator('#bkw-einstellungen .wp-question').filter({ hasText: 'Standort & Förderung' });
  await expect(location.locator('.wp-question-heading')).toHaveAttribute('aria-expanded', 'true');
  await expect(location.getByRole('textbox', { name: 'Postleitzahl oder Ort' })).toBeVisible();
  await page.getByRole('button', { name: /Ertrag und technische Details/ }).click();
  await expect(page.locator('[data-flow-akkordeon-offen="Ertrag und technische Details"]')).toBeVisible();
  const slider = page.getByRole('slider', { name: 'Tag wählen' });
  await slider.focus(); await slider.press('End');
  const chart = page.locator('.wp-personal-race svg[role="img"]');
  await page.locator('.wp-result-chart').scrollIntoViewIfNeeded();
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.6);
  const tooltip = page.locator('.wp-personal-race [role="tooltip"]');
  await expect(tooltip).toContainText('Balkonkraftwerk');
  await expect(tooltip).toContainText('Netzstrom');
  await expect(tooltip).toContainText('€');
  await page.screenshot({ path: '/tmp/bkw-hover-final.png' });
  await page.mouse.move(0, 0);
  await expect(tooltip).toHaveCount(0);
  await chart.focus(); await chart.press('Home');
  await expect(tooltip).toContainText('2026');
  await chart.press('Escape');
  await expect(tooltip).toHaveCount(0);
  await page.locator('#bkw-einstellungen').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/bkw-settings-final.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('result uses the recommended shop configuration and preserves explicit selections', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  const first = page.locator('.wp-product-card').first();
  await expect(first).toBeVisible({ timeout: 60000 });
  await expect(first.locator('.bkw-product-calculation')).not.toContainText('Vorteil über');
  await expect.poll(() => page.evaluate(() => document.querySelector('.wp-result-count-live')?.textContent === document.querySelector('.wp-result-count-space')?.textContent)).toBe(true);
  await expect(page.locator('.wp-result-hero').getByRole('link', { name: /onPower.*im Shop ansehen/ })).toHaveAttribute('rel', /sponsored/);
  await expect(page.locator('.sc-stand-cards')).toContainText('Shoppreis des berechneten Sets');
  await expect(page.locator('.sc-stand-cards')).not.toContainText('Set- und Speicherpreise');
  await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
  await page.getByRole('button', { name: /^Dein Balkonkraftwerk/ }).click();
  const system = page.locator('#bkw-einstellungen');
  await system.getByRole('button', { name: /Ohne Speicher.*600/ }).click();
  await expect(system).toContainText('onPower · 2 kWp · ohne Speicher');
  await expect(page.getByRole('switch', { name: 'Speicher mitrechnen' }).first()).not.toBeChecked();
  await page.getByRole('link', { name: 'Überblick', exact: true }).click();
  await expect(page.locator('.wp-product-card[data-recommended="true"] .bkw-product-price-row')).toContainText('600');
  await page.goto(`${path}&offer=test-2`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.wp-result-hero')).toContainText('4,22 kWh Speicher', { timeout: 60000 });
  await expect(page.locator('.wp-product-card[data-recommended="true"] .bkw-product-price-row')).toContainText('1.600');
});

test('failed shop fetch keeps an explicitly labelled model result', async ({ page }) => {
  await page.route('**/api/shop/balkon', route => route.fulfill({ status: 502, json: { fehler: 'Unavailable' } }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.wp-result-hero')).toContainText('Modellrechnung mit typischen Setgrößen', { timeout: 60000 });
  await expect(page.locator('.wp-result-count-live')).toHaveText(/[1-9]/);
  await expect(page.locator('.wp-product-card')).toHaveCount(0);
  await expect(page.locator('.sc-stand-cards')).toContainText('Set- und Speicherpreise');
});
