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
  // Keep the same assertions in one browser round trip. CI software rendering
  // takes several seconds per call while the full-width terrain is animating.
  const snapshot=await nav.evaluate(el=>{
   const previous=el.querySelector<HTMLButtonElement>('[aria-label="Vorheriges Ziel"]')!;
   const next=el.querySelector<HTMLButtonElement>('[aria-label="Nächstes Ziel"]')!;
   const place=document.querySelector<HTMLElement>('[aria-label="Ort der Vorschau suchen"]')!;
   return {
    nextVariant:next.dataset.variant,previousVariant:previous.dataset.variant,
    iconOnly:previous.hasAttribute('data-icon-only')&&previous.dataset.iconOnly!=='false',
    previousText:previous.textContent,nextText:next.textContent,
    nextIconWidth:next.querySelector('svg')!.getBoundingClientRect().width,
    differentBackgrounds:getComputedStyle(next).backgroundColor!==getComputedStyle(previous).backgroundColor,
    placeVisible:place.getClientRects().length>0&&getComputedStyle(place).visibility==='visible',
    destinationPickers:el.querySelectorAll('[aria-haspopup="listbox"]').length,
    overflow:el.scrollWidth-el.clientWidth,
   };
  });
  expect(snapshot).toMatchObject({nextVariant:'primary',previousVariant:'secondary',iconOnly:true,
   previousText:'',nextText:'Zum Windpark',nextIconWidth:16,differentBackgrounds:true,placeVisible:true,destinationPickers:0});
  expect(snapshot.overflow).toBeLessThanOrEqual(1);
  await next.click();
  await expect(scene.getByRole('heading',{name:'Windanlagen Hatten',exact:true})).toBeVisible({timeout:20000});
  await expect(next).toBeEnabled({timeout:20000});
  await previous.click();
  await expect(scene.getByRole('heading',{name:'Hatten',exact:true})).toBeVisible({timeout:20000});
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
