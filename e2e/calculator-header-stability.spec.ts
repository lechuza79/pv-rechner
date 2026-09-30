import { test, expect } from '@playwright/test';

for (const width of [375, 1280]) {
  test(`calculator header reserves its hydrated height at ${width}px`, async ({ browser, baseURL }) => {
    const staticContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 850 } });
    const hydratedContext = await browser.newContext({ viewport: { width, height: 850 } });
    try {
      const staticPage = await staticContext.newPage();
      const hydratedPage = await hydratedContext.newPage();
      for (const route of ['/klimaanlage-stromkosten', '/photovoltaik-rechner']) {
        await staticPage.goto(`${baseURL}${route}`);
        const before = await staticPage.locator('main#inhalt').boundingBox();
        await hydratedPage.goto(`${baseURL}${route}`);
        await expect(hydratedPage.locator('.sc-react-header')).toHaveClass(/sc-global-header/);
        const after = await hydratedPage.locator('main#inhalt').boundingBox();
        expect(Math.abs(after!.y - before!.y)).toBeLessThan(1);
      }
    } finally {
      await staticContext.close();
      await hydratedContext.close();
    }
  });
}
