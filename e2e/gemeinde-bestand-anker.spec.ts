import { test, expect, type Page } from "@playwright/test";
import { GEMEINDE_ANKER_ORT } from "./routen";

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
const ORT = GEMEINDE_ANKER_ORT;

/** Die Karte um den Bestandsblock — Bezugspunkt für alles hier drin. */
function karte(page: Page) {
  return page.locator("#bestand-privat").locator("xpath=..");
}

/** Die aktive Stellung des Eigentümer-Umschalters, am eingefärbten Knopf
 *  abgelesen — also da, wo ein Nutzer sie auch sieht. */
async function aktiveStellung(page: Page): Promise<string[]> {
  return karte(page)
    .locator("button", { hasText: /^(Alle|Privat|Gewerbe)$/ })
    .evaluateAll((els) =>
      els
        .filter((el) => getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)")
        .map((el) => el.textContent?.trim() ?? ""),
    );
}

function stellungsKnopf(page: Page, stellung: "Alle" | "Privat" | "Gewerbe") {
  return karte(page)
    .locator("button")
    .filter({ hasText: new RegExp(`^${stellung}$`) });
}

/**
 * WARTET, BIS DER UMSCHALTER NICHT NUR DA, SONDERN BEDIENBAR IST.
 *
 * „Alle" steht schon im ausgelieferten HTML — der Baustein startet mit dieser
 * Stellung, der Server rendert sie mit. Darauf zu warten belegt also nur, dass
 * gezeichnet wurde, nicht dass React die Seite übernommen hat. Genau das war
 * die Lücke: Beide Tests weiter unten warteten auf „Alle" und setzten dann den
 * Rauteteil — im CI fielen sie deshalb im ERSTEN Versuch durch, und ob der Lauf
 * am Ende grün war, entschied allein der Wiederholungsversuch.
 *
 * WAS IN DIESEM FENSTER PASSIERT, IST GEMESSEN (24.08.2026, gegen die
 * Produktion, CPU 20-fach gedrosselt, vier Läufe): Wer den Rauteteil dort
 * setzt, verliert ihn zweimal. Der Zuhörer des Bausteins hängt noch nicht, der
 * Wechsel verpufft also — und unmittelbar danach schreibt der Router die
 * Adresse auf den Pfad OHNE Rauteteil zurück (`replaceState`, aufgezeichnet mit
 * „vorher: #bestand-gewerbe"). Der Effekt, der die Adresse beim Übernehmen
 * liest, findet dann nichts mehr. Es wird also nicht spät richtig, sondern gar
 * nicht: In drei der vier Läufe stand danach wieder „Alle" und die Adresse war
 * leer; im vierten kam der Router der Zuweisung zuvor, und alles ging gut.
 *
 * Länger warten wäre deshalb die falsche Antwort — gewartet würde auf etwas,
 * das nicht mehr kommt.
 *
 * DER NACHWEIS IST EIN KLICK, DER WIRKT: Ein Zustandswechsel kann nur aus React
 * kommen, die Übernahme ist damit durch. Gegengemessen im selben Lauf — nach
 * diesem Nachweis kam die Zuweisung bei jeder Drosselstufe an, auch bei
 * 20-facher. Danach wird zurückgestellt, damit jeder Test von derselben
 * Ausgangslage aus prüft wie zuvor; was geprüft wird, bleibt unverändert.
 */
