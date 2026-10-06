import { expect, type Locator, type Page } from '@playwright/test';

export async function assertNoDocumentOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), { timeout: 3000 }).toBeLessThanOrEqual(1);
}

/** Check painted text, including numbers, against its own card rather than the viewport. */
export async function assertTextInsideCard(card: Locator) {
  await expect(card).toBeVisible();
  const outside = await card.evaluate(root => {
    const bounds = root.getBoundingClientRect();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const failures: string[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent?.trim()) continue;
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style,[inert],[aria-hidden="true"]')) continue;
      const style = getComputedStyle(parent);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (!rect.width || !rect.height) continue;
        if (rect.left < bounds.left - 2 || rect.right > bounds.right + 2 || rect.top < bounds.top - 2 || rect.bottom > bounds.bottom + 2) {
          failures.push(`${node.textContent.trim().slice(0, 80)} [${Math.round(rect.left)},${Math.round(rect.right)}] outside [${Math.round(bounds.left)},${Math.round(bounds.right)}]`);
          break;
        }
      }
    }
    return failures;
  });
  expect(outside, 'Painted text must fit its own card').toEqual([]);
}

export async function assertPageFooterMatchesShell(page: Page, footer = page.locator('.sc-page-flow-actions')) {
  await expect(footer).toBeVisible();
  const anchor = page.locator('.wp-flow-footer-space').first();
  const shell = await anchor.evaluate(element => {
    let boundary = element.closest('.sc-calculator-content');
    for (let parent = boundary?.parentElement?.closest('.sc-calculator-content'); parent; parent = parent.parentElement?.closest('.sc-calculator-content')) boundary = parent;
    if (!boundary) throw new Error('Page flow must have a calculator shell');
    const rect = boundary.getBoundingClientRect();
    return { x: rect.x, width: rect.width };
  });
  await expect.poll(async () => {
    const rect = await footer.boundingBox();
    return rect ? Math.max(Math.abs(rect.x - shell.x), Math.abs(rect.width - shell.width)) : Infinity;
  }).toBeLessThanOrEqual(2);
  const rect = (await footer.boundingBox())!;
  expect(rect.x).toBeGreaterThanOrEqual(-1);
  expect(rect.x + rect.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
}

/** Available shell space, rather than viewport alone, controls the offer rail. */
export async function assertResultGeometry(page: Page) {
  const state = page.locator('[data-calculator-state="result"]:visible').first();
  await expect(state).toBeVisible({ timeout: 60_000 });
  const offers = page.locator('.sc-calculator-content[data-calculator-offers="true"]:visible').last();
  const overview = page.locator('.wp-overview:visible').first();
  if (await overview.count()) {
    const shellWidth = await (await offers.count() ? offers : state).evaluate(el => el.getBoundingClientRect().width);
    const hero = (await overview.boundingBox())!;
    expect(hero.width).toBeLessThanOrEqual(821);
    if (shellWidth >= 820) expect(hero.width).toBeGreaterThanOrEqual(819);
    if (await offers.count()) {
      const rail = page.locator('#wp-geraete,#bkw-angebote').filter({ visible: true }).first();
      await expect(rail).toBeVisible();
      const product = (await rail.boundingBox())!;
      if (shellWidth >= 1187) {
        expect(shellWidth).toBeLessThanOrEqual(1277);
        const expansion = Math.min(1, Math.max(0, (shellWidth - 1188) / 88));
        expect(hero.width).toBeCloseTo(820, 0);
        expect(product.width).toBeCloseTo(320 + 40 * expansion, 0);
        expect(product.x - (hero.x + hero.width)).toBeCloseTo(48 + 48 * expansion, 0);
      } else {
        expect(product.y).toBeGreaterThanOrEqual(hero.y + hero.height - 2);
        expect(product.x).toBeGreaterThanOrEqual(hero.x - 2);
        expect(product.x + product.width).toBeLessThanOrEqual(hero.x + hero.width + 2);
      }
    }
  } else {
    const rect = (await state.boundingBox())!;
    expect(rect.width).toBeLessThanOrEqual(821);
    if (page.viewportSize()!.width >= 1440) expect(rect.width).toBeGreaterThanOrEqual(819);
  }
  await assertVisibleCalculatorNotices(page);
  await assertNoDocumentOverflow(page);
  // The user accepted the transient initial chart-label clipping for this release.
  // Check the settled result without weakening shell, hero or text bounds.
  for (const slider of await page.getByRole('slider', { name: 'Tag wählen', exact: true }).filter({ visible: true }).all()) {
    await slider.press('End');
  }
  // Check text last so chart rendering cannot hide the rail geometry.
  for (const card of [overview, overview.locator('.wp-result-hero').first()]) {
    if (await card.count()) await assertTextInsideCard(card);
  }
}

/** Visible calculator notices follow the complete shell, including its offer rail. */
export async function assertVisibleCalculatorNotices(page: Page) {
  const state = page.locator('[data-calculator-state="result"]:visible').first();
  const boundary = await state.evaluate(element => {
    let shell = element.closest('.sc-calculator-content');
    for (let parent = shell?.parentElement?.closest('.sc-calculator-content'); parent; parent = parent.parentElement?.closest('.sc-calculator-content')) shell = parent;
    if (!shell) throw new Error('Result notice requires a visible calculator shell');
    const rect = shell.getBoundingClientRect();
    const width = Math.min(820, rect.width);
    return { x: rect.x + (rect.width - width) / 2, width };
  });
  for (const notice of await page.getByRole('status').filter({ has: page.getByRole('group', { name: 'Standort prüfen', exact: true }) }).filter({ visible: true }).all()) {
    await expect.poll(async () => {
      const rect = await notice.boundingBox();
      return rect ? Math.max(Math.abs(rect.x - boundary.x), Math.abs(rect.width - boundary.width)) : Infinity;
    }).toBeLessThanOrEqual(2);
  }
}
