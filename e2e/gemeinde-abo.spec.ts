import { test, expect } from "@playwright/test";
import { klickBisWirkung } from "./klick";
import { ABO_BESTAETIGT_PARAM } from "../lib/abo-bestaetigt";

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

// Seit dem neuen Design (09/2026) steht dieses Anmeldefeld nur noch auf den
// Förder-Stadtseiten; die Ortsseite des Atlas hat ein eigenes Fenster im
// freigegebenen Design (e2e/gemeindeseite.spec.ts).
const ORT = "/photovoltaik-foerderung/hessen/nidda";

test("BKW-Abo: Gemeinde ohne PLZ bleibt wählbar, Landkreis verlangt Ortswahl", async ({ page }) => {
  await page.route("**/api/abo/anmelden", route => route.abort());
  await page.route("**/api/suche/standorte?**", route => route.fulfill({ json: { hits: [
    { ags: "09679", name: "Würzburg", plz: "", kind: "Landkreis" },
    { ags: "09679147", name: "Testort ohne PLZ", plz: "", kind: "Gemeinde" },
    { ags: "071315001", name: "Testverband", plz: "", kind: "Verbandsgemeinde" },
  ] } }));
  await page.goto("/balkonkraftwerk/foerderung");
  const section = page.getByRole("region", { name: "Förderupdates für deine Gemeinde" });
  await section.getByRole("combobox").fill("Test");
  await expect(section.getByRole("option", { name: /Testverband/ })).toHaveCount(0);
  await section.getByRole("option", { name: "Würzburg Landkreis" }).click();
  await expect(section).toContainText("Ort im Würzburg wählen");
  await expect(section.getByRole("button", { name: "Gemeinde wählen und abonnieren" })).toBeDisabled();
  await section.getByRole("combobox").fill("Test");
  await section.getByRole("option", { name: "Testort ohne PLZ Gemeinde" }).click();
  await klickBisWirkung(section.getByRole("button", { name: "Testort ohne PLZ abonnieren" }), page.getByRole("dialog"), "Ort ohne PLZ");
  await expect(page.getByRole("dialog")).toContainText("Meldungen zu Testort ohne PLZ");
});

test("BKW-Abo: Bestätigungsrückkehr zeigt die Quittung", async ({ page }) => {
  await page.goto(`/balkonkraftwerk/foerderung?${ABO_BESTAETIGT_PARAM}=1`);
  await expect(page.getByRole("status")).toContainText("Dein Förder-Abo ist bestätigt");
  await expect(page).toHaveURL(/\/balkonkraftwerk\/foerderung$/);
});

