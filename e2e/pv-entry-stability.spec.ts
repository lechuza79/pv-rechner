import { test, expect } from '@playwright/test';

for (const width of [375, 1280]) {
 test(`PV first question is present before JavaScript at ${width}px`, async ({ browser, baseURL }) => {
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:850}});
  try {
   const page=await context.newPage();
   await page.goto(`${baseURL}/photovoltaik-rechner`,{waitUntil:'load'});
   await expect(page.getByRole('button',{name:/Reihenhaus/}).first()).toBeVisible();
   await expect(page.getByRole('heading',{name:'Haus',exact:true})).toBeVisible();
  } finally {await context.close();}
 });
 test(`PV entry stays stable during hydration at ${width}px`, async ({ page }) => {
  await page.setViewportSize({width,height:850});
  await page.addInitScript(()=>{
   (window as any).__entryShifts=0;
   new PerformanceObserver(list=>{for(const entry of list.getEntries() as any) if(!entry.hadRecentInput)(window as any).__entryShifts+=entry.value;}).observe({type:'layout-shift',buffered:true});
  });
  await page.goto('/photovoltaik-rechner',{waitUntil:'load'});
  await expect(page.locator('[data-flow-nav]:visible')).toHaveAttribute('data-flow-bereit','1');
  await page.waitForTimeout(1500);
  const shifts=await page.evaluate(()=>(window as any).__entryShifts);
  console.log(`PV_INITIAL_LAYOUT_SHIFT_${width}=${shifts}`);
  expect(shifts).toBeLessThan(0.1);
  await expect(page.getByRole('button',{name:/Reihenhaus/}).first()).toBeVisible();
  await page.screenshot({path:`/tmp/pv-stable-entry-${width}.png`});
  await page.getByRole('button',{name:/Reihenhaus/}).first().click();
  await expect(page.getByRole('button',{name:/Haustyp.*Reihenhaus/})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}

test('PV prefilled recommendation keeps its answers when returning to the form', async ({ page }) => {
 await page.goto('/photovoltaik-rechner?haus=efh&dach=satteldach&az=sued&personen=4&view=ergebnis');
 await expect(page.getByRole('button',{name:'Empfehlung teilen'})).toBeVisible();
 await page.getByRole('button',{name:'Eingaben ändern',exact:true}).last().click();
 await page.getByRole('button',{name:/Zurück zu Schritt 1/}).click();
 await expect(page.getByRole('button',{name:/Haustyp.*Einfamilienhaus/})).toBeVisible();
});
