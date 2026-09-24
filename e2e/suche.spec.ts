import { test, expect, type Page } from "@playwright/test";
import { klickBisWirkung } from "./klick";
import { MESSKOPF, grenzeFuer, zeile, type Kontrastbefund } from "./kontrast";

// ─── Die Suche in der Kopfzeile, auf jeder Seitenart ─────────────────────────
//
// DER ANLASS (23.09.2026): Die neue Gemeindeseite ging live, und die Fehler
// fand danach ein Mensch, einen nach dem anderen — abgeschnittene Kacheln,
// Text auf eigenem Grund, Knöpfe ohne Wirkung, Überlauf auf dem Telefon. Keiner
// davon war im Code zu sehen. Die Suche sitzt in der Kopfzeile und damit auf
// JEDER Seite; deshalb wird sie hier auf jeder SEITENART geprüft, nicht nur
// auf einer: Die Kopfzeile kommt auf React-Seiten, der Startseite, der
// Simulation, der Gemeindeseite und der Fehlerseite jeweils anders ins Dokument.
//
// Geprüft wird die WIRKUNG, wie ein Nutzer sie erlebt: Klick öffnet, der Cursor
// steht im Feld, Treffer erscheinen, nichts ragt über den Rand, alles ist
// lesbar, Escape schließt und gibt den Fokus zurück.
//
// Die Anfrage ist eine Postleitzahl plus Thema, weil beides ohne Datenbank
// beantwortet wird — der Test prüft die Suche, nicht die Erreichbarkeit der
// Datenbank im Prüflauf.

test.describe.configure({ timeout: 60_000 });

const SEITENARTEN = [
  { art: "React-Seite", pfad: "/ratgeber" },
  { art: "Startseite", pfad: "/" },
  { art: "Simulation", pfad: "/pv-simulation" },
  { art: "Gemeindeseite", pfad: "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg" },
  { art: "Fehlerseite", pfad: "/diese-adresse-gibt-es-nicht" },
  { art: "Suchseite", pfad: "/suche" },
];

const GROESSEN = [
  { name: "Desktop", width: 1440, height: 900 },
  { name: "Telefon", width: 375, height: 812 },
];

async function oeffneSuche(page: Page) {
  const knopf = page.locator(".sc-search-toggle");
  const feld = page.locator("#sc-search-input");
  // Die Startseite hängt die Kopfzeile erst nach ihrem Szenen-Bündel ein.
  await expect(knopf).toBeVisible({ timeout: 30_000 });
  await klickBisWirkung(knopf, feld, "Suche öffnen");
  await expect(feld).toBeFocused();
  return { knopf, feld };
}

for (const g of GROESSEN) {
  for (const { art, pfad } of SEITENARTEN) {
    test(`${art} (${g.name}): Suche öffnet, findet, passt und schließt`, async ({ page }) => {
      await page.setViewportSize({ width: g.width, height: g.height });
      const sep = pfad.includes("?") ? "&" : "?";
      await page.goto(`${pfad}${sep}suchvorschau=1`, { waitUntil: "domcontentloaded" });

      const { knopf, feld } = await oeffneSuche(page);
      await feld.fill("97070 Förderung");

      const panel = page.locator("#sc-search-panel");
      await expect(panel.locator(".sc-search-place h4")).toContainText("Würzburg", { timeout: 20_000 });
      await expect(panel.locator(".sc-search-place-links a", { hasText: "Photovoltaik rechnen" })).toHaveAttribute(
        "href",
        "/photovoltaik-rechner?plz=97070",
      );
      await expect(panel.locator(".sc-search-pages")).toContainText("Förderung");

      // Nichts ragt über den Rand — weder die Seite noch das Fenster selbst.
      const mass = await page.evaluate(() => {
        const r = document.querySelector("#sc-search-panel")!.getBoundingClientRect();
        return { seite: document.documentElement.scrollWidth, fenster: innerWidth, links: r.left, rechts: r.right };
      });
      expect(mass.seite, "Seite läuft seitlich über").toBeLessThanOrEqual(mass.fenster);
      expect(mass.links).toBeGreaterThanOrEqual(0);
      expect(mass.rechts).toBeLessThanOrEqual(mass.fenster);

      // Das Fenster liegt OBEN auf — nichts von der Seite verdeckt es.
      const oben = await page.evaluate(() => {
        const r = document.querySelector("#sc-search-input")!.getBoundingClientRect();
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!el?.closest("#sc-search-panel");
      });
      expect(oben, "Das Suchfeld ist von etwas anderem verdeckt").toBe(true);

      // Lesbar: derselbe Messkopf wie der Kontrast-Wächter der ganzen Site,
      // beschränkt auf das Suchfenster. Das Fenster hat einen vollen, festen
      // Grund; die Messung am Baum ist hier also die Messung am Bild.
      await page.addScriptTag({ content: MESSKOPF });
      const befunde = (await page.evaluate(() =>
        (window as unknown as { __kontrastMessen: () => Kontrastbefund[] }).__kontrastMessen(),
      )) as Kontrastbefund[];
      const imFenster: Kontrastbefund[] = [];
      for (const b of befunde) {
        if (b.kontrast >= grenzeFuer(b)) continue;
        if (await page.locator(`#sc-search-panel [data-kontrast="${b.marke}"]`).count()) imFenster.push(b);
      }
      expect(imFenster, imFenster.map(zeile).join("\n")).toEqual([]);

      // Escape schließt und gibt den Fokus an den Knopf zurück.
      await feld.press("Escape");
      await expect(panel).toBeHidden();
      await expect(knopf).toBeFocused();
    });
  }
}

