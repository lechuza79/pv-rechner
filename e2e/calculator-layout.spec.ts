import { test, expect } from '@playwright/test';
const pv='/photovoltaik-rechner?a=4&ck=4&s=4&p=0&n=1&wp=ja&wf=140&wi=1&wh=hk_neu&wht=2&ea=nein&flow=emp&ht=0&da=0&az=sued';
for (const width of [375,1440]) {
 test(`shared result alignment ${width}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(pv);await expect(page.locator('#pv-ueberblick')).toBeVisible({timeout:60000});
  const boxes=await page.locator('#pv-ueberblick,#pv-einstellungen,.sc-calculator-content--inset').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,width:r.width}}));
  for(const b of boxes){expect(b.width).toBeLessThanOrEqual(821);expect(Math.abs(b.x-boxes[0].x)).toBeLessThan(2);expect(Math.abs(b.width-boxes[0].width)).toBeLessThan(2);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.getByRole('slider',{name:'Tag wählen'}).press('End');
  await page.locator('#pv-ueberblick').scrollIntoViewIfNeeded();
  await page.screenshot({path:`/tmp/calculator-layout-${width}.png`});
 });
}
for(const path of ['/balkonkraftwerk/rechner','/photovoltaik-rechner','/waermepumpe-rechner','/klimaanlage-stromkosten','/einspeiseverguetung-rechner'])test(`fixed palette ${path}`,async({page})=>{
 await page.goto(path); await expect(page.locator('style[data-calculator-theme]')).toHaveCount(1,{timeout:60000});
 const colors=[];for(const stage of ['s0','s3','s6']){colors.push(await page.evaluate(stage=>{document.documentElement.setAttribute('data-theme',stage);const p=document.querySelector('.wp-calculator-page') ?? document.querySelector('main')!;return [getComputedStyle(document.body).backgroundColor,getComputedStyle(p).backgroundColor,getComputedStyle(p).color]},stage));}
 expect(colors[1]).toEqual(colors[0]);expect(colors[2]).toEqual(colors[0]);
});
test('storage switch updates the actual set and merchant link',async({page})=>{
 const packages=[0,4.22].map((speicherKwh,i)=>({id:`layout-${i}`,haendler:'solakon',haendlerName:'Solakon',produkt:i?'Storage set':'Panel set',moduleWp:2000,inverterW:800,speicherKwh,preis:400+i*650,streichpreis:null,lieferbar:true,url:`https://www.solakon.de/products/onpower?variant=layout-${i}`,bildUrl:null,variante:`Test ${i}`}));
 await page.route('**/api/shop/balkon',r=>r.fulfill({json:{abgerufenIso:'2026-09-29T08:00:00Z',angebote:packages}}));
 await page.goto('/balkonkraftwerk/rechner?pe=1&an=teils&au=sued_flach&offer=layout-1');
 const hero=page.locator('#bkw-ueberblick');await expect(hero).toContainText('Storage set',{timeout:60000});
 await hero.getByRole('switch',{name:'Speicher mitrechnen'}).click();await expect(hero).toContainText('Panel set');await expect(hero).toContainText('ohne Speicher');await expect(hero).not.toContainText('Storage set');
 await expect(hero.locator('a[href*="variant=layout-0"]')).toHaveCount(1);
 await page.screenshot({path:'/tmp/calculator-without-storage.png'});
});

import { assertNoDocumentOverflow, assertResultGeometry, assertTextInsideCard } from './calculator-geometry';

