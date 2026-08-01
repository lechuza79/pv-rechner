import { test, expect } from "@playwright/test";

// Die Beschriftung der Ranglisten — geprüft DA, WO EIN NUTZER SIE LIEST.
//
// Warum als Browser-Test und nicht nur als Unit-Test: Alle vier Befunde hier
// entstehen erst beim Zusammensetzen auf der Seite. Ein Unit-Test auf
// `spanneVon` oder `spaltenKopfVon` sieht nicht, ob die Seite die Funktion auch
// aufruft — am 29.07.2026 landete genau so eine Textkorrektur in einem Feld,
// das nie gerendert wird: Diff richtig, Seite falsch, Unit-Test grün.
//
// Dazu kommt: Die schwerste Fehlerklasse dieser Seiten war im
// Entwicklungs-Server unsichtbar (alle Ranking-Adressen antworteten in der
// gebauten Fassung mit Fehler 500, weil die Seite Werte aus der Adresszeile
// las). Ein Test, der die Seiten wirklich öffnet, ist die Gegenprobe.

test.describe("Ranglisten: die Beschriftung sagt, was gerechnet wird", () => {
  test("Größenklassen überlappen an keiner Grenze", async ({ page }) => {
    // „1.000–5.000" über der einen und „5.000–20.000" über der nächsten Klasse
    // beanspruchten denselben Ort für beide. Gerechnet wird die Obergrenze
    // exklusiv: Ein Ort mit genau 5.000 Einwohnern gehört zur oberen Klasse.
    await page.goto("/solar-atlas/ranking/solarleistung-je-einwohner");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });

    const text = await page.locator("body").innerText();
    // Die Spannen stehen als Überschrift über den Spitzenreiter-Kacheln.
    expect(text).toContain("1.000–4.999");
    expect(text).toContain("5.000–19.999");
    expect(text).toContain("20.000–99.999");
    // Und die alten, überlappenden Formen sind weg.
    expect(text).not.toContain("1.000–5.000");
    expect(text).not.toContain("5.000–20.000");
    expect(text).not.toContain("20.000–100.000");
  });

  test("der Spaltenkopf nennt denselben Nenner wie die Werte darunter", async ({ page }) => {
    // „je Einwohner" stand über Werten der Form „38,1 je 1.000 Ew." — die
    // Beschriftung verfehlte den Wert um den Faktor tausend.
    await page.goto("/solar-atlas/ranking/balkonkraftwerke-je-einwohner/doerfer");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });

    // GEZIELT DIE KOPFZEILE, nicht die ganze Seite: Im Menü darüber steht die
    // Kategorie „Speicher je Einwohner" — eine Gegenprobe am Gesamttext würde
    // an diesem Menüpunkt scheitern und hätte mit der Spalte nichts zu tun.
    const kopfzeile = page.locator('div:has(> span:text-is("Platz"))').first();
    await expect(kopfzeile).toBeVisible();
    // Ohne Rücksicht auf Groß-/Kleinschreibung: Die Kopfzeile wird per CSS in
    // Versalien gesetzt, und innerText liefert genau das, was zu sehen ist.
    const kopf = await kopfzeile.innerText();
    expect(kopf).toMatch(/je 1\.000 Ew\./i);
    expect(kopf).not.toMatch(/je Einwohner/i);

    // Und die Werte in der Spalte tragen denselben Nenner.
    const ersteZeile = await page.locator("ol li").first().innerText();
    expect(ersteZeile).toContain("je 1.000 Ew.");
  });

  test("nennt die Stadtstaaten mit, statt 16 Landeshauptstädte zu behaupten", async ({ page }) => {
    // „Landeshauptstadt" ist eine kommunalrechtliche Bezeichnung, die einer
    // STADT verliehen wird. Berlin, Hamburg und Bremen sind Stadtstaaten und
    // führen sie nicht — es sind dreizehn, nicht sechzehn.
    await page.goto("/solar-atlas/ranking/solarleistung-je-einwohner/landeshauptstaedte");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });

    const text = await page.locator("body").innerText();
    // „16 Landeshauptstädte und Stadtstaaten sind gewertet" ist richtig — es
    // sind sechzehn Orte, und der Sammelbegriff nennt beide Sorten. Falsch ist
    // allein die Behauptung, alle sechzehn wären Landeshauptstädte.
    expect(text).not.toMatch(/16 Landeshauptstädte(?! und Stadtstaaten)/);
    expect(text).toMatch(/13 Landeshauptstädte und 3 Stadtstaaten/);
  });

  test("beugt den Numerus mit, wenn genau ein Ort gewertet ist", async ({ page }) => {
    // „1 Landeshauptstädte … sind gewertet" stand so auf jeder Bundesland-Liste
    // mit genau einem Treffer — also auf fast allen. Grammatik ist Teil der
    // Richtigkeit, „1 neue Anlagen" ist derselbe Fehler in Worten.
    await page.goto("/solar-atlas/ranking/solarleistung-je-einwohner/landeshauptstaedte/schleswig-holstein");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });

    const text = await page.locator("body").innerText();
    // Entweder die Liste hat genau einen Treffer — dann muss der Satz im
    // Singular stehen — oder mehrere, dann im Plural. Falsch ist nur die
    // Mischung.
    const einzel = /\b1 Landeshauptstadt oder Stadtstaat\b[^.]*\bist gewertet/;
    const mehrere = /\b\d+ Landeshauptstädte und Stadtstaaten\b[^.]*\bsind gewertet/;
    expect(einzel.test(text) || mehrere.test(text), text.slice(0, 600)).toBe(true);
    // Der konkrete Fehler darf nicht zurückkommen.
    expect(text).not.toMatch(/\b1 Landeshauptstädte/);
    expect(text).not.toMatch(/\b1 [^.]{0,40} sind gewertet/);
  });

  test("zählt die ausgeschlossenen Orte in derselben Gruppe, die daneben gewertet wird", async ({ page }) => {
    // „80 Großstädte sind gewertet … 1.398 Orte bleiben außen vor" — gezählt
    // wurde über das ganze Gebiet, gezeigt neben einer nach Größe gefilterten
    // Liste. Gemessen am 01.08.2026 gehören diese ~1.393 Orte ausnahmslos zur
    // Klasse „Dörfer"; auf der Großstadt-Liste hatten sie nie etwas verloren.
    //
    // Geprüft wird die Kategorie mit Größenprüfung (Speicher je Dachanlage) —
    // nur dort entsteht der Satz überhaupt.
    const zahl = (s: string) => Number(s.replace(/\./g, ""));
    const lies = async (klasse: string) => {
      await page.goto(`/solar-atlas/ranking/speicher-je-dachanlage/${klasse}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
      const text = await page.locator("body").innerText();
      const gewertet = /([\d.]+) [^.]{3,40} (?:ist|sind) gewertet/.exec(text);
      expect(gewertet, `Einleitungssatz fehlt auf ${klasse}`).toBeTruthy();
      const aussen = /([\d.]+) Orte? bleib(?:en|t) außen vor/.exec(text);
      return { gewertet: zahl(gewertet![1]), aussen: aussen ? zahl(aussen[1]) : 0, satz: text.slice(0, 400) };
    };

    // Bei den Dörfern sitzt die Masse der ausgeschlossenen Orte — dort MUSS der
    // Satz stehen, sonst prüft der Test unten nichts.
    const doerfer = await lies("doerfer");
    expect(doerfer.aussen, `Dörfer ohne Ausschluss-Satz: ${doerfer.satz}`).toBeGreaterThan(100);

    // Und bei den Großstädten dürfen genau diese Dörfer nicht mehr auftauchen.
    const gross = await lies("grossstaedte");
    expect(gross.aussen, `${gross.aussen} ausgeschlossen neben ${gross.gewertet} Großstädten`).toBeLessThanOrEqual(
      gross.gewertet,
    );
    expect(gross.aussen, "die Dörfer stehen wieder auf der Großstadt-Liste").toBeLessThan(doerfer.aussen);
  });
});
