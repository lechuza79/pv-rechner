import { test, expect } from "@playwright/test";

// End-to-end smoke for the heat pump calculator flow.
// Five steps: Situation, Wohnfläche, Dämmstandard, Haushalt, Heizsystem (+ WP-Typ).
// We just want to confirm a complete walkthrough leads to a TCO comparison.

test("Wärmepumpe flow lands on a result with TCO and amortization", async ({ page }) => {
  await page.goto("/waermepumpe-rechner");

  // Step 0: Situation — Bestandsgebäude (Sanierungsfall, BEG-relevant)
  await page.getByText("Bestandsgebäude", { exact: false }).click();
  await page.getByRole("button", { name: /weiter/i }).click();

  // Step 1: Wohnfläche — 140 m² (typical EFH)
  await page.getByText("140 m²", { exact: false }).first().click();
  await page.getByRole("button", { name: /weiter/i }).click();

  // Step 2: Dämmstandard — Teilsaniert
  await page.getByText("Teilsaniert", { exact: false }).first().click();
  await page.getByRole("button", { name: /weiter/i }).click();

  // Step 3: Haushalt — 3-4 persons
  await page.getByText("3–4", { exact: false }).first().click();
  await page.getByRole("button", { name: /weiter/i }).click();

  // Step 4: Heizsystem — Fußbodenheizung + Luft/Wasser-WP (defaults are picked)
  await page.getByText("Fußbodenheizung", { exact: false }).first().click();
  await page.getByText("Luft/Wasser", { exact: false }).first().click();
  await page.getByRole("button", { name: /berechnen|ergebnis|fertig/i }).click();

  // Result: heat-load, JAZ, TCO comparison, amortization
  await expect(page.getByText(/Amortisation|Ersparnis|TCO/i).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Wärmepumpe|Gas/i).first()).toBeVisible();

  const bodyText = await page.locator("body").innerText();
  // Should contain a € figure (savings or TCO) and at least one year reference
  expect(bodyText).toMatch(/\d.*€/);
  expect(bodyText).toMatch(/\d.*(Jahre|Jahr)/);
});