test('heat pump geometry counterprobe rejects the original constrained result and escaped numbers', async ({ page },testInfo) => {
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('/waermepumpe-rechner?fl=180&da=0&hz=hk_alt&ah=oel_kohle',{timeout:60000});
 await expect(page.locator('#wp-ueberblick')).toBeVisible({timeout:60000});
 const notice=page.getByRole('status').filter({has:page.getByRole('group',{name:'Standort prüfen',exact:true})});
 await expect(notice).toBeVisible({timeout:60000});
 const shell=(await page.locator('.sc-calculator-content[data-calculator-offers=true]').last().boundingBox())!;
 await expect.poll(async()=>{const r=(await notice.boundingBox())!;return Math.max(Math.abs(r.x-(shell.x+(shell.width-Math.min(shell.width,820))/2)),Math.abs(r.width-Math.min(shell.width,820)));}).toBeLessThanOrEqual(2);
 await page.screenshot({path:testInfo.outputPath('heat-pump-shell-toast-1440.png'),animations:'disabled'});
 await page.getByRole('slider',{name:'Tag wählen',exact:true}).first().press('End');
 await assertResultGeometry(page);
 const constrained=await page.addStyleTag({content:'.sc-calculator-content[data-calculator-offers="true"]{max-width:820px!important}.wp-result-layout{display:grid!important;grid-template-columns:minmax(0,1fr) 320px!important;gap:48px!important}'});
 await expect(assertResultGeometry(page)).rejects.toThrow();
 await constrained.evaluate(el=>el.parentNode?.removeChild(el));
 await assertResultGeometry(page);
 const escaped=await page.addStyleTag({content:'#wp-ueberblick .wp-result-value{position:relative!important;left:900px!important}'});
 await expect(assertTextInsideCard(page.locator('#wp-ueberblick .wp-result-hero'))).rejects.toThrow();
 await escaped.evaluate(el=>el.parentNode?.removeChild(el));
 await assertTextInsideCard(page.locator('#wp-ueberblick .wp-result-hero'));
 for (const width of [1252, 1280, 1440, 1920]) {
   await page.setViewportSize({width,height:1000});
   await assertResultGeometry(page);
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#wp-ueberblick').evaluate(el=>el.scrollIntoView({block:'start'}));
 await page.screenshot({path:testInfo.outputPath('heat-pump-refined-layout-1440.png'),animations:'disabled'});
});

for(const width of [375,768,1440,1920])test(`additional tool surfaces fit their own container ${width}`,async({page})=>{
 test.setTimeout(120000);
 await page.setViewportSize({width,height:1000});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/photovoltaik-neigungswinkel',{waitUntil:'domcontentloaded',timeout:60000});
 const tilt=page.getByText('Ausrichtung deines Dachs',{exact:true}).locator('..');
 await expect(async()=>{
   await tilt.getByRole('button',{name:'90°',exact:true}).click({timeout:2000});
   await expect(tilt).toContainText(/71\s*% des optimalen Ertrags/,{timeout:1000});
 }).toPass({timeout:20000});
 await assertTextInsideCard(tilt);
 await assertNoDocumentOverflow(page);
 await page.goto('/balkonkraftwerk/ratgeber/anmelden',{waitUntil:'domcontentloaded',timeout:60000});
 const date=page.getByLabel('Seit wann liefert dein Balkonkraftwerk Strom?');
 await expect(date).toHaveAttribute('max', /^\d{4}-\d{2}-\d{2}$/);
 await date.fill('2026-01-01');
 await expect(date.locator('..')).toContainText('Deine Frist endet am');
 await expect(date.locator('..')).toContainText('1. Februar 2026');
 await assertTextInsideCard(date.locator('..'));
 await assertNoDocumentOverflow(page);
 await page.goto('/pv-simulation',{waitUntil:'domcontentloaded',timeout:60000});
 await expect(page.getByPlaceholder(/PLZ|Postleitzahl/i).filter({visible:true}).first()).toBeVisible({timeout:60000});
 await assertNoDocumentOverflow(page);
 await page.goto('/embed/foerder-check?onsite=1',{waitUntil:'domcontentloaded',timeout:60000});
 const funding=page.getByText('Wärmepumpen-Förderung berechnen',{exact:true}).locator('..');
 await expect(funding).toBeVisible();
 await assertTextInsideCard(funding);
 expect((await funding.boundingBox())!.width).toBeLessThanOrEqual(381);
 await assertNoDocumentOverflow(page);
});

for(const width of [375,1440])test(`PV pending actions hand over to inline controls and dialog footer stays local ${width}`,async({page},testInfo)=>{
 test.setTimeout(120000);
 await page.setViewportSize({width,height:1000});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(pv,{waitUntil:'domcontentloaded',timeout:60000});
 await expect(page.locator('.pv-consumer-options .wp-product-carousel-frame')).toHaveAttribute('data-ready','true',{timeout:60000});
 await page.getByRole('button',{name:'E-Auto: Ergänzen',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:'15.000 km',exact:true}).click();
 const stage=dialog.getByRole('button',{name:'Zur Vorschau hinzufügen',exact:true});
 const dialogBounds=(await dialog.boundingBox())!;
 const stageBounds=(await stage.boundingBox())!;
 expect(stageBounds.x).toBeGreaterThanOrEqual(dialogBounds.x);
 expect(stageBounds.x+stageBounds.width).toBeLessThanOrEqual(dialogBounds.x+dialogBounds.width);
 expect(stageBounds.y+stageBounds.height).toBeLessThanOrEqual(dialogBounds.y+dialogBounds.height);
 await stage.click();
 const anchor=page.locator('.pv-consumer-apply-anchor');
 const floating=page.locator('[data-floating-action="true"]');
 await page.locator('#pv-ueberblick').evaluate(el=>el.scrollIntoView({block:'start'}));
 await expect(floating).toHaveAttribute('aria-hidden','false');
 const shell=await anchor.evaluate(element=>{
   let shell=element.closest('.sc-calculator-content')!;
   for(let parent=shell.parentElement?.closest('.sc-calculator-content');parent;parent=parent.parentElement?.closest('.sc-calculator-content'))shell=parent;
   const r=shell.getBoundingClientRect();return {x:r.x,width:r.width};
 });
 await expect.poll(async()=>{const r=(await floating.boundingBox())!;return Math.max(Math.abs(r.x-(shell.x+(shell.width-Math.min(shell.width,820))/2)),Math.abs(r.width-Math.min(shell.width,820)));}).toBeLessThanOrEqual(2);
 await assertTextInsideCard(floating);
 await page.screenshot({path:testInfo.outputPath(`pv-pending-${width}.png`),animations:'disabled'});
 await anchor.evaluate(el=>el.scrollIntoView({block:'center'}));
 await expect(floating).toHaveAttribute('aria-hidden','true');
 await expect(anchor.getByRole('button',{name:'Berechnung aktualisieren',exact:true})).toBeInViewport();
 await assertTextInsideCard(anchor);
 await page.screenshot({path:testInfo.outputPath(`pv-inline-${width}.png`),animations:'disabled'});
 await anchor.getByRole('button',{name:'Berechnung aktualisieren',exact:true}).click();
 await expect(anchor).toHaveCount(0);
 await assertNoDocumentOverflow(page);
});


test.fixme('initial RaceChart labels remain inside result card before the timeline settles', async ({ page }) => {
 // User acceptance, 5 October 2026: initial transient clipping may remain while
 // the independently verified calculator layout and action-button fixes ship.
 // Keep a dedicated regression to re-enable when the shared chart is repaired.
 await page.setViewportSize({width:768,height:1000});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/waermepumpe-rechner?fl=180&da=0&hz=hk_alt&ah=oel_kohle',{timeout:60000});
 await expect(page.locator('#wp-ueberblick')).toBeVisible({timeout:60000});
 await assertTextInsideCard(page.locator('#wp-ueberblick'));
});
