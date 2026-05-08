import { test, expect } from "@playwright/test";

// Recommendation flow smoke test.
// Three steps: Haus + Dach → Haushalt → Großverbraucher → Empfehlung-Zwischenseite.
// Confirms the algorithm runs end-to-end without state-passing breakage.

test("Empfehlung flow ends on a recommendation with kWp + storage suggestion", async ({ page }) => {
  await page.goto("/empfehlung");

  // Step 0: Haus + Dach — pick Einfamilienhaus + Satteldach
  await page.getByText("Einfamilienhaus", { exact: false }).first().click();
  await page.getByText("Satteldach", { exact: false }).first().click();
  await page.getByRole("button", { name: /weiter/i }).click();

  // Step 1: Haushalt — 3-4 persons + teils zuhause
  await page.getByText("3–4", { exact: false }).first().click();
  await page.getByText("Teils zuhause", { exact: false }).first().click();
  await page.getByRole("button", { name: /weiter/i }).click();

  // Step 2: Großverbraucher — keep WP/EA at default (nein), proceed
  await page.getByRole("button", { name: /empfehlung|berechnen|fertig/i }).click();

  // Recommendation page: must show kWp suggestion + reasoning
  await expect(page.getByText(/kWp/i).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Empfehlung|Anlage|Speicher/i).first()).toBeVisible();

  const bodyText = await page.locator("body").innerText();
  // Must contain a kWp recommendation
  expect(bodyText).toMatch(/\d+(\.\d+)?\s*kWp/);
});
