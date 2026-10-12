import {test,expect} from '@playwright/test';
import {widgetInventory} from '../lib/widget-inventory';
import {curatedGalleryEntries} from '../lib/widget-gallery';

const items=widgetInventory(curatedGalleryEntries({ags:'06440016',name:'Nidda',districtId:'06440',districtName:'Wetteraukreis',stateId:'06',stateName:'Hessen'}));
const pageSize=8;
// Exercise the actual inventory, including existing story details and hero previews.
// Dashboard children are direct components; only external embeds use iframes.
for(const width of [390,1440])for(let index=0;index<Math.ceil(items.length/pageSize);index++){
 test(`inventory page ${index+1} at ${width}px`,async({page})=>{
  test.setTimeout(120_000);
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width,height:1000});
  await page.goto(`/widget-galerie/dashboard-bestand?varianten=alle&seite=${index+1}`);
  const expected=items.slice(index*pageSize,(index+1)*pageSize);
  await expect(page.locator('[data-dashboard-widget]')).toHaveCount(expected.length);
  for(const item of expected){
   const slot=page.locator(`[data-dashboard-widget="${item.id}"]`);
   await slot.scrollIntoViewIfNeeded();
   await expect(slot.locator('[data-widget-loading=true]')).toHaveCount(0,{timeout:65_000});
   await expect(slot).not.toContainText(/Widget gerade nicht verfügbar|Application error|Etwas ist schiefgegangen/);
   await expect(slot.locator('[role=alert]')).toHaveCount(0);
   await expect.poll(()=>slot.evaluate(element=>element.scrollWidth-element.clientWidth),{message:item.src}).toBeLessThanOrEqual(2);
   await expect.poll(()=>slot.evaluate(element=>element.scrollHeight-element.clientHeight),{message:item.src}).toBeLessThanOrEqual(2);
   await expect.poll(()=>slot.locator('svg,canvas,[data-widget-plot],[data-widget-id],[data-widget-state=empty]').count(),{message:item.src,timeout:65_000}).toBeGreaterThan(0);
   if(await slot.locator('[data-widget-state=empty]').count()){
    await expect(slot.getByRole('status')).toContainText('keine veröffentlichte Story');
   }else expect(await slot.locator('svg,canvas,[data-widget-plot],[data-widget-id]').count(),item.src).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
  // A viewport transition previously threw outside the individual widget boundary.
  await page.setViewportSize({width:width===390?1440:390,height:1000});
  await expect(page.locator('[data-dashboard-widget]')).toHaveCount(expected.length);
  expect(errors).toEqual([]);
 });
}

for(const width of [390,1440])test(`nested reference and radial geometry at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.goto('/widget-galerie/layout-referenz');
 await expect(page.getByRole('combobox',{name:'Anordnung',exact:true})).toBeVisible();
 const radial=page.locator('[data-trade-shape=radial] svg[role=img]').first();
 await expect(radial).toBeVisible();
 const circle=await radial.boundingBox();
 expect(Math.abs(circle!.width-circle!.height)).toBeLessThan(2);
 await page.getByRole('combobox',{name:'Anordnung',exact:true}).selectOption('column');
 const collisions=await page.locator('[data-responsive-composition]').evaluateAll(groups=>groups.flatMap(group=>{
  const slots=[...group.querySelectorAll('[data-dashboard-widget]')].map(slot=>slot.getBoundingClientRect());
  return slots.flatMap((a,index)=>slots.slice(index+1).filter(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1));
 }).length);
 expect(collisions).toBe(0);
});
