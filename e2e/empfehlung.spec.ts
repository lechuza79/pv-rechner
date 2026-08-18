import { test, expect } from "@playwright/test";

// Recommendation flow smoke test.
// Three steps: Haus + Dach → Haushalt → Großverbraucher → Empfehlung-Zwischenseite.
// Confirms the algorithm runs end-to-end without state-passing breakage.

test("Empfehlung flow ends on a recommendation with kWp + storage suggestion", async ({ page }) => {
  await page.goto("/pv-bedarf-berechnen");

  // Step 0: Haus + Dach — Einfamilienhaus, Satteldach, dann die Ausrichtung.
  // Die Ausrichtung erscheint erst NACH der Dachform (progressive Disclosure in
  // components/DachField) — ohne sie rechnet der Flow mit dem Standort-Optimum,
  // also einem perfekten Süddach. Der Test klickt sie deshalb mit: er soll den
  // Weg abbilden, den ein Nutzer geht, nicht den kürzesten durch die Seite.
  await page.getByText("Einfamilienhaus", { exact: false }).first().click();
  await page.getByText("Satteldach", { exact: false }).first().click();
  await page.getByRole("button", { name: "Süd", exact: true }).click();
  await page.getByRole("button", { name: /weiter/i }).click();

  // Step 1: Haushalt — 3-4 persons + teils zuhause
  await page.getByText("3–4", { exact: false }).first().click();
  await page.getByText("Teils zuhause", { exact: false }).first().click();
  await page.getByRole("button", { name: /weiter/i }).click();

  // Step 2: Großverbraucher — keep WP/EA at default (nein), proceed.
  // Exact button name: /berechnen/i also matches other controls on the page,
  // and clicking one of those looks identical to a click that did nothing.
  await page.getByRole("button", { name: /empfehlung anzeigen/i }).click();

  // The recommendation lives at ?view=ergebnis — wait for the state change
  // rather than for text, so a failure says WHICH step broke.
  await page.waitForURL(/view=ergebnis/, { timeout: 10_000 });

  // Recommendation page: must show kWp suggestion + reasoning
  await expect(page.getByText(/kWp/i).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Empfehlung|Anlage|Speicher/i).first()).toBeVisible();

  const bodyText = await page.locator("body").innerText();
  // Must contain a kWp recommendation
  expect(bodyText).toMatch(/\d+(\.\d+)?\s*kWp/);
});
