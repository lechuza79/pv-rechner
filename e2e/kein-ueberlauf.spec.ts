import { test, expect } from "@playwright/test";
import { SEITEN } from "./routen";

// ─── Keine Seite läuft auf einem Telefon seitlich über ───────────────────────
//
// DER ANLASS (05.09.2026): Der Balkon-Rechner bekam eine vierte Auswahlkarte
// und ein Ratgeber eine fünfte Tabellenspalte, und die Frage „passt das auf
// 375 px?" ging an den Betreiber. Seine Antwort: „ich kann das nicht testen.
// das muss ein system 100 % zuverlässig testen. wie soll mir ein fehler
// auffallen?" Zu Recht — ob ein Element ein paar Pixel über den Rand ragt,
// sieht man auf einem Bildschirm nicht, und wer es sieht, kann nicht sagen,
// ob es gestern schon so war.
//
// Deshalb misst der Browser: Auf einer Telefonbreite darf die SEITE nicht
// breiter sein als das Fenster. Breite Inhalte (Tabellen, Diagramme) dürfen
// in ihrem eigenen Rahmen scrollen — genau das prüft der Vergleich am
// Dokument statt am Element. Dieselbe Klasse wie der Kopfzeilen-Test, nur für
// jede Seite: Die Kopfzeile lief 2026 wochenlang auf jedem iPad im Querformat
// über, und niemand hat es gesehen.
//
// Toleranz 1 px: Rundung beim Rendern, kein Überlauf.

// Kurz gehalten: 33 Seiten laufen im selben Job wie der Rundgang, und der
// steht ohnehin an seinem 16-Minuten-Limit. Auf „Netz ruhig" zu warten wäre
// hier falsch — auf dem Runner hängen externe Abrufe (Energiedaten) minutenlang
// im Zeitlimit, und genau das riss den ersten Lauf dieses Tests. Gemessen wird
// die Breite nach dem ersten Bild plus einer kurzen Frist für nachgeladene
// Blöcke; ein Chart, das nach zwei Sekunden noch nicht steht, ändert die
// Dokumentbreite nicht mehr, weil sein Rahmen längst gesetzt ist.
test.describe.configure({ timeout: 30_000 });

const TELEFON = { width: 375, height: 812 };

for (const { pfad } of SEITEN) {
  test(`${pfad} läuft auf ${TELEFON.width} px nicht seitlich über`, async ({ page }) => {
    await page.setViewportSize(TELEFON);
    const antwort = await page.goto(pfad, { waitUntil: "domcontentloaded" });
    expect(antwort?.status(), `${pfad} antwortet nicht mit 200`).toBe(200);
    await page.waitForTimeout(1500);
    const mass = await page.evaluate(() => ({
      dokument: document.documentElement.scrollWidth,
      fenster: window.innerWidth,
      // Der breiteste sichtbare Übeltäter, damit ein roter Lauf sagt, WO.
      breitestes: (() => {
        let best: { tag: string; breite: number; text: string } | null = null;
        for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.right <= window.innerWidth + 1) continue;
          const s = getComputedStyle(el);
          if (s.visibility === "hidden" || s.display === "none") continue;
          if (!best || r.right > best.breite) best = { tag: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : ""), breite: Math.round(r.right), text: (el.textContent || "").trim().slice(0, 40) };
        }
        return best;
      })(),
    }));
    expect(
      mass.dokument,
      `${pfad}: Seite ist ${mass.dokument} px breit bei ${mass.fenster} px Fenster — ragt heraus: ${JSON.stringify(mass.breitestes)}`,
    ).toBeLessThanOrEqual(mass.fenster + 1);
  });
}
