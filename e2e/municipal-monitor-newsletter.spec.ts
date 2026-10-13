import {test, expect} from '@playwright/test';

const pagePath = '/solar-atlas/niedersachsen/landkreis-gifhorn/meinersen';
const chart = 'solar-check-radial-03151017-Solarerzeugung im Tagesverlauf in Meinersen';
const query = new URLSearchParams({chart, period:'2026-09', autoplay:'on', nl:'september-2026', nlv:'kommunal', nll:'bild', nl_test:'1'});

for (const width of [1440, 390]) {
  test(`municipal newsletter chart and monitor fit at ${width}px`, async ({page}) => {
    test.setTimeout(120_000);
    await page.setViewportSize({width, height:900});
    // These cases exercise the SVG monitor and its host dialog. Software WebGL
    // rendering of the unrelated hero starves the two CI browser workers (even
    // a DOM assertion takes 7-20 seconds). Use the supported no-WebGL fallback;
    // the complete page with its 3D hero is checked in the live browser release.
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(this:HTMLCanvasElement, type:string, ...rest:unknown[]) {
        if (/webgl/i.test(type)) return null;
        return (original as (...args:unknown[]) => unknown).call(this, type, ...rest);
      } as typeof original;
    });
    await page.goto(`${pagePath}?${query}`, {waitUntil:'domcontentloaded'});
    const frame = page.frameLocator('iframe[title="Energiedaten für Meinersen"]');
    const dialog = frame.getByRole('dialog', {name:'Solarerzeugung im Tagesverlauf in Meinersen', exact:true});
    await expect(dialog).toBeVisible({timeout:60_000});
    await expect(dialog.getByRole('group', {name:/Solarleistung in Meinersen, Sept\. 2026/})).toBeVisible();
    await expect(dialog.getByRole('button', {name:'Wiedergabe pausieren'})).toBeVisible();
    await dialog.getByRole('button', {name:'Wiedergabe pausieren'}).click();
    await expect(dialog.getByRole('button', {name:'Monat abspielen'})).toBeVisible();
    await expect(dialog).toContainText(/Sept.*2026/);
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.height).toBeLessThanOrEqual(900);
    await page.reload({waitUntil:'domcontentloaded'});
    await expect(dialog).toBeVisible({timeout:60_000});
    await dialog.getByRole('button', {name:'Schließen', exact:true}).first().click();
    await expect(dialog).not.toBeVisible();
    await expect(page).not.toHaveURL(/[?&]chart=/);

    await page.locator('#atlas-data').scrollIntoViewIfNeeded();
    const cards = frame.locator('[data-widget-density="compact"]');
    await expect(cards.first()).toBeVisible();
    const geometry = await cards.evaluateAll(nodes => nodes.map(node => {
      const card = node.getBoundingClientRect();
      return {width:card.width, height:card.height, overflow:node.scrollWidth > node.clientWidth + 1,
        allocated:node.getAttribute('data-widget-layout') === 'allocated'};
    }));
    expect(geometry.length).toBeGreaterThan(5);
    expect(geometry.every(card => card.width > 0 && card.height > 0 && card.height < 750 && !card.overflow && !card.allocated)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    // Revisit the exact published link after close; no generated instance ID.
    await page.goto(`${pagePath}?${query}`, {waitUntil:'domcontentloaded'});
    await expect(dialog).toBeVisible({timeout:60_000});
  });
}
