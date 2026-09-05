import { test, expect } from "@playwright/test";
import { kernzahlen } from "./ergebnis";

/**
 * NIEMAND DARF DAS ERGEBNIS EINES ANDEREN SEHEN.
 *
 * Seit dem 05.09.2026 wird die nackte Rechner-Adresse aus dem Zwischenspeicher
 * ausgeliefert, geteilte Links dagegen am Server gebaut. Diese Trennung ist der
 * gefaehrlichste Teil der Aenderung: Griffe sie nicht, bekaeme entweder jemand
 * mit geteiltem Link die leere Fragestrecke — oder, schlimmer, ein Besucher
 * ohne Link die zwischengespeicherte Rechnung eines Fremden.
 *
 * BEIDES SIEHT NICHT KAPUTT AUS. Die Seite antwortet mit 200, sie ist schnell,
 * die Zahlen darauf sind in sich stimmig — sie gehoeren nur jemand anderem.
 * Deshalb pruefen das Tests und nicht ein Mensch im Browser.
 *
 * Was hier NICHT geprueft wird, weil es lokal gar nicht pruefbar ist: ob das
 * CDN sich in der Produktion so verhaelt. Dafuer gibt es den Gesundheitscheck,
 * der dieselben Adressen live abruft.
 */

// Zwei deutlich VERSCHIEDENE Rechnungen: kleine Anlage ohne Speicher gegen
// grosse Anlage mit Speicher. Kaemen beide gleich heraus, koennte der Test eine
// Verwechslung gar nicht sehen.
const KLEIN = "/photovoltaik-rechner?a=0&s=0&p=1&n=1&wp=nein&ea=nein&ht=2&da=0&az=sued";
const GROSS = "/photovoltaik-rechner?a=3&s=3&p=3&n=3&wp=ja&ea=ja&ht=2&da=0&az=sued";
const MUSTER = [/amortisiert sich in\s*([\d.,]+)/, /Gewinn[^\n]{0,20}25[^\n]{0,40}?([\d.,]+)\s*€/];

test.describe("Rechner: geteilte Ergebnisse bleiben getrennt", () => {
  test("die nackte Adresse zeigt die Fragestrecke, nie ein fremdes Ergebnis", async ({ page }) => {
    await page.goto("/photovoltaik-rechner");
    await expect(page.getByRole("heading", { name: /Wie groß soll die Anlage werden/ })).toBeVisible();
    // „Neu berechnen" gibt es ausschliesslich im Ergebnis. Steht es hier, wurde
    // die Rechnung eines Fremden aus dem Zwischenspeicher ausgeliefert.
    await expect(page.getByText("Neu berechnen")).toHaveCount(0);
  });

  test("zwei verschiedene Links liefern zwei verschiedene Ergebnisse", async ({ page }) => {
    await page.goto(KLEIN);
    await expect(page.getByText(/amortisiert sich in/)).toBeVisible();
    const klein = await kernzahlen(page, MUSTER);

    await page.goto(GROSS);
    await expect(page.getByText(/amortisiert sich in/)).toBeVisible();
    const gross = await kernzahlen(page, MUSTER);

    expect(klein).not.toBe("");
    expect(gross).not.toBe("");
    expect(gross).not.toBe(klein);
  });

  test("derselbe Link liefert nach einem fremden Aufruf wieder DASSELBE", async ({ page }) => {
    await page.goto(KLEIN);
    await expect(page.getByText(/amortisiert sich in/)).toBeVisible();
    const zuerst = await kernzahlen(page, MUSTER);

    // Dazwischen eine fremde Rechnung und die nackte Adresse — genau die Abfolge,
    // die einen Zwischenspeicher mit dem falschen Inhalt fuellen wuerde.
    await page.goto(GROSS);
    await expect(page.getByText(/amortisiert sich in/)).toBeVisible();
    await page.goto("/photovoltaik-rechner");
    await expect(page.getByRole("heading", { name: /Wie groß soll die Anlage werden/ })).toBeVisible();

    await page.goto(KLEIN);
    await expect(page.getByText(/amortisiert sich in/)).toBeVisible();
    expect(await kernzahlen(page, MUSTER)).toBe(zuerst);
  });

  test("das Vorschaubild traegt die eigene Rechnung, die nackte Adresse die Marke", async ({ page }) => {
    const bild = async (pfad: string) => {
      await page.goto(pfad);
      return (await page.locator('meta[property="og:image"]').getAttribute("content")) ?? "";
    };
    // Der Chat-Empfaenger sieht nur dieses Bild. Traegt es die Parameter eines
    // anderen, teilt jemand sichtbar die falsche Rechnung.
    const kleinBild = await bild(KLEIN);
    const grossBild = await bild(GROSS);
    expect(kleinBild).toContain("a=0");
    expect(grossBild).toContain("a=3");
    expect(kleinBild).not.toBe(grossBild);

    const nacktBild = await bild("/photovoltaik-rechner");
    expect(nacktBild).toContain("view=brand");
    expect(nacktBild).not.toContain("a=");
  });

  test("die geteilte Adresse bleibt die, die der Nutzer kopiert hat", async ({ page }) => {
    // Umgeschrieben, nicht weitergeleitet: Waere daraus eine Weiterleitung
    // geworden, stuende beim Empfaenger eine andere Adresse — und jeder je
    // geteilte Link zeigte auf eine Adresse, die es so nicht mehr gibt.
    await page.goto(KLEIN);
    await expect(page.getByText(/amortisiert sich in/)).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/photovoltaik-rechner");
  });
});
