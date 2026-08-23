import { test, expect } from "@playwright/test";

// Rechtsaussagen müssen SICHTBAR geprüft werden, nicht nur im Quelltext
// (scripts/council-verify.md, BLOCKER).
//
// Hier geprüft: die Abgrenzung der offenen Lizenz gegen unsere zusammengetragenen
// Datenbestände (Council 17.08.2026, 3 Prüfer + adversarial).
//
// Warum gerade diese Sätze: Die Lizenzseite gibt CC BY 4.0, und diese Lizenz zieht
// das Datenbankherstellerrecht automatisch mit hinein — für alles, worauf wir sie
// anwenden. Bis zum 17.08.2026 stand in der Aufzählung "unsere Auswertungen im
// Solar-Atlas", also die aggregierten Zahlen selbst und nicht bloß ihre
// Darstellung. Wer das zurückdreht, verschenkt den Bestand erneut, ohne es zu
// merken: Die Seite sieht danach genauso aus.
//
// Ebenso empfindlich ist die Gegenrichtung. Die Abgrenzung darf nicht mehr
// behaupten, als sie kann — Forschungs-TDM und die Entnahme einzelner Werte sind
// gesetzlich erlaubt, und eine Klausel dagegen wäre nichtig. Ein zu scharfer Satz
// wäre also nicht nur unwirksam, sondern eine falsche Rechtsbehauptung auf der
// eigenen Seite.

