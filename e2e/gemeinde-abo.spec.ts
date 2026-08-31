import { test, expect } from "@playwright/test";

// Das Abo auf der Gemeindeseite — geprüft dort, wo ein Nutzer es bedient.
//
// WARUM IM BROWSER UND NICHT ALS UNIT-TEST: Beide Wege ins Anmeldefenster
// hängen an Dingen, die eine Unit-Prüfung nicht kennt. Der Knopf neben der
// Überschrift braucht eine hydratisierte Client-Komponente; der Knopf in der
// klebenden Leiste geht über ein Fenster-Ereignis von einer GESCHWISTER-
// Komponente aus, die auf einer Server-Seite daneben gerendert wird. Ob die
// beiden sich finden, entscheidet sich erst im echten Dokument.
//
// Das war keine theoretische Sorge: Beim Bau meldete die Seite im
// Prüf-Browser „hydratisiert", und trotzdem öffnete keiner der beiden Knöpfe
// das Fenster. Ohne diesen Test wäre das eine Zusage geblieben, die man erst
// bemerkt, wenn sich niemand anmeldet.

const ORT = "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg";

test.describe("Gemeinde-Abo", () => {
  test("der Knopf neben der Überschrift öffnet das Anmeldefenster", async ({ page }) => {
    await page.goto(ORT);

    // Die Überschrift steht über die volle Breite, der Knopf rechts daneben.
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Höchberg");

    const knopf = page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first();
    await knopf.click();

    const fenster = page.getByRole("dialog");
    await expect(fenster).toBeVisible();
    await expect(fenster).toContainText("Meldungen zu Höchberg");
    await expect(fenster.getByLabel("E-Mail-Adresse")).toBeVisible();
  });

  test("der Erklärtext steht neben dem Knopf, nicht darin", async ({ page }) => {
    await page.goto(ORT);
    // Betreiber-Vorgabe 31.08.2026: Eine Beschriftung wie „Förderprogramm,
    // Leistung u. v. m. abonnieren" macht den Knopf so breit, dass er die
    // Überschrift daneben erdrückt.
    const knopf = page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first();
    // Der Knopf nennt den Ort und die Handlung — mehr nicht.
    await expect(knopf).toHaveText("Höchberg abonnieren");
    await expect(page.getByText(/Förderprogramm, Leistung/)).toBeVisible();
  });

  test("die klebende Leiste öffnet dasselbe Fenster", async ({ page }) => {
    await page.goto(ORT);

    // Die Leiste erscheint erst beim Scrollen — vorher stünde sie doppelt
    // neben dem Knopf, den sie anbietet.
    await page.mouse.wheel(0, 1200);

    const leiste = page.locator("#sc-cta-sentinel");
    await expect(leiste).toHaveCount(1); // der Merker, an dem sie sich ausblendet

    const stickyKnopf = page.getByRole("button", { name: /^Höchberg abonnieren$/ }).last();
    await expect(stickyKnopf).toBeVisible();
    await stickyKnopf.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Meldungen zu Höchberg");
  });

  test("der Block steht rechts neben der Überschrift, Knopf und Text in einer Zeile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto(ORT);

    const h1 = page.getByRole("heading", { level: 1 });
    const knopf = page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first();
    const text = page.getByText(/Förderprogramm, Leistung/);

    const [hb, kb, tb] = await Promise.all([h1.boundingBox(), knopf.boundingBox(), text.boundingBox()]);
    if (!hb || !kb || !tb) throw new Error("Element ohne Ausdehnung");

    // RECHTS DANEBEN, nicht darunter: Der Knopf beginnt rechts vom Ende der
    // Überschrift, und beide teilen sich dieselbe Zeile.
    expect(kb.x).toBeGreaterThan(hb.x + hb.width - 1);
    expect(kb.y).toBeLessThan(hb.y + hb.height);

    // Innerhalb des Blocks: Text rechts vom Knopf, auf dessen Mittellinie.
    expect(tb.x).toBeGreaterThan(kb.x + kb.width - 1);
    expect(Math.abs(kb.y + kb.height / 2 - (tb.y + tb.height / 2))).toBeLessThanOrEqual(2);

    // Der Block bleibt im sichtbaren Bereich (zum Dokument-Überlauf siehe die
    // Begründung im Mobil-Test).
    const [blockRechts, sichtbar] = await page.evaluate(() => [
      Math.round(document.querySelector(".gemeinde-abo")!.getBoundingClientRect().right),
      document.documentElement.clientWidth,
    ]);
    expect(blockRechts).toBeLessThanOrEqual(sichtbar);
  });

  test("auf schmalen Schirmen steht der Block unter der Überschrift", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(ORT);

    const h1 = page.getByRole("heading", { level: 1 });
    const knopf = page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first();
    const hb = await h1.boundingBox();
    if (!hb) throw new Error("Überschrift ohne Ausdehnung");
    const text = page.getByText(/Förderprogramm, Leistung/);
    const [kb, tb] = await Promise.all([knopf.boundingBox(), text.boundingBox()]);
    if (!kb || !tb) throw new Error("Element ohne Ausdehnung");

    // Unter die Überschrift gerutscht statt daneben.
    expect(kb.y).toBeGreaterThan(hb.y + hb.height - 1);
    // Und der Text unter den Knopf.
    expect(tb.y).toBeGreaterThan(kb.y + kb.height - 1);

    // Der Knopf nimmt die volle Breite — mit dem Daumen zu treffen.
    expect(kb.width).toBeGreaterThan(280);

    // Der Abo-Block bleibt im sichtbaren Bereich.
    //
    // GEZIELT AUF DEN BLOCK, nicht auf das ganze Dokument: Die erste Fassung maß
    // den seitlichen Überlauf der Seite und wurde dadurch flackernd — die
    // Kennzahlen-Kachelreihe darunter lädt nach und ragt auf 375 px rund 60 px
    // hinaus. Der Test war je nach Ladezeitpunkt grün oder rot und hätte am Ende
    // einen fremden Befund meinem Block angelastet. Dass die Kachelreihe
    // überläuft, ist ein eigener, bestehender Punkt.
    const blockRechts = await page.evaluate(() => {
      const b = document.querySelector(".gemeinde-abo");
      return b ? Math.round(b.getBoundingClientRect().right) : -1;
    });
    const sichtbar = await page.evaluate(() => document.documentElement.clientWidth);
    expect(blockRechts).toBeGreaterThan(0);
    expect(blockRechts).toBeLessThanOrEqual(sichtbar);
  });

  test("die Förderseite trägt dasselbe Abo", async ({ page }) => {
    // Beide Seitengattungen tragen denselben Ortsnamen und sprechen
    // verschiedene Leute an. Der Knopf ist derselbe Baustein; unterschiedlich
    // ist nur, was als Herkunft mitgeschrieben wird.
    await page.goto("/photovoltaik-foerderung/hessen/nidda");
    const knopf = page.getByRole("button", { name: /^Nidda abonnieren$/ }).first();
    await expect(knopf).toBeVisible();
    await knopf.click();
    await expect(page.getByRole("dialog")).toContainText("Meldungen zu Nidda");
  });

  test("eine unbrauchbare Adresse kommt nicht durch", async ({ page }) => {
    await page.goto(ORT);
    await page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first().click();

    const fenster = page.getByRole("dialog");
    const feld = fenster.getByLabel("E-Mail-Adresse");
    await feld.fill("keine-adresse");
    await fenster.getByRole("button", { name: "Abonnieren", exact: true }).click();

    // Der Browser hält das schon an der Feldprüfung auf; entscheidend ist, dass
    // KEINE Erfolgsmeldung erscheint.
    await expect(fenster).not.toContainText("Fast geschafft");
  });
});
