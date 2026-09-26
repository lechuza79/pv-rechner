import { test, expect, type Page } from "@playwright/test";

// The "Vor Ort" menu: one primary place field, then Deutschland · Bundesland ·
// Landkreis. The Bundesland and Landkreis controls are meant to be the SAME
// card as the Deutschland entries next to them — a promise that drifted once
// already (three font sizes and radii in one panel), and that only a browser
// can check, since the cards get their look from several cascading rules.
//
// Suggestions are stubbed: the test is about the menu, not the register.

const STUB = {
  q: "x",
  orte: [
    { name: "Höchberg", gattung: "Markt", kontext: "Landkreis Würzburg · Bayern", href: "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg" },
    { name: "Würzburg", gattung: "Kreisfreie Stadt", kontext: "Bayern", href: "/solar-atlas/bayern/wuerzburg" },
  ],
};

async function openLocal(page: Page, mobile: boolean) {
  await page.route("**/api/suche/orte**", r => r.fulfill({ json: STUB }));
  await page.goto("/impressum");
  if (mobile) await page.getByRole("button", { name: "Menü öffnen", exact: true }).click();
  await page.locator('.sc-global-nav [data-section="local"] > summary').click();
  const panel = page.locator('.sc-global-nav [data-section="local"] > .sc-nav-panel');
  await expect(panel.locator(".sc-local")).toBeVisible();
  return panel;
}

/** What makes a card look like a card. */
const LOOK = ["fontSize", "fontWeight", "fontFamily", "lineHeight", "borderRadius", "paddingTop", "paddingLeft", "backgroundColor", "color"] as const;

for (const [label, width, mobile] of [["desktop", 1440, false], ["phone", 375, true]] as const) {
  test.describe(`Vor Ort menu (${label})`, () => {
    test.beforeEach(async ({ page }) => page.setViewportSize({ width, height: 900 }));

    test("Bundesland and Landkreis are the same card as the Deutschland entries", async ({ page }) => {
      const panel = await openLocal(page, mobile);
      const measure = (sel: string) => panel.locator(sel).first().evaluate((el, props) => {
        const c = getComputedStyle(el);
        const small = el.querySelector("small");
        return {
          box: Object.fromEntries(props.map(p => [p, c[p as keyof CSSStyleDeclaration]])),
          height: (el as HTMLElement).offsetHeight,
          small: small ? getComputedStyle(small).fontSize + " " + getComputedStyle(small).fontWeight : null,
        };
      }, [...LOOK]);
      const card = await measure(".sc-nav-column > a");
      expect(await measure("button.sc-local-card")).toEqual(card);
      const kreis = await measure("label.sc-local-card");
      expect(kreis).toEqual(card);
      // All three column headings sit on one line.
      const tops = await panel.locator(".sc-nav-column > h3").evaluateAll(hs => hs.map(h => Math.round(h.getBoundingClientRect().top)));
      if (!mobile) expect(new Set(tops).size).toBe(1);
    });

    test("dropdowns open without moving the panel on desktop, in place on phones", async ({ page }) => {
      const panel = await openLocal(page, mobile);
      // offsetHeight, not the bounding box: the panel opens with a short scale
      // animation, and a box measured during it is a few pixels smaller.
      const before = await panel.evaluate(el => (el as HTMLElement).offsetHeight);

      await panel.locator("button.sc-local-card").click();
      const list = panel.locator(".sc-local-land-list");
      await expect(list.getByRole("link")).toHaveCount(16);
      await expect(list.getByRole("link", { name: "Bayern" })).toHaveAttribute("href", "/solar-atlas/bayern");
      if (!mobile) {
        expect(await panel.evaluate(el => (el as HTMLElement).offsetHeight)).toBe(before);
        // Floating: the list reaches past the panel instead of being cut off.
        await list.getByRole("link", { name: "Thüringen" }).scrollIntoViewIfNeeded();
        await expect(list.getByRole("link", { name: "Thüringen" })).toBeVisible();
      }

      const town = panel.locator('[data-local-search="ort"] input');
      await town.fill("Höchberg");
      const hits = panel.locator('[data-local-search="ort"] .sc-local-results');
      await expect(hits.getByRole("link")).toHaveCount(2);
      // Only one dropdown at a time.
      await expect(list).toBeHidden();
      if (!mobile) {
        expect(await panel.evaluate(el => (el as HTMLElement).offsetHeight)).toBe(before);
        // Over the columns, not pushing them down.
        const hitsBottom = await hits.evaluate(el => el.getBoundingClientRect().bottom);
        const cardTop = await panel.locator(".sc-nav-column > a").first().evaluate(el => el.getBoundingClientRect().top);
        expect(hitsBottom).toBeGreaterThan(cardTop);
      }
      const sizes = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      expect(sizes[0]).toBeLessThanOrEqual(sizes[1]);
    });

    test("keyboard: arrows walk the suggestions, Escape closes only them", async ({ page }) => {
      const panel = await openLocal(page, mobile);
      const town = panel.locator('[data-local-search="ort"] input');
      await town.fill("Höchberg");
      const hits = panel.locator('[data-local-search="ort"] .sc-local-results');
      await expect(hits.getByRole("link")).toHaveCount(2);
      await town.press("ArrowDown");
      await expect(hits.getByRole("link").first()).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(hits).toBeHidden();
      await expect(town).toBeFocused();
      await expect(page.locator('.sc-global-nav [data-section="local"]')).toHaveAttribute("open", "");
    });

    test("Enter opens the first place, even before the suggestions arrive", async ({ page }) => {
      const panel = await openLocal(page, mobile);
      // Slow the lookup so Enter lands first.
      await page.route("**/api/suche/orte**", async r => { await new Promise(res => setTimeout(res, 800)); await r.fulfill({ json: STUB }); });
      const town = panel.locator('[data-local-search="ort"] input');
      await town.fill("Höchberg");
      // A slow answer shows that the search is running, not an empty field.
      await expect(panel.getByText("Suche läuft")).toBeVisible();
      const nav = page.waitForURL("**/solar-atlas/bayern/landkreis-wuerzburg/hoechberg", { waitUntil: "commit" });
      await town.press("Enter");
      await nav;
    });
  });
}
