import { describe, it, expect } from "vitest";
import { PRUEFSTAND, faelligkeiten, tageZwischen, type PruefEintrag } from "../pruefstand";
import { STAND } from "../stand";

/**
 * Der Totmann-Schalter für die Prüfdaten.
 *
 * Anlass (17.08.2026): Der Wärmepumpen-Wächter war seit seiner Einrichtung nie
 * gelaufen, ohne dass es jemandem auffiel — ein Wächter, der schweigt, sieht aus
 * wie einer, der nichts zu melden hat. Was hier geprüft wird, ist deshalb nicht
 * der Wert, sondern die Aufsicht über den Wert: Steht jede sichtbare Zahl unter
 * Beobachtung, und schlägt die Beobachtung an, wenn sich nichts mehr bewegt?
 */

const eintrag = (o: Partial<PruefEintrag> = {}): PruefEintrag => ({
  was: "Test",
  feld: "TEST.geprueftIso",
  geprueftIso: "2026-01-01",
  waechter: "test-waechter",
  rhythmus: "täglich",
  maxAlterTage: 30,
  runbook: "scripts/test-verify.md",
  ...o,
});

describe("Prüfstand: jede sichtbare Zahl steht unter Beobachtung", () => {
  it("jedes Datum, das ein Nutzer sieht, hat einen Eintrag im Prüfstand", () => {
    // Sonst entsteht wieder der Zustand, den es zu vermeiden gilt: Eine Seite
    // nennt ein Prüfdatum, aber niemand merkt, wenn es stehen bleibt.
    const beobachtet = new Set(PRUEFSTAND.map(e => e.geprueftIso));
    for (const [pfad, seite] of Object.entries(STAND)) {
      for (const e of seite.eintraege) {
        expect(
          beobachtet.has(e.iso),
          `${pfad}: „${e.was}" (${e.iso}) steht auf keiner Seite des Prüfstands`
        ).toBe(true);
      }
    }
  });

  it("jeder Eintrag nennt Wächter, Rhythmus und Runbook", () => {
    // Ohne diese drei Angaben ist ein Befund nicht handhabbar: Man weiß, dass
    // etwas alt ist, aber nicht, wer es hätte prüfen sollen.
    for (const e of PRUEFSTAND) {
      expect(e.waechter, `${e.was}: kein Wächter`).not.toBe("");
      expect(e.rhythmus, `${e.was}: kein Rhythmus`).not.toBe("");
      expect(e.runbook, `${e.was}: kein Runbook`).toMatch(/^scripts\/.+\.md$/);
      expect(e.maxAlterTage, `${e.was}: unplausible Stillstandsgrenze`).toBeGreaterThan(0);
    }
  });

  it("keine zwei Einträge zeigen auf dasselbe Feld", () => {
    const felder = PRUEFSTAND.map(e => e.feld);
    expect(new Set(felder).size).toBe(felder.length);
  });
});

describe("Prüfstand: Fälligkeit", () => {
  it("schlägt an, wenn sich das Datum zu lange nicht bewegt hat", () => {
    const offen = faelligkeiten("2026-03-01", [eintrag({ geprueftIso: "2026-01-01", maxAlterTage: 30 })]);
    expect(offen).toHaveLength(1);
    expect(offen[0].grund).toBe("stillstand");
  });

  it("schlägt an, wenn der fachliche Termin verstrichen ist", () => {
    const offen = faelligkeiten("2026-02-15", [
      eintrag({ geprueftIso: "2026-02-01", reviewBy: "2026-02-10", maxAlterTage: 400 }),
    ]);
    expect(offen[0].grund).toBe("termin");
    expect(offen[0].terminUeberzogen).toBe(5);
  });

  it("trennt die beiden Gründe, weil sie verschiedene Antworten brauchen", () => {
    // Termin überzogen = der WERT gehört geprüft. Stillstand = der WÄCHTER
    // gehört nachgesehen. Ein gemeinsames „überfällig" würde die zweite,
    // gefährlichere Frage verschlucken.
    const offen = faelligkeiten("2026-06-01", [
      eintrag({ geprueftIso: "2026-01-01", reviewBy: "2026-02-01", maxAlterTage: 30 }),
    ]);
    expect(offen[0].grund).toBe("beides");
  });

  it("schweigt, solange Termin und Bewegung stimmen", () => {
    expect(faelligkeiten("2026-01-20", [eintrag({ geprueftIso: "2026-01-01", reviewBy: "2026-04-01" })])).toEqual([]);
  });

  it("legt Monatsangaben ans ungünstigere Ende", () => {
    // Prüfdatum „2026-01" zählt ab dem 1., damit ein Monatswert keine Frische
    // behauptet; eine Frist „2026-01" läuft bis zum 31.
    expect(tageZwischen("2026-01", "2026-02-01", "prueftag")).toBe(31);
    expect(tageZwischen("2026-01", "2026-02-01", "frist")).toBe(1);
  });

  it("nennt das Älteste zuerst", () => {
    const offen = faelligkeiten("2026-06-01", [
      eintrag({ feld: "a", geprueftIso: "2026-05-01", maxAlterTage: 10 }),
      eintrag({ feld: "b", geprueftIso: "2026-01-01", maxAlterTage: 10 }),
    ]);
    expect(offen.map(o => o.feld)).toEqual(["b", "a"]);
  });
});
