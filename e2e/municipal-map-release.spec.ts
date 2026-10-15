import {test, expect} from '@playwright/test';
import sharp from 'sharp';

test.setTimeout(90_000);
// These integration cases require the populated municipal database.
test.skip(process.env.ATLAS_DATA_E2E !== '1', 'Run with ATLAS_DATA_E2E=1 against a configured municipal database.');

test('map download retains the dark theme, live camera, crop and fitted metric', async ({page}, testInfo) => {
  await page.addInitScript(() => {
    const remove = Element.prototype.remove;
    Element.prototype.remove = function() {
      if (this instanceof HTMLElement && this.style.left === '-100000px') {
        const source = this.querySelector<HTMLElement>('[data-sc-source-edge]');
        if(source) (window as any).__downloadSource = {content:this.innerText, controls:this.querySelectorAll('select,button').length, canvas:this.querySelector('canvas')?.toDataURL(), text:source.textContent, fits:source.scrollHeight<=source.clientHeight+1&&source.scrollWidth<=source.clientWidth+1};
      }
      return remove.call(this);
    };
  });
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/embed/regional-map?ags=05554&selected=05554048&onsite=1&theme=dark&autoplay=off');
  const card=page.locator('.sc-widget').first();
  const canvas=page.locator('[data-region-scene] canvas');
  await expect(canvas).toBeVisible();
  const box=(await canvas.boundingBox())!;
  await page.mouse.move(box.x+box.width*.45,box.y+box.height*.5);
  await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.55,{steps:12});await page.mouse.up();
  await page.mouse.move(5,5);
  await page.waitForTimeout(1200); // OrbitControls damping settles after the drag.
  const original=(await card.boundingBox())!;
  const before=await canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL());
  await page.getByRole('button',{name:/Optionen für/}).click();
  const pending=page.waitForEvent('download');
  await page.getByText('Download',{exact:true}).click();
  const download=await pending;
  const file=testInfo.outputPath('regional-map-dark.png');
  await download.saveAs(file);
  const attribution=await page.evaluate(()=>(window as any).__downloadSource);
  expect(attribution.text).toContain('Bundesnetzagentur');
  expect(attribution.text).toContain('Stand:');
  expect(attribution.fits).toBe(true);
  const metadata=await sharp(file).metadata();
  expect(metadata.width).toBe(Math.round(original.width*2));
  expect(metadata.height).toBeGreaterThan(0);
  expect(attribution.content).toMatch(/Stand.*20\d{2}/);
  expect(attribution.content).toContain('Installierte Solarleistung');
  expect(attribution.content).toContain('in MWp');
  expect(attribution.content).toContain('solar-check.io');
  expect(attribution.content).not.toContain('Vergleichen Sie Solarleistung');
  expect(attribution.controls).toBe(0);
  expect(attribution.canvas).toBe(before);
  const selection=page.getByRole('combobox',{name:'Kennzahl der Karte'});
  for(const option of await selection.locator('option').evaluateAll(options=>options.map(option=>(option as HTMLOptionElement).value))) {
    await selection.selectOption(option);
    const measured=await page.locator('[data-map-selection] strong').first().evaluate(el=>({width:el.scrollWidth,available:el.parentElement!.clientWidth}));
    expect(measured.width).toBeLessThanOrEqual(measured.available);
  }
  const fit=await page.locator('[data-map-selection] strong').first().evaluate(el=>({text:el.textContent,width:el.scrollWidth,available:el.parentElement!.clientWidth}));
  expect(fit.width).toBeLessThanOrEqual(fit.available);
});

test('municipality embeds the district map and downloads its live view', async ({page}, testInfo) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/solar-atlas/niedersachsen/landkreis-gifhorn/meinersen');
  const monitorElement=page.locator('iframe[title="Energiedaten für Meinersen"]');
  await expect(async()=>{await monitorElement.scrollIntoViewIfNeeded();}).toPass({timeout:20000});
  const monitor=page.frameLocator('iframe[title="Energiedaten für Meinersen"]');
  const heading=monitor.getByRole('heading',{name:'Energie im Landkreis',exact:true});
  await expect(async()=>{
    if(await heading.count()) await heading.scrollIntoViewIfNeeded();
    else await monitor.locator('.municipal-data > div').last().scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
  }).toPass({timeout:25000});
  const map=monitor.frameLocator('iframe[title="3D-Energiekarte · Landkreis Gifhorn"]');
  // The nested, near-viewport embed still has to fetch and initialize WebGL.
  await expect(map.locator('[data-region-scene] canvas')).toBeVisible({timeout:30_000});
  await map.getByRole('button',{name:/Optionen für/}).click();
  const pending=page.waitForEvent('download');
  await map.getByText('Download',{exact:true}).click();
  const file=testInfo.outputPath('municipality-map.png');
  await (await pending).saveAs(file);
  expect((await sharp(file).metadata()).width).toBeGreaterThan(500);
});

test('ranking retains its three explicit image formats', async ({page}, testInfo) => {
  await page.goto('/embed/galerie/gemeinde-ranking?ags=06440016&onsite=1');
  for(const [value,width,height] of [[0,960,540],[1,720,720],[2,720,900]]) {
    await page.getByRole('button',{name:/Optionen für/}).click();
    await page.getByText('Download',{exact:true}).click();
    await page.getByRole('combobox',{name:'Bildformat'}).selectOption(String(value));
    const pending=page.waitForEvent('download');
    await page.getByRole('button',{name:'PNG herunterladen'}).click();
    const file=testInfo.outputPath(`ranking-${value}.png`);
    await (await pending).saveAs(file);
    const metadata=await sharp(file).metadata();
    expect(metadata.width).toBe(width*2);expect(metadata.height).toBe(height*2);
  }
});

for (const width of [320, 375]) {
  test(`map stays within a ${width}px viewport`, async ({page}, testInfo) => {
    await page.setViewportSize({width,height:900});
    await page.goto('/embed/regional-map?ags=03151&selected=03151017&onsite=1&theme=dark&autoplay=off');
    await expect(page.locator('[data-region-scene] canvas')).toBeVisible();
    const sizes=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:window.innerWidth}));
    expect(sizes.page).toBeLessThanOrEqual(sizes.viewport);
    await page.screenshot({path:testInfo.outputPath(`map-${width}.png`),fullPage:true});
  });
}