async function umschalterBedienbar(page: Page) {
  await expect.poll(() => aktiveStellung(page), { timeout: 30_000 }).toEqual(["Alle"]);
  await expect
    .poll(
      async () => {
        // Vor der Übernahme verpufft der Klick, danach wirkt er — deshalb im
        // Takt der Prüfung wiederholen statt einmal blind zu klicken.
        await stellungsKnopf(page, "Gewerbe").click();
        return aktiveStellung(page);
      },
      { timeout: 30_000 },
    )
    .toEqual(["Gewerbe"]);
  await stellungsKnopf(page, "Alle").click();
  await expect.poll(() => aktiveStellung(page)).toEqual(["Alle"]);
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
    // Der geteilte Link braucht den Bedienbarkeits-Nachweis NICHT, und das ist
    // gemessen, nicht angenommen: Steht der Rauteteil schon beim Aufruf in der
    // Adresse, trägt der Router ihn in seine eigene Rückschreibung hinein
    // (`replaceState -> …#bestand-privat`). Vier Läufe bei 20-facher
    // CPU-Drosselung, viermal die richtige Stellung. Verloren geht nur, was im
    // Fenster vor der Übernahme NEU gesetzt wird — siehe `umschalterBedienbar`.
    // Hier ist längeres Warten deshalb ausnahmsweise die RICHTIGE Antwort: Der
    // Wert geht nicht verloren, er kommt nur spät. Gemessen bei 20-facher
    // Drosselung sechsmal 31–42 s, jedes Mal mit der richtigen Stellung; bei
    // 6-facher waren es 3 s. Kein CI-Rechner ist so langsam.
    await page.goto(`${ORT}#bestand-privat`);
    await expect.poll(() => aktiveStellung(page), { timeout: 30_000 }).toEqual(["Privat"]);
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
    await umschalterBedienbar(page);
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
    await umschalterBedienbar(page);
    const titel = page.locator("text=/^Gemeinden und Kleinstädte /").first();
    await expect(titel).toContainText("Schwalm-Eder-Kreis");

    await page.click('a[href="#bestand-privat"]');
    await expect.poll(() => aktiveStellung(page)).toEqual(["Privat"]);
    // Nachladen über /api/atlas/nachbarn — deshalb großzügig warten.
    await expect(titel).toContainText("in Hessen", { timeout: 15_000 });

    // Die eigene Zeile MUSS dabei sein, sonst zeigt die Liste eine
    // Vergleichsgruppe ohne die Zeile, um die es geht.
    await expect(karte(page)).toContainText("Melsungen");
    // Und der Nenner des Platzes steht daneben: Ohne ihn ist „Platz 135" keine
    // Einordnung. Der Knopf sagt „Rangliste ansehen" statt „Alle N anzeigen" —
    // gezeigt werden die ersten hundert, und das Fenster schreibt es hin.
    await expect(karte(page)).toContainText(/Rangliste ansehen \(\d/);
  });

  //
  // DIE 1.000-ZEILEN-GRENZE DER DATENBANK.
  //
  // Jede Antwort ist bei 1.000 Zeilen gedeckelt, ohne dass es jemand sagt, und
  // `.range()` hebt das nicht auf. Die erste Fassung holte die ganze
  // Größenklasse und zählte sie: In Hessen (240) ging das gut, bundesweit stand
  // „1.000 Kommunen in dieser Gruppe" statt 2.235 — eine runde Zahl, die
  // niemandem auffällt — und die eigene Zeile fiel weg, weil sie hinter Platz
  // 1.000 lag.
  //
  // Dieser Test prüft beides an der einzigen Stelle, an der es sichtbar wird:
  // einer Gruppe, die größer als der Deckel ist. Er schlägt an, sobald jemand
  // wieder aus einer Zeilenliste zählt.
  test("eine Gruppe über 1.000 Kommunen wird vollständig gezählt", async ({ request }) => {
    const r = await request.get("/api/atlas/nachbarn", {
      params: {
        gebiet: "", // bundesweit
        owner: "alle",
        klasse: "gemeinden-und-kleinstaedte",
        region: "06634014", // Melsungen
      },
    });
    expect(r.ok()).toBe(true);
    const d = await r.json();

    // 1.000 wäre der Deckel, nicht die Wahrheit.
    expect(d.total).toBeGreaterThan(1000);
    expect(d.total).not.toBe(1000);

    // Die eigene Zeile MUSS dabei sein, auch weit hinten — sonst zeigt die
    // Karte vier fremde Spitzenreiter ohne den Ort, um den es geht.
    const eigen = d.zeilen.find((z: { selbst: boolean }) => z.selbst);
    expect(eigen, "eigene Zeile fehlt").toBeTruthy();
    expect(eigen.platz).toBeGreaterThan(1000);
    expect(eigen.platz).toBeLessThanOrEqual(d.total);
  });

  test("die Karte holt nur fünf Zeilen, das Fenster hundert", async ({ request }) => {
    // Der Unterschied ist der Grund, warum die lange Liste erst auf Klick lädt.
    const hole = async (voll: boolean) => {
      const r = await request.get("/api/atlas/nachbarn", {
        params: { gebiet: "", owner: "alle", klasse: "gemeinden-und-kleinstaedte", region: "06634014", ...(voll ? { voll: "1" } : {}) },
      });
      return r.json();
    };
    expect((await hole(false)).spitzeZeilen).toBe(4);
    expect((await hole(true)).spitzeZeilen).toBe(100);
  });

  test("ein Klick auf den Verweis im Text schaltet um — und zurück", async ({ page }) => {
    await page.goto(ORT);
    await umschalterBedienbar(page);

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
    await umschalterBedienbar(page);
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
