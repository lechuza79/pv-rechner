import { test, expect } from "@playwright/test";

// Rechtsaussagen müssen SICHTBAR geprüft werden, nicht nur im Quelltext
// (scripts/council-verify.md, BLOCKER). Auslöser am 29.07.2026: Eine
// Textkorrektur landete in einem Feld, das nie gerendert wird — der Diff war
// richtig, die Seite zeigte weiter den alten Satz, und ein Unit-Test auf den
// String hätte es nicht gefunden.
//
// Hier geprüft: der Sachstand der EEG-Reform 2027. Das Kabinett hat den Entwurf
// am 29.07.2026 beschlossen; bis dahin stand auf vier Oberflächen, der Weg
// "durch Kabinett, Bundestag und Bundesrat" stehe noch aus.

test.describe("EEG-Reform: Sachstand auf den Seiten, an denen ein Nutzer ihn liest", () => {
  test("Ratgeber zeigt den Kabinettsbeschluss, trennt Entwurf von Gesetz und begrenzt die 50-Prozent-Regel", async ({ page }) => {
    await page.goto("/ratgeber/lohnt-sich-pv-ohne-einspeiseverguetung");

    const block = page.getByRole("heading", { name: /Was gerade geplant ist/i });
    await expect(block).toBeVisible({ timeout: 15_000 });

    const text = await page.locator("body").innerText();

    // Der erfolgte Schritt steht da…
    expect(text).toContain("29. Juli 2026");
    expect(text).toMatch(/im Kabinett beschlossen/);
    // …und wird nicht mit "Gesetz" verwechselt.
    expect(text).toMatch(/Gesetzentwurf/);
    expect(text).toMatch(/nicht das Gesetz|Geltendes Recht ist nichts davon/);

    // Der überholte Verfahrenssatz darf nicht zurückkommen.
    expect(text).not.toMatch(/Weg durch Kabinett/);
    expect(text).not.toMatch(/Referentenentwurf des Bundeswirtschaftsministeriums/);
    // EEG-Novellen sind Einspruchsgesetze — keine Zustimmungspflicht behaupten.
    expect(text).not.toMatch(/Bundesrat (müssen|muss) zustimmen/);
    // Kein Beratungstermin: den hat keine amtliche Stelle genannt.
    expect(text).not.toMatch(/im September 2026 beginnen/);

    // Die 50-Prozent-Grenze gilt nach § 9 Abs. 2b nur für Neuanlagen und ist ein
    // Anteil der installierten Leistung. Ohne beides liest ein PV-Besitzer, seine
    // laufende Anlage werde gekappt bzw. verliere die Hälfte des Ertrags.
    expect(text).toMatch(/50 Prozent ihrer installierten Leistung/);
    expect(text).toMatch(/neuer<?\/?e?m?>? ?Dachanlagen|neuer Dachanlagen/);
    expect(text).toMatch(/laufende Anlagen nicht|bereits in Betrieb/);

    // Entwurfs-Detailwerte sind als solche gekennzeichnet.
    expect(text).toMatch(/nur im Entwurf stehen|stammen aus dem Entwurf|Detailwerte/);
    expect(text).toContain("18. Juli 2026");
    // Die Staffel mit ausgeschriebener Einheit (die Seite nutzt sonst kWp).
    expect(text).toMatch(/2027 unter 50, 2028 unter 25 und 2029 unter 7 Kilowatt installierter Leistung/);
    // Nach 2030 ist nicht endgültig Schluss (§ 85 Abs. 2 Nr. 2a).
    expect(text).toMatch(/verlängern/);
  });

  test("Rechner-Ergebnis nennt den Sachstand, sobald eingespeist wird", async ({ page }) => {
    await page.goto("/photovoltaik-rechner");

    // Durch den Flow klicken — dieselbe Mechanik wie in rechner.spec.ts.
    for (let i = 0; i < 12; i++) {
      const weiter = page.getByRole("button", { name: /^weiter$/i });
      if (!(await weiter.count())) break;
      await weiter.first().click();
    }
    const rechnen = page.getByRole("button", { name: /berechnen|ergebnis|fertig/i });
    if (await rechnen.count()) await rechnen.first().click();

    // [\s\S] statt dem s-Flag: das Test-Target ist ES2017.
    const notiz = page.getByText(/Einspeisevergütung:[\s\S]*Bestandsschutz/).first();
    await expect(notiz).toBeVisible({ timeout: 15_000 });
    const text = await notiz.innerText();

    expect(text).toContain("29. Juli 2026");
    expect(text).toMatch(/Gesetzentwurf beschlossen/);
    expect(text).toMatch(/Bundestag muss noch entscheiden/);
    // Die alte Formulierung behauptete implizit, das Kabinett stehe noch aus.
    expect(text).not.toMatch(/beschlossen ist er noch nicht/i);
    expect(text).not.toMatch(/Bundesrat (müssen|muss) zustimmen/);
  });

  test("Zubau-Datenstory: die 2027-Marke nennt den Kabinettsbeschluss", async ({ page }) => {
    await page.goto("/photovoltaik-zubau-deutschland");

    // Die Marke sitzt in der Ereignis-Timeline (ARIA-Tabs, alle Panels im DOM).
    const tab = page.getByRole("tab", { name: /EEG-Reform/i }).first();
    await expect(tab).toBeVisible({ timeout: 15_000 });
    await tab.click();

    const text = await page.locator("body").innerText();
    expect(text).toContain("29. Juli 2026");
    expect(text).toMatch(/Gesetz ist er noch nicht/);
    expect(text).not.toMatch(/Ein Referentenentwurf sieht vor/);
  });
});
