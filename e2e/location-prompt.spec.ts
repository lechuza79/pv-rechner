import { test, expect, type Page } from '@playwright/test';
import { FUNDING_PROGRAMS } from "../lib/funding-programs";
import { NATIONAL_AVG_YIELD } from "../lib/constants";
import { DEFAULT_PRICES } from '../lib/prices-config';
import { DEFAULT_FEED_IN } from '../lib/feedin-config';

const pv = '/photovoltaik-rechner?a=4&ck=4&s=4&p=0&n=1&wp=ja&wf=140&wi=1&wh=hk_neu&wht=2&ea=nein&flow=emp&ht=0&da=0&az=sued';
const routes = [
  ['pv', pv],
  ['bkw', '/balkonkraftwerk/rechner?pe=1&an=teils&au=sued_flach'],
  ['wp', '/waermepumpe-rechner?e=1&si=bestand&fl=1&ht=0&da=0&pe=2&hz=hk_alt&wt=lwwp'],
  ['klima', '/klimaanlage-stromkosten'],
] as const;

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/prices', r => r.fulfill({ json: DEFAULT_PRICES }));
  await page.route('**/api/feedin', r => r.fulfill({ json: DEFAULT_FEED_IN }));
  await page.route('**/api/shop/balkon', r => r.fulfill({ json: { angebote: [], abgerufenIso: new Date().toISOString() } }));
  await page.route('**/api/suche?*', r => r.fulfill({ json: { orte: [
    { ags: '03458014', name: 'Wildeshausen', kontext: 'Landkreis Oldenburg', links: [{ href: '/?plz=27793' }] },
  ] } }));
  await page.route('**/api/funding?*', r => r.fulfill({ json: { candidates: [{ ags: '03458014', ort: 'Wildeshausen', programs: [] }] } }));
  await page.route('**/plz.json', r => r.fulfill({ json: { '27793': [52.9, 8.4] } }));
  await page.route('**/api/pvgis?*', r => r.fulfill({ json: { annual: 1200, source: 'pvgis', monthly: Array(12).fill(100) } }));
  await page.route('**/api/cooling-degree?*', r => r.fulfill({ json: { avg5: 600, lastSummer: 650, projection: 700, source: 'era5' } }));
});

async function open(page: Page, route: string, klima = false) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  if (klima) {
    await page.locator('[data-flow-option]').first().click();
    await page.locator('[data-flow-next]').click();
    await page.locator('[data-flow-group="raeume"]').first().click();
    await page.locator('[data-flow-group="sonne"]').first().click();
    await page.locator('[data-flow-next]').click();
    await page.locator('[data-flow-group="temperatur"]').first().click();
    await page.getByRole('button', { name: /Nur tagsüber/ }).click();
    await page.locator('[data-flow-next]').click();
  }
  const prompt = page.getByRole('status').filter({ has: page.getByRole('group', { name: 'Standort prüfen', exact: true }) });
  await expect(prompt).toBeVisible({ timeout: 45000 });
  return prompt;
}

