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
  await ersatzstand(page);
  await page.goto("/strommix-deutschland");

  const hinweis = "Energy-Charts (Fraunhofer ISE) liefert gerade keine Daten. Gezeigt wird der letzte Stand vom 05.10., 11:45 Uhr.";
  // Live block and history chart each carry the note.
  await expect(page.getByRole("status").filter({ hasText: hinweis })).toHaveCount(2);
  await expect(page.getByText(/Zu diesem Zeitpunkt deckten erneuerbare Energien/)).toBeVisible();
  await expect(page.getByText(/Gerade decken erneuerbare/)).toHaveCount(0);
  await expect(page.getByText("Daten konnten nicht geladen werden")).toHaveCount(0);
});

test("no copy at all: the live block says so instead of an empty frame", async ({ page }) => {
  await page.route("**/api/energy/**", (r) => r.fulfill({ status: 502, json: { data: [], source: "error" } }));
  await page.goto("/strommix-deutschland");
  // Client retries three times (3 s, 8 s) before giving up.
  await expect(page.getByText("Die Erzeugungsdaten sind gerade nicht erreichbar.").first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Daten konnten nicht geladen werden")).toBeVisible();
});

test("SMARD live: numbers shown, SMARD named and credited, 'gerade' stays", async ({ page }) => {
  await page.route("**/api/energy/generation**", (r) =>
    r.fulfill({
      json: { data: reihe, source: "Bundesnetzagentur | SMARD.de", license: "CC BY 4.0", country: "de", resolution: "15min", fallback: "smard" },
    }),
  );
  await page.route("**/api/energy/nuclear-import**", (r) => r.fulfill({ status: 502, json: { data: [], source: "error" } }));
  await page.goto("/strommix-deutschland");

  const hinweis =
    "Energy-Charts (Fraunhofer ISE) liefert gerade keine Daten. Gezeigt werden die Zahlen von Bundesnetzagentur | SMARD.de, Stand 05.10., 11:45 Uhr.";
  await expect(page.getByRole("status").filter({ hasText: hinweis })).toHaveCount(2);
  await expect(page.getByText(/Gerade decken erneuerbare Energien/)).toBeVisible();
  // The page credit names who supplied the numbers on screen.
  await expect(page.getByText(/Datenquelle: Bundesnetzagentur \| SMARD\.de, CC BY 4\.0/)).toBeVisible();
});
