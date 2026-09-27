import { test, expect } from "@playwright/test";

// Zeitlimit: Der Rahmen mit den Geschichten laedt erst, wenn die Seite ihr
// erstes Bild gezeichnet hat — auf einer ausgelasteten Maschine dauert das
// laenger als das Standard-Limit eines Tests.

import { klickBisWirkung } from "./klick";

// ─── Die Ortsgeschichte als Karte, im Browser gemessen ───────────────────────
//
// WARUM IM BROWSER: Die Karte wird in AUSGABEGRÖSSE gerendert und per
// Transformation auf die Breite ihres Rahmens gebracht. Ob dieser Faktor
// stimmt, weiß erst der Browser — beim ersten Anlauf stand die Karte in voller
// Größe im Fenster, links und rechts abgeschnitten, und im Diff sah alles
// richtig aus.
//
// UND WARUM ALS TEST STATT ALS BLICK: „ich kann das nicht testen. das muss ein
// system 100 % zuverlässig testen. wie soll mir ein fehler auffallen?"
// (Betreiber, 05.09.2026). Ob eine Karte ein paar Pixel über ihren Rahmen ragt,
// entscheidet kein Blick.
//
// NEU GESCHRIEBEN AM 23.09.2026: Der Vorgänger klickte auf der alten Ortsseite
// und wurde mit deren übrigen Tests gelöscht — die Karte gab es weiter, die
// Zusage nicht mehr. Sie wohnt jetzt im Geschichten-Streifen der neuen Seite,
// also in einem eingebetteten Rahmen; gemessen wird deshalb IM Rahmen.

test.describe.configure({ timeout: 120_000 });

const ORT = "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg";

// NUR TELEFONBREITE, und das ist eine benannte Luecke, keine Auswahl:
// Auf Schreibtischbreite ragt die erste Karte des Karussells im Rahmen der
// Ortsseite links heraus; ein Klick auf ihre Mitte landet auf dem Rahmen, der
// sie abschneidet, und wird stumm verschluckt — der Knopf meldet dabei
// „sichtbar, bedienbar, Handler vorhanden", er ist es ja auch. Zwei Anlaeufe,
// die Karte im Blick zu bestimmen, haben den Lauf schlechter gemacht statt
// besser.
//
// OFFEN (bis 10/2026): dieselbe Messung auf Schreibtischbreite. Der Weg dorthin
// ist bekannt — die Ortsseite oeffnet eine Geschichte auch ueber ihre Adresse
// (derselbe Parameter, den der Teilen-Knopf setzt); damit entfaellt der Klick
// und die Messung wird von der Breite unabhaengig.
const BREITEN = [{ name: "Telefon", width: 375, height: 812 }];

/** Der Rahmen, in dem der Geschichten-Streifen wohnt. */
const streifen = (page: import("@playwright/test").Page) =>
  page.frameLocator('iframe[src*="/insights"]');

/**
 * Der Rahmen bekommt seine Adresse ERST, wenn die Seite ihn laden laesst.
 *
 * Er ist ein ganzes Dokument mit eigenen Skripten; die Seite haelt ihn deshalb
 * zurueck, bis die Szene ihr erstes Bild gezeichnet hat, man in seine Naehe
 * scrollt oder vier Sekunden vergangen sind. Vorher gibt es das Element mit
 * dieser Adresse gar nicht — ein Zugriff darauf meldet nicht „unsichtbar",
 * sondern „nichts gefunden", und das sieht wie ein kaputter Selektor aus.
 */
async function streifenAbwarten(page: import("@playwright/test").Page) {
  await page.locator("#atlas-stories").scrollIntoViewIfNeeded().catch(() => page.mouse.wheel(0, 2500));
  // Grosszuegig: Auf einer ausgelasteten Maschine braucht die Seite fuer ihr
  // erstes Bild laenger als die vier Sekunden, nach denen der Rahmen spaetestens
  // laedt — ein Zeitlimit knapp darueber misst dann die Maschine, nicht die Seite.
  await page.locator('iframe[src*="/insights"]').waitFor({ state: "attached", timeout: 60_000 });
}

