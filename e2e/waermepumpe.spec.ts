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
  await uebrigeFragenBeantworten(page);
  await page.getByRole("button", { name: /berechnen|ergebnis|fertig/i }).click();

  // Result: heat-load, JAZ, TCO comparison, amortization
  await expect(page.getByText(/Amortisation|Ersparnis|TCO/i).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Wärmepumpe|Gas/i).first()).toBeVisible();

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
  await page.goto("/waermepumpe-rechner");

  await page.getByText("Neubau", { exact: false }).first().click();
  // Durch den Flow: In JEDEM Schritt erst die offenen Fragen beantworten, dann
  // Weiter. Seit dem Flow-Umbau (Betreiber-Vorgabe: kein Schritt startet
  // vorbelegt) bleibt Weiter sonst ausgegraut, und der Test hängt am Knopf statt
  // an dem, was er prüfen soll. Der Helfer ist derselbe, den der Flow-Läufer
  // benutzt — geteilt in e2e/flows.ts, damit beide nicht auseinanderlaufen.
  for (let i = 0; i < 12; i++) {
    await uebrigeFragenBeantworten(page);
    const weiter = page.getByRole("button", { name: /^weiter$/i });
    if (!(await weiter.count())) break;
    await weiter.first().click();
  }
  await uebrigeFragenBeantworten(page);
  await uebrigeFragenBeantworten(page);
  await page.getByRole("button", { name: /berechnen|ergebnis|fertig/i }).click();

  await page.getByRole("button", { name: "Mehr erfahren →", exact: true }).click();
  const modal = page.getByRole("dialog");
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
