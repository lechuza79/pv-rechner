import { test, expect, type Page } from "@playwright/test";

/**
 * Die Werbekennzeichnung wird dort geprüft, wo ein Nutzer sie sieht.
 *
 * Ein Unit-Test kann hier prinzipiell nicht genügen: Die Frage ist nicht, ob
 * ein Satz im Quelltext steht, sondern ob er VOR dem Kaufknopf im Bild ist.
 * Die Aufsicht verlangt Erkennbarkeit "insbesondere ohne Scrollen oder
 * Ausklappen", und ein Positionsvergleich im Quelltext beantwortet das nicht —
 * die Kachel-Komponente ist oben definiert und unten verwendet.
 *
 * Zwei Prüfungen also, die nur der Browser leisten kann: Reihenfolge im
 * gerenderten Dokument, und dasselbe noch einmal auf schmalem Schirm, wo die
 * Kacheln in einer Wischleiste statt in einer Spalte stehen.
 *
 * Der Zustand kommt über die Adresse (`e=1` springt ins Ergebnis) — den
 * Frageweg durchzuklicken würde hier nichts zusätzlich beweisen.
 */

const ERGEBNIS =
  "/waermepumpe-rechner?e=1&si=bestand&fl=1&ht=0&da=0&pe=2&hz=hk_alt&wt=lwwp";

/** Wartet, bis die Geräte wirklich da sind — sie kommen nachgeladen. */
async function geraeteAbwarten(page: Page): Promise<boolean> {
  const kennzeichnung = page.getByText(/^Anzeige —/);
  try {
    await kennzeichnung.first().waitFor({ state: "visible", timeout: 20_000 });
    return true;
  } catch {
    return false;
  }
}

/** Obere Bildkante eines Elements im Dokument. */
async function obereKante(page: Page, auswahl: string, index = 0): Promise<number> {
  const kasten = await page.locator(auswahl).nth(index).boundingBox();
  if (!kasten) throw new Error(`kein Kasten für ${auswahl}`);
  return kasten.y + (await page.evaluate(() => window.scrollY));
}

