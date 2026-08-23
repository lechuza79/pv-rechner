import { test, expect } from "@playwright/test";
import { akkordeonWaehlen, akkordeonOeffnen, waehle, weiterKlicken } from "./flows";

// Recommendation flow smoke test.
// Three steps: Haus + Dach → Haushalt → Großverbraucher → Empfehlung-Zwischenseite.
// Confirms the algorithm runs end-to-end without state-passing breakage.
//
// Geklickt wird über die geteilten Helfer (e2e/flows.ts), NICHT mit einem
// nackten click(): Ein Klick, der auf eine noch nicht übernommene Seite trifft,
// verpufft stumm. Unter zwei parallelen Arbeitern ist dieser Test genau daran
// umgefallen — mit einer Meldung, die nach einem Produktfehler aussah.

const DACHFORM = "Dachform";
const SATTELDACH = 0; // Reihenfolge aus DACHARTEN
const FLACHDACH = 1;
const NORD = 3;       // Reihenfolge aus TILT_ORIENTATIONS

test("Empfehlung flow ends on a recommendation with kWp + storage suggestion", async ({ page }) => {
  await page.goto("/pv-bedarf-berechnen");

  // Step 0: Haus + Dach — Einfamilienhaus, Satteldach, dann die Ausrichtung.
  // Die Ausrichtung erscheint erst NACH der Dachform (progressive Disclosure in
  // components/DachField) — ohne sie rechnet der Flow mit dem Standort-Optimum,
  // also einem perfekten Süddach. Der Test klickt sie deshalb mit: er soll den
  // Weg abbilden, den ein Nutzer geht, nicht den kürzesten durch die Seite.
  await waehle(page, "Einfamilienhaus");
  await akkordeonWaehlen(page, DACHFORM, SATTELDACH);
  await akkordeonWaehlen(page, "Ausrichtung", 0); // Süd
  await weiterKlicken(page);

  // Step 1: Haushalt — 3-4 persons + teils zuhause
  await waehle(page, "3–4 Personen");
  await waehle(page, "Teils zuhause");
  await weiterKlicken(page);

  // Step 2: Großverbraucher — keep WP/EA at default (nein), proceed.
  await weiterKlicken(page);

  // The recommendation lives at ?view=ergebnis — wait for the state change
  // rather than for text, so a failure says WHICH step broke.
  await page.waitForURL(/view=ergebnis/, { timeout: 10_000 });

  // Recommendation page: must show kWp suggestion + reasoning
  await expect(page.getByText(/kWp/i).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Empfehlung|Anlage|Speicher/i).first()).toBeVisible();

  const bodyText = await page.locator("body").innerText();
  // Must contain a kWp recommendation
  expect(bodyText).toMatch(/\d+(\.\d+)?\s*kWp/);
});

// Ein Klick, mehrere Werte in der Adresse — die dürfen sich nicht gegenseitig
// löschen. Der Zustand dieses Flows lebt vollständig in der Adresse; ein
// Schreibvorgang, der auf dem vorletzten Stand aufsetzt, nimmt den letzten
// stillschweigend zurück. Gemessen am 22.08.2026 auf der Produktion: Ein Klick
// auf „Flachdach" setzt die Dachform UND nimmt die Neigung zurück — danach
// stand wieder „Satteldach" in der eingeklappten Zeile, und die nutzbare
// Dachfläche rechnete mit dem Satteldach-Faktor.
//
// Geprüft wird an der eingeklappten Zeile, also dort, wo ein Nutzer es sieht —
// die Adresse allein wäre nur der halbe Beweis.
// Geklickt wird über die geteilten Helfer (e2e/flows.ts), NICHT mit einem
// nackten click(): Ein Klick, der auf eine noch nicht übernommene Seite trifft,
// verpufft stumm, und die Meldung liest sich dann wie ein Produktfehler. Genau
// so ist die zweite Prüfung hier unter zwei parallelen Arbeitern umgefallen —
// mit „gespeichert ist Satteldach", also der Meldung des Fehlers, den sie
// nachweisen soll. Ein Test, der aus zwei Gründen dasselbe Bild zeigt, taugt
// nicht als Beweis.

test.describe("Ein Klick darf keine andere Antwort aus der Adresse werfen", () => {
  const dachformZeile = (page: import("@playwright/test").Page) =>
    page.getByRole("button", { name: /^Dachform/ });

  test("Dachform überlebt den Klick, der zugleich die Neigung zurücknimmt", async ({ page }) => {
    await page.goto("/pv-bedarf-berechnen?haus=reihenhaus");

    await akkordeonWaehlen(page, DACHFORM, FLACHDACH);

    await expect(dachformZeile(page)).toContainText("Flachdach");
    await expect(page).toHaveURL(/dach=flachdach/);
    // Was vorher in der Adresse stand, bleibt ebenfalls stehen.
    await expect(page).toHaveURL(/haus=reihenhaus/);
  });

  test("Dachform überlebt auch den Wechsel, der zusätzlich die Nord-Ausrichtung verwirft", async ({ page }) => {
    await page.goto("/pv-bedarf-berechnen");

    // Satteldach + Nord: Nord ist auf einem aufgeständerten Dach keine Wahl —
    // der Wechsel darauf schreibt deshalb gleich dreimal in die Adresse.
    await akkordeonWaehlen(page, DACHFORM, SATTELDACH);
    await akkordeonWaehlen(page, "Ausrichtung", NORD);

    await akkordeonOeffnen(page, DACHFORM);
    await akkordeonWaehlen(page, DACHFORM, FLACHDACH);

    await expect(dachformZeile(page)).toContainText("Flachdach");
    await expect(page).toHaveURL(/dach=flachdach/);
    // Die Nord-Ausrichtung ist verworfen und die Frage wieder offen — sonst
    // rechnete der Flow still mit dem Bestfall weiter.
    await expect(page).not.toHaveURL(/az=nord/);
    await expect(page.getByRole("button", { name: "Süd", exact: true })).toBeVisible();
  });
});

// Die Ausrichtung des Dachs muss AUCH OHNE PLZ abgezogen werden.
//
// Bis zum 22.08.2026 reichte dieser Flow ohne PLZ gar keinen Ertrag weiter und
// fiel auf den nackten Bundesschnitt zurück — also auf ein perfekt nach Süden
// geneigtes Dach, egal was jemand angegeben hatte. Für den Nutzer sah es aus,
// als mache die PLZ-Eingabe das Ergebnis SCHLECHTER (Ost/West gemessen:
// 12 Jahre und 10.916 € ohne PLZ gegen 14 Jahre und 6.449 € mit angewandtem
// Dachfaktor). Der Hinweis unter der Dach-Frage ist die sichtbare Stelle: Ohne
// den Abschlag gab es ihn überhaupt nicht.
test("ohne PLZ steht der Dach-Abschlag trotzdem da", async ({ page }) => {
  await page.goto("/pv-bedarf-berechnen");
  await akkordeonWaehlen(page, DACHFORM, SATTELDACH);
  await akkordeonWaehlen(page, "Ausrichtung", 2); // Ost / West

  const hinweis = page.getByText(/Gerechnet wird mit .* kWh je kWp/);
  await expect(hinweis).toBeVisible();
  // „im Bundesmittel", nicht „für deinen Standort" — ohne PLZ kennen wir keinen.
  await expect(hinweis).toContainText("im Bundesmittel");
  // Und der Abschlag ist beziffert, statt still zu verschwinden.
  await expect(hinweis).toContainText(/\d+ % des Optimums/);
});
