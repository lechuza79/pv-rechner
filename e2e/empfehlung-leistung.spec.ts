import { DEFAULT_PRICES } from "../lib/prices-config";
import { DEFAULT_FEED_IN } from "../lib/feedin-config";
import { test, expect, type Page } from "@playwright/test";
import { akkordeonOeffnen, akkordeonWaehlen, waehle, weiterKlicken } from "./flows";

test.beforeEach(async ({page}) => {
  await page.route("**/api/prices",route=>route.fulfill({json:DEFAULT_PRICES}));
  await page.route("**/api/feedin",route=>route.fulfill({json:DEFAULT_FEED_IN}));
});

async function captureClipboard(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", { value: {
      writeText: async (text: string) => { document.documentElement.dataset.copiedLink = text; },
    }, configurable: true });
  });
}

async function verifyResultAndShare(page: Page, kwp: number, cost?: string) {
  const opener = page.getByRole("button", { name: /Deine Anlage & Rechengrundlagen/ });
  const verify = async () => {
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "Deine Anlage & Rechengrundlagen" });
    await expect(dialog.getByRole("button", { name: `${kwp.toLocaleString("de-DE")} kWp bearbeiten`, exact: true })).toBeVisible();
    if (cost) await expect(dialog.getByRole("button", { name: `${cost} bearbeiten`, exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Abbrechen" }).click();
  };
  await verify();
  await page.reload();
  await verify();
  await page.getByTitle("Link kopieren", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-copied-link", /photovoltaik-rechner\?/);
  await page.goto((await page.locator("html").getAttribute("data-copied-link"))!);
  await verify();
}

test("Reihenhaus keeps its 4 kWp and investment through recommendation, reload and both share links", async ({ page }) => {
  test.setTimeout(60_000);
  await captureClipboard(page);
  await page.goto("/photovoltaik-rechner");
  await akkordeonWaehlen(page, "Haustyp", 0); // Reihenhaus
  await akkordeonWaehlen(page, "Dachform", 0);
  await akkordeonWaehlen(page, "Ausrichtung", 0);
  await weiterKlicken(page);
  await waehle(page, "1 Person");
  await akkordeonOeffnen(page, "Nutzungsprofil");
  await waehle(page, "Tagsüber weg");
  await weiterKlicken(page);
  await akkordeonWaehlen(page, "Wärmepumpe", 0);
  await akkordeonWaehlen(page, "Elektroauto", 0);
  await akkordeonWaehlen(page, "Klimaanlage", 0);
  await weiterKlicken(page);
  await page.waitForURL(/flow=emp/);
  await expect(page).toHaveURL(/a=4&ck=4&/);
  await verifyResultAndShare(page, 4);
});

test("shared recommendation hands over exactly 4 kWp", async ({ page }) => {
  await page.goto("/photovoltaik-rechner?haus=reihenhaus&az=sued&personen=1&nutzung=weg&view=ergebnis");
  await page.getByRole("button", { name: "Ergebnis anzeigen", exact: true }).first().click();
  await page.waitForURL(/photovoltaik-rechner/);
  await page.getByRole("button", { name: /Deine Anlage & Rechengrundlagen/ }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "4 kWp bearbeiten", exact: true })).toBeVisible();
});

test("intermediate recommendation and alternatives retain their displayed capacity", async ({ page }) => {
  await captureClipboard(page);
  test.setTimeout(90_000);
  // Ein Haushalt, der eine halbe kWp-Stufe UND Alternativen bekommt — über
  // ±10 % Modulpreis stabil, damit die Live-Preise der Prüfung ihn nicht kippen.
  // Der frühere Fall (Einfamilienhaus, Satteldach, Süd, 3–4 Personen) hatte seine
  // einzige Alternative nur, weil der Eigenverbrauch vor der Geldrechnung auf
  // ganze Prozent gerundet wurde; ungerundet liegt sie unter der 95-%-Schwelle
  // (Rechenmodell-Council 12.09.2026).
  const recommendation = "/photovoltaik-rechner?haus=grosses-efh&dach=flachdach&az=ostwest&personen=5plus&nutzung=teils&view=ergebnis";
  await page.goto(recommendation);
  const hero = page.getByText("Unsere Empfehlung", { exact: true }).locator("..");
  const kwp = Number((await hero.innerText()).match(/([\d.]+) kWp/)![1]);
  expect(kwp % 1).toBe(0.5);
  await page.getByRole("button", { name: "Ergebnis anzeigen", exact: true }).first().click();
  await page.waitForURL(/photovoltaik-rechner/);
  await verifyResultAndShare(page, kwp);
  await page.goto(recommendation);
  const alternatives = page.getByRole("button").filter({ hasText: /\d+(\.\d+)? kWp/ });
  const count = await alternatives.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const alternativeKwp = Number((await alternatives.nth(i).innerText()).match(/([\d.]+) kWp/)![1]);
    await alternatives.nth(i).click();
    await page.waitForURL(/photovoltaik-rechner/);
    await verifyResultAndShare(page, alternativeKwp);
    await page.goto(recommendation);
  }
});

for (const [kwp, params] of [[5, "a=0"], [8, "a=1"], [10, "a=2"], [15, "a=3"], [12.5, "a=4&ck=12.5"], [17.5, "a=4&ck=17.5"]] as const) {
  test(`${kwp} kWp result survives reload and sharing`, async ({ page }) => {
    await captureClipboard(page);
    await page.goto(`/photovoltaik-rechner?${params}&s=0&p=0&n=0&wp=nein&ea=nein`);
    await verifyResultAndShare(page, kwp);
  });
}
