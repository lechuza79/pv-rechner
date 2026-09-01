import { test, expect } from "@playwright/test";

// Bilder zum Ansehen, kein Prüftest. Läuft nur, wenn ein Ablageort gesetzt ist
// (ABO_BILD_DIR) — sonst überspringt er sich, damit der reguläre Lauf keine
// Dateien schreibt.
const AUS = process.env.ABO_BILD_DIR;

test.describe("Abo: Bilder", () => {
  test.skip(!AUS, "ABO_BILD_DIR nicht gesetzt");

  test("Quittung und Knopf", async ({ page }) => {
    const ort = "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg";

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(ort);
    await expect(page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first()).toBeVisible();
    await page.screenshot({ path: `${AUS}/1-knopf.png`, clip: { x: 0, y: 0, width: 1280, height: 340 } });

    await page.goto(`${ort}?abo=1`);
    const quittung = page.getByRole("status").filter({ hasText: "Angemeldet für Höchberg" });
    await expect(quittung).toBeVisible();
    await page.screenshot({ path: `${AUS}/2-quittung.png`, clip: { x: 0, y: 0, width: 1280, height: 340 } });

    // Dasselbe auf einem schmalen Schirm.
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`${ort}?abo=1`);
    await expect(quittung).toBeVisible();
    await page.screenshot({ path: `${AUS}/3-quittung-mobil.png`, clip: { x: 0, y: 0, width: 390, height: 460 } });

    // Und das Anmeldefenster mit dem neuen Datenschutz-Hinweis.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(ort);
    await page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: `${AUS}/4-fenster.png` });

    // Und die beanstandete Adresse.
    await page.getByLabel("E-Mail-Adresse").fill("a@b");
    await page.getByRole("dialog").getByRole("button", { name: "Abonnieren" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page.screenshot({ path: `${AUS}/5-fehler.png` });
  });
});
