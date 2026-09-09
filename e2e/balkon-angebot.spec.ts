import { test, expect } from "@playwright/test";
import { uebrigeFragenBeantworten, weiterKlicken } from "./flows";

/**
 * Der Angebotsblock im Ergebnis des Balkonrechners — geprüft dort, wo ein Nutzer
 * ihn sieht.
 *
 * WARUM IM BROWSER UND NICHT NUR ALS UNIT-TEST: Die Zahlen prüft die
 * Rechenprüfung. Was sie nicht sieht, ist, ob der Block überhaupt erscheint (er
 * lädt seine Preise erst nach), ob die Pflichtkennzeichnung wirklich sichtbar
 * ist und ob er auf einem Telefon aus der Seite läuft. Genau diese drei Fehler
 * sind im Diff unsichtbar.
 */

const PFAD = "/balkonkraftwerk/rechner";

async function bisZumErgebnis(page: import("@playwright/test").Page) {
  await page.goto(PFAD);
  // Der Rechner hat zwei Frageschritte; die Helfer beantworten je Schritt alle
  // Fragen und drücken Weiter.
  for (let i = 0; i < 2; i++) {
    await uebrigeFragenBeantworten(page);
    await weiterKlicken(page);
  }
  await expect(page.getByText("Passende Sets zu kaufen")).toBeVisible({ timeout: 30_000 });
}

