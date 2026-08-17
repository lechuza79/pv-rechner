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

    // Die beiden gesetzlichen Grenzen stehen sichtbar da.
    expect(text).toMatch(/wissenschaftlichen Forschungszwecken/);
    expect(text).toMatch(/einzelne Werte darf ohnehin jeder entnehmen/);

    // Und es wird nicht pauschal verboten, was ohnehin erlaubt ist.
    expect(text).not.toMatch(/jede Nutzung.{0,40}untersagt|Scraping ist verboten/i);
  });

  test("die maschinenlesbare Erklärung deckt sich mit dem Text der Seite", async ({ request }) => {
    const antwort = await request.get("/.well-known/tdmrep.json");
    expect(antwort.status()).toBe(200);

    const eintraege = (await antwort.json()) as { location: string; "tdm-reservation": number }[];
    const bei = (ort: string) => eintraege.find((e) => e.location === ort);

    // Die Seite sagt "Charts, Widgets und Texte stehen weiter offen" — dann darf
    // die Datei nicht pauschal Nein sagen. Genau dieser Widerspruch war die erste
    // Fassung.
    expect(bei("/")?.["tdm-reservation"]).toBe(0);
    expect(bei("/api/")?.["tdm-reservation"]).toBe(1);
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
