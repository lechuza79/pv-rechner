import { test, expect } from '@playwright/test';

for (const width of [375, 624, 1280, 1440]) {
  test(`calculator actions share one button style at ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/waermepumpe-rechner?fl=180&da=0&hz=hk_alt&ah=oel_kohle');
    const result = page.getByRole('region', { name: 'Ergebnisaktionen' });
    const product = page.locator('.wp-product-actions').first();
    await expect(product.locator('[data-action-button]')).toHaveCount(3, {timeout:60000});
    await expect(result.locator('[data-action-button]')).toHaveCount(5);
    const positions = await product.locator('[data-action-button]').evaluateAll(elements => elements.map(el => {
      const r = el.getBoundingClientRect();
      return { top: r.top, right: r.right };
    }));
    for (const position of positions) expect(position.top).toBeCloseTo(positions[0].top, 0);
    const row = (await product.boundingBox())!;
    expect(positions.at(-1)!.right).toBeLessThanOrEqual(row.x + row.width + 1);
    await expect(product.getByRole('button', { name: 'An deinen Heizungsbauer weiterleiten' })).toBeVisible();

    const metrics = async (selector: string) => page.locator(selector).evaluateAll(elements => elements.map(el => {
      const s = getComputedStyle(el);
      return { height: el.getBoundingClientRect().height, font: s.font, radius: s.borderRadius, border: s.borderWidth };
    }));
    const all = await metrics('.wp-result-actionbar [data-action-button],.wp-product-actions [data-action-button]');
    expect(all.length).toBeGreaterThanOrEqual(8);
    for (const actual of all) {
      expect(actual.height).toBeCloseTo(44,0);
      expect(actual.font).toBe(all[0].font);
      expect(actual.radius).toBe(all[0].radius);
      expect(actual.border).toBe('1px');
    }
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    const inline = (await result.boundingBox())!;
    expect(inline.width).toBeLessThanOrEqual(640);
    const save = result.locator('[data-variant="primary"]');
    expect(await save.evaluate(el=>getComputedStyle(el).paddingLeft)).toBe('24px');
    expect(await save.evaluate(el=>getComputedStyle(el).paddingRight)).toBe('24px');
    expect(await save.evaluate(el=>getComputedStyle(el).boxShadow)).not.toBe('none');
    await result.screenshot({path:testInfo.outputPath(`result-actions-${width}.png`)});
    await result.evaluate(el=>window.scrollTo({top:window.scrollY+el.getBoundingClientRect().top+80,behavior:'instant'}));
    await expect(result).toHaveClass(/is-stuck/);
    const stuck = (await result.boundingBox())!;
    expect(stuck.width).toBeCloseTo(inline.width,0);
    expect(stuck.height).toBeCloseTo(inline.height,0);
    await result.screenshot({path:testInfo.outputPath(`sticky-actions-${width}.png`)});
    await product.screenshot({path:testInfo.outputPath(`product-actions-${width}.png`)});
    await page.goto('/waermepumpe-rechner');
    const nav = page.locator('[data-flow-nav]');
    await expect(nav).toHaveAttribute('data-flow-bereit','1');
    const next = nav.locator('[data-flow-next]');
    await expect(next).toHaveAttribute('data-action-button','true');
    expect((await next.boundingBox())!.height).toBeCloseTo(44,0);
    expect(await next.evaluate(el=>getComputedStyle(el).font)).toBe(all[0].font);
    // aria-disabled intentionally retains the explanation-on-click handler.
    await next.click({force:true});
    await expect(nav.getByRole('tooltip')).toBeVisible();
  });
}
