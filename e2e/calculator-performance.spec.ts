import { test, expect } from '@playwright/test';
import { FLOWS, uebrigeFragenBeantworten, weiterKlicken } from './flows';
import { writeFileSync, mkdirSync } from 'node:fs';

// One representative path per calculator; not an exhaustive input-combination audit.
for (const flow of FLOWS.filter(f => !f.startKnopf)) for (const width of [375,1280]) {
 test(`${flow.name} performance ${width}`, async ({ page }) => {
  test.setTimeout(90000);
  const base=process.env.PERF_ORIGIN || String(test.info().project.use.baseURL);
  const errors:string[]=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.setViewportSize({width,height:850});
  await page.addInitScript(()=>{
   const metrics={cls:0,lcp:0,longTasks:[] as number[],shifts:[] as any[]}; let windowStart=0,lastShift=0,windowScore=0;
   (window as any).__perf=metrics;
   for(const type of ['largest-contentful-paint','layout-shift','longtask']) {
    try {new PerformanceObserver(list=>{for(const e of list.getEntries() as any){if(type==='largest-contentful-paint') metrics.lcp=e.startTime;if(type==='layout-shift'&&!e.hadRecentInput){if(e.startTime-lastShift>1000||e.startTime-windowStart>5000){windowStart=e.startTime;windowScore=0;}lastShift=e.startTime;windowScore+=e.value;metrics.cls=Math.max(metrics.cls,windowScore);metrics.shifts.push({time:e.startTime,value:e.value,nodes:e.sources?.map((s:any)=>({tag:s.node?.tagName,cls:s.node?.className}))});}if(type==='longtask') metrics.longTasks.push(e.duration);}}).observe({type,buffered:true});}catch{}
   }
  });
  const snapshot=()=>page.evaluate(()=>({
   ...(window as any).__perf,
   navigation:performance.getEntriesByType('navigation').map(e=>e.toJSON()),
   resources:performance.getEntriesByType('resource').map(e=>e.toJSON()),
   images:Array.from(document.images).filter(i=>i.getClientRects().length).map(i=>({src:i.currentSrc,complete:i.complete,width:i.naturalWidth})),
   overflow:document.documentElement.scrollWidth>innerWidth,
  }));
  let initial:any,result:any, failure:string|undefined,steps=0,resultDelay=0;
  try {
   await page.goto(base+flow.pfad,{waitUntil:'domcontentloaded',timeout:30000});
   await expect(page.locator('[data-flow-nav]:visible').first()).toHaveAttribute('data-flow-bereit','1',{timeout:15000});
   await page.waitForTimeout(1000);
   initial=await snapshot();
   if(flow.pfad==='/waermepumpe-rechner') {
    for(const labels of [['Bestandsgebäude'],['Freistehend Vier Außenwände','140 m²'],['Teilsaniert'],['3–4'],['Fußbodenheizung','Luft/Wasser']]) {
     for(const label of labels) await page.getByRole('button',{name:new RegExp(label)}).filter({visible:true}).first().click({timeout:10000});
     await uebrigeFragenBeantworten(page);
     const start=Date.now();
     steps++; await weiterKlicken(page);
     resultDelay=Date.now()-start;
    }
   }
   while(await page.locator('[data-flow-next]:not([inert] *):visible').count()) {
    if(++steps>10) throw Error('More than ten steps');
    await uebrigeFragenBeantworten(page);
    const start=Date.now();
    await weiterKlicken(page);
    resultDelay=Date.now()-start;
   }
   await expect(page.locator('main')).toContainText(flow.ergebnisEnthaelt,{timeout:15000});
   await page.waitForTimeout(2000);
   result=await snapshot();
  }catch(e){failure=String(e);result=await snapshot().catch(()=>null);}
  const report={name:flow.name,width,base,steps,resultDelay,errors,failure,initial,result};
  const dir=process.env.PERF_REPORT_DIR||'/tmp/calculator-performance';mkdirSync(dir,{recursive:true});
  writeFileSync(`${dir}/${flow.pfad.split('?')[0].replaceAll('/','_')}${flow.pfad.includes('?')?'_direct':''}-${width}.json`,JSON.stringify(report,null,2));
  expect(failure).toBeUndefined();
  expect(errors).toEqual([]);
  expect(result.overflow).toBe(false);
 });
}
