import { describe, it, expect } from "vitest";
import {
  fristStand,
  ANMELDE_SCHRITTE,
  ANMELDE_FRIST_MONATE,
  INBETRIEBNAHME_DEFINITION,
  MASTR_KATEGORIE,
  SOLARPAKET_ENTFALLEN,
} from "../balkon-anmeldung";
import { BALKON_RECHT } from "../balkon-config";
import { balkonAnmeldenFaq } from "../faq";

describe("fristStand — kalendarischer Monat, nicht 30 Tage", () => {
  it("ein Monat später, gleicher Tag", () => {
    expect(fristStand("2026-08-17", "2026-08-17").endeIso).toBe("2026-09-17");
  });

  it("kurzer Februar: der 31. Januar endet am 28. Februar, nicht im März", () => {
    // Hier wäre eine 30-Tage-Rechnung falsch (31.01. + 30 = 02.03.) und ein
    // naives setMonth() würde auf den 03.03. überlaufen.
    expect(fristStand("2026-01-31", "2026-02-01").endeIso).toBe("2026-02-28");
  });

  it("Schaltjahr: der 31. Januar endet am 29. Februar", () => {
    expect(fristStand("2028-01-31", "2028-02-01").endeIso).toBe("2028-02-29");
  });

  it("Jahreswechsel: Dezember läuft in den Januar", () => {
    expect(fristStand("2026-12-20", "2026-12-21").endeIso).toBe("2027-01-20");
  });

  it("Sommerzeit-Wechsel verschiebt den Stichtag nicht um einen Tag", () => {
    // Die Umstellung liegt zwischen Ende März und Ende Oktober. Wer mit lokalen
    // Mitternachts-Daten und Millisekunden rechnet, landet hier auf dem Vortag.
    // Genau daran ist die erste Fassung dieses Moduls gefallen.
    expect(fristStand("2026-03-15", "2026-03-16").endeIso).toBe("2026-04-15");
    expect(fristStand("2026-10-15", "2026-10-16").endeIso).toBe("2026-11-15");
    expect(fristStand("2026-03-01", "2026-03-31").tageUebrig).toBe(1);
    expect(fristStand("2026-09-30", "2026-10-30").tageUebrig).toBe(0);
  });

  it("zählt die Resttage und wird erst NACH dem Stichtag überfällig", () => {
    expect(fristStand("2026-08-01", "2026-08-10").tageUebrig).toBe(22);
    expect(fristStand("2026-08-01", "2026-08-10").ueberfaellig).toBe(false);
    // Am Stichtag selbst ist die Frist noch gewahrt — „innerhalb eines Monats".
    expect(fristStand("2026-08-01", "2026-09-01").tageUebrig).toBe(0);
    expect(fristStand("2026-08-01", "2026-09-01").ueberfaellig).toBe(false);
    // Erst der Tag danach ist zu spät.
    expect(fristStand("2026-08-01", "2026-09-02").ueberfaellig).toBe(true);
    expect(fristStand("2026-08-01", "2026-09-02").tageUebrig).toBe(-1);
  });
});

describe("Anmelde-Schritte", () => {
  it("fünf Schritte, vier davon mit benannter Falle", () => {
    // Die Seite kündigt beides wörtlich an („Fünf Schritte", „bei vier davon").
    // Läuft die Liste auseinander, lügt der Einleitungssatz.
    expect(ANMELDE_SCHRITTE).toHaveLength(5);
    expect(ANMELDE_SCHRITTE.filter(s => s.falle).length).toBeGreaterThanOrEqual(4);
  });

  it("nennt keine Formular-Knöpfe, Feldnamen oder Reihenfolgen", () => {
    // Das Register wurde 2024 von rund 20 auf 5 Angaben umgebaut und wird wieder
    // umgebaut. Eine Klick-Anleitung veraltet still — deshalb bleibt der Text
    // auf der Ebene „welche Information", nicht „welches Eingabefeld".
    const text = ANMELDE_SCHRITTE.map(s => `${s.titel} ${s.was} ${s.falle ?? ""}`).join(" ");
    expect(text).not.toMatch(/klicke|Button|Schaltfläche|Reiter|Menüpunkt|oben rechts|Häkchen setzen/i);
  });

  it("die Frist ist ein Monat und deckt sich mit dem Rechtssatz im Rechner", () => {
    expect(ANMELDE_FRIST_MONATE).toBe(1);
    // Derselbe Satz steht im Rechner-Ergebnis. Läuft einer davon weg, ist eine
    // der beiden Oberflächen falsch.
    expect(BALKON_RECHT.anmeldeFrist).toMatch(/eine[nm]? Monat/);
  });

  it("die Inbetriebnahme-Definition bleibt das Zitat der Behörde", () => {
    expect(INBETRIEBNAHME_DEFINITION).toContain("erste Mal Wechselstrom");
    expect(INBETRIEBNAHME_DEFINITION).toContain("Hausnetz");
    // Und sie steht im Schritt, in dem das Datum gesetzt wird — nicht nur als
    // Konstante herum (der Fehler vom 29.07.2026: Diff richtig, Seite falsch).
    expect(ANMELDE_SCHRITTE.some(s => s.was.includes(INBETRIEBNAHME_DEFINITION))).toBe(true);
  });
});

describe("Register-Vokabular: eine Quelle für Seite und FAQ", () => {
  it("Kategorie und Solarpaket-Wegfall stehen im FAQ wörtlich so wie im Modul", () => {
    const antworten = balkonAnmeldenFaq().map(e => e.a).join("\n");
    expect(antworten).toContain(MASTR_KATEGORIE);
    expect(antworten).toContain(SOLARPAKET_ENTFALLEN);
  });

  it("das Register kennt das Wort Balkonkraftwerk nicht — Kategorie bleibt die amtliche", () => {
    expect(MASTR_KATEGORIE.toLowerCase()).not.toContain("balkon");
    expect(MASTR_KATEGORIE).toMatch(/[Ss]teckerfertige/);
  });

  it("das FAQ verspricht nicht, die Anmeldepflicht sei abgeschafft", () => {
    // Häufigste Verwechslung im Netz: Wegfall der Netzbetreiber-Meldung wird
    // als Wegfall der Registrierung gelesen.
    const antworten = balkonAnmeldenFaq().map(e => e.a).join(" ");
    expect(antworten).not.toMatch(/Anmeldung .{0,20}abgeschafft|keine Anmeldung mehr n[öo]tig/i);
  });
});
