import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MASTR_WORKFLOW } from "../../scripts/health-check";

/**
 * Die Bremse des Nachhol-Termins muss VOR der Arbeit sitzen — und alles, was
 * danach kommt, muss an ihr hängen.
 *
 * WARUM ALS TEST (09.09.2026): Der Zeitplan hat seit dem Ausfall vom 05.09. drei
 * Termine im Monat. Das trägt nur, solange der zweite und dritte sich selbst
 * überspringen, wenn der erste geglückt ist. Fällt eine der Bedingungen weg,
 * passiert nichts Sichtbares: Der Lauf ist grün, die Zahlen stimmen — er lädt
 * bloß dreimal im Monat 3,2 GB und wärmt dreimal zwei Stunden lang 11.000
 * Seiten auf, die sich nicht geändert haben. Eine Fehlerklasse, die man nur an
 * der Rechnung merkt, und dort erst einen Monat später.
 *
 * Geprüft wird die VERKETTUNG, nicht der Wortlaut: Trägt jeder arbeitende
 * Schritt die Bedingung, und hängt das Ungültig-Erklären am Ergebnis des
 * Import-Jobs? Ob die Bedingung inhaltlich richtig entscheidet, prüfen die
 * Tests der Terminrechnung nebenan.
 */

const yaml = readFileSync(join(__dirname, "..", "..", ".github", "workflows", MASTR_WORKFLOW), "utf8");

describe("Zeitplan des Anlagenbestand-Imports", () => {
  it("fragt vor der Arbeit, ob überhaupt etwas zu tun ist", () => {
    expect(yaml).toMatch(/--faellig-pruefen/);
    // Ein Lauf von Hand soll immer arbeiten — wer ihn ansteuert, will genau das.
    expect(yaml).toMatch(/github\.event_name.*!=.*schedule/);
  });

  it("jeder arbeitende Schritt hängt an der Antwort", () => {
    // Der Download und die Plausibilitätsprüfung. Letztere ist der teurere
    // Fehler: Ohne Gate liefe sie nach einem übersprungenen Lauf gegen die
    // Aggregate, die dieser Lauf gar nicht erzeugt hat.
    const arbeitendeSchritte = yaml
      .split(/\n      - name: /)
      .slice(1)
      .filter((s) => /--download|mastr-plausibilitaet/.test(s));
    expect(arbeitendeSchritte).toHaveLength(2);
    for (const schritt of arbeitendeSchritte) {
      expect(schritt).toMatch(/if:\s*steps\.faellig\.outputs\.getan == 'true'/);
    }
  });

  it("Ungültig-Erklären und Aufwärmen hängen am Ergebnis des Imports", () => {
    // Das Aufwärmen hängt über seine Abhängigkeit am Ungültig-Erklären; ein
    // übersprungener Vorgänger überspringt es mit. Deshalb genügt hier die eine
    // Bedingung — und die muss stehen.
    expect(yaml).toMatch(/getan:\s*\$\{\{\s*steps\.faellig\.outputs\.getan\s*\}\}/);
    expect(yaml).toMatch(/if:\s*needs\.refresh\.outputs\.getan == 'true'/);
    expect(yaml).toMatch(/warm:\s*\n\s*needs:\s*invalidate/);
  });
});
