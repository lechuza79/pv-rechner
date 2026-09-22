import { test, expect } from "@playwright/test";
import { klickBisWirkung } from "./klick";

// The Atlas town page in the approved design (09/2026): checked where a
// visitor uses it. The page loads the story strip, the monitor and the hero
// card in frames and builds the ranking by script; this spec proves they all
// arrive, that the subscription dialog opens and refuses a bad address, and
// that the server HTML carries the content without any script.

const ORT = "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg";

test.describe("Gemeindeseite", () => {
  test("ohne JavaScript stehen Überschrift, Zahlen, Geschichten und Platzierungen im HTML", async ({ request }) => {
    const html = await (await request.get(ORT)).text();
    expect(html).toMatch(/<h1[^>]*>Höchberg/);
    expect(html).toContain("So steht es um Solar");
    // React separates text parts with <!-- --> comments in the server HTML.
    const text = html.replace(/<!-- -->/g, "");
    expect(text).toContain("Alle Geschichten aus Höchberg");
    expect(text).toContain("Alle Platzierungen von Höchberg");
    expect(html).toContain("Was bedeutet das für Bürgerinnen und Bürger?");
    expect(html).toContain("Daten &amp; Quellen");
    expect(html).toContain('"@type":"Dataset"');
  });

  test("Geschichten, Monitor und Kopf-Kachel kommen an, die Rangliste wird gebaut", async ({ page }) => {
    await page.goto(ORT);
    await expect(page.frameLocator(".v3-monitor-card iframe").locator(".hero-story, .sc-widget").first()).toBeVisible({ timeout: 30_000 });
    await page.locator("#atlas-stories").scrollIntoViewIfNeeded();
    await expect(page.frameLocator("#atlas-stories iframe").locator("h3").first()).toBeVisible({ timeout: 30_000 });
    await page.locator("#atlas-data").scrollIntoViewIfNeeded();
    await expect(page.frameLocator("#atlas-data iframe").locator(".sc-widget").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#atlas-ranking h2").first()).toContainText("Höchberg");
  });

  test("der Abo-Knopf öffnet das Fenster; eine unbrauchbare Adresse geht nicht raus", async ({ page }) => {
    let angemeldet = 0;
    await page.route("**/api/abo/anmelden", (r) => {
      angemeldet++;
      return r.fulfill({ status: 200, body: "{}" });
    });
    await page.goto(ORT);
    const fenster = page.locator("dialog.atlas-dialog", { hasText: "Höchberg abonnieren" });
    await klickBisWirkung(page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first(), fenster, "Abo-Fenster");
    await expect(fenster.getByRole("button", { name: "Als Bürger:in" })).toHaveAttribute("aria-pressed", "true");
    await expect(fenster.getByRole("button", { name: "Für die Gemeinde" })).toHaveAttribute("aria-pressed", "false");
    await fenster.getByLabel("E-Mail-Adresse").fill("keine-adresse");
    await fenster.getByRole("button", { name: "Kostenlos abonnieren" }).click();
    expect(angemeldet).toBe(0);
    // The consent wording comes from the archive and names no frequency.
    await expect(fenster).toContainText("Datenschutzerklärung");
    await expect(fenster).not.toContainText(/monatlich|wöchentlich|einmal im monat|pro woche/i);
  });
});
