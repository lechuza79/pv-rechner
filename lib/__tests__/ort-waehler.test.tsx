import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WURZEL = join(__dirname, "..", "..");
const lies = (...t: string[]) => readFileSync(join(WURZEL, ...t), "utf8");
const SEITE = lies("app", "(site)", "admin", "redaktion", "kommunen", "page.tsx");
const WAEHLER = lies("components", "social", "OrtWaehler.tsx");

/**
 * Die Quelle ohne Kommentare.
 *
 * Ein Wächter, der in Kommentaren mitliest, schlägt an, sobald jemand
 * AUFSCHREIBT, was verboten ist — und genau das soll hier stehen. Der erste
 * Lauf ist daran hängengeblieben: Der Satz „«kontaktiert» gehört ins
 * Kommunen-Cockpit" machte ihn rot.
 */
function ohneKommentare(quelle: string): string {
  return quelle.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// Der Redaktionstisch zeigt BEITRÄGE, nicht Adressen.
//
// DER ANLASS ist ein Bildschirmfoto (Betreiber, 06.09.2026: „das ist
// hoffentlich nicht dein ernst"): Die erste Fassung rasterte alle hundert
// Gemeinden einer Kampagne als gleich aussehende Kacheln, jede beschriftet mit
// ihrem VERSANDstatus — und die Geschichten, um die es geht, lagen hinter einem
// zweiten Klick. Das ist eine Adressliste.
//
// Die drei Regeln, die daraus folgen, stehen hier, weil sie beim nächsten
// Ausbau sonst zurückkommen: Der Ort ist der Filter, nicht der Inhalt; der
// Versandstatus gehört ins Cockpit; und eine Seite, die zuerst eine Auswahl
// verlangt, verlangt einen Klick, der nichts entscheidet.

describe("Der Kommunen-Tisch zeigt Beiträge, keine Adressliste", () => {
  it("der Ort wird gesucht, nicht als Raster ausgelegt", () => {
    // Ein Raster über die Orte ist genau die Kachelwand von vorher.
    expect(SEITE).not.toContain("gridTemplateColumns");
    expect(WAEHLER).toContain('type="search"');
  });

  it("höchstens ein Dutzend Treffer stehen gleichzeitig da", () => {
    // Ohne Deckel ist das Suchfeld bei leerer Eingabe wieder die ganze Liste.
    const deckel = /const MAX_TREFFER = (\d+);/.exec(WAEHLER)?.[1];
    expect(deckel, "Die Trefferliste hat keinen Deckel").toBeTruthy();
    expect(Number(deckel)).toBeLessThanOrEqual(12);
    expect(WAEHLER).toContain("slice(0, MAX_TREFFER)");
  });

  it("der Versandstatus steht nicht an jedem Ort", () => {
    // „Charge 2 · kontaktiert" an hundert Kacheln sagt über die redaktionelle
    // Arbeit nichts und gehört ins Kommunen-Cockpit, das ihn setzt.
    for (const wort of ["kontaktiert", "geantwortet", "veroeffentlicht", "Charge "]) {
      expect(ohneKommentare(WAEHLER), `Der Wähler beschriftet Orte mit „${wort}"`).not.toContain(wort);
    }
  });

  it("ohne Auswahl öffnet sich der erste offene Ort", () => {
    // Eine leere Seite mit „bitte wählen" ist ein Klick, der nichts entscheidet.
    expect(SEITE).toContain("ags ?? sortiert[0]");
    expect(SEITE).not.toContain("Eine Gemeinde wählen");
  });

  it("die Fassungen werden EINMAL geladen, nicht je Ort", () => {
    // Die Übersicht braucht sie für „schon angefasst", der Tisch für die
    // Einstellungen — zweimal geladen wäre dieselbe kleine Tabelle zweimal.
    expect((SEITE.match(/ladeFassungen\(\)/g) ?? []).length).toBe(1);
  });
});
