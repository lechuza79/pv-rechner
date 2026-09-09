import { test, expect } from "@playwright/test";

// ─── Die Ortsgeschichte als Karte, im Browser gemessen ───────────────────────
//
// WARUM IM BROWSER: Die Karte wird in AUSGABEGRÖSSE gerendert (1080 px) und per
// Transformation auf die Rahmenbreite gebracht. Ob dieser Faktor stimmt, weiß
// erst der Browser — beim ersten Anlauf stand die Karte in voller Größe im
// Dialog, links und rechts abgeschnitten, und im Diff sah alles richtig aus.
//
// UND WARUM ALS TEST STATT ALS BLICK: „ich kann das nicht testen. das muss ein
// system 100 % zuverlässig testen. wie soll mir ein fehler auffallen?"
// (Betreiber, 05.09.2026). Ob eine Karte ein paar Pixel über ihren Rahmen ragt,
// entscheidet kein Blick.

const ORT = "/solar-atlas/hessen/landkreis-hersfeld-rotenburg/bad-hersfeld";

const BREITEN = [
  { name: "Telefon", width: 375, height: 812 },
  { name: "Schreibtisch", width: 1280, height: 900 },
];

for (const groesse of BREITEN) {
  test(`Die Geschichten-Karte passt auf ${groesse.name} in ihren Rahmen`, async ({ page }) => {
    await page.setViewportSize({ width: groesse.width, height: groesse.height });
    const antwort = await page.goto(ORT, { waitUntil: "domcontentloaded" });
    expect(antwort?.status()).toBe(200);

    const block = page.getByRole("heading", { name: /Aktuelles aus/ });
    await expect(block).toBeVisible();

    // Der erste Teaser öffnet das Fenster. Über die Rolle statt über einen
    // Testmarker: Wer wie ein Nutzer bedienen will, greift dort an, wo die
    // Oberfläche ohnehin beschriftet ist.
    //
    // Auf „endet mit Ansehen", nicht auf Gleichheit: Der Teaser IST der Knopf,
    // sein zugänglicher Name ist deshalb Kategorie plus Schlagzeile plus
    // „Ansehen". Ein exakter Vergleich fand gar nichts, und der Klick ging ins
    // Leere — ohne Fehlermeldung, weil `.first()` auf ein anderes Element fiel.
    await page.getByRole("button", { name: /Ansehen$/ }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // IM FENSTER gesucht, nicht auf der Seite: Seit die Teaser ein
    // Vorschaubildchen tragen, steht dieselbe Karte mehrfach im Dokument, und
    // eine Suche über die ganze Seite trifft das erste Bildchen statt der
    // Karte, um die es hier geht.
    const karte = dialog.locator("[data-social-karte]");
    await expect(karte).toBeVisible();

    const mass = await page.evaluate(() => {
      const k = document
        .querySelector<HTMLElement>('[role="dialog"]')!
        .querySelector<HTMLElement>("[data-social-karte]")!;
      // Der Rahmen ist der Großelternteil: Karte → transformierte Hülle → Rahmen.
      const rahmen = k.parentElement!.parentElement!;
      const kr = k.getBoundingClientRect();
      const rr = rahmen.getBoundingClientRect();
      return {
        karte: { breite: kr.width, links: kr.left, rechts: kr.right },
        rahmen: { breite: rr.width, links: rr.left, rechts: rr.right },
        dokument: document.documentElement.scrollWidth,
        fenster: window.innerWidth,
      };
    });

    // Zwei Pixel Toleranz für die Rundung beim Transformieren.
    expect(
      mass.karte.breite,
      `Karte ist ${Math.round(mass.karte.breite)} px breit, ihr Rahmen ${Math.round(mass.rahmen.breite)} px`,
    ).toBeLessThanOrEqual(mass.rahmen.breite + 2);
    expect(mass.karte.links).toBeGreaterThanOrEqual(mass.rahmen.links - 2);
    expect(mass.karte.rechts).toBeLessThanOrEqual(mass.rahmen.rechts + 2);

    // Die Karte darf die Seite nicht seitlich aufreißen — dieselbe Messung wie
    // in kein-ueberlauf.spec.ts, nur mit geöffnetem Fenster.
    expect(mass.dokument).toBeLessThanOrEqual(mass.fenster + 1);

    // Der Quellenvermerk reist im BILD mit, der Beitragstext nicht — er ist
    // Lizenzpflicht (dl-de/by-2-0) und darf deshalb nie beschnitten sein.
    const karteText = (await karte.innerText()).replace(/\s+/g, " ");
    expect(karteText).toContain("Marktstammdatenregister");
    expect(karteText).toContain("dl-de/by-2-0");
    expect(karteText).toContain("Eigene Berechnung");
  });
}

test("Die Karte erbt die Farben der Seite, statt eine eigene Palette mitzubringen", async ({ page }) => {
  // Der Kernfehler der drei gescheiterten Anläufe (05.09.2026): Die Karte
  // überschrieb die Tokens der Seite und stand abends als weißer Block auf
  // dunklem Grund.
  await page.goto(ORT, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Ansehen$/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const eigenePalette = await page.evaluate(() => {
    const k = document
      .querySelector<HTMLElement>('[role="dialog"]')!
      .querySelector<HTMLElement>("[data-social-karte]")!;
    // Ein eigenes Farbschema stünde als Token AM Element, nicht geerbt.
    return k.style.getPropertyValue("--color-bg").trim();
  });
  expect(eigenePalette, "Die Karte setzt eigene Farb-Tokens").toBe("");
});
