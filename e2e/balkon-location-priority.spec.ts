import { test, expect } from '@playwright/test';

for (const query of ['plz=10115', 'plz=10115&pe=1&an=teils&au=sued_flach', 'pe=1&an=teils&au=sued_flach']) {
  test(`postcode priority: ${query}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('sc-plz', '58300'));
    await page.route('**/plz.json', route => route.fulfill({ json: { '10115': [52.53, 13.38], '58300': [51.39, 7.39] } }));
    const requests: string[] = [];
    await page.route('**/api/pvgis?*', route => {
      requests.push(new URL(route.request().url()).searchParams.get('plzPrefix')!);
      return route.fulfill({ json: { annual: 1000, monthly: Array(12).fill(1000 / 12) } });
    });
    const response = page.waitForResponse('**/api/pvgis?*');
    await page.goto(`/balkonkraftwerk/rechner?${query}`);
    await (await response).finished();
    const expected = query.includes('plz=') ? '10115' : '58300';
    await expect.poll(() => page.evaluate(() => localStorage.getItem('sc-plz'))).toBe(expected);
    expect(requests).toEqual([expected.slice(0, 2)]);
  });
}

test('link-change toast counts down and undo restores the prior location without resetting answers', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sc-plz', '58300'));
  await page.route('**/plz.json', route => route.fulfill({ json: { '10115': [52.53, 13.38], '58300': [51.39, 7.39] } }));
  const requested: string[] = [];
  await page.route('**/api/pvgis?*', async route => {
    const prefix = new URL(route.request().url()).searchParams.get('plzPrefix')!;
    requested.push(prefix);
    return route.fulfill({ json: { annual: prefix === '10' ? 1100 : 900, monthly: Array(12).fill(75) } });
  });
  await page.goto('/balkonkraftwerk/rechner?plz=10115&pe=1&an=teils&au=sued_flach');
  const toast = page.getByRole('status').filter({hasText:'PLZ aus dem Link übernommen'});
  await expect(toast).toContainText('10115 statt 58300');
  await expect(toast).toContainText(/\([1-9] s\)/);
  await page.setViewportSize({width:375,height:850});
  await page.screenshot({path:'/tmp/location-change-toast.png', animations:'disabled'});
  await toast.getByRole('button',{name:'Rückgängig',exact:true}).click();
  await expect(toast).toHaveCount(0);
  await expect(page).toHaveURL(/plz=58300/);
  await expect(page).toHaveURL(/pe=1&an=teils&au=sued_flach/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sc-plz'))).toBe('58300');
  await expect.poll(() => requested).toEqual(['10','58']);
  await expect(page.locator('#bkw-ueberblick')).toBeVisible();
});

test('link-change toast expires without reverting the selected location', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sc-plz', '58300'));
  await page.goto('/balkonkraftwerk/rechner?plz=10115');
  const toast = page.getByRole('status').filter({hasText:'PLZ aus dem Link übernommen'});
  await expect(toast).toBeVisible();
  await expect(toast).toHaveCount(0, {timeout:12000});
  expect(await page.evaluate(() => localStorage.getItem('sc-plz'))).toBe('10115');
});


test('undo ignores a late yield response for the link location', async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(() => localStorage.setItem('sc-plz', '58300'));
  await page.route('**/api/shop/balkon', route => route.fulfill({json:{angebote:[],abgerufenIso:new Date().toISOString()}}));
  await page.route('**/plz.json', route => route.fulfill({ json: { '10115': [52.53, 13.38], '58300': [51.39, 7.39] } }));
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve;});
  await page.route('**/api/pvgis?*', async route => {
    const berlin = new URL(route.request().url()).searchParams.get('plzPrefix') === '10';
    if (berlin) await gate;
    await route.fulfill({json:{annual:berlin?1300:800,monthly:Array(12).fill((berlin?1300:800)/12)}});
  });
  await page.goto('/balkonkraftwerk/rechner?plz=10115&pe=1&an=teils&au=sued_flach');
  await page.getByRole('status').getByRole('button',{name:'Rückgängig'}).click();
  await expect(page.getByRole('button',{name:'Standort & Förderung 58300',exact:true})).toBeVisible();
  const summary = page.locator('#bkw-ertrag .wp-question-summary');
  const previous = await summary.innerText();
  const lateResponse = page.waitForResponse(response => response.url().includes('/api/pvgis?') && response.url().includes('plzPrefix=10'));
  release();
  await (await lateResponse).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(summary).toHaveText(previous);
  await expect(page).toHaveURL(/plz=58300/);
});
