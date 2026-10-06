import { test, expect } from "@playwright/test";

for (const width of [1280, 375]) {
  test(`embedded video dialog preserves widget geometry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    // This is a layout regression, not an authentication or mail-delivery test.
    await page.route("**/api/video-export/berechtigung", route => route.fulfill({ json: { direct: false } }));
    await page.goto("/solar-atlas/hessen/landkreis-wetteraukreis/nidda#atlas-data");
    const frame = page.frameLocator('iframe[title="Energiedaten für Nidda"]');
    const trigger = frame.getByRole("button", { name: "Optionen für Solarerzeugung im Tagesverlauf in Nidda", exact: true });
    await expect(trigger).toBeVisible({ timeout: 60000 });
    // The ranking above the frame animates on first paint. Capture geometry
    // after those independent animations, so the test measures the dialog.
    await page.locator("#atlas-ranking").evaluate(async element => {
      await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
    });
    await trigger.click();
    const copy = frame.getByRole("menuitem", { name: "Link kopieren", exact: true });
    await expect(copy).toHaveCSS("outline-style", "none");
    const video = frame.getByRole("menuitem", { name: /Video herunterladen/ });
    // Bring the clicked option into view before taking the reference snapshot.
    await video.scrollIntoViewIfNeeded();
    const measure = () => page.evaluate(() => {
      const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="Energiedaten für Nidda"]')!;
      const host = iframe.getBoundingClientRect();
      return {
        scroll: window.scrollY,
        cards: [...iframe.contentDocument!.querySelectorAll('[aria-label="Strom und Wert"] .sc-widget')].map(card => {
          const box = card.getBoundingClientRect();
          return [host.x + box.x, host.y + box.y, box.width, box.height];
        }),
      };
    });
    const settleScroll = () => expect(async () => {
      const previous = await measure();
      // Safari can still be finishing the page's smooth anchor scroll.
      await page.waitForTimeout(150);
      expect(await measure()).toEqual(previous);
    }).toPass({ timeout: 5000 });
    await settleScroll();
    const before = await measure();
    await video.click();
    const dialog = frame.getByRole("dialog", { name: "Video herunterladen", exact: true });
    await expect(dialog).toBeVisible();
    await expect.poll(async () => (await measure()).cards).toEqual(before.cards);
    expect((await measure()).scroll).toBe(before.scroll);
    await expect(dialog.getByRole("textbox", { name: "E-Mail-Adresse" })).toBeVisible({ timeout: 30000 });
    await expect(dialog).toHaveCSS("opacity", "1");
    await expect(dialog.locator("..")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: `/tmp/widget-video-modal-${width}.png` });
    await dialog.getByRole("button", { name: "Schließen", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('iframe[title="Energiedaten für Nidda"]')).toHaveCSS("position", "static");
    await expect.poll(async () => measure()).toEqual(before);
    // Reopening must not accumulate offsets from the previous promotion.
    await trigger.click();
    await video.scrollIntoViewIfNeeded();
    await settleScroll();
    const reopenedFrom = await measure();
    await video.click();
    await expect(dialog).toBeVisible();
    await expect.poll(async () => measure()).toEqual(reopenedFrom);
    await dialog.getByRole("button", { name: "Schließen", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('iframe[title="Energiedaten für Nidda"]')).toHaveCSS("position", "static");
    await expect.poll(async () => measure()).toEqual(reopenedFrom);
  });
}
