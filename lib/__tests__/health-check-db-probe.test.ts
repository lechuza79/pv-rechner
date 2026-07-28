import { describe, it, expect } from "vitest";
import { dbProbeVerdict } from "../../scripts/health-check";

/**
 * Der Wächter misst die teuersten Atlas-Datenbankabfragen einzeln — als
 * Frühindikator VOR den Seitenzeiten.
 *
 * WARUM ER EXISTIERT (28.07.2026): Jede Gemeindeseite kostete zwei vollständige
 * Durchläufe über 591.024 Zeilen, weil der Präfix als Parameter statt als
 * Literal in der Abfrage stand und der Index dadurch unbenutzt blieb (Begründung
 * im Kopf von lib/mastr-region-sql.ts). Allein aufgerufen lud die Seite trotzdem
 * in ~1,2 s — grün. Erst wenn mehrere Seiten gleichzeitig aufgebaut wurden,
 * stauten sich die Durchläufe und rissen die 8-Sekunden-Notbremse. Die
 * Seitenmessung konnte das prinzipiell nicht sehen; die Abfragemessung schon.
 *
 * Diese Tests nageln die Schwellen fest. Sie hochzusetzen, damit ein Befund
 * verschwindet, ist ausdrücklich verboten (CLAUDE.md, Grenzen des Autofix) —
 * dann fällt hier der Test, und das ist Absicht.
 */
describe("Wächter: Bewertung der Atlas-Datenbankabfragen", () => {
  it("hält den gesunden Zustand für grün", () => {
    // Gemessen nach dem Fix: 76–94 ms, praktisch reine Netzlaufzeit.
    for (const ms of [40, 76, 94, 150, 249]) {
      expect(dbProbeVerdict(ms)).toBe("gruen");
    }
  });

  it("warnt im Zwischenbereich, ohne zu melden", () => {
    for (const ms of [250, 300, 399]) {
      expect(dbProbeVerdict(ms)).toBe("gelb");
    }
  });

  it("schlägt beim Rückfall auf den vollen Tabellendurchlauf an", () => {
    // Der kaputte Zustand lag bei 570–650 ms je Aufruf. Er MUSS rot sein,
    // sonst kommt genau der Ausfall zurück, der diesen Test veranlasst hat.
    for (const ms of [400, 570, 600, 650, 8000]) {
      expect(dbProbeVerdict(ms)).toBe("rot");
    }
  });

  it("lässt zwischen gesund und kaputt keine Lücke", () => {
    // Kein Wert darf unbewertet durchfallen — jede Millisekunde hat ein Urteil.
    for (let ms = 0; ms <= 1000; ms += 1) {
      expect(["gruen", "gelb", "rot"]).toContain(dbProbeVerdict(ms));
    }
  });
});