for (const width of [1280, 375, 320]) {
  test(`BKW-Abo: Ort ohne Programm, Technik und Anmeldung bei ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    // Never let a browser test create a real subscription or send a mail.
    let payload: Record<string, unknown> | undefined;
    await page.route("**/api/abo/anmelden", async route => {
      payload = route.request().postDataJSON();
      await route.fulfill({ json: { ok: true } });
    });
    await page.goto("/balkonkraftwerk/foerderung");
    const section = page.getByRole("region", { name: "Förderupdates für deine Gemeinde" });
    await expect(section.getByRole("button", { name: "Gemeinde wählen und abonnieren" })).toBeDisabled();
    // This real location lookup is independent of entries in the funding list.
    await section.getByRole("combobox").fill("Buxtehude");
    await section.getByRole("option", { name: /21614 Buxtehude/ }).click();
    const dialog = page.getByRole("dialog");
    await klickBisWirkung(section.getByRole("button", { name: "Buxtehude abonnieren" }), dialog, "BKW-Abo");
    await expect(dialog.getByLabel("Balkonkraftwerk", { exact: true })).toBeChecked();
    await expect(dialog.getByLabel("Solaranlage aufs Dach")).not.toBeChecked();
    await expect(dialog.getByLabel("Wärmepumpe")).not.toBeChecked();
    await expect(dialog).toContainText("neu erfasste Förderprogramme");
    await expect(dialog.getByRole("link", { name: "Datenschutzerklärung" })).toHaveAttribute("href", "/datenschutz");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    await dialog.getByLabel("E-Mail-Adresse").fill("browser-test@example.invalid");
    await dialog.getByRole("button", { name: "Abonnieren", exact: true }).click();
    await expect(dialog).toContainText("Fast geschafft");
    expect(payload).toMatchObject({ quelle: "foerderung", techniken: ["balkon"], einwilligung: "2026-10-17-foerderneu" });
    expect(payload?.ags).toMatch(/^funding:region:\d{8}$/);
    await dialog.getByRole("button", { name: "Schließen" }).click();
    await expect(dialog).not.toBeVisible();
    await section.getByRole("button", { name: "Standort löschen" }).click();
    await expect(section.getByRole("button", { name: "Gemeinde wählen und abonnieren" })).toBeDisabled();
    expect(errors).toEqual([]);
    await section.screenshot({ path: testInfo.outputPath(`bkw-abo-${width}.png`) });
  });
}

test.describe("Gemeinde-Abo", () => {
  test("der Knopf neben der Überschrift öffnet das Anmeldefenster", async ({ page }) => {
    await page.goto(ORT);

    // Die Überschrift steht über die volle Breite, der Knopf rechts daneben.
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Nidda");

    const knopf = page.getByRole("button", { name: /^Abonnieren$/ }).first();
    await klickBisWirkung(knopf, page.getByRole("dialog"), "Förder-Abo");

    const fenster = page.getByRole("dialog");
    await expect(fenster).toBeVisible();
    await expect(fenster).toContainText("Meldungen zu Förderung · Nidda");
    await expect(fenster.getByLabel("E-Mail-Adresse")).toBeVisible();
  });

  test("die klebende Leiste öffnet dasselbe Fenster", async ({ page }) => {
    await page.goto(ORT);

    // Die Leiste erscheint erst beim Scrollen — vorher stünde sie doppelt
    // neben dem Knopf, den sie anbietet.
    await page.locator("#foerder-beispiele").scrollIntoViewIfNeeded();

    const leiste = page.locator("#sc-cta-sentinel");
    await expect(leiste).toHaveCount(1); // der Merker, an dem sie sich ausblendet

    const stickyKnopf = page.getByRole("button", { name: /^Nidda abonnieren$/ }).last();
    await expect(stickyKnopf).toBeVisible();
    await klickBisWirkung(stickyKnopf, page.getByRole("dialog"), "Förder-Abo");

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Meldungen zu Förderung · Nidda");
  });

  test("the programme header keeps subscription beside the verification date", async ({ page }) => {
    await page.goto(ORT);
    const header = page.locator('[data-foerderprogramm] header').first();
    await expect(header.getByRole("button", { name: "Abonnieren", exact: true })).toBeVisible();
    await expect(header).toContainText(/Zuletzt geprüft am|Werte noch nicht nachgeprüft/);
  });

  test("der Kreis steht in der Krümelspur, nicht als eigene Zeile", async ({ page }) => {
    await page.goto("/photovoltaik-foerderung/hessen/nidda");

    // Ein Ortsname allein ist mehrdeutig (Mühlhausen, Senden). Der Kreis ordnet
    // ein — als Klammerzusatz am Blatt der Spur, NICHT als eigene Station:
    // eine zusätzliche Ebene behauptete eine Hierarchie, die die Adresse nicht
    // hat (sie lautet /bundesland/ort).
    const spur = page.getByRole("navigation", { name: "Brotkrümel" });
    await expect(spur).toContainText("Nidda (Wetteraukreis)");

    // Und nicht mehr als eigene Zeile zwischen Überschrift und Fließtext.
    const h1 = page.getByRole("heading", { level: 1 });
    const hb = await h1.boundingBox();
    const kreisZeilen = await page.evaluate(() => {
      const y = document.querySelector("h1")!.getBoundingClientRect().bottom;
      return [...document.querySelectorAll("p")].filter(
        (p) => p.textContent?.trim() === "Wetteraukreis" && p.getBoundingClientRect().top > y,
      ).length;
    });
    expect(hb).not.toBeNull();
    expect(kreisZeilen).toBe(0);
  });

  test("der Abo-Knopf trägt die Glocke", async ({ page }) => {
    await page.goto(ORT);
    const knopf = page.getByRole("button", { name: /^Abonnieren$/ }).first();
    // Das Zeichen sitzt IM Knopf, und der Knopf trägt die Klasse, an der der
    // Schwing-Effekt hängt — der Effekt gehört an die Handlung, nicht ans
    // Symbol (dasselbe Symbol steht anderswo nur beschreibend da).
    await expect(knopf.locator("svg")).toHaveCount(1);
    await expect(knopf).toHaveClass(/sc-glocke/);
  });

  test("the programme retains a truthful verification date", async ({ page }) => {
    await page.goto(ORT);
    const header = page.locator('[data-foerderprogramm] header').first();
    const time = header.locator("time");
    if (await time.count()) {
      const date = await time.first().getAttribute("datetime");
      expect(Number.isFinite(Date.parse(date!))).toBe(true);
      expect(Date.parse(date!)).toBeLessThanOrEqual(Date.now());
      await expect(header).toContainText("Zuletzt geprüft am");
    } else {
      await expect(header).toContainText("Werte noch nicht nachgeprüft");
    }
  });

  for (const width of [375, 1200]) {
    test(`all four sticky actions remain available at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(ORT);
      await page.locator("#foerder-beispiele").scrollIntoViewIfNeeded();
      const bar = page.locator(".sc-floating-actions");
      await expect(bar.getByRole("link", { name: "Solaranlage planen" })).toBeVisible();
      await expect(bar.getByRole("button", { name: "Förder-Check starten" })).toBeVisible();
      const subscription = bar.getByRole("button", { name: "Nidda abonnieren" });
      await expect(subscription).toBeVisible();
      await expect(subscription).toHaveText("");
      await expect(bar.getByRole("button", { name: "Seite teilen" })).toBeVisible();
      expect(await bar.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      await klickBisWirkung(subscription, page.getByRole("dialog"), "Förder-Abo");
      await expect(page.getByRole("dialog")).toContainText("Meldungen zu Förderung · Nidda");
    });
  }

  test("das Förder-Abo fragt nach der Technik, das Bestands-Abo nicht", async ({ page }) => {
    // Auf der Förderseite ist die Frage sinnvoll: Wen nur ein Balkonkraftwerk
    // interessiert, den betrifft ein Dach-Zuschuss nicht. Auf der Atlas-Seite
    // geht es um den Bestand des Orts — der kennt keine Technik-Wahl.
    await page.goto("/photovoltaik-foerderung/hessen/nidda");
    await klickBisWirkung(page.getByRole("button", { name: /^Abonnieren$/ }).first(), page.getByRole("dialog"), "Förder-Abo");

    const fenster = page.getByRole("dialog");
    await expect(fenster.getByText("Wofür interessierst du dich?")).toBeVisible();

    // Alle drei sind der Ausgangszustand: Wer ein Förder-Abo abschließt, will
    // erst einmal jedes Geld sehen, das für ihn gilt.
    for (const l of ["Solaranlage aufs Dach", "Balkonkraftwerk", "Wärmepumpe"]) {
      await expect(fenster.getByLabel(l)).toBeChecked();
    }

    // Abwählbar, und ganz ohne Auswahl sagt das Fenster, was dann gilt.
    for (const l of ["Solaranlage aufs Dach", "Balkonkraftwerk", "Wärmepumpe"]) {
      await fenster.getByLabel(l).uncheck();
    }
    await expect(fenster.getByText(/Ohne Auswahl bekommst du alles/)).toBeVisible();
  });

  test("kein Abo verspricht eine Frequenz", async ({ page }) => {
    // KEINE ZAHL, auf keiner der beiden Seiten (Betreiber, 31.08.2026). Eine
    // Frequenzzusage ist eine Werbeaussage nach § 5 UWG, die jede künftige
    // Meldung binden würde — und sie stand hier zwei Fassungen lang, weil sie
    // sich wie Rücksicht liest. Zugesagt wird der ANLASS, nicht der Takt.
    //
    // Auf ein MUSTER geprüft, nicht auf den Satz: Die verbotene Aussage kommt
    // in vielen Schreibweisen zurück ("eine Mail im Monat", "monatlich eine
    // Mail", "höchstens 12 Mails im Jahr"), und ein Test, der den Wortlaut
    // vergleicht, ist gegen genau die Rückkehr blind.
    // Gegengeprobt an zehn Sätzen, bevor er hier landete: Die erste Fassung
    // ließ „monatlich eine Mail" durch, weil sie die beiden Wörter direkt
    // nebeneinander erwartete. Ein Wächter, der die naheliegendste Umformung
    // nicht sieht, ist keiner.
    const verbotenerTakt =
      /(mail|meldung|nachricht)\w*\s+(im|pro|je)\s+(monat|woche|jahr)|(monatlich|wöchentlich|jährlich)\w*(\s+\w+){0,2}\s+(mail|meldung|nachricht)/i;

    await page.goto(ORT);
    await klickBisWirkung(page.getByRole("button", { name: /^Abonnieren$/ }).first(), page.getByRole("dialog"), "Förder-Abo");
    const bestand = page.getByRole("dialog");
    await expect(bestand).toContainText(/Förderkonditionen/);
    expect((await bestand.innerText()).match(verbotenerTakt)).toBeNull();

    await page.goto("/photovoltaik-foerderung/hessen/nidda");
    await klickBisWirkung(page.getByRole("button", { name: /^Abonnieren$/ }).first(), page.getByRole("dialog"), "Förder-Abo");
    const foerder = page.getByRole("dialog");
    // Der Unterschied liegt jetzt im ANLASS, nicht im Takt: Die Förderseite
    // nennt die tägliche Prüfung, die Bestandsseite nennt ihre drei Auslöser.
    await expect(foerder).toContainText("Änderungen der Förderkonditionen");
    expect((await foerder.innerText()).match(verbotenerTakt)).toBeNull();
  });

  test("eine beanstandete Adresse färbt das Feld, ein Serverfehler nicht", async ({ page }) => {
    // ZWEI FÄLLE, und der Unterschied ist der Punkt: Ein roter Rahmen sagt
    // „an deiner Eingabe stimmt etwas nicht". Ihn bei JEDEM Fehler zu setzen
    // schickt jemanden auf die Suche nach einem Tippfehler, den es nicht gibt,
    // während in Wahrheit die Verbindung weg war.
    // BEIDE ANTWORTEN WERDEN GESTELLT, statt den echten Server zu treffen.
    // Geprüft wird hier die Oberfläche, nicht die Route — die hat ihren eigenen
    // Test. Und der echte Server macht diesen hier unzuverlässig: Seine
    // Ratenbegrenzung lässt fünf Versuche je Stunde durch, danach antwortet er
    // mit 429 und der Test bekäme genau den Fall nicht mehr zu sehen, den er
    // prüfen soll.
    let antwort = { status: 400, body: { error: "Diese E-Mail-Adresse sieht nicht richtig aus." } };
    await page.route("**/api/abo/anmelden", (r) =>
      r.fulfill({
        status: antwort.status,
        contentType: "application/json",
        body: JSON.stringify(antwort.body),
      }),
    );

    await page.goto(ORT);
    await klickBisWirkung(page.getByRole("button", { name: /^Abonnieren$/ }).first(), page.getByRole("dialog"), "Förder-Abo");
    const fenster = page.getByRole("dialog");
    const feld = fenster.getByLabel("E-Mail-Adresse");

    // Der Browser lässt "a@b" durch (type=email verlangt keinen Punkt in der
    // Domain), der Server nicht — genau dieser Fall landet in der Oberfläche.
    await feld.fill("a@b");
    await fenster.getByRole("button", { name: "Abonnieren" }).click();

    const blase = fenster.getByRole("alert");
    await expect(blase).toBeVisible();
    // Auf die KENNZEICHNUNG prüfen, nicht auf die Farbe: Ein Test gegen einen
    // Farbwert wäre bei jeder Tagesstufe des Themes ein anderer.
    await expect(feld).toHaveAttribute("aria-invalid", "true");
    await expect(feld).toHaveClass(/abo-feld-fehler/);
    // Die Meldung hängt am Feld, sonst liest ein Screenreader sie nie vor.
    await expect(feld).toHaveAttribute("aria-describedby", "abo-fehler");
    // Und die Blase steht UNTER dem Feld, nicht irgendwo im Fenster.
    const oben = (await feld.boundingBox())!;
    const unten = (await blase.boundingBox())!;
    expect(unten.y).toBeGreaterThan(oben.y + oben.height - 1);

    // Beim Korrigieren verschwindet die Beanstandung sofort.
    await feld.fill("a@b.de");
    await expect(feld).not.toHaveAttribute("aria-invalid", "true");
    await expect(fenster.getByRole("alert")).toHaveCount(0);

    // Gegenprobe: Ein Fehler, der NICHT an der Eingabe hängt, lässt das Feld
    // unangetastet und erscheint als schlichte Zeile.
    antwort = { status: 503, body: { error: "Gerade nicht möglich." } };
    await fenster.getByRole("button", { name: "Abonnieren" }).click();
    await expect(fenster.getByRole("alert")).toContainText("Gerade nicht möglich.");
    await expect(feld).not.toHaveAttribute("aria-invalid", "true");
    await expect(feld).not.toHaveClass(/abo-feld-fehler/);
  });

  test("nach der Bestätigung steht die Quittung, wo der Knopf stand", async ({ page }) => {
    // Der Weg endet auf der SEITE DES ORTS, nicht auf einer Quittungsseite
    // (Betreiber, 01.09.2026). Geprüft wird hier das Ende dieses Wegs: die
    // Ortsseite mit dem Merker, den die Bestätigung anhängt.
    await page.goto(`${ORT}?abo=1`);

    const quittung = page.getByRole("status").filter({ hasText: "Angemeldet für Förderung · Nidda" });
    await expect(quittung).toBeVisible();

    // Kein Anmeldeknopf mehr daneben — er böte an, was gerade geschehen ist.
    await expect(page.getByRole("button", { name: /^Nidda abonnieren$/ })).toHaveCount(0);

    // Der Merker verschwindet aus der Adresse. Sonst trägt jeder geteilte Link
    // und jedes Lesezeichen für immer eine Bestätigung, die dem nächsten Leser
    // nichts sagt.
    await expect(page).toHaveURL((u) => !u.searchParams.has("abo"));

    // Und ohne Merker steht wieder der Knopf da.
    await page.goto(ORT);
    await expect(page.getByRole("button", { name: /^Abonnieren$/ }).first()).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Angemeldet für" })).toHaveCount(0);
  });

  test("eine unbrauchbare Adresse kommt nicht durch", async ({ page }) => {
    await page.goto(ORT);
    await klickBisWirkung(page.getByRole("button", { name: /^Abonnieren$/ }).first(), page.getByRole("dialog"), "Förder-Abo");

    const fenster = page.getByRole("dialog");
    const feld = fenster.getByLabel("E-Mail-Adresse");
    await feld.fill("keine-adresse");
    await fenster.getByRole("button", { name: "Abonnieren", exact: true }).click();

    // Der Browser hält das schon an der Feldprüfung auf; entscheidend ist, dass
    // KEINE Erfolgsmeldung erscheint.
    await expect(fenster).not.toContainText("Fast geschafft");
  });
});
