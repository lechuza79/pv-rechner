import { test, expect } from "@playwright/test";

// End-to-end smoke for the PV calculator flow.
// Goal: prove the user can go from "I want to calculate" to "I see a result with
// a plausible payback figure" without anything breaking. We don't assert exact
// numbers — those are pinned by the unit tests on lib/calc.ts. Here we only
// check the flow plumbing (button clicks, state passing, result rendering).

test.describe("Rechner flow", () => {
  test("clicks through 5 steps and lands on a result with payback info", async ({ page }) => {
    await page.goto("/photovoltaik-rechner");

    // Step 0: Anlagengröße — pick the standard 10 kWp option
    await expect(page.getByRole("heading", { name: /Lohnt sich Photovoltaik/i })).toBeVisible();
    await page.getByText("10 kWp", { exact: false }).first().click();
    await page.getByRole("button", { name: /weiter/i }).click();

    // Step 1: Dach — roof shape, then orientation (it only appears after the shape)
    await page.getByText("Satteldach", { exact: false }).first().click();
    await page.getByText("Ost / West", { exact: false }).first().click();
    await page.getByRole("button", { name: /weiter/i }).click();

    // Step 2: Speicher — pick 10 kWh
    await page.getByText("10 kWh", { exact: false }).first().click();
    await page.getByRole("button", { name: /weiter/i }).click();

    // Step 3: Haushalt — pick 3-4 persons + a usage profile
    await page.getByText("3–4", { exact: false }).first().click();
    // Pick "Teils zuhause" as usage pattern
    await page.getByText("Teils zuhause", { exact: false }).first().click();
    await page.getByRole("button", { name: /weiter/i }).click();

    // Step 4: Großverbraucher — leave defaults (no WP, no EA)
    await page.getByRole("button", { name: /berechnen|ergebnis|fertig/i }).click();

    // Result page: amortization figure + 25-year return must be visible
    await expect(page.getByText(/Amortisation/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Rendite|Ersparnis/i).first()).toBeVisible();

    // The result should contain at least one € or year figure
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toMatch(/\d.*(€|Jahre|Jahr)/);
  });

  // Der Abschnitt „Einspeisung und Vergütung" trägt seinen Zustand in der
  // Kopfzeile — zugeklappt ist das die einzige Stelle, an der ein Nutzer sieht,
  // mit welchem Satz gerechnet wird. Genau das wird hier geprüft, samt der
  // Rückfallebene „Eigener Satz" für Bestandsanlagen.
  test("Vergütungs-Abschnitt zeigt seinen Zustand und nimmt einen eigenen Satz an", async ({ page }) => {
    await page.goto("/photovoltaik-rechner?a=2&s=2&p=2&n=1&wp=nein&ea=nein");

    const kopf = page.getByRole("button", { name: /Einspeisung und Vergütung/ }).first();
    await expect(kopf).toBeVisible({ timeout: 10_000 });
    // Zugeklappt: Modus, Satz und Laufzeit stehen in der Kopfzeile.
    await expect(kopf).toContainText("Teileinspeisung");
    await expect(kopf).toContainText("ct");
    await expect(kopf).toHaveAttribute("aria-expanded", "false");

    await kopf.click();
    await expect(kopf).toHaveAttribute("aria-expanded", "true");

    // Dritter Reiter: eigener Satz statt des amtlichen Werts.
    await page.getByRole("button", { name: /Eigener Satz/ }).first().click();
    // InlineEdit: der Wert ist ein role="button" mit Aria-Label „… bearbeiten",
    // der Klick tauscht ihn gegen ein fokussiertes Eingabefeld (ohne type-Attribut).
    await page.getByRole("button", { name: /ct bearbeiten/ }).first().click();
    const input = page.locator("input:focus");
    await input.fill("12,3");
    await input.press("Enter");

    await expect(kopf).toContainText("eigener Satz 12,30 ct");
  });

  test("share URL with params loads straight to the result page", async ({ page }) => {
    // Standard config: 10 kWp, 10 kWh storage, 3-4 persons, teils zuhause, no WP/EA.
    // Param shape from lib/calc.ts:paramInt → 'a' (anlage idx 2 = 10 kWp), 's' (speicher idx 2 = 10 kWh),
    // 'p' (personen idx 2), 'n' (nutzung idx 1).
    await page.goto("/photovoltaik-rechner?a=2&s=2&p=2&n=1&wp=nein&ea=nein");

    // Should skip the steps entirely and show the result directly
    await expect(page.getByText(/Amortisation/i).first()).toBeVisible({ timeout: 10_000 });

    // No "Weiter" button should be present (we're past the flow, on the result)
    const weiterBtn = page.getByRole("button", { name: /^weiter$/i });
    await expect(weiterBtn).toHaveCount(0);
  });

  // The orientation must actually move the number the user reads. A unit test
  // proves the formula; only the browser proves the formula reaches the page.
  // Without the roof factor an east/west roof was shown as a due-south one.
  test("orientation changes the yield shown on the result", async ({ page }) => {
    const ertrag = async () => {
      const body = await page.locator("body").innerText();
      const m = body.match(/([\d.]+)\s*kWh\/kWp/);
      return m ? parseInt(m[1].replace(/\./g, "")) : null;
    };

    // Same configuration twice, once due south, once east/west (da=0 = Satteldach).
    await page.goto("/photovoltaik-rechner?a=2&s=2&p=2&n=1&wp=nein&ea=nein&er=1000&da=0&az=sued");
    await expect(page.getByText(/Amortisation/i).first()).toBeVisible({ timeout: 10_000 });
    const sued = await ertrag();

    await page.goto("/photovoltaik-rechner?a=2&s=2&p=2&n=1&wp=nein&ea=nein&er=1000&da=0&az=ostwest");
    await expect(page.getByText(/Amortisation/i).first()).toBeVisible({ timeout: 10_000 });
    const ostwest = await ertrag();

    expect(sued).toBe(1000);
    expect(ostwest).toBe(800);
  });
});
