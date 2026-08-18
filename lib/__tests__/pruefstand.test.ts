import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PRUEFSTAND, aeltestePruefung, faelligkeiten, tageZwischen, type PruefEintrag } from "../pruefstand";
import { STAND } from "../stand";
const ROOT = join(__dirname, "..", "..");

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
  it("jedes Feld, aus dem eine Seite ein Prüfdatum zieht, steht im Prüfstand", () => {
    // Über den DATUMSWERT zu prüfen war zu schwach (Prüfagent, 17.08.2026):
    // Zwei Felder tragen oft denselben Tag, also blieb der Test grün, wenn ein
    // Eintrag aus dem Prüfstand verschwand — das Datum stand weiter auf der
    // Seite, beobachtet hat es niemand mehr. Deshalb über die FELD-IDENTITÄT,
    // gelesen aus dem Quelltext von lib/stand.ts.
    const quelle = readFileSync(join(ROOT, "lib", "stand.ts"), "utf8");
    const tabelle = quelle.slice(quelle.indexOf("export const STAND"), quelle.indexOf("export const monatJahr"));
    const benutzt = new Set<string>();
    for (const m of tabelle.matchAll(/iso:\s*([A-Z][A-Za-z0-9_]*\.[A-Za-z]+|[A-Z][A-Z0-9_]*)/g)) {
      benutzt.add(m[1]);
    }
    expect(benutzt.size, "keine Felder erkannt — Regex passt nicht mehr zur Tabelle").toBeGreaterThan(4);
    expect(Object.keys(STAND).length, "STAND ist leer — dann prüft dieser Test nichts").toBeGreaterThan(4);

    const beobachtet = new Set(PRUEFSTAND.map(e => e.feld));
    for (const feld of benutzt) {
      // FEED_IN_WERTSTAND ist ein Wertstand, kein Prüfdatum — der gehört nicht
      // unter Beobachtung, sein Prüftag (FEED_IN_GEPRUEFT_ISO) schon.
      if (feld === "FEED_IN_WERTSTAND") continue;
      expect(
        beobachtet.has(feld),
        `${feld} liefert ein sichtbares Prüfdatum, steht aber nicht im PRUEFSTAND`
      ).toBe(true);
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

describe("Prüfstand: ein Datum für die ganze Seite", () => {
  it("nennt das älteste Prüfdatum, nicht das jüngste", () => {
    // Eine Vertrauens-Aussage über die ganze Site darf nur so frisch sein wie
    // ihr ältester Wert — das jüngste Datum stammt von genau einem Eintrag und
    // würde dessen Frische allen anderen zuschreiben.
    expect(
      aeltestePruefung([
        eintrag({ feld: "a", geprueftIso: "2026-08-14" }),
        eintrag({ feld: "b", geprueftIso: "2026-07-15" }),
        eintrag({ feld: "c", geprueftIso: "2026-08-01" }),
      ])
    ).toBe("2026-07-15");
  });

  it("ist für JEDEN Eintrag des echten Prüfstands wahr", () => {
    // Zusicherung statt Nachrechnen mit derselben Zeile: Das Ergebnis muss
    // kleiner-gleich jedem einzelnen Prüfdatum sein — nur dann ist der Satz
    // „alle Angaben seit … geprüft" wahr.
    const aeltest = aeltestePruefung();
    for (const e of PRUEFSTAND) {
      // Einträge, deren Stand in der Datenbank liegt, tragen hier nur den
      // Rückfall-Schnappschuss als Datum — er beschreibt nicht den geprüften
      // Wert und darf deshalb weder bewertet noch verglichen werden. Dieselbe
      // Ausnahme wie in aeltestePruefung() und faelligkeiten().
      if (e.standAusDb) continue;
      expect(aeltest <= e.geprueftIso, `${e.was} (${e.geprueftIso}) ist älter als ${aeltest}`).toBe(true);
    }
    expect(PRUEFSTAND.some(e => e.geprueftIso === aeltest), "das Ergebnis ist kein echtes Prüfdatum").toBe(true);
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
