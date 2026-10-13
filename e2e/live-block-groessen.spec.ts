import {test, expect} from "@playwright/test";

// The approved radar hero replaces the former pair of live cards. Measure its
// real plot and copy bounds rather than retaining the removed card structure.
for (const width of [390, 1024, 1600, 1920]) {
 test(`Strommix radar hero fits at ${width}px`, async ({page}) => {
  await page.setViewportSize({width,height:900});
  await page.goto("/strommix-deutschland");
  const hero=page.getByRole("region",{name:"Strommix Deutschland live",exact:true});
  await expect(hero.getByRole("heading",{level:1})).toBeVisible();
  const radar=hero.locator(".sc-radar");
  await expect(radar).toBeVisible({timeout:30000});
  const geometry=await hero.evaluate(root=>{
   const h=root.getBoundingClientRect();
   const r=root.querySelector(".sc-radar")!.getBoundingClientRect();
   const p=root.querySelector("h1")!.parentElement!.getBoundingClientRect();
   return {overflow:document.documentElement.scrollWidth-window.innerWidth,
    contained:r.left>=h.left-1&&r.right<=h.right+1&&p.left>=h.left-1&&p.right<=h.right+1,
    overlap:Math.min(r.right,p.right)-Math.max(r.left,p.left)>1&&Math.min(r.bottom,p.bottom)-Math.max(r.top,p.top)>1};
  });
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.contained).toBe(true);
  expect(geometry.overlap).toBe(false);
 });
}
