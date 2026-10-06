import { test, expect } from '@playwright/test';

for (const route of ['balkonkraftwerk/rechner', 'photovoltaik-rechner', 'photovoltaik-rechner?direkt=1', 'waermepumpe-rechner', 'klimaanlage-stromkosten']) {
  for (const width of [375, 1280]) {
    test(`${route}: flow surfaces at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/${route}`, { waitUntil: "domcontentloaded" });
      const footer = page.locator('.wp-flow-footer');
      await expect(footer).toBeVisible();
      await expect(footer.locator('[data-flow-nav]')).toHaveAttribute('data-flow-bereit', '1');
      const colors = await footer.evaluate(el => ({
        gradient: getComputedStyle(el).backgroundImage,
        page: getComputedStyle(document.body).backgroundColor,
      }));
      expect(colors.gradient).toContain(colors.page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (route === 'balkonkraftwerk/rechner') {
        await page.locator('[data-flow-group=personen]').filter({ hasText: /^1 Person$/ }).click();
        const option = page.locator('[data-flow-group=anwesenheit]').filter({ hasText: 'Tagsüber selten' });
        await expect(option).toBeVisible();
        const grid = page.locator('.wp-question.is-open .wp-text-options');
        const columns = await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
        expect(columns).toBe(width < 600 ? 1 : 2);
        const colors = await grid.evaluate(el => {
          const question = el.closest('.wp-question')!;
          const label = question.querySelector('.wp-question-content > div')!;
          return { text: getComputedStyle(label).color, background: getComputedStyle(question).backgroundColor };
        });
        const luminance = (color: string) => {
          const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => {
            const c = v / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        };
        expect((luminance(colors.text) + 0.05) / (luminance(colors.background) + 0.05)).toBeGreaterThanOrEqual(4.5);

      }
    });
  }
}

// One representative path per registered calculator, rather than a Cartesian flow sweep.
import { FLOWS, uebrigeFragenBeantworten, weiterKlicken } from './flows';
import type { Page } from '@playwright/test';

async function answerCurrentStep(page: Page) {
  await expect(async () => {
    await uebrigeFragenBeantworten(page);
    await expect(page.locator('[data-flow-next]:not([inert] *):visible').first()).not.toHaveAttribute('aria-disabled', 'true', { timeout: 1000 });
  }).toPass({ timeout: 20000 });
}
import { assertNoDocumentOverflow, assertPageFooterMatchesShell, assertResultGeometry, assertTextInsideCard } from './calculator-geometry';

