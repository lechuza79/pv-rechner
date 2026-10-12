import {test,expect} from '@playwright/test';

// Check actual rendered rectangles; catalog tests cannot prove allocation.
for (const width of [390,1440]) {
 test(`allocated widget combination at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto('/widget-galerie/layout-referenz');
  const group=page.locator('[data-example="nested"]');
  const frames=group.locator('[aria-label="Eine Vollansicht und zwei kompakte Ansichten"] iframe[src*="layout=allocated"]');
  await expect(frames).toHaveCount(3);
  for(const iframe of await frames.all()){
   await iframe.scrollIntoViewIfNeeded();
   const frame=await (await iframe.elementHandle())!.contentFrame();
   await expect(frame!.locator('svg[role="img"]')).toBeVisible();
   await expect.poll(async()=>{
    const host=await iframe.boundingBox();
    const card=await frame!.locator('.sc-widget').boundingBox();
    return Math.max(Math.abs(host!.height-card!.height),Math.abs(host!.width-card!.width));
   }).toBeLessThan(2);
   const overflow=await frame!.locator('body').evaluate(e=>e.scrollHeight-window.innerHeight);
   expect(overflow).toBeLessThanOrEqual(2);
  }
  const radial=page.frameLocator('iframe[src*="stromhandel?presentation=compact"]:not([src*="period=seven"])').locator('svg[role="img"]');
  const rectangle=await radial.boundingBox();
  expect(Math.abs(rectangle!.width-rectangle!.height)).toBeLessThan(1);
  const race=page.frameLocator('iframe[src*="pv-kostenrennen"]').locator('[data-race-plot] svg');
  const box=await race.boundingBox();
  expect(box!.height).toBeGreaterThan(200);
  expect(await page.locator('main').evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);
 });
}

for(const width of [1003,1440]) {
 test(`content-sized siblings do not overlap at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto('/widget-galerie/layout-referenz');
  const grid=page.locator('[data-example="mixed"] > [data-composition-grid]');
  await grid.scrollIntoViewIfNeeded();
  await expect(grid.locator('[data-ready="true"]')).toHaveCount(3,{timeout:60000});
  const collisions=await grid.evaluate(e=>{
   const rects=Array.from(e.children).map(child=>child.getBoundingClientRect());
   return rects.flatMap((a,i)=>rects.slice(i+1).filter(b=>
    Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 &&
    Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)).length;
  });
  expect(collisions).toBe(0);
 });
}

for(const width of [390,1440]){
 test(`regional chart families and shared controls at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto('/widget-galerie/layout-referenz');
  const regional=page.locator('[data-example="regional"]');
  for(const iframe of await regional.locator('iframe').all()){
   await iframe.scrollIntoViewIfNeeded();
   const frame=await (await iframe.elementHandle())!.contentFrame();
   await expect(frame!.locator('body')).not.toContainText('Application error');
  }
  const monthly=page.frameLocator('iframe[src*="gemeinde-solar-monat"]');
  const circle=monthly.locator('svg[viewBox="0 0 560 560"]');
  await expect(circle).toBeVisible();
  const box=await circle.boundingBox();
  expect(box!.width).toBeGreaterThan(180);
  expect(box!.height).toBeGreaterThan(180);
  expect(Math.abs(box!.width-box!.height)).toBeLessThan(1);
  const stats=page.frameLocator('iframe[src*="regional-basic-stats"]:not([src*="presentation=compact"])');
  await expect(stats.locator('.sc-kpi')).not.toHaveCount(0);
  await expect(stats.getByLabel('Zeitraum der Kennzahlen')).toHaveCount(1);
 });
}

// Caption ownership and plot fill are separate from outer card geometry.
for(const width of [390,1440]) {
 test(`compact trade explanation is available on demand at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto('/widget-galerie/layout-referenz');
  const iframe=page.locator('iframe[src*="stromhandel?presentation=compact"]:not([src*="period=seven"])');
  await iframe.scrollIntoViewIfNeeded();
  const frame=page.frameLocator('iframe[src*="stromhandel?presentation=compact"]:not([src*="period=seven"])');
  const root=frame.locator('[data-compact-center=true]');
  await expect(root).toBeVisible();
  const explanation=frame.getByRole('button',{name:'Einordnung des Handelssaldos'});
  await explanation.focus();
  await expect(frame.getByRole('tooltip')).toContainText('der gesamten Handelsmenge');
  await explanation.press('Escape');
  await expect(frame.getByRole('tooltip')).not.toBeVisible();
  await explanation.click();
  await expect(frame.getByRole('tooltip')).toBeVisible();
  const barsFrame=page.locator('iframe[src*="stromhandel"][src*="period=seven"]');
  await barsFrame.scrollIntoViewIfNeeded();
  const bars=page.frameLocator('iframe[src*="stromhandel"][src*="period=seven"]');
  const surface=bars.locator('[data-metric-overlay=true]');
  await expect(surface).toBeVisible();
  const area=await surface.boundingBox();
  const svg=await surface.locator('svg[role=img]').boundingBox();
  const card=await surface.locator('[data-density=small]').boundingBox();
  expect(svg!.height).toBeGreaterThanOrEqual(area!.height-1);
  expect(card!.width).toBeLessThanOrEqual(200);
  expect(card!.y).toBeGreaterThanOrEqual(area!.y-1);
  expect(card!.x).toBeGreaterThanOrEqual(area!.x-1);
  expect(card!.x+card!.width).toBeLessThanOrEqual(area!.x+area!.width+1);
  const collisions=await surface.evaluate(el=>{
   const tile=el.querySelector('[data-density=small]')!.getBoundingClientRect();
   return [...el.querySelectorAll('[data-trade-bar]')].filter(mark=>{
    const r=mark.getBoundingClientRect();
    return Math.min(r.right,tile.right)>Math.max(r.left,tile.left)&&Math.min(r.bottom,tile.bottom)>Math.max(r.top,tile.top);
   }).length;
  });
  expect(collisions).toBe(0);
  const donut=bars.getByRole('button',{name:/Anteil:/});
  await donut.click();
  await expect(bars.getByRole('tooltip')).toContainText('der gesamten Handelsmenge');
 });
}
