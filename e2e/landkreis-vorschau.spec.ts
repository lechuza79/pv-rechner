import { test, expect } from "@playwright/test";

const route = "/solar-atlas/bayern/landkreis-wuerzburg";

test("district sections reuse navigation and subscription without municipality grids", async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto(route, {waitUntil:"commit"});
  await expect(page.getByRole("heading",{name:/So steht es um Solar/})).toBeVisible();
  await expect(page.locator("[data-town],[data-mini-town]")).toHaveCount(0);
  const ids=await page.locator("#atlas-stories,#atlas-ranking,#atlas-foerderung").evaluateAll(nodes=>nodes.map(n=>n.id));
  expect(ids).toEqual(["atlas-stories","atlas-ranking","atlas-foerderung"]);
  await page.getByRole("button",{name:"Landkreis Würzburg abonnieren",exact:true}).click();
  await expect(page.locator("dialog[data-abo]")).toBeVisible();
  await page.locator("dialog[data-abo]").getByRole("button",{name:"Schließen",exact:true}).click();
  await expect(page.locator("dialog[data-abo]")).not.toBeVisible();
  for(const width of [375,320]) {
    await page.setViewportSize({width,height:850});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test("map hover stays in viewport and a municipality click opens its page", async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto(route);
  const canvas=page.locator('[data-region-scene] canvas[data-trees="ready"]');
  await expect(canvas).toBeVisible({timeout:60000});
  const city=page.getByRole('button',{name:'Würzburg: kreisfreie Stadt'});
  await city.focus();
  await expect(page.getByRole('tooltip')).toContainText('gehört nicht zum Landkreis');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  const box=(await canvas.boundingBox())!;
  let point:{x:number;y:number}|undefined;
  for(const y of [.4,.5,.6,.7]){
    for(const x of [.35,.45,.55,.65]){
      await page.mouse.move(box.x+box.width*x,box.y+box.height*y);
      await page.waitForTimeout(80);
      if(await page.getByRole('tooltip').count() && (await page.getByRole('tooltip').innerText()).includes('Gemeinde öffnen')){point={x:box.x+box.width*x,y:box.y+box.height*y};break;}
    }
    if(point)break;
  }
  expect(point).toBeTruthy();
  const flag=(await page.getByRole('tooltip').boundingBox())!,view=page.viewportSize()!;
  expect(flag.x).toBeGreaterThanOrEqual(0);expect(flag.x+flag.width).toBeLessThanOrEqual(view.width);
  expect(flag.y).toBeGreaterThanOrEqual(0);expect(flag.y+flag.height).toBeLessThanOrEqual(view.height);
  await page.mouse.click(point!.x,point!.y);
  await expect(page).toHaveURL(new RegExp(route+'/[^/]+$'),{timeout:60000});
});

test("3D metric selector wraps without preselecting a town", async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto(route, {waitUntil:"commit"});
  await expect(page.locator('[data-region-scene] canvas[data-trees="ready"]')).toBeVisible({ timeout: 60000 });
  await expect(page.getByLabel("Gemeinde auf der Karte")).toHaveCount(0);
  await expect(page.locator("[class*=mapReading]")).toHaveCount(0);
  const control = page.getByRole("group", {name:"Kennzahl der Karte"});
  for (const label of ["Solaranlagen", "Speicherkapazität", "Installierte Solarleistung"]) {
    await control.getByRole("button", { name: "Nächster Eintrag", exact: true }).click();
    await expect(control.getByRole("combobox", {name:"Kennzahl der Karte"})).toHaveValue({"Solaranlagen":"count","Speicherkapazität":"speicher","Installierte Solarleistung":"kwp"}[label]!);
  }
});

