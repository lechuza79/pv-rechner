import { FUNDING_PROGRAMS } from "../lib/funding-programs";
import { test, expect } from '@playwright/test';
const base = '/balkonkraftwerk/rechner?pe=1&an=teils&au=sued_flach';
const packages = [0, 4.22, 10.55].map((storage, i) => ({ id: `contract-${i}`, haendler: 'solakon', haendlerName: 'Solakon', produkt: 'onPower', moduleWp: 2000, inverterW: 800, speicherKwh: storage, preis: 400 + i * 650, streichpreis: null, lieferbar: true, url: `https://www.solakon.de/products/onpower?variant=contract-${i}`, bildUrl: null, variante: `Test ${storage}` }));
test.beforeEach(async ({ page }) => {
  await page.route('**/api/shop/balkon', route => route.fulfill({ json: { abgerufenIso: '2026-09-27T08:00:00Z', angebote: packages } }));
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (value: string) => sessionStorage.setItem('result-link', value) } }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 569, height: 900 });
});
test('ten-year default, cancelled edits and twenty-year recalculation', async ({ page }) => {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  const result = page.locator('#bkw-ueberblick');
  await expect(result.locator('.wp-result-label-copy')).toContainText('über 10 Jahre', { timeout: 60000 });
  await expect(result).toContainText('Ersparnis im 1. Jahr');
  await result.getByRole('button', { name: 'Hinweis zur Speicherberechnung' }).click();
  await expect(page.getByRole('tooltip')).toContainText('15 % Mindestladung');
  await expect(page.getByRole('tooltip')).toContainText('Smart Meter');
  await page.screenshot({ path: '/tmp/bkw-storage-assumptions.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await result.getByRole('slider', { name: 'Tag wählen' }).press('End');
  await expect(result).toContainText('Die Bilanz nach 10 Jahren');
  await page.locator('.wp-assumptions-trigger').click();
  let modal = page.getByRole('dialog', { name: 'Preise und Preisentwicklung' });
  await expect(modal.getByRole('button', { name: /^Ergebnis neu berechnen/ })).toBeDisabled();
  await modal.getByRole('button', { name: '20 Jahre', exact: true }).click();
  await modal.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(result.locator('.wp-result-label-copy')).toContainText('über 10 Jahre');
  await page.locator('.wp-assumptions-trigger').click();
  modal = page.getByRole('dialog', { name: 'Preise und Preisentwicklung' });
  await modal.getByRole('button', { name: '20 Jahre', exact: true }).click();
  await modal.getByRole('button', { name: /^Ergebnis neu berechnen/ }).click();
  await expect(result.locator('.wp-result-label-copy')).toContainText('über 20 Jahre');
  await expect(page.locator('.wp-product-card[data-recommended="false"]').first().locator('.bkw-product-header')).toContainText('Ersparnis über 20 Jahre');
  await result.getByRole('slider', { name: 'Tag wählen' }).press('End');
  await expect(result).toContainText('Die Bilanz nach 20 Jahren');
  await page.screenshot({ path: '/tmp/bkw-stage2-result.png' });
  await result.locator('.wp-result-stats').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/bkw-stage2-stats.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('share preserves a large battery, edited price, funding off and horizon', async ({ page }) => {
  await page.goto(`${base}&offer=contract-2&years=20&inv=1600&funding=0&wohnform=mieter&extra=120&shade=15`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.wp-result-hero')).toContainText('10,55 kWh', { timeout: 60000 });
  const actions = page.getByRole('region', { name: 'Ergebnisaktionen' });
  await actions.getByRole('button', { name: 'Link zu diesem Ergebnis kopieren', exact: true }).click();
  const copied = await page.evaluate(() => sessionStorage.getItem('result-link'));
  const link = new URL(copied!);
  for (const [key, value] of Object.entries({ speicherKwh: '10.55', offer: 'contract-2', years: '20', inv: '1600', funding: '0', wohnform: 'mieter', extra: '120', shade: '15' })) expect(link.searchParams.get(key)).toBe(value);
  await page.goto(link.toString(), { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.wp-result-hero')).toContainText('10,55 kWh');
  await expect(page.locator('.wp-result-hero')).toContainText('deinem eigenen Preis');
});
test('unavailable shared offer retains hardware with a visible model fallback', async ({ page }) => {
  await page.goto(`${base}&offer=gone&moduleWp=2000&inverterW=800&speicherKwh=10.55&preis=1700&years=10`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.bkw-offer-price-note').filter({ hasText: 'Das geteilte Shopangebot' })).toContainText('Das geteilte Shopangebot ist aktuell nicht verfügbar', { timeout: 60000 });
  await expect(page.locator('.bkw-offer-price-note').filter({ hasText: 'Das geteilte Shopangebot' })).toContainText('geteilten Geräteangaben');
  await page.getByRole('region', { name: 'Ergebnisaktionen' }).getByRole('button', { name: 'Link zu diesem Ergebnis kopieren', exact: true }).click();
  const copied = new URL((await page.evaluate(() => sessionStorage.getItem('result-link')))!);
  expect(copied.searchParams.get('offer')).toBe('gone');
  expect(copied.searchParams.get('speicherKwh')).toBe('10.55');
});

test('funding lookup previews changes, then recalculation applies them', async ({ page }) => {
  const program = { ...FUNDING_PROGRAMS['landkreis-oldenburg-steckersolar'], lastVerified: new Date().toISOString().slice(0, 10), pageSeenAt: new Date().toISOString() };
  await page.route('**/api/suche?*', route => route.fulfill({ json: {
    orte: [{ ags: '03458014', name: 'Wildeshausen', kontext: 'Landkreis Oldenburg', links: [{ href: '/balkonkraftwerk/rechner?plz=27793' }] }],
  } }));
  await page.route('**/api/funding?*', route => route.fulfill({ json: { candidates: [{ ags: '03458014', ort: 'Wildeshausen', programs: [program] }] } }));
  await page.route('**/api/pvgis?*', route => route.fulfill({ json: { annual: 1000 } }));
  await page.goto(`${base}&offer=contract-1&strom=0.31`);
  const value = page.locator('.wp-result-count-space');
  await expect(page.locator('.wp-result-hero')).toContainText('4,22 kWh', { timeout: 60000 });
  const original = await value.textContent();
  await page.getByText('Standort & Förderung', { exact: true }).click();
  const input = page.getByLabel('Postleitzahl oder Ort', { exact: true });
  const check = page.locator('#bkw-einstellungen').getByRole('button', { name: 'Förderung prüfen', exact: true });
  const apply = page.getByRole('button', { name: /^Ergebnis neu berechnen/ });
  await expect(check).toBeDisabled();
  await input.fill('Wildeshausen');
  await page.getByRole('button', { name: /27793 Wildeshausen/ }).click();
  await check.click();
  await expect(page.locator('.sc-result-funding')).toContainText('250');
  await expect(check).toBeDisabled();
  await expect(value).toHaveText(original!);
  await expect(apply).toBeEnabled();
  await input.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/bkw-funding-preview.png' });
  await apply.click();
  await expect(value).not.toHaveText(original!);
  await expect.poll(async () => {
    const box = await page.locator('#bkw-ueberblick').boundingBox();
    return box !== null && box.y >= -1 && box.y < 200;
  }).toBe(true);
  const applied = await value.textContent();
  const fundedPrice = page.locator('.wp-product-card[data-recommended="true"]');
  await expect(fundedPrice.locator('.bkw-product-price-row strong')).toContainText('1.050');
  await expect(fundedPrice.locator('.wp-funded-amount')).toContainText('800');
  await expect(fundedPrice.getByRole('button', { name: 'Förderung genau berechnen', exact: true })).toHaveCount(0);
  const fundingHelp = fundedPrice.getByRole('button', { name: 'Wie wird der Setpreis mit Förderung berechnet?', exact: true });
  await fundedPrice.scrollIntoViewIfNeeded();
  await fundingHelp.focus();
  await fundingHelp.press('Enter');
  await expect(page.getByRole('tooltip').getByText('Landkreis Oldenburg: Gefördert werden nur Balkonkraftwerke mit Speicher.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await fundedPrice.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/bkw-shared-funded-card.png' });
  await page.getByText('Standort & Förderung', { exact: true }).click();
  await expect(input).toHaveValue('27793 Wildeshausen');
  await expect(input).toHaveAttribute('readonly', '');
  await expect(check).toBeDisabled();
  await expect(page.getByRole('list', { name: 'Gefundene Orte' })).toHaveCount(0);
  await page.getByRole('switch', { name: 'Förderung anrechnen', exact: true }).click();
  await expect(value).toHaveText(applied!);
  await apply.click();
  await expect(value).not.toHaveText(applied!);
  await page.getByText('Standort & Förderung', { exact: true }).click();
  await page.getByRole('button', { name: 'Standort löschen', exact: true }).click();
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await expect(check).toBeDisabled();
  await expect(apply).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('offer selection updates the calculation and keeps technical details accessible', async ({ page }) => {
  await page.goto(`${base}&offer=contract-1&strom=0.31`);
  const cards = page.locator('.bkw-offers .wp-product-card');
  await expect(cards).toHaveCount(3, { timeout: 60000 });
  await expect(cards.getByRole('button', { name: 'In deiner Berechnung', exact: true })).toHaveCount(1);
  const alternative = cards.filter({ has: page.locator('.bkw-offer-intro', { hasText: 'ohne Speicher' }) }).first();
  await alternative.getByRole('button', { name: 'Damit berechnen', exact: true }).click();
  await expect(page.locator('.wp-result-hero')).toContainText('ohne Speicher');
  await expect(alternative.getByRole('button', { name: 'In deiner Berechnung', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(alternative.getByRole('button', { name: 'Damit berechnen' })).toHaveCount(0);
  await alternative.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/bkw-offer-layout.png' });
  await page.getByText('Ertrag und technische Details', { exact: true }).click();
  const technical = page.locator('#bkw-ertrag');
  await expect(technical).toContainText('Erzeugt pro Jahr');
  await expect(technical).toContainText('Selbst genutzt');
  await technical.getByText('Anschluss, Anmeldung & Nutzung', { exact: true }).click();
  await expect(technical).toContainText('Miete oder Eigentum');
  await technical.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/bkw-technical-layout.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test('shop clicks distinguish the result teaser from lower cards without properties', async ({ page }) => {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.wp-product-card').first()).toBeVisible({ timeout: 60000 });
  await page.evaluate(() => {
    const events: unknown[][] = [];
    Object.assign(window, { testShopEvents: events });
    Object.defineProperty(window, "va", { configurable: true, get: () => (...args: unknown[]) => events.push(args), set: () => {} });
    // Keep this test local while exercising real anchor activation and React handlers.
    document.addEventListener('click', event => {
      if ((event.target as Element).closest('a[rel*="sponsored"]')) event.preventDefault();
    });
  });
  const events = () => page.evaluate(() => (window as unknown as { testShopEvents: unknown[][] }).testShopEvents.filter(e => e[0] === 'event'));
  await page.locator('section[aria-label="Berechnet mit"] a').click();
  expect(await events()).toEqual([['event', { name: 'balkon_shop_ergebnis', data: undefined }]]);
  const card = page.locator('.wp-product-card').first();
  await card.locator('.wp-product-image').click();
  await card.locator('.wp-product-shop').click();
  expect(await events()).toEqual([
    ['event', { name: 'balkon_shop_ergebnis', data: undefined }],
    ['event', { name: 'balkon_shop_angebote', data: undefined }],
    ['event', { name: 'balkon_shop_angebote', data: undefined }],
  ]);
  await card.getByRole('button', { name: 'Produktlink kopieren', exact: true }).click();
  expect(await events()).toHaveLength(3);
});
