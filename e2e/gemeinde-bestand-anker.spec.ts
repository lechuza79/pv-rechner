import { test, expect } from "@playwright/test";

//
// DER VERWEIS AUS DEM EINLEITUNGSTEXT MUSS DEN UMSCHALTER STELLEN.
//
// Der erste Absatz einer Gemeindeseite nennt im Konfliktfall zwei Messgrößen
// nebeneinander („auf den privaten Dächern … jedoch … für alle Anlagen") und
// verweist mit jeder auf ihre Stellung im Bestandsblock. Springt der Verweis
// nur an den Block, ohne umzuschalten, sieht der Leser andere Zahlen als die,
// deretwegen er geklickt hat — also genau die Verwechslung, gegen die der
// Verweis gebaut ist.
//
// WARUM DAS EIN BROWSER-TEST SEIN MUSS: Ein toter Anker sieht nirgends nach
// einem Fehler aus. Der Unit-Test kann prüfen, dass der Satz auf „privat"
// zeigt, und die Komponente kann den Anker setzen — ob die Adresse den
// Umschalter am Ende wirklich stellt, hängt an der Hydratation und ist nur im
// Browser zu sehen. Der Rauteteil erreicht den Server nie.
//
// Melsungen ist bewusst als ADRESSE gewählt, nicht als Datenfall: Geprüft wird
// die Mechanik (Adresse → Stellung), die auf jeder Gemeindeseite gleich ist.
// Ob dieser Ort gerade den Konfliktsatz trägt, hängt am Datenstand und wäre
// eine wackelige Zusage — das prüft der Unit-Test an festen Zahlen.
const ORT = "/solar-atlas/hessen/landkreis-schwalm-eder-kreis/melsungen";

/** Die aktive Stellung des Eigentümer-Umschalters, am eingefärbten Knopf
 *  abgelesen — also da, wo ein Nutzer sie auch sieht. */
async function aktiveStellung(page: import("@playwright/test").Page): Promise<string[]> {
  const karte = page.locator("#bestand-privat").locator("xpath=..");
  return karte.locator("button", { hasText: /^(Alle|Privat|Gewerbe)$/ }).evaluateAll((els) =>
    els
      .filter((el) => getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)")
      .map((el) => el.textContent?.trim() ?? ""),
  );
}

