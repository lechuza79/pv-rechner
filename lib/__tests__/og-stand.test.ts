import { describe, it, expect } from "vitest";
import { zeitpunktInBerlin } from "../zeit";

/**
 * Der Zeitstempel im Vorschaubild der Startseite.
 *
 * Warum das Bild ihn überhaupt trägt (24.08.2026): Unsere Route frischt das Bild
 * alle 30 Minuten auf — im Web richtig. Ein soziales Netzwerk holt die Vorschau
 * dagegen genau einmal beim Posten und friert sie dauerhaft ein. Über der Zahl
 * stand „GERADE EBEN"; damit hätte ein Beitrag von heute in vier Wochen noch
 * immer den Momentanwert von heute getragen, ausgewiesen als aktuell.
 *
 * Geprüft wird hier vor allem die ZEITZONE. Die Messwerte kommen in Weltzeit,
 * angezeigt wird deutsche Zeit — ein Versatz von ein bis zwei Stunden sähe völlig
 * plausibel aus und wäre im Bild durch nichts zu erkennen. Genau die Sorte
 * Fehler, die man nicht sieht, sondern nur misst.
 */
describe("Zeitstempel im Vorschaubild", () => {
  it("rechnet Weltzeit in deutsche Sommerzeit um (+2 Stunden)", () => {
    // 14:45 Weltzeit im August = 16:45 in Deutschland
    expect(zeitpunktInBerlin("2026-08-24T14:45:00.000Z")).toBe("24.08.2026, 16:45");
  });

  it("rechnet Weltzeit in deutsche Winterzeit um (+1 Stunde)", () => {
    // Im Januar gilt Normalzeit — wer fest +2 rechnet, liegt hier daneben.
    expect(zeitpunktInBerlin("2026-01-15T14:45:00.000Z")).toBe("15.01.2026, 15:45");
  });

  it("liefert nichts, wenn kein Zeitpunkt bekannt ist", () => {
    // Ohne Stand zeigt das Bild nur „ERNEUERBARE" — lieber keine Angabe als eine
    // erfundene. Dieselbe Regel wie beim Prüfdatum der Förderprogramme.
    expect(zeitpunktInBerlin(null)).toBeNull();
    expect(zeitpunktInBerlin(undefined)).toBeNull();
    expect(zeitpunktInBerlin("kein datum")).toBeNull();
  });
});
