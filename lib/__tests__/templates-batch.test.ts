import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WURZEL = join(__dirname, "..", "..");
const lies = (...t: string[]) => readFileSync(join(WURZEL, ...t), "utf8");
const SEITE = lies("app", "(site)", "admin", "redaktion", "templates", "page.tsx");
const SAMMLER = lies("lib", "orts-beitraege-server.ts");

// Die Templates-Ansicht lässt sich aus dem nächsten Kommunen-Schub füllen.
//
// DER ARBEITSRHYTHMUS (Betreiber, 06.09.2026): pro Woche ein Batch planen und
// dabei die Templates fertigmachen, die dieser Batch braucht. Welche Bildform
// eine Ortsgeschichte bekommt, entscheiden ihre Zahlen — an den vierzehn
// bundesweiten Beiträgen zu üben hieße, ein Design für Fälle abzunehmen, die im
// Schub gar nicht vorkommen.
//
// Die drei Regeln stehen hier, weil sie beim nächsten Ausbau sonst zurückkommen.

describe("Templates aus dem Kommunen-Schub", () => {
  it("die Ansicht kennt beide Quellen", () => {
    expect(SEITE).toContain('params.quelle === "kommunen"');
    expect(SEITE).toContain("ortsBeitraegeMehrere");
  });

  it("der Sammellauf hat einen Deckel, und er ist klein", () => {
    // Ein Schub sind hundert Gemeinden, die Kette je Ort kostet ein halbes
    // Dutzend Abfragen. Ohne Deckel wären das sechshundert für eine Ansicht —
    // dieselbe Kopplung, an der im September der Produktionsbau zerbrochen ist.
    const oben = /Math.min\(opts.hoechstens \?\? 6, (\d+)\)/.exec(SAMMLER)?.[1];
    expect(oben, "Der Sammellauf hat keine Obergrenze").toBeTruthy();
    expect(Number(oben)).toBeLessThanOrEqual(24);
    const standard = /const ORTE_STANDARD = (\d+);/.exec(SEITE)?.[1];
    expect(Number(standard)).toBeLessThanOrEqual(8);
  });

  it("der Ausschnitt wird genannt, nicht verschwiegen", () => {
    // Eine Ansicht, die sechs von hundert Orten zeigt und aussieht wie das
    // Ganze, behauptet eine Vollständigkeit, die sie nicht hat.
    expect(SAMMLER).toContain("angesehen");
    expect(SAMMLER).toContain("vorhanden");
    expect(SEITE).toContain("von {ausschnitt.vorhanden} Gemeinden");
  });

  it("die Quelle überlebt das Durchschalten einer Zeile", () => {
    // Sonst springt die Ansicht beim Wechsel der Füllung zurück auf die
    // bundesweiten Beiträge — und man beurteilt ein anderes Design als das,
    // das man ansehen wollte.
    //
    // GEPRÜFT WIRD NUR DER RUMPF DER ADRESS-FUNKTION. Die erste Fassung nahm
    // den Bereich bis zum Laden der Beiträge — und darin steht die Variable
    // `quelle` ohnehin. Der Test verglich den Fehler mit sich selbst und blieb
    // bei der Gegenprobe grün; dieselbe Klasse wie der Gemeindeschlüssel-Test,
    // der einen falschen Wert gegen sich selbst hielt.
    const start = SEITE.indexOf("const adresseMit");
    const rumpf = SEITE.slice(start, SEITE.indexOf("q.set(`f_${art}`", start));
    for (const k of ["quelle", "schub", "orte"]) {
      expect(rumpf, `„${k}" fällt beim Durchschalten weg`).toContain(`"${k}"`);
    }
  });

  it("der nächste Schub wird gemessen, nicht der Markierung geglaubt", () => {
    // Am 06.09.2026 zeigte die Markierung „aktueller Schub" im Code auf einen
    // Schub, dessen 79 Gemeinden alle angeschrieben waren — vier der fünf
    // Schübe waren durch. Wer ihr folgt, füllt die Templates-Arbeit mit
    // Geschichten von Orten, an denen sich nichts mehr ändern lässt.
    expect(SEITE).toContain("async function naechsterSchub");
    expect(SEITE).toContain("o.offen");
  });

  it("innerhalb des Schubs kommen die noch nicht angeschriebenen zuerst", () => {
    // Ein Schub ist nach Chargen sortiert, und die vorderen sind längst raus.
    expect(SEITE).toMatch(/sort\(\(a, b\) => Number\(b\.offen\) - Number\(a\.offen\)\)/);
  });

  it("die Platzierungen werden einmal gerechnet, nicht je Ort", () => {
    // Die Rechnung läuft über alle 11.000 Gemeinden. Sechs Orte hintereinander
    // hießen sie sechsmal.
    const awards = lies("lib", "awards-server.ts");
    expect(awards).toContain("const platzierungsKarte = memoize");
    expect(awards).not.toMatch(/computePlacements\(stats\)\.get/);
  });
});
