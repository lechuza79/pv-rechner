import {test,expect} from '@playwright/test';
import {DEFAULT_PRICES} from '../lib/prices-config';
import {DEFAULT_FEED_IN} from '../lib/feedin-config';
test.beforeEach(async({page})=>{
 await page.route('**/api/prices',r=>r.fulfill({json:DEFAULT_PRICES}));
 await page.route('**/api/feedin',r=>r.fulfill({json:DEFAULT_FEED_IN}));
 await page.emulateMedia({reducedMotion:'reduce'});
});
const url='/photovoltaik-rechner?a=4&ck=4&s=4&p=0&n=1&wp=ja&wf=140&wi=1&wh=hk_neu&wht=2&ea=nein&flow=emp&ht=0&da=0&az=sued';
test('single consumer additions preserve existing consumers and require only their own missing answers',async({page})=>{
  await page.setViewportSize({width:708,height:900});
  await page.goto(url,{waitUntil:"domcontentloaded"});
  const cards=page.locator('.pv-consumer-options');
  await expect(cards.locator('.wp-product-carousel-frame')).toHaveAttribute('data-ready','true',{timeout:30000});
  await expect(cards.getByRole('button',{name:'Wärmepumpe: Entfernen',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(cards.getByText('Deine Ausgangsangaben')).toHaveCount(0);
  const original=await page.locator('.wp-result-summary').innerText();
  const annualMetric=page.locator('.wp-result-summary strong').last();
  const amount=(text:string)=>Number(text.replace(/[^0-9−-]/g,'').replace('−','-'));
  const originalAnnual=amount(await annualMetric.innerText());
  await cards.getByRole('button',{name:'E-Auto: Ergänzen',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.locator('[data-flow-akkordeon-offen="Fahrleistung pro Jahr"]')).toBeVisible();
  await expect(dialog.getByRole('button',{name:/Wohnfläche|Nutzungsprofil|Gekühlte Räume/})).toHaveCount(0);
  await expect(dialog.locator('[data-flow-next]')).toHaveAttribute('aria-disabled','true');
  await dialog.getByRole('button',{name:'Abbrechen',exact:true}).click();
  await expect(page.locator('.wp-result-summary')).toHaveText(original);
  await cards.getByRole('button',{name:'E-Auto: Ergänzen',exact:true}).click();
  await dialog.getByRole('button',{name:'20.000 km',exact:true}).click();
  await dialog.getByRole('button',{name:'Zur Vorschau hinzufügen',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(cards.locator('[aria-pressed=true]')).toHaveCount(2);
  await expect(page.locator('.wp-result-summary')).toHaveText(original);
  await expect(cards.locator('.sc-result-choice-header').filter({hasText:'E-Auto'})).toContainText('über 25 Jahre');
  await cards.getByRole('button',{name:'E-Auto: Entfernen',exact:true}).click();
  await expect(cards.locator('[aria-pressed=true]')).toHaveCount(1);
  await expect(page.locator('.pv-consumer-apply-anchor').getByRole('button',{name:'Berechnung aktualisieren',exact:true})).toHaveCount(0);
  await cards.getByRole('button',{name:'E-Auto: Ergänzen',exact:true}).click();
  await expect(dialog.locator('[data-flow-next]')).toHaveAttribute('aria-disabled','true');
  await dialog.getByRole('button',{name:'20.000 km',exact:true}).click();
  await dialog.getByRole('button',{name:'Zur Vorschau hinzufügen',exact:true}).click();
  await cards.scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/pv-individual-708.png',animations:'disabled'});
  await cards.getByRole('button',{name:'Klimaanlage: Ergänzen',exact:true}).click();
  await expect(dialog.locator('[data-flow-akkordeon-offen="Gekühlte Räume"]')).toBeVisible();
  await expect(dialog.getByText('Fahrleistung pro Jahr',{exact:true})).toHaveCount(0);
  await dialog.getByRole('button',{name:'2 Räume',exact:true}).click();
  await page.setViewportSize({width:375,height:900});
  await dialog.screenshot({path:'/tmp/pv-individual-dialog-375.png',animations:'disabled'});
  await dialog.getByRole('button',{name:'Zur Vorschau hinzufügen',exact:true}).click();
  await expect(cards.locator('[aria-pressed=true]')).toHaveCount(3);
  await cards.scrollIntoViewIfNeeded();
  await page.locator('.pv-consumer-apply-anchor').getByRole('button',{name:'Berechnung aktualisieren',exact:true}).click({trial:true});
  const cooling=page.getByRole('group',{name:'Kühlstromkosten pro Jahr',exact:true});
  await expect(cooling.locator('.sc-category-horizontal-track')).toHaveCount(2);
  expect(await cooling.locator('.sc-category-horizontal-track').first().evaluate(el=>getComputedStyle(el).height)).toBe('7px');
  await expect(cards).toContainText('Zusätzlicher PV-Vorteil');
  expect(await page.locator('.pv-consumer-apply-anchor footer').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await page.screenshot({path:'/tmp/pv-individual-375.png',animations:'disabled'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('.wp-result-summary')).toHaveText(original);
  const combined=amount((await page.locator('.pv-consumer-apply-anchor .sc-metric-value').innerText()).split('€')[0]);
  await page.locator('.pv-consumer-apply-anchor').getByRole('button',{name:'Berechnung aktualisieren',exact:true}).click();
  await expect(cards.locator('.sc-result-choice-footer')).toHaveCount(0);
  await expect(cards.locator('[aria-pressed=true]')).toHaveCount(3);
  await expect(page.locator('.wp-result-summary')).not.toHaveText(original);
  expect(Math.abs(amount(await annualMetric.innerText())-originalAnnual-combined)).toBeLessThanOrEqual(1);
});
test('new heat pump asks only missing building information',async({page})=>{
  await page.goto(url.replace('wp=ja','wp=nein').replace(/&(wf|wi|wh|wht)=[^&]*/g,''),{waitUntil:"domcontentloaded"});
  await expect(page.locator('.pv-consumer-options .wp-product-carousel-frame')).toHaveAttribute('data-ready','true',{timeout:30000});
  await page.getByRole('button',{name:'Wärmepumpe: Ergänzen',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.locator('[data-flow-next]')).toHaveAttribute('aria-disabled','true');
  for(let i=0;i<4;i++){
    const question=dialog.locator('[data-flow-akkordeon-offen]');
    await expect(question).toHaveCount(1);
    await question.locator('[data-flow-wahl]').first().click();
  }
  await expect(dialog.getByText('Fahrleistung pro Jahr',{exact:true})).toHaveCount(0);
  await expect(dialog.locator('[data-flow-next]')).not.toHaveAttribute('aria-disabled','true');
});

test('compact comparison pairs and shared apply preserve the original until confirmation',async({page})=>{
  await page.setViewportSize({width:1024,height:1000});
  await page.goto(url,{waitUntil:"domcontentloaded"});
  const cards=page.locator('.pv-consumer-options');
  await expect(cards.locator('.wp-product-carousel-frame')).toHaveAttribute('data-ready','true',{timeout:30000});
  await expect(cards.locator('.pv-consumer-addon')).toHaveCount(0);
  await expect(cards.locator('.wp-product-navigation')).toHaveCount(0);
  await expect(cards.locator('.sc-result-choice-footer')).toHaveCount(0);
  const original=await page.locator('.wp-result-summary').innerText();
  const car=cards.locator('.pv-consumer-card').filter({hasText:'E-Auto'});
  await car.getByRole('button',{name:'E-Auto: Ergänzen',exact:true}).click();
  for(const width of [708,375]) {
    await page.setViewportSize({width,height:783});
    const dialog=page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const dialogBox=await dialog.boundingBox();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x+dialogBox!.width).toBeLessThanOrEqual(width);
    await page.screenshot({path:`/tmp/pv-dialog-${width}.png`,animations:'disabled'});
  }
  await page.setViewportSize({width:1024,height:1000});
  await page.getByRole('dialog').getByRole('button',{name:'20.000 km',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Zur Vorschau hinzufügen',exact:true}).click();
  await expect(page.locator('.wp-result-summary')).toHaveText(original);
  await expect(page.locator('.sc-category-pair:visible')).toHaveCount(2);
  await expect(page.locator('.sc-category-pair-saving').first()).toContainText('%');
  await page.getByRole('button',{name:'Heizöl',exact:true}).click();
  await expect(page.getByRole('button',{name:'Heizöl',exact:true})).toBeVisible();
  const footer=page.locator('.pv-consumer-apply-anchor .pv-consumer-apply');
  await expect(footer).toBeVisible();
  for(const width of [708,375]) {
    await page.setViewportSize({width,height:783});
    await footer.scrollIntoViewIfNeeded();
    const geometry=await footer.evaluate(el=>{
      const text=el.querySelector('p')!.getBoundingClientRect();
      const button=el.querySelector('[data-flow-next]')!.getBoundingClientRect();
      const box=el.getBoundingClientRect();
      return {textWidth:text.width,textRight:text.right,left:button.left,right:button.right,bottom:button.bottom,height:box.height};
    });
    expect(geometry.textWidth).toBeGreaterThan(120);
    expect(geometry.textRight).toBeLessThanOrEqual(geometry.left-8);
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width);
    expect(geometry.bottom).toBeLessThanOrEqual(783);
    expect(geometry.height).toBeLessThan(150);
    await page.screenshot({path:`/tmp/pv-footer-${width}.png`,animations:'disabled'});
  }
  await page.setViewportSize({width:1024,height:1000});
  expect(await footer.evaluate(el=>getComputedStyle(el).position)).toBe('static');
  await page.locator('.pv-consumer-apply-anchor').getByRole('button',{name:'Berechnung aktualisieren',exact:true}).click();
  await expect(footer).toHaveCount(0);
  await expect(page.locator('.wp-result-summary')).not.toHaveText(original);
  await expect(car.getByRole('button',{name:'E-Auto: Entfernen',exact:true})).toBeVisible();
  await page.locator('#pv-consumer-comparison').scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/pv-paired-1024.png',animations:'disabled'});
  await page.setViewportSize({width:708,height:900});
  await expect(cards.getByRole('button',{name:'Weitere Verbraucher',exact:true})).toBeVisible();
  await cards.getByRole('button',{name:'Weitere Verbraucher',exact:true}).click();
  await expect(cards.getByRole('button',{name:'Klimaanlage: Ergänzen',exact:true})).toBeInViewport();
  await page.locator('#pv-consumer-comparison').scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/pv-paired-708.png',animations:'disabled'});
  await page.setViewportSize({width:375,height:900});
  await page.locator('#pv-consumer-comparison').scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/pv-paired-375.png',animations:'disabled'});
  await expect(cards.locator('.wp-product-navigation')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('consumer section keeps its layout and chart geometry across viewport sizes',async({page})=>{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const cards=page.locator('.pv-consumer-options');
  await expect(cards.locator('.wp-product-carousel-frame')).toHaveAttribute('data-ready','true',{timeout:30000});
  for(const width of [375,708,1440]) {
    await page.setViewportSize({width,height:1000});
    await page.locator('.pv-consumer-scenarios').evaluate(el=>el.scrollIntoView({block:'start'}));
    const notice=page.getByRole('status').filter({has:page.getByRole('group',{name:'Standort prüfen',exact:true})});
    if(await notice.isVisible()) await notice.getByRole('button',{name:'Schließen',exact:true}).click();
    expect(await page.locator('.wp-overview').first().evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
    expect(await page.locator('.pv-result-settings').first().evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    const actionbar=page.getByRole('region',{name:'Ergebnisaktionen'});
    expect(await actionbar.evaluate(el=>getComputedStyle(el).position)).toBe('sticky');
    const navigation=cards.getByRole('button',{name:'Weitere Verbraucher',exact:true});
    if(width<1024) await expect(navigation).toBeVisible();
    else await expect(cards.locator('.wp-product-navigation')).toHaveCount(0);
    const header=cards.locator('.sc-result-choice-header').first();
    const art=await header.locator('.sc-result-choice-art').boundingBox();
    const title=await header.locator(':scope > div > strong').boundingBox();
    expect(art!.x+art!.width).toBeLessThanOrEqual(title!.x);
    const pair=page.locator('.sc-category-pair').first();
    const tracks=pair.locator('.sc-category-horizontal-track');
    const gap=await tracks.evaluateAll(elements=>{const upper=elements[0].getBoundingClientRect();const lower=elements[1].getBoundingClientRect();return lower.top-upper.bottom;});
    expect(gap).toBeCloseTo(1,1);
    expect(await tracks.first().evaluate(el=>getComputedStyle(el).borderTopLeftRadius)).toBe('0px');
    expect(await pair.locator('.sc-category-pair-bars').evaluate(el=>getComputedStyle(el,'::before').width)).toBe('1px');
    await expect(pair.locator('.sc-category-pair-saving')).not.toContainText('+');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`/tmp/pv-coherent-${width}.png`,animations:'disabled'});
  }
});


test('consumer action floats only outside its content position',async({page})=>{
  await page.setViewportSize({width:708,height:783});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await expect(page.locator('.pv-consumer-options .wp-product-carousel-frame')).toHaveAttribute('data-ready','true',{timeout:30000});
  await page.getByRole('button',{name:'E-Auto: Ergänzen',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'15.000 km',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Zur Vorschau hinzufügen',exact:true}).click();
  const anchor=page.locator('.pv-consumer-apply-anchor');
  const floating=page.locator('[data-floating-action=true]');
  for(const width of [708,375]) {
    await page.setViewportSize({width,height:783});
    await page.locator('#pv-ueberblick').evaluate(el=>el.scrollIntoView({block:'start'}));
    await expect(floating).toHaveAttribute('aria-hidden','false');
    await page.screenshot({path:`/tmp/pv-floating-before-${width}.png`,animations:'disabled'});
    await anchor.evaluate(el=>el.scrollIntoView({block:'center'}));
    await expect(floating).toHaveAttribute('aria-hidden','true');
    await page.screenshot({path:`/tmp/pv-floating-inline-${width}.png`,animations:'disabled'});
    await page.locator('.pv-result-methodology').evaluate(el=>el.scrollIntoView({block:'start'}));
    await expect(floating).toHaveAttribute('aria-hidden','false');
    await expect(floating.getByRole('button',{name:'Berechnung aktualisieren',exact:true})).toBeInViewport();
    await page.screenshot({path:`/tmp/pv-floating-after-${width}.png`,animations:'disabled'});
  }
  const art=page.locator('[data-consumer=ea] .sc-result-choice-art');
  expect(await art.evaluate(el=>{const s=getComputedStyle(el,'::before');return Math.abs(parseFloat(s.width)-parseFloat(s.height));})).toBeLessThan(1);
  await floating.getByRole('button',{name:'Berechnung aktualisieren',exact:true}).click();
  await expect(anchor).toHaveCount(0);
});


test('removing a consumer previews a signed loss and applies that exact difference',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 const cards=page.locator('.pv-consumer-options');
 await expect(cards.locator('.wp-product-carousel-frame')).toHaveAttribute('data-ready','true',{timeout:60000});
 const amount=(text:string)=>Number(text.replace(/[^0-9−-]/g,'').replace('−','-'));
 const total=page.locator('.wp-result-summary strong').last();
 const before=amount(await total.innerText());
 await cards.getByRole('button',{name:'Wärmepumpe: Entfernen',exact:true}).click();
 const footer=page.locator('.pv-consumer-apply-anchor');
 const delta=amount(await footer.locator('.sc-metric-value').innerText());
 expect(delta).toBeLessThan(0);
 await footer.getByRole('button',{name:'Berechnung aktualisieren',exact:true}).click();
 await expect(footer).toHaveCount(0);
 expect(Math.abs(amount(await total.innerText())-before-delta)).toBeLessThanOrEqual(1);
});

test('manual self consumption is not mislabelled as a consumer benefit',async({page})=>{
 await page.goto(url+'&ev=60',{waitUntil:'domcontentloaded'});
 const cards=page.locator('.pv-consumer-options');
 await expect(cards.locator('.wp-product-carousel-frame')).toHaveAttribute('data-ready','true',{timeout:60000});
 await expect(cards.locator('.sc-metric-value')).toHaveCount(0);
 await cards.getByRole('button',{name:'E-Auto: Ergänzen',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.getByRole('button',{name:'20.000 km',exact:true}).click();
 await dialog.getByRole('button',{name:'Zur Vorschau hinzufügen',exact:true}).click();
 const footer=page.locator('.pv-consumer-apply-anchor');
 await footer.getByRole('button',{name:'Änderung des PV-Vorteils erklären',exact:true}).click();
 await expect(page.getByRole('tooltip')).toContainText('Dein manuell gesetzter Eigenverbrauch wird beim Aktualisieren neu berechnet.');
 await page.keyboard.press('Escape');
 await expect(footer.locator('.sc-metric-value')).toHaveCount(0);
 await footer.getByRole('button',{name:'Berechnung aktualisieren',exact:true}).click();
 await expect(cards.locator('.sc-metric-value').first()).toBeVisible();
});

for (const width of [375, 1280]) test(`mixed consumer changes and footer handover at ${width}px`, async ({page}) => {
  await page.setViewportSize({width, height:900});
  await page.goto(url.replace('ea=nein', 'ea=ja') + '&km=15000');
  const cards = page.locator('.pv-consumer-options');
  await expect(cards.locator('.wp-product-carousel-frame')).toHaveAttribute('data-ready', 'true');
  await cards.locator('[data-consumer=ea] .sc-result-choice-action').click();
  await cards.locator('[data-consumer=klima] .sc-result-choice-action').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', {name:'2 Räume', exact:true}).click();
  await dialog.getByRole('button', {name:'Zur Vorschau hinzufügen', exact:true}).click();
  const anchor = page.locator('.pv-consumer-apply-anchor');
  const floating = page.locator('[data-floating-action=true]');
  await expect(anchor).toContainText('durch Klimaanlage sowie den Wegfall von Elektroauto');
  // Test both directions and partial intersection, not only a fully visible anchor.
  const move = async (top:number) => {
    await anchor.evaluate((el, y) => window.scrollBy({top:el.getBoundingClientRect().top-y, behavior:'instant'}), top);
  };
  await move(950);
  await expect(floating).toHaveAttribute('aria-hidden', 'false');
  await move(870);
  await expect(floating).toHaveCSS('visibility', 'hidden');
  await expect(floating).toHaveAttribute('inert', '');
  await move(300);
  await expect(floating).toHaveCSS('visibility', 'hidden');
  const height = await anchor.evaluate(el => el.getBoundingClientRect().height);
  await move(-height + 20);
  await expect(floating).toHaveCSS('visibility', 'hidden');
  await move(-height - 20);
  await expect(floating).toHaveAttribute('aria-hidden', 'false');
});


const consumerKinds=[{kind:'wp',name:'Wärmepumpe'},{kind:'ea',name:'E-Auto'},{kind:'klima',name:'Klimaanlage'}];
for(const {kind,name} of consumerKinds) for(const width of [375,1280]) test(`restoring ${kind} restores its benefit and clears the unchanged preview at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto(url.replace('ea=nein','ea=ja')+'&km=15000&kl=ja&klr=2');
  const card=page.locator(`[data-consumer=${kind}]`);
  await expect(page.locator('.pv-consumer-options .wp-product-carousel-frame')).toHaveAttribute('data-ready','true');
  const original=(await card.locator('.sc-metric-value').textContent())!;
  expect(Number(original.replace(/[^0-9]/g,''))).toBeGreaterThan(0);
  const result=await page.locator('.wp-result-summary').innerText();
  await card.getByRole('button',{name:`${name}: Entfernen`,exact:true}).click();
  await expect(card).toContainText('Entfernt');
  await card.getByRole('button',{name:`${name}: Wieder hinzufügen`,exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Zur Vorschau hinzufügen',exact:true}).click();
  await expect(card.locator('.sc-metric-value')).toHaveText(original);
  await expect(page.locator('.pv-consumer-apply-anchor')).toHaveCount(0);
  await expect(page.locator('.wp-result-summary')).toHaveText(result);
  await expect(page.locator('.pv-consumer-options [aria-pressed=true]')).toHaveCount(3);
});
for(const {kind,name} of consumerKinds) test(`adding then removing new ${kind} cancels its preview`,async({page})=>{
  await page.setViewportSize({width:375,height:900});
  await page.goto(url.replace('wp=ja','wp=nein').replace(/&(wf|wi|wh|wht)=[^&]*/g,''));
  await expect(page.locator('.pv-consumer-options .wp-product-carousel-frame')).toHaveAttribute('data-ready','true');
  const result=await page.locator('.wp-result-summary').innerText();
  const card=page.locator(`[data-consumer=${kind}]`);
  await card.getByRole('button',{name:`${name}: Ergänzen`,exact:true}).click();
  const dialog=page.getByRole('dialog');
  if(kind==='wp') for(let i=0;i<4;i++) await dialog.locator('[data-flow-akkordeon-offen] [data-flow-wahl]').first().click();
  else await dialog.getByRole('button',{name:kind==='ea'?'15.000 km':'2 Räume',exact:true}).click();
  await dialog.getByRole('button',{name:'Zur Vorschau hinzufügen',exact:true}).click();
  await expect(page.locator('.pv-consumer-apply-anchor')).toHaveCount(1);
  await card.getByRole('button',{name:`${name}: Entfernen`,exact:true}).click();
  await expect(page.locator('.pv-consumer-apply-anchor')).toHaveCount(0);
  await expect(card.getByRole('button',{name:`${name}: Ergänzen`,exact:true})).toBeVisible();
  await expect(page.locator('.wp-result-summary')).toHaveText(result);
});

test('an editorial handover opens the question flow with its chosen configuration', async ({page}) => {
  await page.goto('/photovoltaik-rechner?direkt=1&eingabe=1&a=4&ck=10&sk=0&p=2&n=1&vb=3800&wp=geplant&ea=geplant&km=20000&kl=nein', {waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'Anlage',exact:true})).toBeVisible();
  await expect(page.locator('#pv-ueberblick')).toHaveCount(0);
  await expect(page.locator('[data-flow-next]')).toHaveAttribute('aria-disabled','false');
});


test('funding nudge stays until dismissed instead of timing out', async ({page}) => {
  await page.clock.install();
  await page.goto(url);
  const nudge = page.getByRole('status').filter({has:page.getByRole('group',{name:'Standort prüfen',exact:true})});
  await expect(nudge).toBeVisible();
  await page.clock.fastForward(8000);
  await expect(nudge).toBeVisible();
  await nudge.getByRole('button', {name:'Schließen', exact:true}).click();
  await expect(nudge).toHaveCount(0);
});

for (const [wp, ea, klima, target] of [
  ['nein', 'nein', 'nein', 'wp'],
  ['ja', 'nein', 'nein', 'ea'],
  ['ja', 'ja', 'nein', 'klima'],
  ['ja', 'ja', 'ja', null],
] as const) test(`scroll hint targets the first free consumer: ${target ?? 'none'}`, async ({page}) => {
  await page.setViewportSize({width:1280,height:720});
  await page.emulateMedia({reducedMotion:'no-preference'});
  const params = new URLSearchParams(url.split('?')[1]);
  params.set('wp', wp); params.set('ea', ea); params.set('kl', klima);
  await page.goto(`/photovoltaik-rechner?${params}`);
  const cards = page.locator('.pv-consumer-options');
  await expect(cards.locator('.wp-product-carousel-frame')).toHaveAttribute('data-ready','true');
  await expect(cards.locator('.wp-solar-pointer')).toHaveCount(0);
  await cards.scrollIntoViewIfNeeded();
  await expect(cards.locator('.wp-solar-pointer')).toHaveCount(target ? 1 : 0);
  if (target) {
    const freeCard = cards.locator(`[data-consumer=${target}]`);
    await expect(freeCard.locator('.sc-result-choice-action')).toBeVisible();
    await expect(freeCard.locator('.wp-solar-pointer')).toHaveCSS('display', 'block');
    expect(await freeCard.locator('.wp-solar-pointer').evaluate(el => getComputedStyle(el, '::before').animationName)).toBe('wp-tap-contact');
    await freeCard.locator('.sc-result-choice-action').click();
    await expect(freeCard.locator('.wp-solar-pointer')).toHaveCount(0);
  }
});
