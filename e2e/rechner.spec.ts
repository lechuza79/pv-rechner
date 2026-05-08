import { test, expect } from "@playwright/test";

// End-to-end smoke for the PV calculator flow.
// Goal: prove the user can go from "I want to calculate" to "I see a result with
// a plausible payback figure" without anything breaking. We don't assert exact
// numbers — those are pinned by the unit tests on lib/calc.ts. Here we only
// check the flow plumbing (button clicks, state passing, result rendering).

test.describe("Rechner flow", () => {
  test("clicks through 4 steps and lands on a result with payback info", async ({ page }) => {
    await page.goto("/rechner");

    // Step 0: Anlagengröße — pick the standard 10 kWp option
    await expect(page.getByRole("heading", { name: /Lohnt sich Photovoltaik/i })).toBeVisible();
    await page.getByText("10 kWp", { exact: false }).first().click();
    await page.getByRole("button", { name: /weiter/i }).click();

    // Step 1: Speicher — pick 10 kWh
    await page.getByText("10 kWh", { exact: false }).first().click();
    await page.getByRole("button", { name: /weiter/i }).click();

    // Step 2: Haushalt — pick 3-4 persons + a usage profile
    await page.getByText("3–4", { exact: false }).first().click();
    // Pick "Teils zuhause" as usage pattern
    await page.getByText("Teils zuhause", { exact: false }).first().click();
    await page.getByRole("button", { name: /weiter/i }).click();

    // Step 3: Großverbraucher — leave defaults (no WP, no EA)
    await page.getByRole("button", { name: /berechnen|ergebnis|fertig/i }).click();

    // Result page: amortization figure + 25-year return must be visible
    await expect(page.getByText(/Amortisation/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Rendite|Ersparnis/i).first()).toBeVisible();

    // The result should contain at least one € or year figure
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toMatch(/\d.*(€|Jahre|Jahr)/);
  });

  test("share URL with params loads straight to the result page", async ({ page }) => {
    // Standard config: 10 kWp, 10 kWh storage, 3-4 persons, teils zuhause, no WP/EA.
    // Param shape from lib/calc.ts:paramInt → 'a' (anlage idx 2 = 10 kWp), 's' (speicher idx 2 = 10 kWh),
    // 'p' (personen idx 2), 'n' (nutzung idx 1).
    await page.goto("/rechner?a=2&s=2&p=2&n=1&wp=nein&ea=nein");

    // Should skip the steps entirely and show the result directly
    await expect(page.getByText(/Amortisation/i).first()).toBeVisible({ timeout: 10_000 });

    // No "Weiter" button should be present (we're past the flow, on the result)
    const weiterBtn = page.getByRole("button", { name: /^weiter$/i });
    await expect(weiterBtn).toHaveCount(0);
  });
});