for (const flow of FLOWS.filter(flow => !flow.startKnopf)) {
  test(`${flow.name}: input steps and result obey container geometry`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(flow.pfad, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator("[data-flow-nav]:not([inert] *):visible").first()).toBeVisible({ timeout: 60_000 });
    let measuredSteps = 0;
    for (let step = 0; step < 12; step++) {
      const navigation = page.locator('[data-flow-nav]:not([inert] *):visible').first();
      if (!(await navigation.count())) break;
      await expect(navigation).toHaveAttribute('data-flow-bereit', '1', { timeout: 60_000 });
      const state = page.locator('[data-calculator-state="input"]:visible').first();
      await expect(state).toBeVisible();
      expect((await state.boundingBox())!.width).toBeCloseTo(760, 0);
      if (await page.locator('.wp-flow-footer-space').count()) {
        await assertPageFooterMatchesShell(page);
        const controls = (await navigation.boundingBox())!;
        expect(controls.width).toBeCloseTo(640, 0);
        expect(controls.x + controls.width / 2).toBeCloseTo(720, 0);
      }
      await assertNoDocumentOverflow(page);
      measuredSteps++;
      await answerCurrentStep(page);
      // Capture the last input screen while the result button is present.
      if (flow.name === 'Wärmepumpen-Rechner' && /Ergebnis|Berechnen/i.test(await navigation.innerText())) {
        for (const width of [375, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          await assertPageFooterMatchesShell(page);
          await page.screenshot({ path: testInfo.outputPath(`heat-pump-final-input-${width}.png`), animations: 'disabled' });
        }
      }
      await weiterKlicken(page);
      await expect.poll(() => page.locator("[data-flow-nav]:not([inert] *):visible,[data-calculator-state=\"result\"]:visible").count()).toBeGreaterThan(0);
    }
    expect(measuredSteps, 'Measure every real input step; balcony has two steps').toBeGreaterThanOrEqual(flow.name === 'Balkonkraftwerk-Rechner' ? 2 : 3);
    await expect(page.getByText(flow.ergebnisEnthaelt, { exact: false }).filter({ visible: true }).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.sc-page-flow-actions')).toHaveCount(0);
    const geometryFailures: string[] = [];
    for (const width of [375, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      try { await assertResultGeometry(page); }
      catch (error) { geometryFailures.push(`${width}px: ${(error as Error).message}`); }
      await page.screenshot({ path: testInfo.outputPath(`result-${width}.png`), animations: 'disabled' });
    }
    expect(geometryFailures, 'All four widths are measured; every clipping failure remains a failure').toEqual([]);
  });
}

for (const width of [375, 1440]) {
  test(`funding dialog keeps first, middle and final actions inside at ${width}`, async ({ page }) => {
    test.setTimeout(120_000);
    const flow = FLOWS.find(flow => flow.startKnopf)!;
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(flow.pfad, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const dialog = page.getByRole('dialog');
    await expect(async () => {
      if (!(await dialog.isVisible())) await page.getByRole('button', { name: flow.startKnopf!, exact: true }).first().click({ timeout: 2000 });
      await expect(dialog).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 20000 });
    await expect(dialog.locator("[data-flow-nav]:not([inert] *):visible").first()).toBeVisible({ timeout: 60_000 });
    let steps = 0;
    for (let step = 0; step < 12; step++) {
      const navigation = dialog.locator('[data-flow-nav]:visible');
      if (!(await navigation.count())) break;
      const bounds = (await dialog.boundingBox())!;
      const controls = (await navigation.boundingBox())!;
      expect(controls.x).toBeGreaterThanOrEqual(bounds.x - 1);
      expect(controls.x + controls.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
      expect(controls.y + controls.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1);
      expect(await navigation.evaluate(el => !!el.closest('[role="dialog"]'))).toBe(true);
      await assertTextInsideCard(navigation);
      steps++;
      await answerCurrentStep(page);
      await weiterKlicken(page);
      await expect.poll(async () => (await dialog.locator("[data-flow-nav]:visible").count()) + (await dialog.getByText(flow.ergebnisEnthaelt, { exact: false }).filter({ visible: true }).count())).toBeGreaterThan(0);
    }
    expect(steps).toBeGreaterThanOrEqual(3);
    await expect(dialog).toContainText(flow.ergebnisEnthaelt);
    await assertNoDocumentOverflow(page);
  });
}

test('footer geometry counterprobe rejects a footer confined to the old narrow column', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/waermepumpe-rechner', { timeout: 60_000 });
  await assertPageFooterMatchesShell(page);
  const sabotage = await page.addStyleTag({ content: '.sc-page-flow-actions{width:452px!important}' });
  await expect(assertPageFooterMatchesShell(page)).rejects.toThrow();
  await sabotage.evaluate(el => el.parentNode?.removeChild(el));
  await assertPageFooterMatchesShell(page);
});

for (const calculator of [
  { name: 'PV', path: '/photovoltaik-foerderung/hessen/frankfurt#pv-rechner', title: 'Photovoltaik-Rechner' },
  { name: 'heat pump', path: '/ratgeber/waermepumpe-foerderung#wp-rechner', title: 'Wärmepumpen-Rechner' },
]) {
  test(`${calculator.name}: actual embedded calculator keeps input, result and actions inside dialog`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(calculator.path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const dialog = page.getByRole('dialog', { name: calculator.title, exact: true });
    await expect(dialog).toBeVisible({ timeout: 60_000 });
    const input = dialog.locator('[data-calculator-state="input"]:visible').first();
    await expect(input).toBeVisible({ timeout: 60_000 });
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const boundary = (await dialog.boundingBox())!;
      const column = (await input.boundingBox())!;
      expect(column.width).toBeLessThanOrEqual(761);
      expect(column.x).toBeGreaterThanOrEqual(boundary.x - 1);
      expect(column.x + column.width).toBeLessThanOrEqual(boundary.x + boundary.width + 1);
      await expect(page.locator('.sc-page-flow-actions')).toHaveCount(0);
      await assertNoDocumentOverflow(page);
    }
    await expect(dialog.locator("[data-flow-nav]:not([inert] *):visible").first()).toBeVisible({ timeout: 60_000 });
    let steps = 0;
    for (let step = 0; step < 12; step++) {
      const navigation = dialog.locator('[data-flow-nav]:not([inert] *):visible').first();
      if (!(await navigation.count())) break;
      await expect(navigation).toHaveAttribute('data-flow-bereit', '1');
      const boundary = (await dialog.boundingBox())!;
      const controls = (await navigation.boundingBox())!;
      expect(controls.x).toBeGreaterThanOrEqual(boundary.x - 1);
      expect(controls.x + controls.width).toBeLessThanOrEqual(boundary.x + boundary.width + 1);
      expect(controls.y + controls.height).toBeLessThanOrEqual(boundary.y + boundary.height + 1);
      expect(await navigation.evaluate(el => !!el.closest('[role="dialog"]'))).toBe(true);
      await expect(page.locator('.sc-page-flow-actions')).toHaveCount(0);
      steps++;
      await answerCurrentStep(page);
      await weiterKlicken(page);
      await expect.poll(() => dialog.locator("[data-flow-nav]:not([inert] *):visible,[data-calculator-state=\"result\"]:visible").count()).toBeGreaterThan(0);
    }
    expect(steps).toBeGreaterThanOrEqual(3);
    await expect(dialog.locator('[data-calculator-state="result"]')).toBeVisible({ timeout: 60_000 });
    const resultFailures: string[] = [];
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      try { await assertResultGeometry(page); }
      catch (error) { resultFailures.push(`${width}px: ${(error as Error).message}`); }
      const boundary = (await dialog.boundingBox())!;
      const overview = (await dialog.locator('.wp-overview').boundingBox())!;
      expect(overview.x).toBeGreaterThanOrEqual(boundary.x - 1);
      expect(overview.x + overview.width).toBeLessThanOrEqual(boundary.x + boundary.width + 1);
      // A wide viewport cannot turn a 560/860px dialog into the desktop offer shell.
      const offers = dialog.locator('#wp-geraete:visible');
      if (await offers.count()) {
        expect((await offers.boundingBox())!.y).toBeGreaterThanOrEqual(overview.y + overview.height - 2);
      }
      await expect(page.locator('.sc-page-flow-actions')).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath(`${calculator.name}-dialog-result-${width}.png`), animations: 'disabled' });
    }
    expect(resultFailures, 'Every dialog width is checked; clipping remains a failure').toEqual([]);
  });
}
