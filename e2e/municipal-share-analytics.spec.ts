import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

test("publishing counters exclude failed copies and other share entries", async ({ page }) => {
      await page.setContent(`<section id="atlas-publish"><button data-ranking-share><span>Publish</span></button></section>
        <button data-page-share>Share</button><button data-page-copy>Copy</button>`);
      await page.evaluate(() => {
        const w = window as any;
        w.__GEMEINDE__ = { name: "Meinersen", genitiv: "Meinersens", liveUrl: "https://solar-check.io/test" };
        w.solarLiveIcons = { Copy: "copy", Share: "share", Close: "close", External: "external" };
        w.events = [];
        w.failCopy = false;
        Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => {
          if (w.failCopy) throw new Error("denied");
        } } });
        for (const name of ["municipal-message-opened", "municipal-message-copied"])
          window.addEventListener(name, () => w.events.push(name));
      });
      await page.addScriptTag({ content: readFileSync("public/gemeinde/teilen.js", "utf8") });
      const events = () => page.evaluate(() => (window as any).events);
      await page.locator("#atlas-publish span").click();
      expect(await events()).toEqual(["municipal-message-opened"]);
      await page.locator("[data-copy-link]").click();
      expect(await events()).toHaveLength(1);
      await page.evaluate(() => { (window as any).failCopy = true; });
      await page.locator("[data-copy-story]").click();
      expect(await events()).toHaveLength(1);
      await page.evaluate(() => { (window as any).failCopy = false; });
      await page.locator("[data-copy-story]").click();
      expect(await events()).toEqual(["municipal-message-opened", "municipal-message-copied"]);
      await page.locator(".atlas-close").click();
      await page.locator("[data-page-share]").click();
      await page.locator("[data-copy-story]").click();
      expect(await events()).toHaveLength(2);
});