test.describe("Balkon-Angebote im Ergebnis", () => {
  test("zeigt kaufbare Sets mit Preis, Ersparnis und Amortisation", async ({ page }) => {
    await bisZumErgebnis(page);

    const block = page.locator("div").filter({ hasText: /^Passende Sets zu kaufen/ }).first();
    await expect(block).toBeVisible();

    // Mindestens eine Angebotszeile mit einem Kaufweg. Es ist ein LINK, kein
    // Knopf — siehe den eigenen Test dazu weiter unten.
    await expect(page.getByRole("link", { name: /Zum Shop/ }).first()).toBeVisible();

    // Die erste Zeile trägt die Begründung, warum sie oben steht.
    await expect(page.getByText("rechnet sich am besten")).toBeVisible();
  });

  test("die Kennzeichnung als bezahlte Empfehlung ist sichtbar, nicht versteckt", async ({ page }) => {
    // § 5a Abs. 4 UWG: Der kommerzielle Zweck muss erkennbar sein. Ein Hinweis,
    // den man erst aufklappen muss, ist nicht erkennbar.
    await bisZumErgebnis(page);
    await expect(page.getByText(/Anzeige · Provision bei Kauf/)).toBeVisible();
    await expect(page.getByText(/bekommen wir eine Provision vom Händler/)).toBeVisible();
  });

  test("nennt den Stand der Preise — ein Preis ohne Datum wird still falsch", async ({ page }) => {
    await bisZumErgebnis(page);
    await expect(page.getByText(/abgerufen am \d{2}\.\d{2}\.\d{4}/)).toBeVisible();
  });

  test("sagt sichtbar, wonach sortiert wird", async ({ page }) => {
    // Der Grundsatz „nach dem Nutzen für dich, nicht nach unserer Provision"
    // steht seit der Vorgabe vom 19.08.2026 auf der Seite, nicht nur im Code.
    await bisZumErgebnis(page);
    await expect(page.getByText(/nicht nach unserer Provision/)).toBeVisible();
  });

  test("der Kaufweg ist ein echter Link mit Partnerkennung", async ({ page }) => {
    // DIESER TEST FRAGTE ZUERST DIE SCHNITTSTELLE STATT DIE SEITE — und war
    // deshalb grün, während auf der Seite überhaupt kein Link stand: Der Knopf
    // öffnete den Shop per Skript, im ausgelieferten HTML kam die Shop-Adresse
    // kein einziges Mal vor (09.09.2026, im Browser gemessen). Ein Test, der
    // eine Schnittstelle befragt, belegt über die Seite nichts.
    await bisZumErgebnis(page);

    const links = page.locator('a[href*="solakon.de/products/"]');
    expect(await links.count()).toBeGreaterThan(0);

    const erster = links.first();
    await expect(erster).toBeVisible();
    // Provisionslink: `sponsored` ist Googles Vorgabe für bezahlte Verweise,
    // `noopener` schützt unseren Tab vor der Zielseite.
    const rel = (await erster.getAttribute("rel")) ?? "";
    expect(rel).toContain("sponsored");
    expect(rel).toContain("noopener");
    expect(await erster.getAttribute("target")).toBe("_blank");
  });

  test("Preise und Jahre stehen in deutscher Schreibweise", async ({ page }) => {
    // Zwei Fehler, die live standen und nur im Browser sichtbar waren
    // (09.09.2026): Der Kaufpreis erschien gestaffelt als „1,5 Tsd. €" — eine
    // Zahl, die im Shop niemand wiederfindet — und die Amortisation als
    // „bezahlt nach 4.0 Jahre", mit englischem Punkt und falschem Fall.
    await bisZumErgebnis(page);
    // Der ganze Kaufblock, nicht nur seine Überschrift: Ein zu enger Ausschnitt
    // enthält gar keine Preiszeile, und dann prüfen die Verbote unten nichts —
    // genau daran war die erste Fassung rot (sie griff über die Elternkette nur
    // die Überschrift, 52 Zeichen statt 920). Der äußere Container kommt
    // zuerst; die Zusicherung darunter hält das fest, falls es je kippt.
    const block = page.locator("div").filter({ hasText: /^Passende Sets zu kaufen/ }).first();
    const text = await block.innerText();
    expect(text).toContain("Zum Shop");

    // Kein gestaffelter Preis im Kaufblock.
    expect(text).not.toMatch(/Tsd\.\s*€/);
    expect(text).not.toMatch(/Mio\.\s*€/);
    // Kein englischer Dezimalpunkt vor einer Jahresangabe.
    expect(text).not.toMatch(/\d+\.\d+\s*Jahre/);
    // Und die richtige Form kommt wirklich vor.
    expect(text).toMatch(/bezahlt nach \d+,\d Jahren|rechnet sich nicht/);
  });

  test("Produktbilder laufen über unseren Server, nie direkt vom Shop", async ({ page }) => {
    // Ein Bild direkt von der Shop-Adresse zu laden schickt die IP-Adresse
    // jedes Besuchers dorthin, bevor er irgendetwas angeklickt hat. Der Fehler
    // wäre unsichtbar — das Bild sähe genauso aus.
    await bisZumErgebnis(page);

    // GEPRÜFT WIRD DER URSPRUNG, NICHT DIE ZEICHENKETTE. Die erste Fassung
    // suchte den Shop-Hostnamen irgendwo in der Bildadresse — und der steht
    // auch im optimierten Pfad über unseren Server, dort als Parameter
    // (`/_next/image?url=https%3A%2F%2Fcdn.shopify.com%2F…`, der Hostname bleibt
    // in der Kodierung lesbar). Der Test war deshalb rot, obwohl kein einziges
    // Bild vom Shop kam: Er verglich das Falsche.
    const fremde = await page.evaluate(() =>
      [...document.querySelectorAll("img")]
        .map(i => i.currentSrc || i.src)
        .filter(Boolean)
        .filter(src => !src.startsWith("data:"))
        .filter(src => new URL(src, location.href).origin !== location.origin),
    );
    expect(fremde).toEqual([]);

    // Und die Bilder sind wirklich da — sonst belegt der Test oben nichts.
    const eigene = await page.locator('img[src*="/_next/image"]').count();
    expect(eigene).toBeGreaterThan(0);
  });

  test("läuft auf 375 px nicht aus der Seite", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await bisZumErgebnis(page);
    const ueberlauf = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(ueberlauf).toBe(false);
  });
});
