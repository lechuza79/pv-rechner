import {test,expect} from '@playwright/test';

const preview='/embed/galerie/gemeinde-ranking?ags=12063080&list=on&theme=light&autoplay=on';

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
  await expect(tiles.first()).not.toHaveClass(/ranking-undiscovered/);
  await tiles.first().click();
  await expect(tiles.nth(1)).toHaveAttribute('aria-pressed','true');
  await expect(tiles.nth(1)).not.toHaveClass(/ranking-undiscovered/,{timeout:20_000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:/Alle .* Orte in dieser Rangliste ansehen/}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('tr[aria-current="location"]')).toContainText('Falkensee');
  await page.getByRole('button',{name:'Schließen',exact:true}).click();
  await tiles.nth(1).press('ArrowLeft');
  await expect(tiles.first()).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>page.locator('.ranking-choices').evaluate(node=>node.scrollLeft)).toBe(0);
});
