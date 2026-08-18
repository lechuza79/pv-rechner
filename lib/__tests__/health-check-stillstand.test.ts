import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PRUEFSTAND, faelligkeiten, type PruefEintrag } from "../pruefstand";

// Der Melder für stillstehende Wächter muss AUSSERHALB der Wächter laufen.
//
// Bis zum 18.08.2026 lief `npm run stand:faellig` ausschließlich innerhalb von
// zwei Wächter-Aufträgen. Damit meldete der Melder nur, solange ein Wächter
// lief — fällt der tägliche Lauf aus, fällt die Meldung über seinen Ausfall mit
// ihm aus. Ein Henne-Ei-Fehler, und er ist eingetreten: Der Grüngas-Rechtsstand
// stand 21 Tage unbewegt (erlaubt: 14), ohne dass irgendetwas gemeldet wurde.
//
// Der Gesundheitscheck läuft alle drei Stunden in GitHub Actions, unabhängig
// davon, ob der Rechner des Betreibers an ist. Er ist damit die einzige Stelle,
// die einen ausgefallenen Wächter überhaupt bemerken kann. Dieser Test hält
// fest, dass die Prüfung dort bleibt.

const REPO = join(__dirname, "..", "..");
const check = readFileSync(join(REPO, "scripts", "health-check.ts"), "utf8");

describe("Gesundheitscheck: stillstehende Wächter", () => {
  it("führt die Fälligkeitsprüfung selbst aus", () => {
    expect(check, "faelligkeiten() wird im Gesundheitscheck nicht aufgerufen").toMatch(
      /faelligkeiten\(/,
    );
    expect(check, "der Prüfstand wird nicht importiert").toMatch(
      /import\s*\{[^}]*faelligkeiten[^}]*\}\s*from\s*["']\.\.\/lib\/pruefstand["']/,
    );
  });

  // Ein stillstehender Wächter braucht Analyse und einen Code-Fix — das ist ein
  // Fall für Claude, nicht für den Betreiber. Landete er in `forOperator`, ginge
  // eine Mail über etwas raus, das er nicht beheben kann; landete er in
  // `warnings`, passierte gar nichts.
  it("meldet den Befund an Claude, nicht an den Betreiber", () => {
    const block = check.slice(check.indexOf("const offen = faelligkeiten"));
    const bisBericht = block.slice(0, block.indexOf("── Bericht"));
    expect(bisBericht, "der Befund geht nicht an Claude").toMatch(/forClaude\.push/);
    expect(
      bisBericht,
      "ein stillstehender Wächter darf keine Mail an den Betreiber auslösen — er kann ihn nicht beheben",
    ).not.toMatch(/forOperator\.push/);
  });

  // Der Text muss sagen, was der Befund NICHT bedeutet. Ein unbewegtes Datum
  // heißt „niemand sieht mehr nach", nicht „der Wert ist falsch" — und die
  // naheliegende Reaktion (Datum hochsetzen) wäre genau die behauptete Prüfung,
  // die es nie gab.
  it("warnt davor, das Datum von Hand hochzusetzen", () => {
    expect(check).toMatch(/NICHT von Hand hochsetzen|nicht von Hand hochsetzen/);
  });

  it("nennt Wächter, Rhythmus und Runbook, damit der Befund bearbeitbar ist", () => {
    const block = check.slice(check.indexOf("const offen = faelligkeiten"));
    for (const feld of ["f.waechter", "f.rhythmus", "f.runbook"]) {
      expect(block, `${feld} fehlt in der Meldung`).toContain(feld);
    }
  });

  // Die Prüfung darf den Lauf nicht zum Kippen bringen: Sie liest nur
  // Konstanten. Stünde sie hinter einem Netz- oder Datenbankzugriff, fiele sie
  // genau dann aus, wenn ohnehin etwas kaputt ist.
  it("kommt ohne Netz und Datenbank aus", () => {
    const eigen: PruefEintrag[] = PRUEFSTAND;
    expect(() => faelligkeiten("2026-08-18", eigen)).not.toThrow();
  });

  // Gegenprobe an einem erfundenen Eintrag: Ein Wert, der lange stillsteht,
  // muss auch als Stillstand erkannt werden — sonst prüft der Test nur, dass
  // eine Funktion existiert.
  it("erkennt einen stillstehenden Wert", () => {
    const still: PruefEintrag = {
      was: "Testwert",
      feld: "TEST.geprueftIso",
      geprueftIso: "2026-01-01",
      waechter: "test-waechter",
      rhythmus: "täglich",
      maxAlterTage: 14,
      runbook: "scripts/test-verify.md",
    };
    const offen = faelligkeiten("2026-08-18", [still]);
    expect(offen).toHaveLength(1);
    expect(offen[0].grund).toBe("stillstand");
  });
});
