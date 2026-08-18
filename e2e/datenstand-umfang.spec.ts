import { test, expect } from "@playwright/test";

// Die Datenstand-Seite zeigt seit dem 17.08.2026 nicht mehr jeden Einzelwert
// (Entscheidung des Betreibers). Zwei Dinge müssen dabei zusammenpassen, und
// beide sind im Browser prüfbar, nicht im Diff:
//
//   1. Was die Seite VERSPRICHT, muss sie halten. Vorher stand dort "Hier steht
//      jeder Wert, der in die Berechnung einfließt" — nach dem Umbau wäre das
//      eine Falschaussage gewesen, ausgerechnet auf der Seite, die für die
//      Ehrlichkeit der Zahlen bürgt. Ein Satz, der zu viel verspricht, ist hier
//      schlimmer als eine fehlende Tabelle.
//   2. Was BLEIBEN muss, muss bleiben: Quellenangabe und Stand je Größe. Die
//      Quellennennung ist Lizenzbedingung unserer Datengeber (dl-de/by-2-0,
//      CC BY), keine Höflichkeit — sie darf beim Aufräumen nicht mitgehen.
//      Zwölf andere Seiten verweisen außerdem hierher, mehrere lagern ihre
//      Stand-Pflicht per Verweis aus.

test.describe("Datenstand: Umfang und Versprechen", () => {
  test("verspricht nicht mehr, als die Seite zeigt", async ({ page }) => {
    await page.goto("/datenstand");
    await expect(page.getByRole("heading", { name: "Datenstand", exact: true })).toBeVisible({
      timeout: 15_000,
    });

    const text = await page.locator("body").innerText();

    // Auf Muster prüfen, nicht auf Wortlaut. Die erste Fassung dieses Tests
    // verbot "alle Werte, mit denen wir rechnen" — und übersah die Trust-Leiste
    // wenige Pixel darunter, die "Alle Annahmen, mit denen wir rechnen" sagte.
    // Ein Wort daneben, Test grün, Falschaussage auf jeder Seite der Site.
    expect(text).not.toMatch(/steht jeder Wert/);
    expect(text).not.toMatch(/(alle|jede[rs]?|sämtliche)\s+\w*\s*(werte?|annahmen)[^.]{0,30}(stehen offen|im Überblick|offengelegt)/i);

    // Stattdessen: Was da ist, und wie man an den Rest kommt.
    expect(text).toMatch(/worauf wir rechnen, woher sie stammt und wie alt sie ist/);
    expect(text).toMatch(/auf Anfrage/);

    // Der Ersatztext darf nicht selbst etwas Falsches versprechen. Die erste
    // Fassung behauptete pauschal, man bekomme die Zahlen im Rechner und könne
    // sie dort überschreiben — beim Wärmepumpen-Rechner sind es 7 von 15
    // Größen, bei der historischen Vergütungsreihe gibt es überhaupt keinen
    // Rechner. Und dieser Test nagelte den falschen Satz auch noch als
    // erwünscht fest.
    expect(text).not.toMatch(/kann sie dort überschreiben/);
    expect(text).not.toMatch(/Rechner gibt sie mit dem Ergebnis aus/);
    expect(text).not.toMatch(/Alle Werte im Ergebnis editierbar/);
  });

  // Die Zurückhaltung muss dort wirken, wo sie behauptet wird. Bei der
  // historischen Vergütungsreihe tat sie das nicht: Dieselben Werte stehen auf
  // /einspeiseverguetung-tabelle vollständig. Sie hier einzuklappen kostete die
  // Zusage und täuschte eine Zurückhaltung vor, die es nicht gibt.
  test("hält nur zurück, wo es auch wirkt", async ({ page }) => {
    await page.goto("/datenstand");
    await expect(page.getByRole("heading", { name: "Datenstand", exact: true })).toBeVisible({
      timeout: 15_000,
    });

    const text = await page.locator("body").innerText();
    // Die historische Reihe steht wieder offen — mindestens der erste und der
    // letzte Jahrgang sind lesbar.
    expect(text).toMatch(/\b2000\b/);
    expect(text).toMatch(/50,62|ct\/kWh/);
  });

  test("Quelle und Stand stehen weiter bei jeder Größe", async ({ page }) => {
    await page.goto("/datenstand");
    await expect(page.getByRole("heading", { name: "Datenstand", exact: true })).toBeVisible({
      timeout: 15_000,
    });

    const text = await page.locator("body").innerText();

    // Lizenzpflichtige Quellennennung — die Datengeber verlangen sie.
    expect(text).toMatch(/Fraunhofer ISE/);
    expect(text).toMatch(/Marktstammdatenregister|Bundesnetzagentur/);

    // Jede Sektion trägt ihren Stand. Mindestens so viele "Stand"-Marker wie
    // Sektionsüberschriften.
    const staende = (text.match(/Stand /g) ?? []).length;
    expect(staende, "Stand-Angabe je Sektion fehlt").toBeGreaterThanOrEqual(8);

    // Und die Quellenzeilen ebenso.
    const quellen = (text.match(/Quelle: /g) ?? []).length;
    expect(quellen, "Quellenangabe je Sektion fehlt").toBeGreaterThanOrEqual(8);
  });

  test("die Werte, die im Rechner ohnehin offen sind, bleiben sichtbar", async ({ page }) => {
    await page.goto("/datenstand");
    await expect(page.getByRole("heading", { name: "Datenstand", exact: true })).toBeVisible({
      timeout: 15_000,
    });

    const text = await page.locator("body").innerText();

    // Preise und Vergütungssätze zu verbergen kostete Vertrauen, ohne etwas zu
    // schützen: Der Rechner zeigt sie im Ergebnis und lässt sie überschreiben.
    // Beide Blöcke tragen ihre Tabelle also weiter.
    expect(text).toMatch(/€\/kWp/);
    expect(text).toMatch(/ct\/kWh/);
    expect(text).toMatch(/Haushaltsstrompreis/);
  });

  test("die Grüngas-Rechtsstände bleiben vollständig lesbar", async ({ page }) => {
    await page.goto("/datenstand");
    await expect(page.getByRole("heading", { name: "Datenstand", exact: true })).toBeVisible({
      timeout: 15_000,
    });

    const text = await page.locator("body").innerText();

    // Dieser Block wird bewusst NICHT eingeklappt: Er trägt Rechtsaussagen zur
    // Beimischpflicht samt der Trennung zwischen Gesetz und Studienannahme.
    // Sie hinter "auf Anfrage" zu schieben wäre ein Rückschritt gegenüber der
    // Offenlegungspflicht, die für Rechtsstände gilt.
    expect(text).toMatch(/Beimischpflicht laut § 43 GModG/);
    expect(text).toMatch(/nicht im Gesetz/);
  });
});
