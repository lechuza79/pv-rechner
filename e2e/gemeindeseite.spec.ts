import { test, expect } from "@playwright/test";
import { klickBisWirkung } from "./klick";

// The Atlas town page in the approved design (09/2026): checked where a
// visitor uses it. The page loads the story strip, the monitor and the hero
// card in frames and builds the ranking by script; this spec proves they all
// arrive, that the subscription dialog opens and refuses a bad address, and
// that the server HTML carries the content without any script.

const ORT = "/solar-atlas/bayern/landkreis-wuerzburg/hoechberg";

// WARUM DIESE SEITE EIN EIGENES ZEITBUDGET BRAUCHT (gemessen 23.09.2026):
// Playwrights `goto` wartet ohne Angabe auf das Ereignis „load", und das
// tritt hier erst ein, wenn AUCH die drei nachgeladenen Rahmen (Kopf-Kachel,
// Geschichten, Monitor) samt ihrer eigenen Unterressourcen fertig sind — die
// starten absichtlich erst nach dem ersten Bild der Szene. Gemessen gegen den
// Entwicklungs-Server: „load" nach 44 s, der Abo-Klick selbst wirkt beim
// ERSTEN Versuch, sobald man ihn überhaupt erreicht. In der Prüfung fraß die
// Navigation damit das 30-Sekunden-Budget des Tests auf, und der Fehler las
// sich als „Klick blieb wirkungslos" — er zeigte auf den Knopf statt auf die
// Navigation. Deshalb: auf das erste Dokument warten statt auf das letzte
// Bild, und dem Beweis, dass ein Rahmen ankommt, ein Budget geben, das seine
// eigene 30-Sekunden-Erwartung überhaupt zulässt.
//
// Das ist KEIN Hochsetzen einer Schwelle, damit ein Befund verschwindet: Was
// die Tests prüfen (Fenster geht auf, Rahmen kommt an), bleibt unverändert
// scharf — geändert wird nur, worauf gewartet wird.
test.describe.configure({ timeout: 90_000 });