for (const [name, route] of routes) test(`${name}: mobile inline location saves only on confirmation`, async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  let fundingRequests = 0;
  page.on('request', request => { if (request.url().includes('/api/funding?plz=')) fundingRequests++; });
  if (name === 'wp') await page.clock.install();
  const prompt = await open(page, route, name === 'klima');
  if (name === 'wp') await page.getByRole('slider', { name: 'Tag wählen', exact: true }).first().evaluate(el => el.setAttribute('data-before-location', 'true'));
  await prompt.getByRole('button', { name: 'Standort eingeben', exact: true }).click({ trial: true });
  const buttonBox = (await prompt.getByRole('button', { name: 'Standort eingeben', exact: true }).boundingBox())!;
  const promptBox = (await prompt.boundingBox())!;
  const message = prompt.getByRole('group', { name: 'Standort prüfen', exact: true }).locator(':scope > span');
  expect(await message.evaluate(el => el.getBoundingClientRect().height <= 2 * parseFloat(getComputedStyle(el).lineHeight) + 1)).toBe(true);
  await prompt.getByRole('button', { name: 'Standort eingeben', exact: true }).click();
  expect((await prompt.boundingBox())!.height).toBeLessThanOrEqual(promptBox.height + 1);
  const editorBox = (await prompt.locator('form').boundingBox())!;
  expect(Math.abs(editorBox.x - buttonBox.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(editorBox.width - buttonBox.width)).toBeLessThanOrEqual(1);
  const field = prompt.getByLabel('Postleitzahl oder Ort', { exact: true });
  await expect(field).toBeFocused();
  await expect(prompt.getByRole('button', { name: 'Speichern', exact: true })).toBeDisabled();
  await field.fill('Wildeshausen');
  await prompt.getByRole('button', { name: /27793 Wildeshausen/ }).click();
  expect(fundingRequests).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('sc-plz'))).toBeNull();
  await prompt.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await expect(prompt.getByRole('button', { name: 'Standort eingeben', exact: true })).toBeFocused();
  await prompt.getByRole('button', { name: 'Standort eingeben', exact: true }).click();
  await expect(field).toHaveValue('');
  await field.fill('27793');
  await prompt.getByRole('button', { name: /27793 Wildeshausen/ }).click();
  await page.screenshot({ path: `/tmp/location-${name}-375.png`, animations: 'disabled' });
  await prompt.screenshot({ path: `/tmp/location-inline-${name}-375.png`, animations: 'disabled' });
  const box = await prompt.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await prompt.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Standort eingeben', exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sc-plz'))).toBe('27793');
  const feedback = page.getByRole('status').filter({ hasText: 'Wildeshausen übernommen.' });
  await expect(feedback).toContainText(name === 'wp' ? 'Dein Ergebnis bleibt unverändert.' : 'Ergebnis aktualisiert.');
  await expect(feedback.locator('.sc-toast-countdown')).toContainText('10');
  await expect(feedback.locator('.sc-toast-countdown circle')).toHaveCount(2);
  if (name === 'wp') {
    await expect(page.locator('[data-before-location="true"]')).toHaveCount(1);
    await feedback.screenshot({ path: '/tmp/location-feedback-unchanged.png' });
    await page.clock.fastForward(9000);
    await expect(feedback.locator('.sc-toast-countdown')).toHaveText('1');
    await expect.poll(async () => Number(await feedback.locator('.sc-toast-countdown circle').last().getAttribute('stroke-dashoffset'))).toBeGreaterThan(0.8);
    await page.clock.fastForward(1000);
    await expect(feedback).toHaveCount(0);
    await expect(page.locator('[data-before-location="true"]')).toHaveCount(1);
  } else if (name === 'pv') await feedback.screenshot({ path: '/tmp/location-feedback-updated.png' });
});

test('PV: failed yield lookup preserves the result and lets the visitor retry', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  let fail = true;
  await page.route('**/api/pvgis?*', r => fail ? r.fulfill({ status: 503, json: { error: 'unavailable' } }) : r.fulfill({ json: { annual: 1200, source: 'pvgis' } }));
  const prompt = await open(page, pv);
  const before = await page.locator('.wp-result-summary').innerText();
  await prompt.getByRole('button', { name: 'Standort eingeben', exact: true }).click();
  await prompt.getByLabel('Postleitzahl oder Ort', { exact: true }).fill('27793');
  await prompt.getByRole('button', { name: /27793 Wildeshausen/ }).click();
  await prompt.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(prompt).toContainText('Die Prüfung ist fehlgeschlagen');
  await expect(page.locator('.wp-result-summary')).toHaveText(before);
  expect(await page.evaluate(() => localStorage.getItem('sc-plz'))).toBeNull();
  fail = false;
  await prompt.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sc-plz'))).toBe('27793');
  await expect(page.locator('.wp-result-summary')).not.toHaveText(before);
});

