import { test, expect, type Page } from "@playwright/test";
import { akkordeonWaehlen, waehle, weiterKlicken } from "./flows";

async function captureClipboard(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", { value: {
      writeText: async (text: string) => { document.documentElement.dataset.copiedLink = text; },
    }, configurable: true });
  });
}

async function verifyResultAndShare(page: Page, kwp: number, cost?: string) {
  const capacity = page.getByRole("button", { name: `${kwp.toLocaleString("de-DE")} kWp bearbeiten`, exact: true });
  await expect(capacity).toBeVisible();
  if (cost) await expect(page.getByRole("button", { name: `${cost} bearbeiten`, exact: true })).toBeVisible();
  await page.reload();
  await expect(capacity).toBeVisible();
  await page.getByTitle("Link kopieren", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-copied-link", /photovoltaik-rechner\?/);
  const shared = (await page.locator("html").getAttribute("data-copied-link"))!;
  await page.goto(shared);
  await expect(capacity).toBeVisible();
  if (cost) await expect(page.getByRole("button", { name: `${cost} bearbeiten`, exact: true })).toBeVisible();
}

test("Reihenhaus keeps its 4 kWp and investment through recommendation, reload and both share links", async ({ page }) => {
  test.setTimeout(60_000);
  await captureClipboard(page);
  await page.goto("/pv-bedarf-berechnen");
  await waehle(page, "Reihenhaus");
  await akkordeonWaehlen(page, "Dachform", 0);
  await akkordeonWaehlen(page, "Ausrichtung", 0);
  await weiterKlicken(page);
  await waehle(page, "1 Person");
  await waehle(page, "Tagsüber weg");
  await weiterKlicken(page);
  await weiterKlicken(page);
  await page.waitForURL(/view=ergebnis/);
  await expect(page.getByText("Unsere Empfehlung", { exact: true }).locator("..").getByText("4 kWp", { exact: true })).toBeVisible();
  const cost = (await page.getByText(/^Geschätzte Investition:/).innerText()).replace("Geschätzte Investition: ", "");
  await page.getByRole("button", { name: "Empfehlung teilen", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-copied-link", /view=ergebnis/);
  await page.goto((await page.locator("html").getAttribute("data-copied-link"))!);
  await expect(page.getByText("Unsere Empfehlung", { exact: true }).locator("..").getByText("4 kWp", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ergebnis anzeigen", exact: true }).first().click();
  await page.waitForURL(/photovoltaik-rechner/);
  await expect(page).toHaveURL(/a=4&ck=4&/);
  await verifyResultAndShare(page, 4, cost);
});

test("shared recommendation hands over exactly 4 kWp", async ({ page }) => {
  await page.goto("/pv-bedarf-berechnen?haus=reihenhaus&az=sued&personen=1&nutzung=weg&view=ergebnis");
  await page.getByRole("button", { name: "Ergebnis anzeigen", exact: true }).first().click();
  await page.waitForURL(/photovoltaik-rechner/);
  await expect(page.getByRole("button", { name: "4 kWp bearbeiten", exact: true })).toBeVisible();
});

test("intermediate recommendation and alternatives retain their displayed capacity", async ({ page }) => {
  await captureClipboard(page);
  test.setTimeout(90_000);
  const recommendation = "/pv-bedarf-berechnen?haus=efh&dach=satteldach&az=sued&personen=4&nutzung=teils&view=ergebnis";
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
