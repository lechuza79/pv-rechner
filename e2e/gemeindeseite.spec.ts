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
  // Der längste Ortsname Deutschlands, über drei Breiten. GEMESSEN am
  // 22.09.2026: Der Abo-Knopf trägt den Ortsnamen, und das abgenommene Design
  // hält jeden Knopf einzeilig — dadurch war die Seite auf 375 px um 40 px und
  // auf 768 px um 113 px breiter als das Fenster, also schob sich die ganze
  // Seite seitlich. Ein Blick auf Höchberg hätte das nie gezeigt.
  const LANGER_ORT = "/solar-atlas/sachsen/landkreis-goerlitz/quitzdorf-am-see-kw-tanecy-p-i-j-zoru";
  for (const breite of [375, 414, 768]) {
    test(`ein langer Ortsname läuft auf ${breite} px nicht seitlich über`, async ({ page }) => {
      await page.setViewportSize({ width: breite, height: 900 });
      const antwort = await page.goto(LANGER_ORT, { waitUntil: "domcontentloaded" });
      expect(antwort?.status()).toBe(200);
      await page.waitForTimeout(1500);
      const mass = await page.evaluate(() => ({
        dokument: document.documentElement.scrollWidth,
        fenster: window.innerWidth,
      }));
      expect(mass.dokument, `Seite ${mass.dokument} px breit im ${mass.fenster} px Fenster`).toBeLessThanOrEqual(mass.fenster + 1);
    });
  }
  // Der Kopf färbt sich nach dem Himmel. GEMESSEN am 23.09.2026: Der
  // Kontrastmesser der Szene lief längst (er färbt den Titel), aber die
  // Kopfzeile war ihm nicht übergeben — bei hellem Mittagshimmel stand die
  // weiße Wortmarke auf hellem Grau. Der Test stellt die Uhr, nicht das
  // Wetter: die Sonnenhöhe entscheidet, und sie hängt an der Zeit.
  for (const [tageszeit, zeit, erwartet] of [
    ["mittags dunkel auf hellem Himmel", "2026-09-23T10:30:00Z", /^#(122c3b|000)$/],
    ["nachts hell auf dunklem Himmel", "2026-09-23T22:30:00Z", /^#fff$/],
  ] as const) {
    test(`die Kopfzeile steht ${tageszeit}`, async ({ page }) => {
      await page.clock.setFixedTime(new Date(zeit));
      await page.goto(ORT, { waitUntil: "load" });
      const marke = page.locator(".site-header .brand");
      await expect(marke).toHaveAttribute("data-sc-contrast", "");
      await expect
        .poll(
          () => marke.evaluate((el) => getComputedStyle(el).getPropertyValue("--sc-region-ink").trim()),
          { timeout: 20_000, message: "Der Kontrastmesser hat die Kopfzeile nicht eingefärbt" },
        )
        .toMatch(erwartet);
    });
  }
  // Die kommunale Förderung stand auf der bisherigen Ortsseite und fehlte im
  // neuen Entwurf ganz — aufgefallen ist es dem Betreiber, nicht uns. Sie
  // erscheint nur, wo sie gilt: Nidda hat ein eigenes Programm, Höchberg keins.
  test("der Zuschuss der Gemeinde steht auf der Seite und führt zu seinem Programm", async ({ page }) => {
    await page.goto("/solar-atlas/hessen/landkreis-wetteraukreis/nidda");
    const link = page.getByRole("link", { name: /Zuschüsse in Nidda/ });
    await expect(link).toHaveAttribute("href", "/photovoltaik-foerderung/hessen/nidda");
    await page.goto(ORT);
    await expect(page.getByRole("link", { name: /Zuschüsse in|Landesförderung in/ })).toHaveCount(0);
  });
});
