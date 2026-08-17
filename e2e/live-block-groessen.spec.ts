import { test, expect } from "@playwright/test";

// Die beiden Live-Karten auf /strommix-deutschland müssen gleich breit sein und
// gleich große Ringe zeigen — bei JEDER Fensterbreite.
//
// Warum als Test und nicht per Augenmaß: Genau das ging dreimal hintereinander
// schief. Mit Flexbox waren die Karten in einem schmalen Fenster gleich und in
// einem breiten nicht — Flex verteilt den RESTPLATZ gleichmäßig, nicht die
// Spalten. Sobald die einzeilige Stand-Zeile („Stand 17.08., 17:00 Uhr · 56 GW
// im Netz") breiter wurde als ihr Anteil, wuchs ihre Karte darüber hinaus. Auf
// dem Entwicklungsrechner brach die Zeile um, beim Betreiber nicht — der Fehler
// war am einen Bildschirm unsichtbar und am anderen offensichtlich. Deshalb
// prüft dieser Test mehrere Breiten.

const BREITEN = [
  { name: "schmal (Laptop)", w: 1024, h: 900 },
  { name: "breit (Desktop)", w: 1600, h: 900 },
  { name: "sehr breit", w: 1920, h: 900 },
];

test.describe("Live-Block: gleiche Karten, gleiche Ringe", () => {
  for (const { name, w, h } of BREITEN) {
    test(`${name}: beide Karten gleich breit`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/strommix-deutschland");

      await expect(page.getByRole("heading", { name: "Gerade im Netz" })).toBeVisible({ timeout: 30_000 });

      const spalten = await page.evaluate(() => {
        const h2 = [...document.querySelectorAll("h2")].find((x) => x.textContent === "Gerade im Netz");
        const reihe = h2?.parentElement?.parentElement;
        if (!reihe) return null;
        return [...reihe.children].map((c) => Math.round(c.getBoundingClientRect().width));
      });

      expect(spalten, "Live-Block nicht gefunden").not.toBeNull();
      expect(spalten!.length, "Es müssen genau zwei Karten sein").toBe(2);
      // Ein Pixel Toleranz für die Rundung ungerader Spaltenbreiten.
      expect(
        Math.abs(spalten![0] - spalten![1]),
        `Karten ungleich breit: ${spalten![0]} vs ${spalten![1]} px bei ${w} px Fenster`,
      ).toBeLessThanOrEqual(1);
    });
  }

});