test("ohne Vorschau-Marke gibt es keine Lupe (der Schalter ist aus)", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/ratgeber", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".sc-nav-login").first()).toBeAttached({ timeout: 30_000 });
  await expect(page.locator(".sc-search-toggle")).toHaveCount(0);
});

test("die Suchseite funktioniert ohne JavaScript und steht nicht im Index", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  const res = await page.goto("/suche?q=W%C3%A4rmepumpe");
  expect(res?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator(".sc-search-results")).toContainText("Wärmepumpe");
  await expect(page.locator(".sc-search-results a[href='/waermepumpe-rechner']")).toHaveCount(1);
  await ctx.close();
});

test("Pfeiltasten führen vom Feld durch die Treffer", async ({ page }) => {
  await page.goto("/ratgeber?suchvorschau=1", { waitUntil: "domcontentloaded" });
  const { feld } = await oeffneSuche(page);
  await feld.fill("Wärmepumpe");
  const erster = page.locator("#sc-search-panel .sc-search-results a").first();
  await expect(erster).toBeVisible({ timeout: 20_000 });
  await feld.press("ArrowDown");
  await expect(erster).toBeFocused();
  await erster.press("ArrowUp");
  await expect(feld).toBeFocused();
});

// Die Lupe macht die Kopfzeile breiter. Knapp über der Umschaltbreite zum
// Burger ist dort am wenigsten Platz, und genau da lief die Kopfzeile schon
// einmal über (ein einziger neuer Menüpunkt, 1162 px Inhalt in 1040 px).
for (const width of [375, 1024, 1280, 1281, 1300, 1366, 1440]) {
  test(`Kopfzeile mit Lupe passt auf ${width}px, eine Zeile, nichts überlappt`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/impressum?suchvorschau=1", { waitUntil: "domcontentloaded" });
    const lupe = page.locator("header > .sc-search-toggle");
    await expect(lupe).toBeVisible({ timeout: 30_000 });
    const m = await page.evaluate(() => {
      const box = (s: string) => {
        const el = document.querySelector(s) as HTMLElement | null;
        if (!el || !el.getClientRects().length || getComputedStyle(el).display === "none") return null;
        const r = el.getBoundingClientRect();
        return { l: r.left, r: r.right, mitte: r.top + r.height / 2 };
      };
      const summaries = [...document.querySelectorAll("header .sc-global-nav > details > summary")]
        .map((s) => s.getBoundingClientRect())
        .filter((r) => r.width > 0);
      return {
        seite: document.documentElement.scrollWidth,
        fenster: innerWidth,
        lupe: box("header > .sc-search-toggle"),
        login: box("header > .sc-nav-login"),
        burger: box("header > .sc-nav-toggle"),
        navRechts: summaries.length ? Math.max(...summaries.map((r) => r.right)) : null,
      };
    });
    expect(m.seite, "Seite läuft seitlich über").toBeLessThanOrEqual(m.fenster + 1);
    expect(m.lupe!.r).toBeLessThanOrEqual(m.fenster);
    if (m.navRechts !== null) expect(m.lupe!.l, "Lupe liegt auf dem Menü").toBeGreaterThanOrEqual(m.navRechts);
    const rechts = m.login ?? m.burger;
    expect(rechts, "weder Login noch Menüknopf sichtbar").not.toBeNull();
    expect(m.lupe!.r, "Lupe überlappt den Nachbarn").toBeLessThanOrEqual(rechts!.l + 1);
    expect(Math.abs(m.lupe!.mitte - rechts!.mitte), "Lupe steht nicht in derselben Zeile").toBeLessThan(6);
  });
}
