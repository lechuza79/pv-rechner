import {test,expect} from '@playwright/test';

const preview='/embed/galerie/gemeinde-ranking?ags=12063080&list=on&theme=light&autoplay=on';

// The first category's rows come from a live API backed by the shared database;
// its podium (and with it the reveal) appears only once they arrive. Wait for the
// data itself, so a slow read is not mistaken for a reveal that never happens.
async function firstCategoryLoaded(page:import('@playwright/test').Page){
  await expect(page.locator('[data-podium-layout]').first(),'first ranking rows did not load').toBeVisible({timeout:20_000});
}

for (const width of [713,390]) test(`ranking list action remains visible while the next category loads at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});
  // Hold the next category's real response so the loading state cannot escape the assertion.
  let release!:()=>void;
  const pending=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/atlas/nachbarn?**',async route=>{
    await pending;
    await route.continue();
  });
  await page.goto(preview.replace('autoplay=on','autoplay=off'));
  const list=page.locator('.ranking-footer .ranking-open');
  const tiles=page.locator('.ranking-choice');
  await firstCategoryLoaded(page);
  await expect(tiles.first()).not.toHaveClass(/ranking-undiscovered/);
  await expect(list).toBeEnabled();
  if(width>600) await page.getByRole('button',{name:'Nächste Platzierung entdecken',exact:true}).click();
  else await tiles.first().click();
  await expect(tiles.nth(1)).toHaveAttribute('aria-pressed','true');
  try {
    await expect(list).toBeVisible();
    await expect(list).toBeDisabled();
    await expect(list).toHaveText('Vollständige Rangliste ansehen');
  } finally { release(); }
  await expect(list).toBeEnabled({timeout:20_000});
  await list.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Solarleistung');
});

test('shared ranking preserves discovery, celebration and list position',async({page})=>{
  test.slow();
  await page.setViewportSize({width:1280,height:900});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(preview);
  const choices=page.locator('.ranking-choices');
  const tiles=choices.locator('.ranking-choice');
  await expect(page.locator('[data-ranking-celebration-origin]')).toHaveAttribute('data-celebrated','true',{timeout:20_000});
  await expect(tiles.nth(1)).toHaveClass(/ranking-invite-visible/);
  expect(await tiles.nth(1).evaluate(node=>getComputedStyle(node,'::before').animationName)).toBe('ranking-tap-contact');
  const before=await choices.evaluate(node=>node.scrollTop);
  await page.getByRole('button',{name:'Nächste Platzierung entdecken',exact:true}).click();
  await expect(tiles.nth(1)).toHaveAttribute('aria-pressed','true');
  expect(await choices.evaluate(node=>node.scrollTop)).toBe(before);
  await expect(page.locator('.ranking-invite-visible')).toHaveCount(0);
  await page.getByRole('button',{name:'Vorherige Platzierung',exact:true}).click();
  await expect(tiles.nth(0)).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-podium-visual]')).not.toHaveAttribute('data-animate','true');
});

test('shared ranking retains mobile category navigation and the own table row',async({page})=>{
  test.slow();
  await page.setViewportSize({width:390,height:844});
  await page.goto(preview.replace('autoplay=on','autoplay=off'));
  const tiles=page.locator('.ranking-choice');
  await firstCategoryLoaded(page);
  await expect(tiles.first()).not.toHaveClass(/ranking-undiscovered/);
  await tiles.first().click();
  await expect(tiles.nth(1)).toHaveAttribute('aria-pressed','true');
  await expect(tiles.nth(1)).not.toHaveClass(/ranking-undiscovered/,{timeout:20_000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:/Alle .* Orte in dieser Rangliste ansehen/}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const ownRow=page.locator('tr[aria-current="location"]');
  await expect(ownRow).toContainText('Falkensee');
  const place=ownRow.locator('th[scope="row"]');
  expect(await place.evaluate(node=>node.getBoundingClientRect().width)).toBeGreaterThanOrEqual(160);
  const tableScroll=page.getByRole('dialog').getByRole('region');
  expect(await tableScroll.evaluate(node=>node.scrollWidth>node.clientWidth)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Schließen',exact:true}).click();
  await tiles.nth(1).press('ArrowLeft');
  await expect(tiles.first()).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>page.locator('.ranking-choices').evaluate(node=>node.scrollLeft)).toBe(0);
});
