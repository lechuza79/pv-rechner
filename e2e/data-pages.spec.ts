import { test, expect } from "@playwright/test";

// Smoke for the two pages that fetch external data:
// /simulation pulls weather data from Open-Meteo, /energie pulls Energy-Charts data.
// We don't assert the data contents (those depend on live APIs), only that:
//   - the page renders its frame and controls without crashing
//   - either real data shows up, or a graceful loading/error state appears
//
// This catches the high-impact failure mode: a refactor breaks the page so badly
// it shows a blank screen or runtime error.

test.describe("Data-driven pages", () => {
  test("Live simulation page renders and accepts a PLZ submit", async ({ page }) => {
    await page.goto("/simulation");

    // Page frame should be there
    await expect(page.getByRole("heading", { name: /Live|Simulation|Solar/i }).first()).toBeVisible();

    // PLZ input should exist
    const plzInput = page.getByPlaceholder(/PLZ|Postleitzahl/i).first();
    await expect(plzInput).toBeVisible();

    // Type a known PLZ and submit
    await plzInput.fill("10115"); // Berlin Mitte
    // Find the submit button next to the input — usually labeled "Anzeigen", "Laden", or arrow icon
    const submitBtn = page.getByRole("button", { name: /anzeigen|laden|los|simulation/i }).first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    } else {
      await plzInput.press("Enter");
    }

    // Either weather data shows up (sun/cloud/temp) or an error/loading state.
    // Don't fail on either — the API may be rate-limited in CI.
    // Just confirm the page hasn't crashed: the heading is still there.
    await page.waitForTimeout(2000);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("Energy dashboard page renders header and time-range controls", async ({ page }) => {
    await page.goto("/energie");

    // Page must render without runtime errors
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });

    // Time-range buttons should be present (at least one of "24h", "7d", "30d", "12M")
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toMatch(/24h|7\s*Tage|30\s*Tage|12\s*Monate/i);

    // Should mention strommix-related vocabulary
    expect(bodyText).toMatch(/Strom|Erzeug|Erneuerbar|Kohle|Solar|Wind/i);
  });
});
