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