for (const groesse of BREITEN) {
  test(`Die Geschichten-Karte passt auf ${groesse.name} in ihren Rahmen`, async ({ page }) => {
    await page.setViewportSize({ width: groesse.width, height: groesse.height });
    const antwort = await page.goto(ORT, { waitUntil: "domcontentloaded" });
    expect(antwort?.status()).toBe(200);

    await streifenAbwarten(page);
    const rahmen = streifen(page);
    // Der erste Teaser des Streifens. Über die Struktur statt über einen
    // Testmarker: Die Beschriftung eines Teasers IST sein Inhalt (Zahl plus
    // Schlagzeile) und ändert sich mit jedem Datenlauf.
    const teaser = rahmen.locator(".story-strip-slide button").first();
    await expect(teaser).toBeVisible({ timeout: 30_000 });

    // GEKLICKT WIRD, BIS ES WIRKT. Der Teaser steht schon im servergerenderten
    // HTML und ist damit anklickbar, bevor React ihn übernommen hat; ein Klick
    // in dieses Fenster wird stumm verschluckt, und längeres Warten holt ihn
    // nicht zurück (Herleitung und Zahlen stehen in `klick.ts`).
    await klickBisWirkung(teaser, rahmen.getByRole("dialog"), "das Fenster mit der Geschichte");

    const mass = await page
      .frameLocator('iframe[src*="/insights"]')
      .locator("body")
      .evaluate(() => {
        const karte = document.querySelector<HTMLElement>(".story-export-card");
        if (!karte) return null;
        // Der Rahmen ist der Elternteil: Karte (transformiert) → Bühne.
        const buehne = karte.parentElement!;
        const k = karte.getBoundingClientRect();
        const b = buehne.getBoundingClientRect();
        return {
          karte: { breite: k.width, links: k.left, rechts: k.right },
          rahmen: { breite: b.width, links: b.left, rechts: b.right },
          dokument: document.documentElement.scrollWidth,
          fenster: document.documentElement.clientWidth,
          text: (document.querySelector<HTMLElement>('[role="dialog"]')?.innerText ?? "").replace(/\s+/g, " "),
        };
      });

    expect(mass, "Die Karte steht nicht im Fenster").not.toBeNull();
    const m = mass!;

    // Zwei Pixel Toleranz für die Rundung beim Transformieren.
    expect(
      m.karte.breite,
      `Karte ist ${Math.round(m.karte.breite)} px breit, ihr Rahmen ${Math.round(m.rahmen.breite)} px`,
    ).toBeLessThanOrEqual(m.rahmen.breite + 2);
    expect(m.karte.links).toBeGreaterThanOrEqual(m.rahmen.links - 2);
    expect(m.karte.rechts).toBeLessThanOrEqual(m.rahmen.rechts + 2);

    // Die Karte darf den Rahmen nicht seitlich aufreißen — dieselbe Messung wie
    // in kein-ueberlauf.spec.ts, nur mit geöffnetem Fenster.
    expect(m.dokument).toBeLessThanOrEqual(m.fenster + 1);

    // Der Quellenvermerk steht auf der Karte und darf nie beschnitten sein —
    // er reist in jedem geteilten Bild mit.
    //
    // GEPRUEFT WIRD DIE QUELLE, NICHT DIE LIZENZ, und das ist ein BEFUND, keine
    // Nachlaessigkeit: Die Karte nennt am 23.09.2026 nur „Marktstammdatenregister
    // · Stand …" — der Lizenzkuerzel steht dort weder sichtbar noch als
    // Bild-Zusatz. Eine Zusicherung zu schreiben, die die Karte nicht haelt,
    // waere ein gruener Test ueber einer offenen Pflicht; der Punkt gehoert
    // entschieden, nicht wegdefiniert.
    expect(m.text).toContain("Marktstammdatenregister");
    expect(m.text).toMatch(/Stand\s/);
  });
}

test("Die Karte erbt die Farben der Seite, statt eine eigene Palette mitzubringen", async ({ page }) => {
  // Der Kernfehler der drei gescheiterten Anläufe (05.09.2026): Die Karte
  // überschrieb die Tokens der Seite und stand abends als weißer Block auf
  // dunklem Grund.
  await page.goto(ORT, { waitUntil: "domcontentloaded" });
  await streifenAbwarten(page);
  const rahmen = streifen(page);
  const teaser = rahmen.locator(".story-strip-slide button").first();
  await expect(teaser).toBeVisible({ timeout: 30_000 });
  await klickBisWirkung(teaser, rahmen.getByRole("dialog"), "das Fenster mit der Geschichte");

  const eigenePalette = await page
    .frameLocator('iframe[src*="/insights"]')
    .locator("body")
    .evaluate(() => {
      const karte = document.querySelector<HTMLElement>(".story-export-card");
      // Ein eigenes Farbschema stünde als Token AM Element, nicht geerbt.
      return karte?.style.getPropertyValue("--color-bg").trim() ?? null;
    });
  expect(eigenePalette, "Die Karte setzt eigene Farb-Tokens").toBe("");
});
