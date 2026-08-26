import { test, expect } from "@playwright/test";
import { waehle, uebrigeFragenBeantworten, weiterKlicken } from "./flows";
import { bisZumErgebnis } from "./ergebnis";

// Rechtsaussagen werden SICHTBAR geprüft, nicht nur im Quelltext
// (scripts/council-verify.md, BLOCKER). Ein Unit-Test auf die Konstante beweist
// nur, dass der Satz existiert — nicht, dass ihn jemand zu sehen bekommt.
//
// Hier geprüft: die Reihenfolge der BEG-Antragstellung. Bis 08/2026 stand davon
// ein Halbsatz im grauen Kleingedruckten unter dem Rechtshinweis — die teuerste
// Auskunft der ganzen Seite an der Stelle, die niemand liest.

test.describe("BEG-Antragsreihenfolge: sichtbar dort, wo der Betrag steht", () => {
  test("Ratgeber führt die Reihenfolge im Fließtext, mit Regel, Entwarnung und allen sechs Schritten", async ({ page }) => {
    await page.goto("/ratgeber/waermepumpe-foerderung", { waitUntil: "domcontentloaded" });

    // Der Abschnitt hat eine eigene Überschrift im Fließtext — kein Kleingedrucktes.
    const ueberschrift = page.getByRole("heading", { name: /Die Reihenfolge entscheidet/i });
    await expect(ueberschrift).toBeVisible({ timeout: 15_000 });

    // Der Anker heißt so, weil andere Seiten darauf verlinken (lib/beg-antrag.ts).
    await expect(page.locator("#antrag-reihenfolge")).toHaveCount(1);

    const text = await page.locator("body").innerText();

    // 1. Die Regel — und zwar am richtigen Zeitpunkt festgemacht.
    expect(text).toContain("Der Vorhabenbeginn vor Antragstellung schließt eine Förderung aus.");
    // Die verbreitete Verschärfung wäre eine Falschaussage: Nummer 9.2.1 der
    // BEG-EM-Richtlinie erklärt den Beginn vor der Zusage ausdrücklich für zulässig.
    expect(text).not.toMatch(/Vorhabenbeginn vor (der )?(Bewilligung|Zusage)[^.]{0,20}schließt/i);

    // 2. Die Entwarnung. Fehlt sie, ist die Seite in der anderen Richtung falsch
    //    und schreckt vor genau dem Schritt ab, der als erster kommen muss.
    expect(text).toMatch(/Planungs- und Beratungsleistungen/);
    // Und der Ausweg, den jeder zuerst sucht, ist als versperrt benannt.
    expect(text).toMatch(/nachträglich/);
    expect(text).toMatch(/zulässig/);
    expect(text).toMatch(/eigenes Risiko/);

    // 3. Alle sechs Schritte, inklusive des letzten — mit dem Einbau ist es
    //    nicht getan, die Auszahlung will eigens beantragt sein.
    for (const stufe of [
      /Bestätigung zum Antrag holen/,
      /Vertrag mit Bedingung abschließen/,
      /Zuschuss beantragen/,
      /Zusage abwarten, dann einbauen/,
      /Durchführung bestätigen lassen/,
      /Auszahlung beantragen/,
    ]) {
      expect(text).toMatch(stufe);
    }

    // 4. Die Fristen nach der Zusage — der zweite, unauffälligere Weg, auf dem
    //    das Geld verlorengeht. Der Verfall hängt an der ÄUSSEREN Frist
    //    (Richtlinie Nr. 9.5.1 Satz 2); auf beide bezogen wäre es ein
    //    Fehlalarm über bis zu 30 Monate.
    expect(text).toMatch(/36 Monaten/);
    expect(text).toMatch(/harte Grenze ist die zweite/);
    expect(text).toMatch(/Datum der letzten Rechnung/);

    // 5. Und die KfW-Entscheidung heißt Zusage, nicht Bescheid — sie ergeht
    //    nach Richtlinie Nr. 9.4 auf privatrechtlicher Grundlage.
    expect(text).not.toMatch(/Zuschussbescheid|Bescheid der KfW/);

    // 6. Verfahren beschreiben, nicht beraten — plus der Stand, an dem ein Leser
    //    erkennt, ob die Auskunft noch trägt.
    expect(text).toMatch(/keine Rechts- oder Förderberatung/);
    expect(text).toMatch(/zuletzt geprüft am/);
    // Das Merkblatt gilt ab dem 21.07.2026; unser Wertstand (27.07.) darf nicht
    // als seine Gültigkeit ausgegeben werden.
    expect(text).not.toMatch(/458[^.]{0,40}gültig ab 27\. Juli 2026/);
  });

  test("der Wärmepumpen-Rechner nennt die Bedingung am Förderbetrag", async ({ page }) => {
    // Der Wärmepumpen-Rechner kennt keinen Teilen-Link (offener Punkt der
    // Roadmap, angemeldet in e2e/ergebnis.ts) — also durchklicken, mit den
    // geteilten Helfern statt eigener Klicks. "Bestandsgebäude" ausdrücklich:
    // Der BEG-Block gibt es nur dort, im Neubau wäre gar nichts zu prüfen.
    // Wie die Flow-Tests: auf `domcontentloaded` warten, nicht auf `load`. Der
    // Rechner ist eine schwere Client-Komponente; das vollständige Ladeereignis
    // wartet auf jedes Bild und jeden Nachzügler und hat mit dem, was hier
    // geprüft wird, nichts zu tun. Gemessen am 25.08.2026: mit `load` lief der
    // Test auf einer ausgelasteten Maschine ins 30-Sekunden-Limit, obwohl die
    // Seite lange stand.
    test.setTimeout(120_000);
    await page.goto("/waermepumpe-rechner", { waitUntil: "domcontentloaded" });
    await waehle(page, "Bestandsgebäude");
    await uebrigeFragenBeantworten(page);
    await weiterKlicken(page);
    await bisZumErgebnis(page);

    await expect(page.getByText(/Deine BEG-Förderung/i).first()).toBeVisible({ timeout: 20_000 });

    const treffer = page.getByText(/Der Zuschuss muss beantragt sein, bevor das Vorhaben beginnt/i).first();
    await expect(treffer).toBeVisible({ timeout: 20_000 });

    // Und der Weg zur Langfassung steht daneben.
    await expect(
      page.locator('a[href="/ratgeber/waermepumpe-foerderung#antrag-reihenfolge"]').first(),
    ).toBeVisible();
  });
});