test("district content uses municipality width while scene stays full bleed", async ({page})=>{
  test.setTimeout(180000);
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto(route,{waitUntil:"domcontentloaded"});
  await expect(page.locator('#atlas-data .sc-share-legend img')).toHaveCount(3);
  if(process.env.LK_LAYOUT_NEGATIVE) await page.addStyleTag({content:'#atlas-data{width:1400px!important;max-width:none!important}'});
  for(const width of [320,390,1440,1920]){
    await page.setViewportSize({width,height:900});
    for(const selector of ['[class*=districtIntro]','#atlas-ranking','#atlas-data','[class*=fundingSection]']){
      await expect(page.locator(selector)).toBeVisible();
      const box=await page.locator(selector).boundingBox();
      expect(box,selector).not.toBeNull();
      expect(box!.width,selector).toBeLessThanOrEqual(1001);
      expect(Math.abs(box!.x+(box!.width/2)-width/2),selector).toBeLessThan(2);
    }
    const canvas=await page.locator('[data-map-canvas]').boundingBox();
    expect(canvas!.width).toBeCloseTo(width,0);
    expect(canvas!.x).toBeCloseTo(0,0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.locator('#atlas-data .sc-share-legend').scrollIntoViewIfNeeded();
  for(const img of await page.locator('#atlas-data .sc-share-legend img').all()){
    await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
    expect(await img.evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThanOrEqual(.16);
  }
  await page.screenshot({path:'scratch/landkreis/width-and-artwork.png'});
});

test("district race uses one widget and monitor dates live in help",async({page})=>{
  test.setTimeout(120000);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(route,{waitUntil:'domcontentloaded'});
  const ranking=page.locator('#atlas-ranking');
  await expect(ranking.locator('.district-race')).toBeVisible();
  await expect(ranking.locator('.sc-widget')).toHaveCount(1);
  if(process.env.LK_WIDGET_NEGATIVE)await page.addStyleTag({content:'#atlas-ranking{padding-top:56px!important;background:#edf0ec!important}'});
  await expect(ranking).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await expect(ranking).toHaveCSS('padding-top','0px');
  await expect(ranking.locator('.atlas-wrap,.atlas-award-card,.atlas-kicker,.ranking-stage')).toHaveCount(0);
  await expect(ranking).not.toContainText('Die Gemeinden im Ranking');
  await expect(ranking.locator('h4')).toContainText('Welche Gemeinde hat die meisten Solaranlagen?');
  await expect(ranking.locator('h4 .district-race-year')).toHaveText('2026');
  await expect(page.locator('#atlas-data .sc-widget-context')).toHaveCount(0);
  for(const width of [320,451,1226,1920]){
    await page.setViewportSize({width,height:900});
    await ranking.scrollIntoViewIfNeeded();
    const geometry=await ranking.evaluate(el=>{
      const heading=el.querySelector('h4')!.getBoundingClientRect(),year=el.querySelector('.district-race-year')!.getBoundingClientRect();
      const rank=el.querySelector('.district-race-rank')!.getBoundingClientRect(),bar=el.querySelector('.district-race-row[data-rank="1"] .district-race-bar')!.getBoundingClientRect();
      const section=document.querySelector('#atlas-data')!;
      return {x:heading.x,yearX:year.x,rankY:rank.y+rank.height/2,barY:bar.y+bar.height/2,
        gap:section.querySelector('.sc-widget')!.getBoundingClientRect().top-section.querySelector('h2')!.getBoundingClientRect().bottom};
    });
    expect(geometry.yearX).toBeCloseTo(geometry.x,0);
    expect(geometry.rankY).toBeCloseTo(geometry.barY,0);
    expect(geometry.gap).toBeGreaterThanOrEqual(24);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if(width===451||width===1226)await page.screenshot({path:`scratch/landkreis/race-widget-${width}.png`});
  }
  await ranking.getByRole('button',{name:'Informationen zu Welche Gemeinde hat die meisten Solaranlagen?'}).click();
  await expect(page.getByRole('tooltip')).toContainText('Registerstand:');
  await page.keyboard.press('Escape');
  const annualHelp=page.locator('#atlas-data').getByRole('button',{name:'Informationen zu Zubau pro Jahr'});
  await annualHelp.scrollIntoViewIfNeeded();
  await annualHelp.hover();
  await expect(page.getByRole('tooltip')).toContainText('Registerstand:');
});

test('map uses monitor control and navigation starts below the first screen',async({page})=>{
  test.setTimeout(120000);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(route,{waitUntil:'domcontentloaded'});
  const control=page.getByRole('group',{name:'Kennzahl der Karte'});
  await expect(control.locator('.sc-widget-setting')).toHaveCount(1);
  for(const viewport of [{width:320,height:793},{width:451,height:793},{width:1440,height:1200}]){
    await page.setViewportSize(viewport);
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    const nav=page.getByRole('navigation',{name:'Auf dieser Seite'});
    await expect.poll(async()=>(await nav.boundingBox())!.y).toBeGreaterThanOrEqual(viewport.height);
    await control.scrollIntoViewIfNeeded();
    if(viewport.width<600){
      const canvas=await page.locator('[data-map-canvas]').boundingBox();
      expect((await control.boundingBox())!.y).toBeGreaterThanOrEqual(canvas!.y+canvas!.height);
    }
    await control.getByRole('button',{name:'Vorheriger Eintrag'}).click();
    await expect(control.getByRole('combobox')).toHaveValue('speicher');
    await control.getByRole('button',{name:'Nächster Eintrag'}).click();
    await expect(control.getByRole('combobox')).toHaveValue('kwp');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({path:`scratch/landkreis/map-control-${viewport.width}.png`});
    await page.locator('#atlas-data').scrollIntoViewIfNeeded();
    await expect.poll(async()=>(await nav.boundingBox())!.y).toBeLessThanOrEqual(10);
  }
});

test('district basics show complete monthly totals and working comparisons',async({page})=>{
  test.setTimeout(120000);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(route,{waitUntil:'domcontentloaded'});
  await expect(page.locator('.district-race')).toBeVisible();
  const basics=page.getByRole('region',{name:'Bestand und Entwicklung',exact:true});
  await expect(basics.locator('.sc-kpi')).toHaveCount(6);
  await expect(basics.locator('.sc-kpi-trend')).toHaveCount(6);
  await expect(basics).not.toContainText('Kein vergleichbarer Datenstand');
  const period=basics.getByRole('combobox',{name:'Zeitraum der Kennzahlen'});
  const year=await basics.locator('.sc-kpi').first().innerText();
  await period.selectOption('1');
  await expect(basics.locator('.sc-kpi').first()).not.toHaveText(year);
  await expect(basics.locator('.sc-kpi-trend').first().locator('g[role="button"]')).toHaveCount(1);
  await period.selectOption('6');
  await expect(basics.locator('.sc-kpi-trend').first().locator('g[role="button"]')).toHaveCount(6);
  await period.selectOption('12');
  for(const width of [320,451,1440]){
    await page.setViewportSize({width,height:1000});
    await basics.scrollIntoViewIfNeeded();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for(const card of await basics.locator('.sc-kpi').all()){
      expect(await card.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
      expect(await card.evaluate(e=>{const a=e.querySelector('.sc-kpi-value')!.getBoundingClientRect(),b=e.querySelector('.sc-kpi-plot')!.getBoundingClientRect();return a.bottom<=b.top||a.right<=b.left;})).toBe(true);
    }
    await page.screenshot({path:`scratch/landkreis/basics-${width}.png`});
  }
  await basics.getByRole('button',{name:'Kennzahlen: Erklärung'}).click();
  await expect(page.getByRole('tooltip')).toContainText('Vollständige Summe aller Gemeinden');
});

test('district energy widgets retain complete periods and fit mobile',async({page})=>{
  test.setTimeout(120000);
  await page.goto(route,{waitUntil:'domcontentloaded'});
  await expect(page.locator('.district-race')).toBeVisible();
  const monitor=page.locator('#atlas-data');
  for(const title of ['Solarleistung heute','Solarerzeugung im Tagesverlauf','Solar- und Windpotenzial im Jahresverlauf','Wert des Solarstroms','Einspeisevergütung']){
    await expect(monitor.getByRole('heading',{name:title,exact:true})).toBeVisible();
  }
  const money=monitor.locator('.sc-widget').filter({has:page.getByRole('heading',{name:'Wert des Solarstroms',exact:true})});
  const period=money.getByRole('combobox',{name:'Monat der Berechnung'});
  const before=await money.locator('[data-approved-template="kennzahl"] strong').innerText();
  const options=await period.locator('option').evaluateAll(nodes=>nodes.map(node=>(node as HTMLOptionElement).value));
  expect(options.length).toBeGreaterThan(1);
  await period.selectOption(options[1]);
  await expect(period).toHaveValue(options[1]);
  await expect(money.locator('[data-approved-template="kennzahl"] strong')).not.toHaveText(before);
  for(const width of [320,451,1440]){
    await page.setViewportSize({width,height:1000});
    await money.scrollIntoViewIfNeeded();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for(const widget of await monitor.locator('.sc-widget').all()){
      const box=(await widget.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x+box.width).toBeLessThanOrEqual(width+1);
    }
  }
});

test('district chart proportions and source footer remain responsive',async({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width:1226,height:793});
  await page.goto(route,{waitUntil:'domcontentloaded'});
  const legend=page.locator('#atlas-data .sc-share-legend');
  await legend.scrollIntoViewIfNeeded();
  await expect.poll(()=>legend.evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(3);
  const composition=page.locator('#atlas-data [data-widget-kind="composition"]');
  await expect(composition.locator('circle[stroke-linecap="round"]')).toHaveCount(3);
  const art=page.locator('#atlas-foerderung solar-illustration');
  await art.scrollIntoViewIfNeeded();
  await expect.poll(()=>art.evaluate(e=>!!e.shadowRoot?.querySelector('svg'))).toBe(true);
  const footer=page.locator('[data-page-footer]');
  expect(await footer.evaluate(e=>Math.abs(e.getBoundingClientRect().top-document.querySelector('main')!.getBoundingClientRect().bottom))).toBeLessThan(1);
  expect(await footer.locator('.sc-data-sources').evaluate(e=>e.previousElementSibling?.classList.contains('sc-trust'))).toBe(true);
  await expect(page.locator('[data-sc-fuss]:visible')).toHaveCount(1);
  await page.setViewportSize({width:451,height:793});
  await expect(art).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(451);
});

test('without WebGL the district map falls back to the drawn map with every municipality',async({page})=>{
  test.setTimeout(120000);
  // The fallback is no longer server-rendered (it was 0.9 MB of hidden paths on every
  // page); it must still appear when the 3D scene cannot start.
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...rest:unknown[]){
      if(/webgl/i.test(type))return null;
      return (original as (...a:unknown[])=>unknown).call(this,type,...rest);
    } as typeof original;
  });
  await page.goto(route,{waitUntil:'domcontentloaded'});
  const fallback=page.locator('[data-map-canvas] svg[role="img"]');
  await expect(fallback).toBeVisible({timeout:30000});
  await expect(fallback.locator('path[data-region]')).not.toHaveCount(0);
  const regions=await fallback.locator('path[data-region]').count();
  expect(regions).toBeGreaterThanOrEqual(52); // Landkreis Würzburg: 52 municipalities plus context areas
  await expect(page.locator('[data-region-scene]')).toBeHidden();
});
