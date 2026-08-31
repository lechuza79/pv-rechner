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

    const knopf = page.getByRole("button", { name: "Abonnieren", exact: true }).first();
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
    const knopf = page.getByRole("button", { name: "Abonnieren", exact: true }).first();
    await expect(knopf).toHaveText("Abonnieren");
    await expect(page.getByText(/Förderprogramm, Leistung/)).toBeVisible();
  });

  test("die klebende Leiste öffnet dasselbe Fenster", async ({ page }) => {
    await page.goto(ORT);

    // Die Leiste erscheint erst beim Scrollen — vorher stünde sie doppelt
    // neben dem Knopf, den sie anbietet.
    await page.mouse.wheel(0, 1200);

    const leiste = page.locator("#sc-cta-sentinel");
    await expect(leiste).toHaveCount(1); // der Merker, an dem sie sich ausblendet

    const stickyKnopf = page.getByRole("button", { name: "Abonnieren", exact: true }).last();
    await expect(stickyKnopf).toBeVisible();
    await stickyKnopf.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Meldungen zu Höchberg");
  });

  test("Knopf und Text sitzen in einer Zeile, bündig zur Überschrift", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto(ORT);

    const h1 = page.getByRole("heading", { level: 1 });
    const knopf = page.getByRole("button", { name: "Abonnieren", exact: true }).first();
    const text = page.getByText(/Förderprogramm, Leistung/);

    const [hb, kb, tb] = await Promise.all([
      h1.boundingBox(),
      knopf.boundingBox(),
      text.boundingBox(),
    ]);
    if (!hb || !kb || !tb) throw new Error("Element ohne Ausdehnung");

    // Linksbündig zur Überschrift.
    expect(Math.abs(kb.x - hb.x)).toBeLessThanOrEqual(1);

    // EINE Zeile: Der Text beginnt rechts vom Knopf, nicht darunter.
    expect(tb.x).toBeGreaterThan(kb.x + kb.width - 1);

    // Auf der Mitte des Knopfes, nicht an seiner Oberkante — sonst läuft die
    // Zeile optisch auseinander. Zwei Pixel Toleranz für die Schriftmetrik.
    const mitteKnopf = kb.y + kb.height / 2;
    const mitteText = tb.y + tb.height / 2;
    expect(Math.abs(mitteKnopf - mitteText)).toBeLessThanOrEqual(2);

    // Luft nach oben und unten: nicht angeklebt, nicht verloren.
    const abstandOben = kb.y - (hb.y + hb.height);
    expect(abstandOben).toBeGreaterThan(0);
    expect(abstandOben).toBeLessThan(40);
  });

  test("auf schmalen Schirmen bricht der Text unter den Knopf", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(ORT);

    const knopf = page.getByRole("button", { name: "Abonnieren", exact: true }).first();
    const text = page.getByText(/Förderprogramm, Leistung/);
    const [kb, tb] = await Promise.all([knopf.boundingBox(), text.boundingBox()]);
    if (!kb || !tb) throw new Error("Element ohne Ausdehnung");

    // Gestapelt statt nebeneinander.
    expect(tb.y).toBeGreaterThan(kb.y + kb.height - 1);

    // Der Knopf nimmt die volle Breite — mit dem Daumen zu treffen.
    expect(kb.width).toBeGreaterThan(280);

    // Und nichts läuft seitlich über.
    const ueberlauf = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(ueberlauf).toBeLessThanOrEqual(0);
  });

  test("eine unbrauchbare Adresse kommt nicht durch", async ({ page }) => {
    await page.goto(ORT);
    await page.getByRole("button", { name: "Abonnieren", exact: true }).first().click();

    const fenster = page.getByRole("dialog");
    const feld = fenster.getByLabel("E-Mail-Adresse");
    await feld.fill("keine-adresse");
    await fenster.getByRole("button", { name: "Abonnieren" }).click();

    // Der Browser hält das schon an der Feldprüfung auf; entscheidend ist, dass
    // KEINE Erfolgsmeldung erscheint.
    await expect(fenster).not.toContainText("Fast geschafft");
  });
});