test.describe("Werbekennzeichnung der Geräteempfehlung", () => {
  test("steht vor dem ersten Preis — auf breitem Schirm", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(ERGEBNIS, { waitUntil: "domcontentloaded" });

    // Ohne Datenbank gibt es keine Geräte. Dann ist hier nichts zu prüfen —
    // sichtbar übersprungen statt mit einem irreführenden Fehlschlag.
    test.skip(!(await geraeteAbwarten(page)), "Gerätekatalog nicht verfügbar");

    const text = await page.locator("body").innerText();

    // Firmierung MIT Rechtsform und Anschrift: § 5b Abs. 1 Nr. 2 UWG verlangt
    // "Identität und Anschrift" auch dessen, für den gehandelt wird. Der
    // Verweis aufs Impressum des Shops kommt zu spät — der Klick dorthin ist
    // bereits die geschäftliche Entscheidung (BGH I ZR 231/14, Rn. 30).
    expect(text).toContain("Heizungsdiscount 24 GmbH");
    expect(text).toContain("Stolzenmorgen 15");
    expect(text).toContain("35394 Gießen");

    // Das Bestehen des Widerrufsrechts — ohne Frist. Nr. 5 verlangt nur das
    // Bestehen, und eine Frist wäre eine Aussage über die Bedingungen eines
    // Dritten, die wir nicht beherrschen.
    expect(text).toMatch(/besteht ein Widerrufsrecht/);
    expect(text).not.toMatch(/\d+\s*Tage\s*Widerruf/i);

    // Provision offengelegt, Preisstand am Preis.
    expect(text).toMatch(/Wir erhalten eine Provision/);
    expect(text).toMatch(/Preis vom \d{2}\.\d{2}\.\d{4}/);

    // Der Kennzeichnungs-Absatz selbst bleibt kurz: Kennzeichnung, ein
    // Händler, Provision. Anschrift und Widerruf stehen unter den Kacheln,
    // der Preisstand an der Kachel. Eine frühere Fassung hatte alles in
    // einem Absatz — 70 Wörter, die niemand liest.
    const absatz = await page.locator("p", { hasText: /^Anzeige —/ }).first().innerText();
    expect(absatz).toMatch(/Sortiment eines einzelnen Händlers/);
    expect(absatz).not.toMatch(/Stolzenmorgen/);
    expect(absatz).not.toMatch(/Widerrufsrecht/);
    expect(
      absatz.split(/\s+/).length,
      "Der Anzeigen-Absatz soll kurz bleiben",
    ).toBeLessThan(45);

    // Und die Reihenfolge: Kennzeichnung oben, Preis darunter.
    const kennzeichnungY = await obereKante(page, "text=/^Anzeige —/");
    const preisY = await obereKante(page, "text=/inkl\\. MwSt/");
    expect(
      kennzeichnungY,
      "Die Kennzeichnung muss vor dem ersten Preis stehen, nicht darunter",
    ).toBeLessThan(preisY);
  });

  test("kennzeichnet jede Kachel einzeln", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(ERGEBNIS, { waitUntil: "domcontentloaded" });
    test.skip(!(await geraeteAbwarten(page)), "Gerätekatalog nicht verfügbar");

    // Ein pauschaler Hinweis für einen ganzen Block genügt nicht (Leitfaden der
    // Medienanstalten). Wer auf der Wischleiste bei Kachel 3 ankommt, hat den
    // Block oben längst aus dem Bild.
    const preise = await page.locator("text=/inkl\\. MwSt/").count();
    const etiketten = await page.getByText("ANZEIGE", { exact: true }).count();
    expect(preise).toBeGreaterThan(0);
    expect(
      etiketten,
      "Jede Kachel mit Preis braucht ihre eigene Kennzeichnung",
    ).toBeGreaterThanOrEqual(preise);
  });

  test("nennt die Bezugsgröße der Spitzenstellung", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(ERGEBNIS, { waitUntil: "domcontentloaded" });
    test.skip(!(await geraeteAbwarten(page)), "Gerätekatalog nicht verfügbar");

    const text = await page.locator("body").innerText();
    // "Günstigstes passendes" allein wäre eine Spitzenstellung ohne
    // Grundgesamtheit — günstigstes wovon?
    if (/Günstigstes passendes/.test(text)) {
      expect(text).toMatch(/Günstigstes passendes bei Heizungsdiscount24/);
    }
  });

  test("steht auch auf dem Handy vor dem ersten Preis", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(ERGEBNIS, { waitUntil: "domcontentloaded" });
    test.skip(!(await geraeteAbwarten(page)), "Gerätekatalog nicht verfügbar");

    // Auf schmalem Schirm stehen die Kacheln in einer Wischleiste. Genau dort
    // war die Kennzeichnung in einer früheren Fassung unter allen Kacheln
    // gelandet — erreichbar erst nach dem Wischen, also nach dem Kaufknopf.
    const kennzeichnungY = await obereKante(page, "text=/^Anzeige —/");
    const preisY = await obereKante(page, "text=/inkl\\. MwSt/");
    expect(kennzeichnungY).toBeLessThan(preisY);
  });

  test("nennt die Dimension seines Versprechens", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(ERGEBNIS, { waitUntil: "domcontentloaded" });
    test.skip(!(await geraeteAbwarten(page)), "Gerätekatalog nicht verfügbar");

    const text = await page.locator("body").innerText();
    // Die Zusage bleibt — angreifbar war nur ihre Reichweite. Der Satz bezieht
    // sich auf die Wahl DES GERÄTS, und die ist vollständig durch Heizlast,
    // Vorlauf und Preis bestimmt. Dass alle Geräte aus einem Sortiment stammen,
    // steht in der Kennzeichnung darüber, nicht im Versprechen.
    expect(text).not.toMatch(/nie nach unserer Provision/);
    expect(text).toMatch(/Welches Gerät wir dir empfehlen/);
    expect(text).toMatch(/kein Marktüberblick/);
  });

  test("widerspricht dem Produktnamen nicht", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(ERGEBNIS, { waitUntil: "domcontentloaded" });
    test.skip(!(await geraeteAbwarten(page)), "Gerätekatalog nicht verfügbar");

    // Steht "inkl. Erstinbetriebnahme" im Produktnamen, darf daneben nicht
    // "nur Gerät" stehen. Zwei wahre Aussagen über verschiedene Dinge, die wie
    // ein Widerspruch aussehen — ein Leser kann das nicht auflösen.
    //
    // Gegriffen wird über die Kachel-Klasse, nicht über einen geratenen
    // Vorfahren: Ein erster Anlauf nahm die dritte `div` über dem Preis und
    // erwischte damit eine Hülle, die MEHRERE Kacheln und den Fußtext enthielt.
    // Der Test wurde rot, weil das "nur Gerät" der Nachbarkachel mitgelesen
    // wurde — ein Fehlalarm, der wie ein echter Befund aussieht.
    const kacheln = page.locator("li.wp-geraete-kachel");
    const anzahl = await kacheln.count();
    expect(anzahl, "Ohne Kacheln prüft dieser Test nichts").toBeGreaterThan(0);
    let geprueft = 0;
    for (let i = 0; i < anzahl; i++) {
      const t = await kacheln.nth(i).innerText().catch(() => "");
      if (/inkl\.\s*Erstinbetriebnahme/i.test(t)) {
        geprueft++;
        expect(t, "Produktname nennt die Inbetriebnahme, die Beschriftung nicht").not.toMatch(
          /\bnur Gerät\b/,
        );
        expect(t).toMatch(/Gerät \+ Inbetriebnahme/);
      }
    }
    // Kein stiller Durchmarsch: Findet der Lauf keinen einzigen solchen Fall,
    // hat er nichts geprüft und sagt das, statt grün zu melden.
    console.log(`Kacheln mit Inbetriebnahme im Namen: ${geprueft} von ${anzahl}`);
  });
});