test.describe("Lizenz: Abgrenzung zwischen Darstellung und Datenbestand", () => {
  test("die Aufzählung lizenziert die Darstellung, nicht die Auswertung selbst", async ({ page }) => {
    await page.goto("/lizenz");

    const ueberschrift = page.getByRole("heading", { name: /Was unter dieser Lizenz steht/i });
    await expect(ueberschrift).toBeVisible({ timeout: 15_000 });

    const text = await page.locator("body").innerText();

    // Die entschärfte Formulierung steht da…
    expect(text).toMatch(/Darstellung unserer Auswertungen/);
    // …und die alte, die den Datenbestand mitgab, ist weg. Der Wortlaut war
    // "unsere Auswertungen im Solar-Atlas und in den Datengeschichten," als
    // eigener Aufzählungspunkt.
    expect(text).not.toMatch(/^\s*unsere Auswertungen im Solar-Atlas/m);

    // Die Aufzählung ist abschließend formuliert. "alles, was wir selbst erstellt
    // haben" war der Satz, der die Datenbestände miterfasste.
    expect(text).not.toMatch(/gilt für alles, was wir selbst erstellt haben/);
  });

  test("der ausgenommene Bestand ist benannt und die Grenze wirkt nur nach vorn", async ({ page }) => {
    await page.goto("/lizenz");

    const ueberschrift = page.getByRole("heading", { name: /Was nicht unter dieser Lizenz steht/i });
    await expect(ueberschrift).toBeVisible({ timeout: 15_000 });

    const text = await page.locator("body").innerText();

    // Benannt, nicht nur pauschal ausgeschlossen — Creative Commons verlangt für
    // einen Teil-Ausschluss eine klare Demarkation.
    expect(text).toMatch(/Förderprogramme/);
    expect(text).toMatch(/Datenbestände/);

    // Kein Rückruf: CC BY ist unwiderruflich, ein "gilt auch rückwirkend" wäre
    // schlicht falsch.
    expect(text).toMatch(/nur nach vorn|wirkt nur nach vorn/);
    expect(text).toMatch(/nehmen wir nicht zurück/);
    expect(text).not.toMatch(/rückwirkend|widerrufen/);
  });

  test("der Vorbehalt behauptet nicht mehr, als er kann", async ({ page }) => {
    await page.goto("/lizenz");

    const ueberschrift = page.getByRole("heading", { name: /Training von KI-Modellen/i });
    await expect(ueberschrift).toBeVisible({ timeout: 15_000 });

    const text = await page.locator("body").innerText();

    // Die beiden gesetzlichen Grenzen stehen sichtbar da. Die Forschungsgrenze
    // muss dabei eng benannt sein: § 60d UrhG privilegiert Forschungs-
    // organisationen ohne gewerbliche Zwecksetzung, nicht jeden mit
    // wissenschaftlichem Motiv — die weite Fassung gab mehr weg als nötig.
    expect(text).toMatch(/Forschungsorganisationen ohne gewerbliche Zwecksetzung/);
    expect(text).toMatch(/einzelne Werte darf ohnehin jeder entnehmen/);

    // Und es wird nicht pauschal verboten, was ohnehin erlaubt ist.
    expect(text).not.toMatch(/jede Nutzung.{0,40}untersagt|Scraping ist verboten/i);
  });

  test("die maschinenlesbare Erklärung deckt sich mit dem Text der Seite", async ({ request }) => {
    const antwort = await request.get("/.well-known/tdmrep.json");
    expect(antwort.status()).toBe(200);

    const eintraege = (await antwort.json()) as { location: string; "tdm-reservation": number }[];

    // Die Seite sagt: Vorbehalt für die GANZE Seite, auch für die frei
    // lizenzierten Teile. Dann muss die Datei dasselbe sagen.
    //
    // Zwischenzeitlich stand hier das Gegenteil ("/" → 0, nur "/api/"
    // vorbehalten). Zwei Fehler auf einmal: Die Förderdaten liegen als HTML
    // unter "/", nicht unter "/api/" — der Vorbehalt saß neben der Tür. Und
    // eine 0 ist kein Schweigen, sondern eine ausdrückliche Freigabe, also
    // schlechter als gar keine Datei. Dieser Test schrieb den Fehler fest.
    expect(eintraege.find((e) => e.location === "/")?.["tdm-reservation"]).toBe(1);
    for (const e of eintraege) {
      expect(e["tdm-reservation"], `"${e.location}" gibt TDM ausdrücklich frei`).toBe(1);
    }
  });

  test("Lizenztext und robots.txt behaupten dasselbe", async ({ page, request }) => {
    await page.goto("/lizenz");
    const text = await page.locator("body").innerText();
    const robots = await (await request.get("/robots.txt")).text();

    // Die Seite sagte "Die Charts, Widgets und Texte oben sind davon nicht
    // betroffen — die stehen weiter offen", während robots.txt den
    // Trainingssammlern Disallow: / für die ganze Domain gab. Wer den Satz liest
    // und die Datei prüft, findet uns bei einer Unwahrheit.
    expect(robots).toMatch(/Disallow: \/\s*$/m);
    expect(text).not.toMatch(/die stehen weiter offen/);
    expect(text).toMatch(/für die gesamte Seite, auch für die frei lizenzierten Teile/);
  });

  test("die CC-BY-Quellen tragen sichtbar Lizenzlink und Änderungshinweis", async ({ page }) => {
    // Council 22.08.2026 (3/3 bestätigt, zwei Legal-Judges): Die Angabe
    // "CC BY 4.0" für Energy-Charts stand bis dahin unbelegt im Register und
    // war nur über Drittverzeichnisse gestützt. Sie ist richtig — Fraunhofer
    // sagt es in der API-Spezifikation und in JEDER v2-Antwort selbst
    // (Belege in docs/quellen/energy-charts-lizenz/). Falsch war, was daneben
    // fehlte: der Lizenzverweis (Sec. 3(a)(1)(A)(iii)) und der Hinweis, dass
    // wir verändern (Sec. 3(a)(1)(B)).
    //
    // Warum im Browser und nicht nur als Unit-Test: Der Hinweis rendert nur
    // dann als Link, wenn licenseUrl gesetzt ist. Ein Test auf die Konstante
    // hätte einen Eintrag ohne Adresse für erfüllt gehalten — die Pflichtangabe
    // stünde als toter Text auf der Seite, und genau das war der Zustand.
    await page.goto("/lizenz");

    const eintraege = page.locator("li", { hasText: "CC BY 4.0" });
    await expect(eintraege.first()).toBeVisible({ timeout: 15_000 });

    for (const [quelle, hinweis] of [
      ["Energy-Charts (Fraunhofer ISE)", "aggregiert"],
      ["Ember", "aggregiert"],
      ["Open-Meteo", "abgeleitet"],
    ] as const) {
      const zeile = page.locator("li", { hasText: quelle }).first();
      await expect(zeile, `${quelle}: Eintrag fehlt`).toContainText("CC BY 4.0");
      await expect(zeile, `${quelle}: Änderungshinweis fehlt`).toContainText(hinweis);
      await expect(
        zeile.locator('a[href="https://creativecommons.org/licenses/by/4.0/"]'),
        `${quelle}: Lizenz ist nicht verlinkt`,
      ).toHaveCount(1);
    }
  });

  test("zitierende Crawler bleiben in der robots.txt offen", async ({ request }) => {
    const antwort = await request.get("/robots.txt");
    expect(antwort.status()).toBe(200);
    const txt = await antwort.text();

    // Trainingssammler sind benannt…
    expect(txt).toMatch(/User-Agent: GPTBot/i);
    expect(txt).toMatch(/User-Agent: CCBot/i);

    // …die Zitierenden nicht. Sie unterscheiden sich teils nur durch die Endung,
    // deshalb wird auf die vollständige Zeile geprüft.
    for (const zitierend of ["Claude-User", "OAI-SearchBot", "PerplexityBot", "Googlebot"]) {
      expect(txt, `${zitierend} darf nicht gesperrt sein`).not.toMatch(
        new RegExp(`User-Agent: ${zitierend}\\s*$`, "im"),
      );
    }
  });
});
