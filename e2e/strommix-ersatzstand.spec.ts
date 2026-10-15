import { test, expect, type Page } from "@playwright/test";

/**
 * Energy-Charts outage on the strommix page (05.10.2026), seen where a visitor
 * sees it. The energy routes are answered from the test, because the condition
 * — upstream down, our stored copy served — cannot be produced on demand:
 *
 * 1. Stored copy (`stale: true`): the page shows the data, names the source and
 *    the real time of the newest point, and stops saying "gerade".
 * 2. No copy at all (502): the live block says the data is unreachable instead
 *    of leaving an empty frame.
 */

// 24 h of quarter-hours ending 05.10.2026 09:45 UTC = 11:45 German time.
const ENDE = Date.parse("2026-10-05T09:45:00.000Z");
const reihe = Array.from({ length: 96 }, (_, i) => ({
  ts: new Date(ENDE - (95 - i) * 15 * 60000).toISOString(),
  solar: 15000,
  wind_onshore: 9000,
  biomass: 4000,
  fossil_gas: 3000,
  fossil_brown_coal_lignite: 5000,
}));

async function ersatzstand(page: Page) {
  await page.route("**/api/energy/generation**", (r) =>
    r.fulfill({
      json: { data: reihe, source: "Fraunhofer ISE / Energy-Charts", license: "CC BY 4.0", country: "de", resolution: "15min", stale: true },
      headers: { "X-Data-Stale": "true" },
    }),
  );
  await page.route("**/api/energy/nuclear-import**", (r) =>
    r.fulfill({
      json: {
        data: reihe.map((p) => ({ ts: p.ts, nuclear_gw: 1 })),
        avg_gw: 1, avg_share_pct: 3, source: "x", license: "CC BY 4.0", stale: true,
      },
    }),
  );
}

test("stored copy: data shown, outage and real time named, no 'gerade'", async ({ page }) => {
  await page.emulateMedia({reducedMotion:"reduce"});
  await ersatzstand(page);
  // Server-rendered observations remain fresh for five minutes. Exercise the next client refresh.
  await page.clock.install({time: new Date(Date.now() + 10 * 60_000)});
  await page.goto("/strommix-deutschland");

  const hinweis = "Energy-Charts (Fraunhofer ISE) liefert gerade keine Daten. Gezeigt wird der letzte Stand vom 05.10., 11:45 Uhr.";
  // Stale data has a short dismissible notice; provenance remains in chart details.
  const notices = page.getByRole("note").filter({hasText: "Die Daten sind gerade nur verzögert verfügbar."});
  await expect(notices).toHaveCount(3);
  await expect(page.getByRole("status").filter({hasText: hinweis})).toHaveCount(0);
  await notices.first().getByRole("button", {name: "Hinweis schließen"}).click();
  await expect(notices).toHaveCount(2);
  await expect(page.getByText(/Zuletzt stammten/)).toBeVisible();
  await expect(page.getByText(/Gerade decken erneuerbare/)).toHaveCount(0);
  await expect(page.getByText("Daten konnten nicht geladen werden")).toHaveCount(0);
});

test("no copy at all: radar and history embeds show an explicit error", async ({ page }) => {
  await page.route("**/api/energy/**", (r) => r.fulfill({ status: 502, json: { data: [], source: "error" } }));
  await page.goto("/embed/strommix?darstellung=radar");
  await expect(page.getByText("Daten gerade nicht erreichbar.")).toBeVisible();
  await page.goto("/embed/strommix");
  await expect(page.getByText("Daten konnten nicht geladen werden")).toBeVisible();
});

test("SMARD live: numbers shown, SMARD named and credited", async ({ page }) => {
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.route("**/api/energy/generation**", (r) =>
    r.fulfill({
      json: { data: reihe, source: "Bundesnetzagentur | SMARD.de", license: "CC BY 4.0", country: "de", resolution: "15min", fallback: "smard" },
    }),
  );
  await page.route("**/api/energy/nuclear-import**", (r) => r.fulfill({ status: 502, json: { data: [], source: "error" } }));
  // Server-rendered observations remain fresh for five minutes. Exercise the next client refresh.
  await page.clock.install({time: new Date(Date.now() + 10 * 60_000)});
  await page.goto("/strommix-deutschland");

  const hinweis =
    "Energy-Charts (Fraunhofer ISE) liefert gerade keine Daten. Gezeigt werden die Zahlen von Bundesnetzagentur | SMARD.de, Stand 05.10., 11:45 Uhr.";
  await expect(page.getByRole("status").filter({ hasText: hinweis })).toHaveCount(0);
  await expect(page.getByRole("note").filter({hasText: "Die Daten sind gerade nur verzögert verfügbar."})).toHaveCount(0);
  await expect(page.getByText(/Zuletzt stammten/)).toBeVisible();
  // The page credit names who supplied the numbers on screen.
  await expect(page.getByText(/Bundesnetzagentur \| SMARD\.de.*CC BY 4\.0/).first()).toBeVisible();
});