test.describe("Gemeindeseite", () => {
  // WEICHES SCROLLEN AUS — sonst misst die Prüfung eine Seite, die sich noch
  // bewegt. GEMESSEN 23.09.2026: Die Seite scrollt weich (das ist so gewollt,
  // ihre Abschnittsleiste lebt davon). Playwright schiebt ein Element vor dem
  // Klick in den Blick und wartet danach, bis es ruhig steht — bei weichem
  // Scrollen wandert es noch hunderte Millisekunden weiter, die Prüfung
  // scrollt erneut, und das Ganze kann sich über Sekunden aufschaukeln. Im
  // Protokoll steht dann bis zum Zeitlimit „warte, dass das Element ruhig
  // steht", während der Knopf in Wahrheit sichtbar, bedienbar und unverdeckt
  // ist — der Fehler zeigte auf den Knopf statt auf das Scrollen.
  //
  // Das ändert nichts an dem, was geprüft wird: Wie die Seite scrollt, ist
  // nicht Gegenstand dieser Tests.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const stil = document.createElement("style");
      stil.textContent = "html{scroll-behavior:auto !important}";
      const anhaengen = () => document.head?.appendChild(stil);
      if (document.head) anhaengen();
      else document.addEventListener("DOMContentLoaded", anhaengen);
    });
  });

  test("ohne JavaScript stehen Überschrift, Zahlen, Geschichten und Platzierungen im HTML", async ({ request }) => {
    const html = await (await request.get(ORT)).text();
    expect(html).toMatch(/<h1[^>]*>Höchberg/);
    expect(html).toContain("So steht es um Solar");
    // React separates text parts with <!-- --> comments in the server HTML.
    const text = html.replace(/<!-- -->/g, "");
    expect(text).toContain("Alle Geschichten aus Höchberg");
    expect(text).toContain("Alle Platzierungen von Höchberg");
    expect(html).toContain("Was bedeutet das für Bürgerinnen und Bürger?");
    expect(html).toContain("Daten &amp; Quellen");
    expect(html).toContain('"@type":"Dataset"');
  });

  test("Geschichten, Monitor und Kopf-Kachel kommen an, die Rangliste wird gebaut", async ({ page }) => {
    await page.goto(ORT, { waitUntil: "domcontentloaded" });
    await expect(page.frameLocator(".v3-monitor-card iframe").locator(".hero-story, .sc-widget").first()).toBeVisible({ timeout: 30_000 });
    await page.locator("#atlas-stories").scrollIntoViewIfNeeded();
    await expect(page.frameLocator("#atlas-stories iframe").locator("h3").first()).toBeVisible({ timeout: 30_000 });
    await page.locator("#atlas-data").scrollIntoViewIfNeeded();
    await expect(page.frameLocator("#atlas-data iframe").locator(".sc-widget").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#atlas-ranking h2").first()).toContainText("Höchberg");
  });

  test("der Abo-Knopf öffnet das Fenster; eine unbrauchbare Adresse geht nicht raus", async ({ page }) => {
    let angemeldet = 0;
    await page.route("**/api/abo/anmelden", (r) => {
      angemeldet++;
      return r.fulfill({ status: 200, body: "{}" });
    });
    await page.goto(ORT, { waitUntil: "domcontentloaded" });
    const fenster = page.locator("dialog.atlas-dialog", { hasText: "Höchberg abonnieren" });
    await klickBisWirkung(page.getByRole("button", { name: /^Höchberg abonnieren$/ }).first(), fenster, "Abo-Fenster");
    await expect(fenster.getByRole("button", { name: "Als Bürger:in" })).toHaveAttribute("aria-pressed", "true");
    await expect(fenster.getByRole("button", { name: "Für die Gemeinde" })).toHaveAttribute("aria-pressed", "false");
    await fenster.getByLabel("E-Mail-Adresse").fill("keine-adresse");
    await fenster.getByRole("button", { name: "Kostenlos abonnieren" }).click();
    expect(angemeldet).toBe(0);
    // The consent wording comes from the archive and names no frequency.
    await expect(fenster).toContainText("Datenschutzerklärung");
    await expect(fenster).not.toContainText(/monatlich|wöchentlich|einmal im monat|pro woche/i);
  });
  // Der längste Ortsname Deutschlands, über drei Breiten. GEMESSEN am
  // 22.09.2026: Der Abo-Knopf trägt den Ortsnamen, und das abgenommene Design
  // hält jeden Knopf einzeilig — dadurch war die Seite auf 375 px um 40 px und
  // auf 768 px um 113 px breiter als das Fenster, also schob sich die ganze
  // Seite seitlich. Ein Blick auf Höchberg hätte das nie gezeigt.
  const LANGER_ORT = "/solar-atlas/sachsen/landkreis-goerlitz/quitzdorf-am-see-kw-tanecy-p-i-j-zoru";
  for (const breite of [375, 414, 768]) {
    test(`ein langer Ortsname läuft auf ${breite} px nicht seitlich über`, async ({ page }) => {
      await page.setViewportSize({ width: breite, height: 900 });
      const antwort = await page.goto(LANGER_ORT, { waitUntil: "domcontentloaded" });
      expect(antwort?.status()).toBe(200);
      await page.waitForTimeout(1500);
      const mass = await page.evaluate(() => ({
        dokument: document.documentElement.scrollWidth,
        fenster: window.innerWidth,
      }));
      expect(mass.dokument, `Seite ${mass.dokument} px breit im ${mass.fenster} px Fenster`).toBeLessThanOrEqual(mass.fenster + 1);
    });
  }
  // Der Kopf färbt sich nach dem Himmel. GEMESSEN am 23.09.2026: Der
  // Kontrastmesser der Szene lief längst (er färbt den Titel), aber die
  // Kopfzeile war ihm nicht übergeben — bei hellem Mittagshimmel stand die
  // weiße Wortmarke auf hellem Grau. Der Test stellt die Uhr, nicht das
  // Wetter: die Sonnenhöhe entscheidet, und sie hängt an der Zeit.
  for (const [tageszeit, zeit, erwartet] of [
    ["mittags dunkel auf hellem Himmel", "2026-09-23T10:30:00Z", /^#(122c3b|000)$/],
    ["nachts hell auf dunklem Himmel", "2026-09-23T22:30:00Z", /^#fff$/],
  ] as const) {
    test(`die Kopfzeile steht ${tageszeit}`, async ({ page }) => {
      await page.clock.setFixedTime(new Date(zeit));
      // Auf das erste Dokument warten, nicht auf das letzte Bild: Der
      // Kontrastmesser hängt am ersten Bild der Szene, nicht daran, dass
      // die nachgeladenen Rahmen fertig sind — und auf die zu warten kostet
      // gemessene 44 s. Der Beweis ist die Messung unten, nicht die
      // Navigation.
      await page.goto(ORT, { waitUntil: "domcontentloaded" });
      const marke = page.locator(".site-header .brand");
      await expect(marke).toHaveAttribute("data-sc-contrast", "");
      await expect
        .poll(
          () => marke.evaluate((el) => getComputedStyle(el).getPropertyValue("--sc-region-ink").trim()),
          { timeout: 20_000, message: "Der Kontrastmesser hat die Kopfzeile nicht eingefärbt" },
        )
        .toMatch(erwartet);
    });
  }
  // Die kommunale Förderung stand auf der bisherigen Ortsseite und fehlte im
  // neuen Entwurf ganz — aufgefallen ist es dem Betreiber, nicht uns. Jedes
  // Programm, das hier gilt, steht als Box mit seinen Einzelheiten im Fenster;
  // wo es keines gibt, sagt der Abschnitt genau das. Vorher stand dort ein
  // Verweis auf die Landesseite, der bei Quitzdorf einen BEENDETEN
  // Balkon-Zuschuss als „Landesförderung in Sachsen" anbot.
  test("das Förderprogramm der Gemeinde steht als Box und öffnet seine Einzelheiten", async ({ page }) => {
    await page.goto("/solar-atlas/hessen/landkreis-wetteraukreis/nidda", { waitUntil: "domcontentloaded" });
    const abschnitt = page.locator("#atlas-foerderung");
    await abschnitt.scrollIntoViewIfNeeded();
    await expect(abschnitt).toContainText("Förderung in Nidda");
    // Dieselbe Karte wie die Beispielrechnungen darueber (sc-feature-card).
    const box = abschnitt.locator(".sc-feature-card").first();
    const knopf = box.locator("button.sc-feature-action:not(.gemeinde-foerder-melden)");
    await expect(box).toContainText("Photovoltaik");
    // Der Dialog steht immer im Dokument; geöffnet ist er erst mit [open].
    const fenster = page.locator("dialog.gemeinde-foerder-dialog[open]");
    await klickBisWirkung(knopf, fenster, "Förder-Fenster");
    // Die Bedingungen stehen je Technik getrennt: Die Balkon-Bedingung „zwei
    // Module je Haushalt" darf nicht unter der Dachanlage stehen.
    await expect(fenster).toContainText("Balkonkraftwerk");
    await expect(fenster.getByRole("link", { name: /offiziellen Quelle/ })).toBeVisible();
  });

  test("ein Ort ohne eigenen Zuschuss bekommt den Satz, der wirklich gilt", async ({ page }) => {
    await page.goto(ORT, { waitUntil: "domcontentloaded" });
    const abschnitt = page.locator("#atlas-foerderung");
    await abschnitt.scrollIntoViewIfNeeded();
    await expect(abschnitt).toContainText(/kein eigener Zuschuss bekannt|kein eigenes Förderprogramm/);
    await expect(abschnitt.locator(".sc-feature-card")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Landesförderung in/ })).toHaveCount(0);
  });

  // GEMESSEN 24.09.2026: Der Fokusring der aktiven Platzierungs-Kachel wurde
  // links und rechts abgeschnitten — die Kacheln füllen ihre Liste exakt aus,
  // der Ring wird außerhalb der Kachel gezeichnet, und die Liste schneidet
  // seitlich ab, weil sie senkrecht scrollt. Oben und unten war er zu sehen,
  // an den Seiten nicht: Die Kachel sah aus, als wäre sie am Rand abgeschnitten.
  //
  // Geprüft wird die GEOMETRIE, nicht eine Zahl im Stylesheet: Der Ring muss in
  // seine Liste passen, egal wie breit er ist und egal, woher der Platz kommt.
  test("der Fokusring der Platzierungs-Kachel wird nicht abgeschnitten", async ({ page }) => {
    await page.goto(ORT, { waitUntil: "domcontentloaded" });
    const abschnitt = page.locator("#atlas-ranking");
    await abschnitt.scrollIntoViewIfNeeded();
    const kachel = page.locator("#atlas-ranking .ranking-choice").first();
    await expect(kachel).toBeVisible({ timeout: 30_000 });
    const mass = await kachel.evaluate((el) => {
      const liste = el.closest<HTMLElement>(".ranking-choices")!;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const lr = liste.getBoundingClientRect();
      const aussen = parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset);
      return {
        clippt: getComputedStyle(liste).overflowX !== "visible",
        links: Math.round(r.left - aussen - lr.left),
        rechts: Math.round(lr.right - (r.right + aussen)),
      };
    });
    // Ohne seitliches Abschneiden gibt es nichts zu prüfen.
    if (!mass.clippt) return;
    expect(mass.links, "links ist kein Platz für den Fokusring").toBeGreaterThanOrEqual(0);
    expect(mass.rechts, "rechts ist kein Platz für den Fokusring").toBeGreaterThanOrEqual(0);
  });

  // Der Kopf zeigt eine Platzierung nur, wenn sie eine Nachricht ist. Quitzdorf
  // stand dort mit „Platz 25", obwohl es im Kreis beim Zubau je Einwohner
  // Zweiter ist — und der Ranglisten-Abschnitt eröffnete mit derselben 25.
  test("Kopf und Rangliste zeigen die beste Platzierung, nicht die erstbeste", async ({ page }) => {
    await page.goto(LANGER_ORT, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".v3-rank-intro")).not.toContainText("Platz 25");
    const abschnitt = page.locator("#atlas-ranking");
    await abschnitt.scrollIntoViewIfNeeded();
    await expect(abschnitt.locator(".ranking-stage")).toContainText("Zubau auf privaten Dächern", { timeout: 30_000 });
    await expect(abschnitt.locator(".ranking-intro-copy")).toContainText("im Landkreis Görlitz");
  });
  // Ein Stadtstaat hat EINE Adresse: die kurze. Vorher standen die Landesseite
  // und eine Ortsseite unter „hamburg/hamburg/hamburg" nebeneinander, mit
  // denselben Zahlen.
  test("ein Stadtstaat hat eine Adresse, die langen führen dorthin", async ({ page, request }) => {
    const kurz = await request.get("/solar-atlas/hamburg", { maxRedirects: 0 });
    expect(kurz.status()).toBe(200);
    expect(await kurz.text()).toMatch(/<h1[^>]*>Hamburg/);
    for (const lang of ["/solar-atlas/hamburg/hamburg", "/solar-atlas/hamburg/hamburg/hamburg", "/solar-atlas/berlin/berlin/berlin"]) {
      const antwort = await request.get(lang, { maxRedirects: 0 });
      expect(antwort.status(), lang).toBe(308);
      expect(antwort.headers()["location"], lang).toMatch(/\/solar-atlas\/(hamburg|berlin)$/);
    }
    await page.goto("/solar-atlas/hamburg", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/solar-atlas\/hamburg$/);
  });

  // Ein Stadtstaat IST sein Bundesland: Hamburg verglich sich mit „1 Ort" —
  // sich selbst. Jetzt startet der Vergleich bundesweit.
  test("ein Stadtstaat vergleicht sich nicht mit sich selbst", async ({ page }) => {
    await page.goto("/solar-atlas/hamburg", { waitUntil: "domcontentloaded" });
    const abschnitt = page.locator("#atlas-ranking");
    await abschnitt.scrollIntoViewIfNeeded();
    await expect(abschnitt).toContainText(/Wir vergleichen \d+ Orte in Deutschland/, { timeout: 30_000 });
    await expect(abschnitt).not.toContainText("1 Orte in");
  });
});
