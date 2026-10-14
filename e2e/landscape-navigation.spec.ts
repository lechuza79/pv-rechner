import {test, expect} from '@playwright/test';

// Requires the normal municipal-page build, as in production.
for (const width of [375, 1440]) {
 test(`product landscape navigation retains usable controls at ${width}px`, async ({page}) => {
  // Scene loading and both camera flights have their own bounded waits below.
  test.setTimeout(120000);
  await page.setViewportSize({width,height:900});
  await page.goto('/fuer-organisationen/kommunen?gemeinde=03458009');
  const scene=page.locator('#municipal-landscape-hero [data-place-phase]');
  await expect(scene).toHaveAttribute('data-place-phase','ready',{timeout:60000});
  const nav=scene.getByRole('group',{name:'Navigation in der Landschaft'});
  await expect(nav).toBeVisible({timeout:60000});
  const next=nav.getByRole('button',{name:'Nächstes Ziel',exact:true});
  const previous=nav.getByRole('button',{name:'Vorheriges Ziel',exact:true});
  await expect(next).toHaveAttribute('data-variant','primary');
  await expect(previous).toHaveAttribute('data-variant','secondary');
  // The static HTML serializer can emit a present boolean attribute as empty.
  await expect(previous).toHaveAttribute('data-icon-only',/^(true)?$/);
  await expect(previous).toHaveText('');
  await expect(page.getByRole('combobox',{name:'Ort der Vorschau suchen'})).toBeVisible();
  await expect(nav.locator('[aria-haspopup="listbox"]')).toHaveCount(0);
  expect(await next.locator('svg').evaluate(el=>el.getBoundingClientRect().width)).toBe(16);
  expect(await next.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(await previous.evaluate(el=>getComputedStyle(el).backgroundColor));
  await expect(next).toHaveText('Zum Windpark');
  await next.click();
  await expect(scene.getByRole('heading',{name:'Windanlagen Hatten',exact:true})).toBeVisible({timeout:20000});
  await expect(next).toBeEnabled({timeout:20000});
  await previous.click();
  await expect(scene.getByRole('heading',{name:'Hatten',exact:true})).toBeVisible({timeout:20000});
  expect(await nav.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
 });
}

test('embedded landscape retains its compact navigation and header destination',async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width:375,height:812});
 await page.goto('/embed/kommunen-landschaft?ags=03458009&theme=dark');
 const scene=page.locator('[data-navigation="widget"][data-ready="true"]');
 await expect(scene).toBeVisible({timeout:60000});
 await expect(scene.locator('[data-tour] [data-action-button]')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Vorheriges Ziel',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Nächstes Ziel',exact:true})).toBeVisible();
 await expect(page.locator('.sc-widget-head [aria-haspopup="listbox"]')).toBeVisible();
});
