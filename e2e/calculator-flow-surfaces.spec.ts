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
