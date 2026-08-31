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

const ORT = "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg";

test.describe("Gemeinde-Abo", () => {
  test("der Knopf neben der Überschrift öffnet das Anmeldefenster", async ({ page }) => {
    await page.goto(ORT);

    // Die Überschrift steht über die volle Breite, der Knopf rechts daneben.
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Höchberg");

    const knopf = page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first();
    await knopf.click();

    const fenster = page.getByRole("dialog");
    await expect(fenster).toBeVisible();
    await expect(fenster).toContainText("Meldungen zu Höchberg");
    await expect(fenster.getByLabel("E-Mail-Adresse")).toBeVisible();
  });

  test("der Erklärtext steht außerhalb des Knopfes", async ({ page }) => {
    await page.goto(ORT);
    // Betreiber-Vorgabe 31.08.2026: Eine Beschriftung wie „Förderprogramm,
    // Leistung u. v. m. abonnieren" macht den Knopf so breit, dass er die
    // Überschrift daneben erdrückt.
    const knopf = page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first();
    // Der Knopf nennt den Ort und die Handlung — mehr nicht.
    await expect(knopf).toHaveText("Höchberg abonnieren");
    await expect(page.getByText(/Förderprogramm, Leistung/)).toBeVisible();
  });

  test("die klebende Leiste öffnet dasselbe Fenster", async ({ page }) => {
    await page.goto(ORT);

    // Die Leiste erscheint erst beim Scrollen — vorher stünde sie doppelt
    // neben dem Knopf, den sie anbietet.
    await page.mouse.wheel(0, 1200);

    const leiste = page.locator("#sc-cta-sentinel");
    await expect(leiste).toHaveCount(1); // der Merker, an dem sie sich ausblendet

    const stickyKnopf = page.getByRole("button", { name: /^Höchberg abonnieren$/ }).last();
    await expect(stickyKnopf).toBeVisible();
    await stickyKnopf.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Meldungen zu Höchberg");
  });

  test("der Block steht rechts neben der Überschrift, Text unter dem Knopf", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto(ORT);

    const h1 = page.getByRole("heading", { level: 1 });
    const knopf = page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first();
    const text = page.getByText(/Förderprogramm, Leistung/);

    const [hb, kb, tb] = await Promise.all([h1.boundingBox(), knopf.boundingBox(), text.boundingBox()]);
    if (!hb || !kb || !tb) throw new Error("Element ohne Ausdehnung");

    // RECHTS DANEBEN, nicht darunter: Der Knopf beginnt rechts vom Ende der
    // Überschrift, und beide teilen sich dieselbe Zeile.
    expect(kb.x).toBeGreaterThan(hb.x + hb.width - 1);
    expect(kb.y).toBeLessThan(hb.y + hb.height);

    // Innerhalb des Blocks: Text UNTER dem Knopf, rechtsbündig zu ihm.
    expect(tb.y).toBeGreaterThan(kb.y + kb.height - 1);
    expect(Math.abs(tb.x + tb.width - (kb.x + kb.width))).toBeLessThanOrEqual(2);

    // Der Block bleibt im sichtbaren Bereich (zum Dokument-Überlauf siehe die
    // Begründung im Mobil-Test).
    const [blockRechts, sichtbar] = await page.evaluate(() => [
      Math.round(document.querySelector(".gemeinde-abo")!.getBoundingClientRect().right),
      document.documentElement.clientWidth,
    ]);
    expect(blockRechts).toBeLessThanOrEqual(sichtbar);
  });

  test("auf schmalen Schirmen steht der Block unter der Überschrift", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(ORT);

    const h1 = page.getByRole("heading", { level: 1 });
    const knopf = page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first();
    const hb = await h1.boundingBox();
    if (!hb) throw new Error("Überschrift ohne Ausdehnung");
    const text = page.getByText(/Förderprogramm, Leistung/);
    const [kb, tb] = await Promise.all([knopf.boundingBox(), text.boundingBox()]);
    if (!kb || !tb) throw new Error("Element ohne Ausdehnung");

    // Unter die Überschrift gerutscht statt daneben.
    expect(kb.y).toBeGreaterThan(hb.y + hb.height - 1);
    // Und der Text unter den Knopf.
    expect(tb.y).toBeGreaterThan(kb.y + kb.height - 1);

    // Der Knopf nimmt die volle Breite — mit dem Daumen zu treffen.
    expect(kb.width).toBeGreaterThan(280);

    // Der Abo-Block bleibt im sichtbaren Bereich.
    //
    // GEZIELT AUF DEN BLOCK, nicht auf das ganze Dokument: Die erste Fassung maß
    // den seitlichen Überlauf der Seite und wurde dadurch flackernd — die
    // Kennzahlen-Kachelreihe darunter lädt nach und ragt auf 375 px rund 60 px
    // hinaus. Der Test war je nach Ladezeitpunkt grün oder rot und hätte am Ende
    // einen fremden Befund meinem Block angelastet. Dass die Kachelreihe
    // überläuft, ist ein eigener, bestehender Punkt.
    const blockRechts = await page.evaluate(() => {
      const b = document.querySelector(".gemeinde-abo");
      return b ? Math.round(b.getBoundingClientRect().right) : -1;
    });
    const sichtbar = await page.evaluate(() => document.documentElement.clientWidth);
    expect(blockRechts).toBeGreaterThan(0);
    expect(blockRechts).toBeLessThanOrEqual(sichtbar);
  });

  test("ein sehr langer Ortsname wird gekürzt, die Handlung bleibt lesbar", async ({ page }) => {
    // „Alt Zauche-Wußwerk/Stara Niwa-Wózwjerch" — 39 Zeichen, der längste
    // Gemeindename im Bestand. Ohne Kürzung wäre entweder der Knopf breiter
    // als die Seite oder „abonnieren" abgeschnitten.
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/solar-atlas/brandenburg/landkreis-dahme-spreewald/alt-zauche-wusswerk-stara-niwa-w-zwjerch");

    const knopf = page.getByRole("button", { name: /abonnieren$/ }).first();
    await expect(knopf).toBeVisible();

    // Die Handlung steht vollständig da.
    await expect(knopf).toContainText("abonnieren");

    // Und der Knopf bleibt im Fenster.
    const [rechts, sichtbar] = await page.evaluate(() => [
      Math.round(document.querySelector(".gemeinde-abo")!.getBoundingClientRect().right),
      document.documentElement.clientWidth,
    ]);
    expect(rechts).toBeLessThanOrEqual(sichtbar);

    // Der Name ist wirklich beschnitten, nicht bloß klein: Der sichtbare
    // Bereich ist schmaler als der Text, den er trägt.
    const beschnitten = await page.evaluate(() => {
      const o = document.querySelector(".gemeinde-abo-ort") as HTMLElement | null;
      return o ? o.scrollWidth > o.clientWidth : false;
    });
    expect(beschnitten).toBe(true);
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
    const knopf = page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first();
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

  test("das Bestands-Abo fragt keine Technik", async ({ page }) => {
    await page.goto(ORT);
    await page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first().click();
    const fenster = page.getByRole("dialog");
    await expect(fenster.getByLabel("E-Mail-Adresse")).toBeVisible();
    await expect(fenster.getByText("Wofür interessierst du dich?")).toHaveCount(0);
  });

  test("eine unbrauchbare Adresse kommt nicht durch", async ({ page }) => {
    await page.goto(ORT);
    await page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first().click();

    const fenster = page.getByRole("dialog");
    const feld = fenster.getByLabel("E-Mail-Adresse");
    await feld.fill("keine-adresse");
    await fenster.getByRole("button", { name: "Abonnieren", exact: true }).click();

    // Der Browser hält das schon an der Feldprüfung auf; entscheidend ist, dass
    // KEINE Erfolgsmeldung erscheint.
    await expect(fenster).not.toContainText("Fast geschafft");
  });
});
