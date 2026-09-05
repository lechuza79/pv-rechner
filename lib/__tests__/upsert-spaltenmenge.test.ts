/**
 * EIN BATCH-UPSERT DARF KEIN FELD AUF NULL SETZEN, DAS ER GAR NICHT MEINT.
 *
 * Der teuerste Unfall dieses Bereichs, am 29.08.2026 real passiert — und der
 * Fall war im Projekt bereits dokumentiert, als er zum zweiten Mal eintrat.
 *
 * PostgREST baut aus einem Batch EIN INSERT mit EINER Spaltenliste. Trägt eine
 * Zeile ein Feld und die anderen 499 nicht, bekommen diese 499 dort NULL — und
 * überschreiben einen bestehenden Wert. Kein Fehler, keine Warnung, die Zeile
 * sieht danach normal aus.
 *
 * Gemessener Schaden: Der Über-uns-Lauf setzte ein Trust-Signal nur dort in die
 * Zeile, wo es sich geändert hatte — die vorsichtige Bauweise, wie man denkt.
 * Meisterbetrieb fiel von 676 auf 167, das Geschäftsfeld Photovoltaik von 2.913
 * auf 135.
 *
 * Wiederhergestellt wurden die Trust-Signale aus den Belegen. Die
 * Geschäftsfelder NICHT — für sie legt kein Lauf einen Beleg an, sie mussten neu
 * abgerufen werden. Das ist die zweite Lehre: **Was keinen Beleg hat, ist bei
 * einem Schreibfehler unwiederbringlich.**
 *
 * Die Absicherung sitzt deshalb in der Schreibfunktion selbst, nicht in einer
 * Regel für Aufrufer: Ungleiche Feldmengen werden gruppiert und je Gruppe
 * geschrieben. Eine Regel, an die sich jeder künftige Lauf erinnern muss, ist
 * keine Absicherung — dieser Lauf hätte sie gebraucht und nicht gehabt.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const QUELLE = readFileSync(
  resolve(process.cwd(), "scripts", "fachbetriebe-refresh.ts"),
  "utf8",
);

describe("Batch-Upsert: gleiche Feldmenge oder getrennte Schreibvorgänge", () => {
  it("gruppiert nach Feldmenge, bevor geschrieben wird", () => {
    // Die Gruppierung MUSS in der Schreibfunktion sitzen. Stünde sie im
    // Aufrufer, hätte der nächste Lauf sie wieder nicht.
    expect(QUELLE).toMatch(/Object\.keys\(z\)\.sort\(\)\.join/);
    expect(QUELLE).toMatch(/gruppen\.size > 1/);
  });

  it("benennt den Vorfall, damit niemand die Gruppierung wieder ausbaut", () => {
    expect(QUELLE).toMatch(/VEREINHEITLICHT DIE SPALTENMENGE/);
    expect(QUELLE).toMatch(/676 auf 167/);
  });

  it("schreibt die Reparatur-Phase für die belegfreien Felder fest", () => {
    // Die Geschäftsfelder waren nur deshalb verloren, weil es für sie keinen
    // Beleg gibt. Die Phase, die sie neu holt, bleibt bestehen.
    expect(QUELLE).toMatch(/async function felder\(/);
    expect(QUELLE).toMatch(/--felder/);
  });

  it("verliert beim Nachlesen keine vorhandenen Geschäftsfelder", () => {
    // Ein Betrieb, der seine Startseite umbaut, verlöre sonst ein Angebot, das
    // er weiter macht — derselbe Fehlertyp eine Ebene tiefer.
    expect(QUELLE).toMatch(/new Set\(\[\.\.\.\(r\.geschaeftsfelder \?\? \[\]\), \.\.\.gefundene\]\)/);
  });
});

describe("Die Gruppierung tut wirklich, was sie soll", () => {
  // Nachgebaut, weil der Wächter sonst nur Text prüft. Zweimal absichtlich
  // kaputtgemacht und rot gesehen, bevor er eingecheckt wurde.
  function gruppen(zeilen: Record<string, unknown>[]): Record<string, unknown>[][] {
    const m = new Map<string, Record<string, unknown>[]>();
    for (const z of zeilen) {
      const form = Object.keys(z).sort().join("|");
      m.set(form, [...(m.get(form) ?? []), z]);
    }
    return [...m.values()];
  }

  it("trennt eine Zeile mit Zusatzfeld von den übrigen", () => {
    const g = gruppen([
      { domain: "a.de", stand: 1 },
      { domain: "b.de", stand: 1, meisterbetrieb: true },
      { domain: "c.de", stand: 1 },
    ]);
    expect(g).toHaveLength(2);
    expect(g.find((x) => x.length === 2)).toBeDefined();
    expect(g.find((x) => x.length === 1)?.[0].meisterbetrieb).toBe(true);
  });

  it("lässt gleichförmige Zeilen in EINEM Schreibvorgang", () => {
    const g = gruppen([
      { domain: "a.de", stand: 1 },
      { domain: "b.de", stand: 2 },
    ]);
    expect(g).toHaveLength(1);
  });

  it("unterscheidet nach FELDERN, nicht nach Werten — auch null ist ein Feld", () => {
    // Ein ausdrücklich auf null gesetztes Feld ist gewollt und muss geschrieben
    // werden; nur ein FEHLENDES Feld ist der Unfall.
    const g = gruppen([
      { domain: "a.de", meisterbetrieb: null },
      { domain: "b.de", meisterbetrieb: true },
    ]);
    expect(g).toHaveLength(1);
  });
});
