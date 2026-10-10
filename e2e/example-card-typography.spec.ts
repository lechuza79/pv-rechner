import { test, expect } from "@playwright/test";
import { tokens } from "../lib/theme";
import { NATIONAL_AVG_YIELD } from "../lib/constants";

// Regression: extracting ExampleCard from the municipality stylesheet made
// captions inherit the 36px amount because that document has no site tokens.
// Both real hosts matter: a themed article alone cannot expose this failure.
for (const path of [
  "/solar-atlas/niedersachsen/landkreis-gifhorn/meinersen",
  "/einspeiseverguetung-tabelle",
]) {
  for (const width of [375, 1440]) {
    test(`example typography: ${path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      // Exercise the real calculator/card with a deterministic test yield.
      // This spec checks typography, not availability of the weather service.
      await page.route("**/api/pvgis?**", route => route.fulfill({
        json: { annual: NATIONAL_AVG_YIELD, monthly: null },
      }));
      await page.goto(`${path}#atlas-buerger`, { waitUntil: "domcontentloaded" });
      if (path.startsWith("/solar-atlas/")) {
        const heading = page.locator("#atlas-stories .atlas-insights-head h2");
        await expect(heading).toHaveCSS("font-size", "20px");
      }
      const cards = page.locator(".gemeinde-buerger-card");
      await expect(cards.first()).toBeAttached();
      const captions = cards.locator(".v3-result-amount > small");
      // Municipal amounts arrive after the location-yield request completes.
      await expect(captions).toHaveCount(3, { timeout: 30_000 });
      for (const caption of await captions.all()) {
        await expect(caption).toHaveCSS("font-size", path.startsWith("/solar-atlas/")
          ? tokens["--font-size-small"] : tokens["--font-size-editorial-note"]);
        const fits = await caption.evaluate(el => el.scrollWidth <= el.clientWidth + 1);
        expect(fits, "The period must fit its amount badge").toBe(true);
      }
      for (const title of await cards.locator(":scope > h3").all()) {
        await expect(title).toHaveCSS("font-size", tokens["--font-size-h3"]);
      }
    });
  }
}
