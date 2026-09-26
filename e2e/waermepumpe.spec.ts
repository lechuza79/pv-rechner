import { test, expect } from "@playwright/test";
import { uebrigeFragenBeantworten } from "./flows";

// End-to-end smoke for the heat pump calculator flow.
// Five steps: Situation, Wohnfläche, Dämmstandard, Haushalt, Heizsystem (+ WP-Typ).
// We just want to confirm a complete walkthrough leads to a TCO comparison.

test("Wärmepumpe flow lands on a result with TCO and amortization", async ({ page }) => {
  await page.goto("/waermepumpe-rechner");

  // Step 0: Situation — Bestandsgebäude (Sanierungsfall, BEG-relevant)
  await page.getByText("Bestandsgebäude", { exact: false }).click();
  await uebrigeFragenBeantworten(page);
  await page.getByRole("button", { name: /weiter/i }).click();

  // Step 1: Wohnfläche — 140 m² (typical EFH)
  await page.getByRole("button", { name: "Freistehend Vier Außenwände" }).click();
  await page.getByText("140 m²", { exact: false }).first().click();
  await uebrigeFragenBeantworten(page);
  await page.getByRole("button", { name: /weiter/i }).click();

  // Step 2: Dämmstandard — Teilsaniert
  await page.getByText("Teilsaniert", { exact: false }).first().click();
  await uebrigeFragenBeantworten(page);
  await page.getByRole("button", { name: /weiter/i }).click();

  // Step 3: Haushalt — 3-4 persons
  await page.getByText("3–4", { exact: false }).first().click();
  await uebrigeFragenBeantworten(page);
  await page.getByRole("button", { name: /weiter/i }).click();

  // Step 4: Heizsystem — Fußbodenheizung + Luft/Wasser-WP (defaults are picked)
  await page.getByText("Fußbodenheizung", { exact: false }).first().click();
  await page.getByText("Luft/Wasser", { exact: false }).first().click();
  await page.getByRole("button", { name: "Später im Fördercheck beantworten" }).click();

  // Result: heat-load, JAZ, TCO comparison, amortization
  // Visible matches only: the site menu carries the same words in its closed flyouts.
  await expect(page.getByText(/Amortisation|Ersparnis|TCO/i).filter({ visible: true }).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Wärmepumpe|Gas/i).filter({ visible: true }).first()).toBeVisible();

  const bodyText = await page.locator("body").innerText();
  // Should contain a € figure (savings or TCO) and at least one year reference
  expect(bodyText).toMatch(/\d.*€/);
  expect(bodyText).toMatch(/\d.*(Jahre|Jahr)/);
});

// Rechtsaussagen müssen SICHTBAR geprüft werden, nicht nur im Quelltext.
// Auslöser (29.07.2026): Eine Textkorrektur zum Geltungsbereich der Grüngas-
// Pflicht landete in einem Feld, das nie gerendert wird — der Diff sah richtig
// aus, die Seite zeigte weiter den alten Satz. Ein Unit-Test auf den String
// hätte das nicht gefunden, weil der String ja existierte. Dieser Test öffnet
// deshalb das echte Modal im echten Ergebnis und liest, was dort steht.
test("Grüngas-Modal nennt den Geltungsbereich vollständig und sichtbar", async ({ page }) => {
  await page.goto("/waermepumpe-rechner?si=neubau&hz=hk_neu&pe=4");

  await page.getByRole("button", { name: /realistischer Preisentwicklung/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Mehr erfahren", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Grüngas-Pflicht: was dahintersteckt" });
  await expect(modal).toBeVisible({ timeout: 10_000 });
  const text = await modal.innerText();

  // § 43 erfasst alle drei Brennstoffe — „Gasheizung" allein sagt einem
  // Ölheizungs-Besitzer, er sei nicht gemeint.
  expect(text).toContain("Heizöl");
  expect(text).toContain("Flüssiggas");
  // Der Geltungsbereich umfasst Bestand UND Neubau (§ 10 Abs. 2 Nr. 3 GModG)…
  expect(text).toMatch(/Bestand/);
  expect(text).toMatch(/Neubau/);
  // …aber im Neubau nur bis Ende 2029. Ohne die Grenze wäre die Aussage falsch.
  expect(text).toContain("31. Dezember 2029");
  // Die Verengung, die am 28.07.2026 live war, darf nicht zurückkommen.
  expect(text).not.toMatch(/nur .{0,40}bestehende[ns]? Gebäude/);
});

// Skipping heating must preserve base funding and allow later completion.
test("Fördercheck applies bonuses only after confirmation", async ({ page }) => {
  await page.goto("/waermepumpe-rechner?hz=hk_neu&pe=4");
  const investment = page.getByRole("region", { name: "Investition und Förderung", exact: true });
  await expect(investment).toContainText("−8.400 €");
  await page.getByRole("button", { name: "Fördercheck machen →", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: "Weiter", exact: true }).click();
  await modal.getByRole("button", { name: /^Öl, Kohle/ }).click();
  await modal.getByRole("button", { name: /^bis 60.000/ }).click();
  await modal.getByRole("button", { name: "Ja Einkommensgrenze +10.000 €" }).click();
  await expect(modal).toContainText("56 % Förderung · 15.680 €");
  await expect(investment).toContainText("−8.400 €");
  await modal.getByRole("button", { name: "Ergebnis neu berechnen" }).click();
  await expect(modal).not.toBeVisible();
  await expect(investment).toContainText("−15.680 €");
  await expect(investment).toContainText("21.770 €");
});
