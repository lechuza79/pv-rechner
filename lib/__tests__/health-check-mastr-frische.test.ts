import { describe, it, expect } from "vitest";
import {
  MASTR_FRISCHE_FAIL_TAGE,
  MASTR_FRISCHE_WARN_TAGE,
  mastrAlterTage,
  mastrFrischeVerdict,
} from "../../scripts/health-check";

/**
 * Der Totmann-Schalter für den Anlagenbestand.
 *
 * Anlass (Audit 19.08.2026): Über 11.000 Atlas-Seiten rechnen mit den Zahlen aus
 * EINEM monatlichen Import. Bleibt der aus, liefern alle diese Seiten weiterhin
 * HTTP 200, sind schnell, sehen richtig aus — und zeigen den Bestand von
 * vorletztem Monat. Der Gesundheitscheck las das Importdatum bereits, benutzte
 * es aber nur als Latenz-Vergleichswert; sein ALTER hat nie jemand bewertet.
 *
 * Geprüft wird hier die Aufsicht, nicht die Zahl: Schlägt sie an, wenn sich
 * nichts mehr bewegt — und schweigt sie, solange der Rhythmus stimmt?
 */

describe("MaStR-Frische: Schwellen", () => {
  it("schweigt innerhalb eines Import-Zyklus", () => {
    expect(mastrFrischeVerdict(0)).toBe("gruen");
    expect(mastrFrischeVerdict(14)).toBe("gruen");
    expect(mastrFrischeVerdict(MASTR_FRISCHE_WARN_TAGE - 1)).toBe("gruen");
  });

  it("warnt, wenn ein monatlicher Import fehlt", () => {
    expect(mastrFrischeVerdict(MASTR_FRISCHE_WARN_TAGE)).toBe("gelb");
    expect(mastrFrischeVerdict(MASTR_FRISCHE_FAIL_TAGE - 1)).toBe("gelb");
  });

  it("wird rot, wenn zwei Importe ausgefallen sind", () => {
    expect(mastrFrischeVerdict(MASTR_FRISCHE_FAIL_TAGE)).toBe("rot");
    expect(mastrFrischeVerdict(365)).toBe("rot");
  });

  it("die Schwellen bleiben, wo der Import-Rhythmus sie hinsetzt", () => {
    // CLAUDE.md: „kein Hochsetzen der Schwellen, damit ein Befund verschwindet."
    // Der Import läuft monatlich — eine Warngrenze jenseits von zwei Monaten
    // würde einen ausgefallenen Lauf durchwinken, und genau dagegen gibt es
    // diese Prüfung. Wer sie anhebt, lässt diesen Test fallen.
    expect(MASTR_FRISCHE_WARN_TAGE).toBeLessThanOrEqual(45);
    expect(MASTR_FRISCHE_FAIL_TAGE).toBeLessThanOrEqual(70);
    expect(MASTR_FRISCHE_WARN_TAGE).toBeLessThan(MASTR_FRISCHE_FAIL_TAGE);
  });
});

describe("MaStR-Frische: Altersrechnung", () => {
  it("rechnet gegen einen hereingereichten Stichtag, nicht gegen die Uhr", () => {
    // Eine Bewertungsfunktion mit eigener Uhr lässt sich nicht prüfen — und im
    // Projekt ist schon einmal ein Prüfdatum falsch geworden, weil es sich seine
    // Zeit selbst geholt hat.
    expect(mastrAlterTage("2026-08-05T00:00:00+00:00", new Date("2026-08-19T00:00:00Z"))).toBe(14);
    expect(mastrAlterTage("2026-06-01T00:00:00+00:00", new Date("2026-08-19T00:00:00Z"))).toBe(79);
  });

  it("schneidet angebrochene Tage ab, statt aufzurunden", () => {
    // Die vorsichtige Richtung: Das Alter wird eher zu klein als zu groß
    // ausgewiesen, damit die Meldung nicht einen Tag zu früh kommt.
    expect(mastrAlterTage("2026-08-05T00:00:00+00:00", new Date("2026-08-05T23:59:00Z"))).toBe(0);
  });

  it("ein 14 Tage alter Bestand ist der Normalfall, kein Befund", () => {
    // Gemessen am 19.08.2026: Stand 2026-08-05. Wäre das schon gelb, meldete die
    // Prüfung bei jedem Lauf — und eine Warnung, die immer angeht, filtert man
    // weg und verpasst dann die echte.
    expect(mastrFrischeVerdict(mastrAlterTage("2026-08-05T00:00:00+00:00", new Date("2026-08-19T00:00:00Z")))).toBe(
      "gruen",
    );
  });
});