test.describe("Bestandsblock: die Adresse stellt den Umschalter", () => {
  test("alle drei Sprungziele stehen im ausgelieferten HTML", async ({ page }) => {
    // Ohne JavaScript gibt es kein Umschalten, aber der Sprung muss trotzdem
    // ankommen — ein Link ins Leere ist schlechter als einer ohne Wirkung.
    await page.goto(ORT);
    for (const stellung of ["alle", "privat", "gewerbe"]) {
      await expect(page.locator(`#bestand-${stellung}`)).toHaveCount(1);
    }
  });

  test("ohne Rauteteil bleibt es bei „Alle“", async ({ page }) => {
    await page.goto(ORT);
    await expect(page.locator("#bestand-privat")).toHaveCount(1);
    await expect.poll(() => aktiveStellung(page)).toEqual(["Alle"]);
  });

  test("mit #bestand-privat steht der Umschalter auf „Privat“", async ({ page }) => {
    await page.goto(`${ORT}#bestand-privat`);
    await expect.poll(() => aktiveStellung(page)).toEqual(["Privat"]);
  });

  //
  // DER VERWEIS MUSS AUCH DIE BEZUGSGRÖSSE MITBRINGEN.
  //
  // Der Einleitungssatz vergleicht mit dem BUNDESLAND, die Kacheln von Haus
  // aus mit dem LANDKREIS. Ohne diesen Schritt führte der Verweis „39 % über
  // dem Hessen-Schnitt" auf eine Kachel mit „−28 %" — beides richtig, beides
  // eine andere Bezugsgröße. Gemessen an Melsungen, und genau so vom Betreiber
  // im Browser bemängelt.
  //
  // Geprüft wird die BEZUGSGRÖSSE, nicht der Prozentwert: Der hängt am
  // Datenstand, die Bezugsgröße an dieser Mechanik.
  test("mit der Stellung kommt die Bezugsgröße des Satzes mit", async ({ page }) => {
    await page.goto(ORT);
    const tendenz = page.locator("text=/Tendenz: je Einwohner gegenüber dem Durchschnitt/").first();
    await expect(tendenz).toContainText("Schwalm-Eder-Kreis");

    await page.click('a[href="#bestand-privat"]');
    await expect.poll(() => aktiveStellung(page)).toEqual(["Privat"]);
    await expect(tendenz).toContainText("Hessen");
  });

  //
  // DIE LISTE FOLGT DER BEZUGSGRÖSSE MIT.
  //
  // Ohne das vergleicht die eine Hälfte der Karte mit Hessen und die andere mit
  // dem Landkreis — an Melsungen gemessen: „+39 %" über einer Liste, in der der
  // Ort auf dem letzten Platz stand. Der Betreiber hat es zweimal im Browser
  // bemängelt, bevor es gebaut war.
  //
  // Geprüft werden die GRUPPE und dass die eigene Zeile mitkommt, nicht die
  // Platzziffer: Die hängt am Datenstand, die Mechanik an diesem Code.
  test("die Nachbarschafts-Liste wechselt auf die Landesgruppe", async ({ page }) => {
    await page.goto(ORT);
    const titel = page.locator("text=/^Gemeinden und Kleinstädte /").first();
    await expect(titel).toContainText("Schwalm-Eder-Kreis");

    await page.click('a[href="#bestand-privat"]');
    await expect.poll(() => aktiveStellung(page)).toEqual(["Privat"]);
    // Nachladen über /api/atlas/nachbarn — deshalb großzügig warten.
    await expect(titel).toContainText("in Hessen", { timeout: 15_000 });

    // Die eigene Zeile MUSS dabei sein, sonst zeigt die Liste eine
    // Vergleichsgruppe ohne die Zeile, um die es geht.
    const karte = page.locator("#bestand-privat").locator("xpath=..");
    await expect(karte).toContainText("Melsungen");
    // Und der Nenner des Platzes steht daneben: Ohne ihn ist „Platz 135" keine
    // Einordnung. Ein Fenster „Vollständige Rangliste" gibt es hier bewusst
    // nicht — der Browser kennt nur die fünf Zeilen.
    await expect(karte).toContainText(/Kommunen in dieser Gruppe/);
  });

  test("ein Klick auf den Verweis im Text schaltet um — und zurück", async ({ page }) => {
    await page.goto(ORT);
    await expect.poll(() => aktiveStellung(page)).toEqual(["Alle"]);

    // Nicht über den Textlink klicken: Ob der Einleitungssatz gerade beide
    // Messgrößen nennt, hängt am Datenstand (siehe oben). Geprüft wird, dass
    // eine ÄNDERUNG des Rauteteils wirkt — das ist es, was ein Klick auslöst.
    await page.evaluate(() => {
      window.location.hash = "bestand-privat";
    });
    await expect.poll(() => aktiveStellung(page)).toEqual(["Privat"]);

    // Der zweite Verweis muss auch wirken. Ohne den `hashchange`-Zuhörer wirkt
    // nur der erste, weil ein reiner Rauteteil-Wechsel kein Neuladen auslöst —
    // ein Fehler, den man beim einmaligen Ausprobieren nicht bemerkt.
    await page.evaluate(() => {
      window.location.hash = "bestand-alle";
    });
    await expect.poll(() => aktiveStellung(page)).toEqual(["Alle"]);
  });

  test("ein fremder Rauteteil setzt den Umschalter nicht zurück", async ({ page }) => {
    await page.goto(ORT);
    // ERST den geladenen Zustand abwarten, DANN den Rauteteil setzen: Eine
    // Zuweisung an `location.hash` während die Seite noch streamt geht
    // verloren — gemessen, nicht vermutet. Für einen echten Leser spielt das
    // keine Rolle (er klickt auf eine fertige Seite), für einen Test schon:
    // ohne dieses Abwarten prüft er eine Zuweisung, die nie ankam.
    await expect.poll(() => aktiveStellung(page)).toEqual(["Alle"]);
    await page.evaluate(() => {
      window.location.hash = "bestand-gewerbe";
    });
    await expect.poll(() => aktiveStellung(page)).toEqual(["Gewerbe"]);

    await page.evaluate(() => {
      window.location.hash = "irgendwas-anderes";
    });
    // Bleibt stehen, statt auf „Alle" zurückzufallen: Ein Anker, der uns nichts
    // sagt, ist kein Grund, die Auswahl des Lesers wegzuwerfen.
    await expect.poll(() => aktiveStellung(page)).toEqual(["Gewerbe"]);
  });
});
