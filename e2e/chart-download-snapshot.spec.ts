import {test, expect} from '@playwright/test';
import sharp from 'sharp';

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
  expect(attribution.content).toContain('Stand 01.10.2026');
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
