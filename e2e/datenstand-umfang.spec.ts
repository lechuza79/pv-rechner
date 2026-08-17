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

    // Der überzogene Satz darf nicht zurückkommen.
    expect(text).not.toMatch(/steht jeder Wert/);
    expect(text).not.toMatch(/alle Werte, mit denen wir rechnen/i);

    // Stattdessen: Was da ist, und wie man an den Rest kommt.
    expect(text).toMatch(/worauf wir rechnen, woher sie stammt und wie alt sie ist/);
    expect(text).toMatch(/auf Anfrage/);
    // Der Weg zu den Zahlen wird benannt — sonst liest sich der Umbau als
    // Rückzug hinter eine Mauer.
    expect(text).toMatch(/Rechner gibt sie mit dem Ergebnis aus/);
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