for (const [name, route] of routes.filter(([name]) => name !== 'pv')) test(`${name}: failed lookup keeps the form open and supports retry`, async ({ page }) => {
  let fail = true;
  const pattern = name === 'klima' ? '**/api/cooling-degree?*' : '**/api/funding?*';
  await page.route(pattern, r => fail ? r.fulfill({ status: 503, json: { error: 'unavailable' } }) : r.fallback());
  const prompt = await open(page, route, name === 'klima');
  await prompt.getByRole('button', { name: 'Standort eingeben', exact: true }).click();
  await prompt.getByLabel('Postleitzahl oder Ort', { exact: true }).fill('27793');
  await prompt.getByRole('button', { name: /27793 Wildeshausen/ }).click();
  await prompt.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(prompt).toContainText('Die Prüfung ist fehlgeschlagen');
  expect(await page.evaluate(() => localStorage.getItem('sc-plz'))).toBeNull();
  await expect(prompt.getByRole('button', { name: 'Speichern', exact: true })).toBeEnabled();
  fail = false;
  await prompt.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sc-plz'))).toBe('27793');
});


test('BKW: saving the location applies an eligible grant to the selected set', async ({ page }) => {
  const program = { ...FUNDING_PROGRAMS['landkreis-oldenburg-steckersolar'], lastVerified: new Date().toISOString().slice(0, 10), pageSeenAt: new Date().toISOString() };
  await page.route('**/api/funding?*', r => r.fulfill({ json: { candidates: [{ ags: '03458014', ort: 'Wildeshausen', programs: [program] }] } }));
  await page.route('**/api/shop/balkon', r => r.fulfill({ json: { abgerufenIso: new Date().toISOString(), angebote: [
    { id: 'location-set', haendler: 'solakon', haendlerName: 'Solakon', produkt: 'onPower', moduleWp: 2000, inverterW: 800, speicherKwh: 4.22, preis: 1050, streichpreis: null, lieferbar: true, url: 'https://www.solakon.de/products/onpower', bildUrl: null, variante: 'Test' },
  ] } }));
  const prompt = await open(page, `${routes[1][1]}&offer=location-set`);
  await prompt.getByRole('button', { name: 'Standort eingeben', exact: true }).click();
  await prompt.getByLabel('Postleitzahl oder Ort', { exact: true }).fill('27793');
  await prompt.getByRole('button', { name: /27793 Wildeshausen/ }).click();
  await expect(page.locator('.wp-funded-amount')).toHaveCount(0);
  await prompt.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.locator('.wp-funded-amount').first()).toContainText('800');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sc-plz'))).toBe('27793');
});


for (const [name, route] of routes.filter(([name]) => name === 'pv' || name === 'bkw')) test(`${name}: unchanged yield and no grant do not restart the result`, async ({ page }) => {
  await page.route('**/api/pvgis?*', r => r.fulfill({ json: { annual: NATIONAL_AVG_YIELD, source: 'pvgis' } }));
  const prompt = await open(page, route);
  await page.getByRole('slider', { name: 'Tag wählen', exact: true }).first().evaluate(el => el.setAttribute('data-before-location', 'true'));
  await prompt.getByRole('button', { name: 'Standort eingeben', exact: true }).click();
  await prompt.getByLabel('Postleitzahl oder Ort', { exact: true }).fill('27793');
  await prompt.getByRole('button', { name: /27793 Wildeshausen/ }).click();
  await prompt.getByRole('button', { name: 'Speichern', exact: true }).click();
  const feedback = page.getByRole('status').filter({ hasText: 'Wildeshausen übernommen.' });
  await expect(feedback).toContainText('Dein Ergebnis bleibt unverändert.');
  await expect(page.locator('[data-before-location="true"]')).toHaveCount(1);
  await feedback.getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(feedback).toHaveCount(0);
});
