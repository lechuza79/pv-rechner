import { test, expect } from "@playwright/test";

// ─── Kommt die Zählung der Brief-Aufrufe wirklich an? ────────────────────────
//
// WARUM IM BROWSER UND NICHT ALS UNIT-TEST: Die Erkennung selbst ist trivial
// und in `lib/__tests__/brief-herkunft.test.ts` abgedeckt. Der Fehler, der
// wirklich passiert ist (27.08.2026, bei der ersten Fassung), lag woanders und
// wäre dort nicht zu sehen gewesen: Der Melder läuft im Layout und feuerte,
// BEVOR Vercel Web Analytics initialisiert war. Der Aufruf war damit still weg
// — er landete nicht einmal in der Warteschlange, die das Skript beim Start
// abarbeitet.
//
// DAS IST DIE UNANGENEHMSTE FEHLERKLASSE DIESES PROJEKTS: kein Absturz, keine
// Meldung, keine kaputte Seite. Nur eine Zahl, die für immer null bleibt — und
// eine Aktion, die dann als wirkungslos gilt, obwohl niemand gemessen hat.
//
// Im Entwicklungsmodus sendet die Messbibliothek nichts, sie schreibt die
// Ereignisse in die Browser-Konsole. Genau daran hängt dieser Test: Er liest
// mit, was sie melden würde.

const KENNUNG = "utm_source=gemeinde";

/** Sammelt die Ereignis-Meldungen der Messbibliothek aus der Konsole. */
function ereignisse(page: import("@playwright/test").Page): string[] {
  const gesehen: string[] = [];
  page.on("console", (m) => {
    const t = m.text();
    if (t.includes("[event]")) gesehen.push(t);
  });
  return gesehen;
}

test.describe("Herkunftskennung der Outreach-Briefe", () => {
  test("ein Aufruf MIT Kennung meldet das Ereignis", async ({ page }) => {
    const gesehen = ereignisse(page);
    await page.goto(`/photovoltaik-rechner?${KENNUNG}`);
    // Das Warten ist der Punkt des Tests: Der Melder darf ruhig später dran
    // sein als der Seitenaufbau — er darf nur nicht verlorengehen.
    // Ohne Verweis: Der Testlauf ruft die Adresse direkt auf, also muss der
    // „direkt"-Fall kommen. Die beiden Namen statt einer Eigenschaft sind kein
    // Stilentscheid — Ereignisse tragen im Projekt keine Eigenschaften mehr,
    // daran hängt die Einwilligungsfreiheit der Messung (lib/analytics.ts).
    await expect
      .poll(() => gesehen.some((t) => t.includes("brief_aufruf_direkt")), {
        timeout: 15_000,
        message:
          "Ereignis 'brief_aufruf_direkt' kam nie an — vermutlich feuert der Melder wieder, bevor die Messung bereit ist",
      })
      .toBe(true);
  });

  test("ein Aufruf OHNE Kennung meldet nichts", async ({ page }) => {
    const gesehen = ereignisse(page);
    await page.goto("/photovoltaik-rechner");
    // Kein poll: Hier wird das Ausbleiben geprüft, also muss gewartet werden,
    // bevor gemessen wird — sonst ist der Test grün, weil er zu früh nachsieht.
    await page.waitForTimeout(8_000);
    expect(gesehen.filter((t) => t.includes("brief_aufruf"))).toEqual([]);
  });
});
