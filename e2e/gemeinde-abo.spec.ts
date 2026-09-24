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

// Seit dem neuen Design (09/2026) steht dieses Anmeldefeld nur noch auf den
// Förder-Stadtseiten; die Ortsseite des Atlas hat ein eigenes Fenster im
// freigegebenen Design (e2e/gemeindeseite.spec.ts).
const ORT = "/photovoltaik-foerderung/hessen/nidda";

test.describe("Gemeinde-Abo", () => {
  test("der Knopf neben der Überschrift öffnet das Anmeldefenster", async ({ page }) => {
    await page.goto(ORT);

    // Die Überschrift steht über die volle Breite, der Knopf rechts daneben.
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Nidda");

    const knopf = page.getByRole("button", { name: /^Nidda abonnieren$/ }).first();
    await knopf.click();

    const fenster = page.getByRole("dialog");
    await expect(fenster).toBeVisible();
    await expect(fenster).toContainText("Meldungen zu Nidda");
    await expect(fenster.getByLabel("E-Mail-Adresse")).toBeVisible();
  });

  test("die klebende Leiste öffnet dasselbe Fenster", async ({ page }) => {
    await page.goto(ORT);

    // Die Leiste erscheint erst beim Scrollen — vorher stünde sie doppelt
    // neben dem Knopf, den sie anbietet.
    await page.mouse.wheel(0, 1200);

    const leiste = page.locator("#sc-cta-sentinel");
    await expect(leiste).toHaveCount(1); // der Merker, an dem sie sich ausblendet

    const stickyKnopf = page.getByRole("button", { name: /^Nidda abonnieren$/ }).last();
    await expect(stickyKnopf).toBeVisible();
    await stickyKnopf.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Meldungen zu Nidda");
  });

  test("die Förderseite trägt dieselbe Kopfzeile", async ({ page }) => {
    // Beide Seitengattungen tragen denselben Ortsnamen und sprechen
    // verschiedene Leute an. Der Knopf ist derselbe Baustein; unterschiedlich
    // ist nur, was als Herkunft mitgeschrieben wird.
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto("/photovoltaik-foerderung/hessen/nidda");

    const h1 = page.getByRole("heading", { level: 1 });
    const knopf = page.getByRole("button", { name: /^Nidda abonnieren$/ }).first();
    const [hb, kb] = await Promise.all([h1.boundingBox(), knopf.boundingBox()]);
    if (!hb || !kb) throw new Error("Element ohne Ausdehnung");

    // Dieselbe Anordnung wie auf der Atlas-Seite: Knopf rechts neben der
    // Überschrift, nicht darunter.
    expect(kb.x).toBeGreaterThan(hb.x + hb.width - 1);
    expect(kb.y).toBeLessThan(hb.y + hb.height);

    await knopf.click();
    await expect(page.getByRole("dialog")).toContainText("Meldungen zu Nidda");
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
    const knopf = page.getByRole("button", { name: /^Nidda abonnieren$/ }).first();
    // Das Zeichen sitzt IM Knopf, und der Knopf trägt die Klasse, an der der
    // Schwing-Effekt hängt — der Effekt gehört an die Handlung, nicht ans
    // Symbol (dasselbe Symbol steht anderswo nur beschreibend da).
    await expect(knopf.locator("svg")).toHaveCount(1);
    await expect(knopf).toHaveClass(/sc-glocke/);
  });

  test("die Förderseite nennt ihren Stand über der Überschrift", async ({ page }) => {
    await page.goto("/photovoltaik-foerderung/hessen/nidda");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Nidda");

    // BEIDE Daten, nie eines von beiden: aus welchem Monat die Werte stammen
    // UND wann wir sie zuletzt bestätigt haben. Eines allein lässt offen, ob
    // die Beträge von gestern oder von vor einem Jahr sind.
    //
    // Über die Position gemessen statt über die Textsuche: Die Angabe steht
    // zweimal auf der Seite (Kopfzeile und Programmkarte), und ein Selektor,
    // der beide trifft, sagt nichts darüber, ob die OBERE existiert.
    const befund = await page.evaluate(() => {
      const h1 = document.querySelector("h1")!;
      const muster = /Werte von .+, zuletzt geprüft am/;
      const oben = [...document.querySelectorAll("div")].filter(
        (e) =>
          e.children.length === 0 &&
          muster.test(e.textContent ?? "") &&
          e.getBoundingClientRect().bottom <= h1.getBoundingClientRect().top + 1,
      );
      return { anzahl: oben.length, text: oben[0]?.textContent?.trim() ?? null };
    });
    expect(befund.anzahl).toBe(1);
    expect(befund.text).toMatch(/Werte von .+, zuletzt geprüft am \d{2}\.\d{2}\.\d{4}/);
  });

  test("auf der Förderseite bleiben alle drei Wege in der Leiste", async ({ page }) => {
    // Der Förder-Check musste NICHT weichen: Das Abo tritt als drittes
    // Element auf, auf schmalen Schirmen nur als Glocke. Ein Symbol braucht
    // die Breite nicht, die ein dritter Textknopf genommen hätte.
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/photovoltaik-foerderung/hessen/nidda");
    await page.mouse.wheel(0, 1200);

    // Gezielt IN der Leiste zählen: „Förder-Check starten" steht auch in der
    // Förderkarte, und ein Selektor über die ganze Seite sagt nichts darüber,
    // ob der Weg in der Leiste noch existiert.
    const inDerLeiste = await page.evaluate(() => {
      const symbol = document.querySelector(".sc-cta-dritte");
      const reihe = symbol?.parentElement;
      if (!reihe) return null;
      return [...reihe.children].map((e) => (e.getAttribute("aria-label") ?? e.textContent ?? "").trim());
    });
    expect(inDerLeiste).not.toBeNull();
    expect(inDerLeiste!.length).toBe(3);
    expect(inDerLeiste![0]).toContain("Anlage durchrechnen");
    expect(inDerLeiste![1]).toContain("Förder-Check");
    expect(inDerLeiste![2]).toContain("Nidda abonnieren");

    const abo = page.locator(".sc-cta-dritte");
    await expect(abo).toBeVisible();

    // Auf 375 px trägt der dritte Knopf nur das Symbol — die Beschriftung
    // steht als Vorlese-Name, sonst wäre er namenlos.
    const textSichtbar = await page.evaluate(() => {
      const t = document.querySelector(".sc-cta-dritte-text");
      return t ? getComputedStyle(t).display !== "none" : null;
    });
    expect(textSichtbar).toBe(false);

    // Und nichts läuft über.
    const ueberlauf = await page.evaluate(() => {
      const reihe = document.querySelector(".sc-cta-dritte")!.parentElement!;
      return Math.round(reihe.scrollWidth - reihe.clientWidth);
    });
    expect(ueberlauf).toBeLessThanOrEqual(0);

    // Er öffnet dasselbe Fenster.
    await abo.click();
    await expect(page.getByRole("dialog")).toContainText("Meldungen zu Nidda");
  });

  test("auf breiten Schirmen trägt der dritte Weg seine Beschriftung", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto("/photovoltaik-foerderung/hessen/nidda");
    await page.mouse.wheel(0, 1200);

    const textSichtbar = await page.evaluate(() => {
      const t = document.querySelector(".sc-cta-dritte-text");
      return t ? getComputedStyle(t).display !== "none" : null;
    });
    expect(textSichtbar).toBe(true);
  });

  test("das Förder-Abo fragt nach der Technik, das Bestands-Abo nicht", async ({ page }) => {
    // Auf der Förderseite ist die Frage sinnvoll: Wen nur ein Balkonkraftwerk
    // interessiert, den betrifft ein Dach-Zuschuss nicht. Auf der Atlas-Seite
    // geht es um den Bestand des Orts — der kennt keine Technik-Wahl.
    await page.goto("/photovoltaik-foerderung/hessen/nidda");
    await page.getByRole("button", { name: /^Nidda abonnieren$/ }).first().click();

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
    await page.getByRole("button", { name: /^Nidda abonnieren$/ }).first().click();
    const bestand = page.getByRole("dialog");
    await expect(bestand).toContainText(/Zuschuss/);
    expect((await bestand.innerText()).match(verbotenerTakt)).toBeNull();

    await page.goto("/photovoltaik-foerderung/hessen/nidda");
    await page.getByRole("button", { name: /^Nidda abonnieren$/ }).first().click();
    const foerder = page.getByRole("dialog");
    // Der Unterschied liegt jetzt im ANLASS, nicht im Takt: Die Förderseite
    // nennt die tägliche Prüfung, die Bestandsseite nennt ihre drei Auslöser.
    await expect(foerder).toContainText("täglich");
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
    await page.getByRole("button", { name: /^Nidda abonnieren$/ }).first().click();
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

    const quittung = page.getByRole("status").filter({ hasText: "Angemeldet für Nidda" });
    await expect(quittung).toBeVisible();

    // Kein Anmeldeknopf mehr daneben — er böte an, was gerade geschehen ist.
    await expect(page.getByRole("button", { name: /^Nidda abonnieren$/ })).toHaveCount(0);

    // Der Merker verschwindet aus der Adresse. Sonst trägt jeder geteilte Link
    // und jedes Lesezeichen für immer eine Bestätigung, die dem nächsten Leser
    // nichts sagt.
    await expect(page).toHaveURL((u) => !u.searchParams.has("abo"));

    // Und ohne Merker steht wieder der Knopf da.
    await page.goto(ORT);
    await expect(page.getByRole("button", { name: /^Nidda abonnieren$/ }).first()).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Angemeldet für" })).toHaveCount(0);
  });

  test("eine unbrauchbare Adresse kommt nicht durch", async ({ page }) => {
    await page.goto(ORT);
    await page.getByRole("button", { name: /^Nidda abonnieren$/ }).first().click();

    const fenster = page.getByRole("dialog");
    const feld = fenster.getByLabel("E-Mail-Adresse");
    await feld.fill("keine-adresse");
    await fenster.getByRole("button", { name: "Abonnieren", exact: true }).click();

    // Der Browser hält das schon an der Feldprüfung auf; entscheidend ist, dass
    // KEINE Erfolgsmeldung erscheint.
    await expect(fenster).not.toContainText("Fast geschafft");
  });
});
