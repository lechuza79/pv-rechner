import { test, expect } from "@playwright/test";

// Rechtsaussagen müssen SICHTBAR geprüft werden, nicht nur im Quelltext
// (scripts/council-verify.md, BLOCKER). Ein Unit-Test auf den String hätte am
// 29.07.2026 nicht gefunden, dass die korrigierte Aussage in einem Feld landete,
// das nie gerendert wird.
//
// Hier geprüft: die Pflichtangaben nach Art. 13 DSGVO zum Kontaktformular. Der
// Legal-Wächter fand am 15.08.2026, dass das Formular Name, E-Mail und Nachricht
// über einen US-Versanddienstleister verschickt, die Datenschutzerklärung aber
// weder das Formular noch den Dienstleister nannte — und am Formular selbst kein
// Hinweis stand.

test.describe("Kontaktformular: Datenschutzangaben stehen dort, wo man sie liest", () => {
  test("Datenschutzerklärung nennt Formular, Empfänger, Drittland und Speicherdauer", async ({ page }) => {
    await page.goto("/datenschutz");

    await expect(page.getByRole("heading", { name: /Kontaktformular/i })).toBeVisible({ timeout: 15_000 });

    const text = await page.locator("body").innerText();

    // Empfänger mit Rechtsträger — "Resend" allein wäre als Empfängerangabe dünn.
    expect(text).toContain("Plus Five Five, Inc.");
    expect(text).toMatch(/Resend/);
    // Drittlandbezug samt Grundlage (Art. 13 Abs. 1 lit. f DSGVO).
    expect(text).toMatch(/in die USA übermittelt/);
    expect(text).toMatch(/EU-US Data Privacy Framework/);
    expect(text).toMatch(/Standardvertragsklauseln/);
    // Rechtsgrundlagen: Anfrage UND Missbrauchsabwehr (zwei Zwecke, zwei Gründe).
    expect(text).toMatch(/Art\. 6 Abs\. 1 lit\. f DSGVO/);
    // Pflichtangabe nach Art. 13 Abs. 2 lit. e DSGVO: was ist Pflicht, was nicht.
    expect(text).toMatch(/brauchen wir zwingend/);
    // Speicherdauer.
    expect(text).toMatch(/gelöscht, sobald die Anfrage erledigt ist/);

    // Die IP-Verarbeitung der Ratenbegrenzung darf nicht verschwiegen werden…
    expect(text).toMatch(/IP-Adresse der absendenden Verbindung/);
    // …und nicht stärker klingen, als der Server es tut. Das Limit zählt je
    // Serverinstanz, ist also keine Garantie ("höchstens fünf" wäre eine).
    expect(text).toMatch(/bis zu fünf Nachrichten je Stunde und Serverinstanz/);
    expect(text).not.toMatch(/Zweck ist ausschließlich/);

    // Wo auf das berechtigte Interesse gestützt wird, gehört der Verweis aufs
    // Widerspruchsrecht daneben — so hält es die Erklärung auch bei der
    // Reichweitenmessung.
    expect(text).toMatch(/kannst du jederzeit widersprechen \(Abschnitt 12\)/);
  });

  test("Der alte E-Mail-Abschnitt widerspricht dem Formular-Abschnitt nicht mehr", async ({ page }) => {
    await page.goto("/datenschutz");
    await expect(page.getByRole("heading", { name: /Kontakt per E-Mail/i })).toBeVisible({ timeout: 15_000 });

    const text = await page.locator("body").innerText();
    const abschnitt = text.slice(text.indexOf("11. Kontakt per E-Mail"), text.indexOf("12. Deine Rechte"));

    // Vorher: "werden … gespeichert" ohne jedes Löschkriterium, und die
    // Rechtsgrundlagen in umgekehrter Reihenfolge — zwei Begründungen für
    // denselben Vorgang.
    expect(abschnitt).toMatch(/gelöscht, sobald die Anfrage erledigt ist/);
    expect(abschnitt).toMatch(/lit\. f DSGVO[\s\S]*lit\. b DSGVO/);
  });

  test("Am Formular selbst steht der Hinweis mit Verweis auf die Erklärung", async ({ page }) => {
    await page.goto("/kontakt");

    const hinweis = page.getByText(/Deine Angaben gehen per E-Mail an uns/i);
    await expect(hinweis).toBeVisible({ timeout: 15_000 });
    await expect(hinweis).toContainText(/Resend/);

    // Der Verweis muss klickbar auf die Erklärung führen — ein Hinweis ohne Ziel
    // erfüllt die Informationspflicht nicht.
    const link = hinweis.getByRole("link", { name: /Datenschutzerklärung/i });
    await expect(link).toHaveAttribute("href", "/datenschutz");
  });
});
