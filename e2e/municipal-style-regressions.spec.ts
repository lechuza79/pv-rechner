import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import sharp from "sharp";

for (const width of [375, 1440]) {
  test(`municipal example actions retain symmetric padding at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/solar-atlas/niedersachsen/landkreis-gifhorn/meinersen", { waitUntil: "domcontentloaded" });
    const actions = page.locator(".gemeinde-buerger-card .sc-feature-action");
    await expect(actions).toHaveCount(3);
    for (const action of await actions.all()) {
      await action.scrollIntoViewIfNeeded();
      await expect(action).toBeVisible();
      const geometry = await action.evaluate(el => {
        const style = getComputedStyle(el);
        return { top: style.paddingTop, bottom: style.paddingBottom, height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width, parentWidth: el.parentElement!.getBoundingClientRect().width };
      });
      expect(geometry.top).toBe(geometry.bottom);
      expect(geometry.height).toBeGreaterThanOrEqual(44);
      expect(geometry.width).toBeLessThanOrEqual(geometry.parentWidth + 1);
    }
    // Scene contrast sampling must include the cue itself, not only its siblings.
    await expect(page.locator(".v3-scroll-indicator")).toHaveAttribute("data-sc-contrast", "");
  });
}

test("signed-in header icons share ring geometry and remain separated", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // Authentication only substitutes this native details element; its geometry
  // belongs to the shared stylesheet and must not depend on a live account.
  await page.setContent('<header class="site-header sc-global-header"><button class="sc-search-toggle" aria-label="Suche"></button><details class="sc-account"><summary class="sc-nav-login" aria-label="Mein Konto"></summary></details></header>');
  await page.addStyleTag({ content: readFileSync("public/shared-nav/nav.css", "utf8") });
  const measured = await page.evaluate(() => {
    const search = document.querySelector(".sc-search-toggle")!;
    const account = document.querySelector(".sc-account > summary")!;
    const a = search.getBoundingClientRect(), b = account.getBoundingClientRect();
    return { searchBorder: getComputedStyle(search).borderTopWidth, accountBorder: getComputedStyle(account).borderTopWidth, searchWidth: a.width, accountWidth: b.width, gap: b.left - a.right };
  });
  expect(measured.accountBorder).toBe(measured.searchBorder);
  expect(measured.accountWidth).toBe(measured.searchWidth);
  expect(measured.gap).toBeGreaterThanOrEqual(12);
});

test("nested regional map uses its dark iframe canvas", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/embed/gemeinde/03151017/monitor', {waitUntil:'domcontentloaded'});
  const heading = page.getByRole('heading', {name:'Energie im Landkreis', exact:true});
  await expect(async () => {
    if (await heading.count()) await heading.scrollIntoViewIfNeeded();
    else await page.locator('.municipal-data > div').last().scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
  }).toPass({timeout:25_000});
  const frame = page.locator('iframe[title="3D-Energiekarte · Landkreis Gifhorn"]');
  await expect(frame).toHaveCSS('color-scheme', 'dark');
  const background = await frame.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
  expect(background).not.toBe('rgb(255, 255, 255)');
  await expect(frame).toHaveCSS('opacity', '1', {timeout:30_000});
  const {data:pixels,info} = await sharp(await frame.screenshot()).removeAlpha().raw().toBuffer({resolveWithObject:true});
  // Sample inside the iframe outline, outside the centered widget card.
  const offset = (40 * info.width + 24) * info.channels;
  expect(Math.max(...pixels.subarray(offset, offset + 3))).toBeLessThan(150);
});

for (const theme of ["dark", "light"]) {
  test(`regional map preserves a transparent ${theme} document canvas`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({width:1280,height:900});
    await page.addInitScript(() => {
      window.addEventListener("message", event => {
        if (event.source === window && event.data?.type === "widget:appearance-request")
          document.documentElement.dataset.appearanceReady = "true";
      });
    });
    await page.goto(`/embed/regional-map?ags=03151&selected=03151017&onsite=1&theme=${theme}&autoplay=off`, {waitUntil:"domcontentloaded"});
    await expect(page.locator("html")).toHaveCSS("color-scheme",theme);
    await expect(page.locator("body")).toHaveCSS("background-color","rgba(0, 0, 0, 0)");
    await expect(page.locator("html")).toHaveAttribute("data-appearance-ready","true",{timeout:30_000});
    const buffer=await page.screenshot({clip:{x:24,y:40,width:1,height:1}});
    const pixel=await sharp(buffer).removeAlpha().raw().toBuffer();
    if(theme==="dark") expect(Math.max(...pixel)).toBeLessThan(150);
    else expect(Math.min(...pixel)).toBeGreaterThan(200);
    // Live appearance changes must update the browser canvas as well.
    const next=theme==="dark"?"light":"dark";
    await page.evaluate(theme=>window.postMessage({type:"widget:appearance",appearance:{theme}},window.location.origin),next);
    await expect(page.locator("html")).toHaveCSS("color-scheme",next);
    // A matching host scheme must reveal the host's custom background, not
    // an opaque browser canvas. This also protects third-party embeds.
    await page.setContent(`<style>html{color-scheme:${theme}}body{margin:0;background:rgb(22,80,96)}iframe{display:block;border:0;width:1280px;height:750px;color-scheme:${theme}}</style><iframe src="/embed/regional-map?ags=03151&theme=${theme}&autoplay=off"></iframe>`);
    await expect(page.frameLocator("iframe").locator("html")).toHaveCSS("color-scheme",theme);
    const embedded=await sharp(await page.screenshot({clip:{x:24,y:40,width:1,height:1}})).removeAlpha().raw().toBuffer();
    expect([...embedded]).toEqual([22,80,96]);
  });
}
