import { describe, it, expect } from "vitest";
import { entfernungKm, ortNachGattungswort, ortsnamenAusFirma, pruefeGebiet, type PruefEingabe } from "../utility-check";

// Alle Fälle hier sind echte Befunde aus dem Lauf über die 778 gemessenen
// Gebiete — jeder Test hält eine Fehlerklasse fest, die tatsächlich aufgetreten
// ist, damit sie beim Nachschärfen der Regeln nicht zurückkommt.

const GEMEINDEN = [
  { ags: "08127055", name: "Schwäbisch Hall" },
  { ags: "09161000", name: "Ingolstadt" },
  { ags: "07332025", name: "Karl" }, // gibt es wirklich (Eifel)
  { ags: "14523400", name: "Reichenbach" },
  { ags: "14524240", name: "Reichenbach" },
  { ags: "07316000", name: "Weidenthal" },
  { ags: "07312000", name: "Kaiserslautern" },
];

const ZENTREN = new Map([
  ["08127055", { lat: 49.11, lon: 9.74 }],
  ["09161000", { lat: 48.76, lon: 11.42 }],
  ["07316000", { lat: 49.4, lon: 7.98 }],
  ["07312000", { lat: 49.44, lon: 7.77 }],
]);

function eingabe(over: Partial<PruefEingabe> = {}): PruefEingabe {
  return {
    name: "Stadtwerke Schwäbisch Hall GmbH",
    sitzKandidaten: ["08127055"],
    gebiet: [{ ags: "08127055", name: "Schwäbisch Hall", anteil: 0.8 }],
    zentren: ZENTREN,
    gemeindeNamen: GEMEINDEN,
    ...over,
  };
}

describe("Entfernung", () => {
  it("rechnet in Kilometern auf der Kugel", () => {
    const d = entfernungKm({ lat: 49.11, lon: 9.74 }, { lat: 48.76, lon: 11.42 });
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(150);
  });
});

describe("Ortsname aus dem Firmennamen", () => {
  it("findet den Ort hinter den Gattungswörtern", () => {
    const orte = ortsnamenAusFirma("Stadtwerke Schwäbisch Hall GmbH", GEMEINDEN);
    expect(orte.map((o) => o.name)).toContain("Schwäbisch Hall");
  });

  it("nimmt keine kurzen Namen — Karl ist ein Vorname und zugleich eine Gemeinde", () => {
    // Echter Fehlalarm: „TauberEnergie Kuhn, Karl und Andreas Kuhn OHG" traf die
    // Gemeinde Karl in der Eifel. Ein falscher Alarm kostet mehr als eine
    // ausgelassene Prüfung.
    const orte = ortsnamenAusFirma("TauberEnergie Kuhn, Karl und Andreas Kuhn OHG", GEMEINDEN);
    expect(orte.map((o) => o.name)).not.toContain("Karl");
  });

  it("trifft nur an Wortgrenzen", () => {
    expect(ortsnamenAusFirma("Netzgesellschaft Musterstadt", GEMEINDEN)).toHaveLength(0);
  });
});

describe("Gebiets-Prüfung", () => {
  it("bestätigt ein Gebiet, das Sitz und Name deckt", () => {
    const p = pruefeGebiet(eingabe());
    expect(p.ampel).toBe("gruen");
    expect(p.befunde.find((b) => b.test === "sitz")?.ergebnis).toBe("ok");
    expect(p.befunde.find((b) => b.test === "name")?.ergebnis).toBe("ok");
  });

  it("schlägt an, wenn weder Sitz noch Name im Gebiet liegen", () => {
    const p = pruefeGebiet(
      eingabe({
        name: "Stadtwerke Ingolstadt GmbH",
        sitzKandidaten: ["09161000"],
        gebiet: [{ ags: "08127055", name: "Schwäbisch Hall", anteil: 0.8 }],
      }),
    );
    expect(p.ampel).toBe("rot");
  });

  it("wertet einen widersprechenden Sitz ab, wenn der Name das Gebiet bestätigt", () => {
    // Echter Fall: „Gemeindewerke Weidenthal c/o Stadtwerke Kaiserslautern" —
    // die Anschrift ist die des Dienstleisters, versorgt wird Weidenthal.
    const p = pruefeGebiet(
      eingabe({
        name: "Gemeindewerke Weidenthal c/o Stadtwerke Kaiserslautern",
        sitzKandidaten: ["07312000"],
        gebiet: [{ ags: "07316000", name: "Weidenthal", anteil: 0.9 }],
      }),
    );
    expect(p.ampel).not.toBe("rot");
  });

  it("hält einen mehrdeutigen Ortsnamen für unprüfbar, nicht für falsch", () => {
    // „Stadtwerke Reichenbach/Vogtland" trifft jedes Reichenbach — welches
    // gemeint ist, kann der Test nicht entscheiden.
    const p = pruefeGebiet(
      eingabe({
        name: "Stadtwerke Reichenbach/Vogtland GmbH",
        sitzKandidaten: [],
        gebiet: [{ ags: "08127055", name: "Schwäbisch Hall", anteil: 0.9 }],
      }),
    );
    expect(p.befunde.find((b) => b.test === "name")?.ergebnis).toBe("unpruefbar");
    expect(p.ampel).not.toBe("rot");
  });

  it("prüft den Firmensitz bei Flächennetzen gar nicht erst", () => {
    // Die Bayernwerk Netz sitzt in Regensburg, wo die Stadtwerke das Netz
    // betreiben. „Sitz nicht im Gebiet" ist dort der Normalfall.
    const gross = Array.from({ length: 80 }, (_, i) => ({
      ags: `09${String(i).padStart(6, "0")}`,
      name: `Ort ${i}`,
      anteil: 0.9,
    }));
    const p = pruefeGebiet(eingabe({ name: "Flächennetz GmbH", sitzKandidaten: ["09161000"], gebiet: gross }));
    expect(p.befunde.find((b) => b.test === "sitz")?.ergebnis).toBe("unpruefbar");
  });

  it("meldet ein Gebiet aus lauter Kleinstanteilen als auffällig", () => {
    const p = pruefeGebiet(
      eingabe({
        gebiet: [
          { ags: "08127055", name: "Schwäbisch Hall", anteil: 0.06 },
          { ags: "09161000", name: "Ingolstadt", anteil: 0.07 },
        ],
      }),
    );
    expect(p.befunde.find((b) => b.test === "dominanz")?.ergebnis).toBe("auffaellig");
  });

  it("gibt zu jedem Befund einen Satz, der ihn erklärt", () => {
    // Eine Ampel ohne Begründung wäre ein Urteil ohne Beleg.
    for (const b of pruefeGebiet(eingabe()).befunde) {
      expect(b.text.length).toBeGreaterThan(10);
    }
  });
});

describe("Dominanz relativ statt absolut", () => {
  it("wertet 40 % als stark, wenn dort niemand mehr hat", () => {
    // In einer Gemeinde mit drei Netzbetreibern ist 40 % die Mehrheit. Ein
    // absoluter Schwellenwert hätte das als schwaches Gebiet gemeldet.
    const p = pruefeGebiet(
      eingabe({
        gebiet: [{ ags: "08127055", name: "Schwäbisch Hall", anteil: 0.4, anlagen: 400 }],
        groesstemAnteilJeGemeinde: new Map([["08127055", 0.4]]),
      }),
    );
    expect(p.befunde.find((b) => b.test === "dominanz")?.ergebnis).toBe("ok");
  });

  it("schlägt an, wenn anderswo jemand mehr hat", () => {
    const p = pruefeGebiet(
      eingabe({
        gebiet: [{ ags: "08127055", name: "Schwäbisch Hall", anteil: 0.2, anlagen: 100 }],
        groesstemAnteilJeGemeinde: new Map([["08127055", 0.7]]),
      }),
    );
    expect(p.befunde.find((b) => b.test === "dominanz")?.ergebnis).toBe("auffaellig");
  });

  it("lässt die Kerngemeinde schwerer wiegen als den Schnitt", () => {
    // Ein Stadtwerk teilt sich Randgemeinden oft mit dem Flächenversorger, sein
    // eigenes Ortsnetz aber nicht.
    const p = pruefeGebiet(
      eingabe({
        gebiet: [
          { ags: "08127055", name: "Schwäbisch Hall", anteil: 0.9, anlagen: 900 },
          { ags: "09161000", name: "Ingolstadt", anteil: 0.1, anlagen: 10 },
          { ags: "07316000", name: "Weidenthal", anteil: 0.1, anlagen: 10 },
        ],
        groesstemAnteilJeGemeinde: new Map([
          ["08127055", 0.9],
          ["09161000", 0.8],
          ["07316000", 0.8],
        ]),
      }),
    );
    expect(p.befunde.find((b) => b.test === "dominanz")?.ergebnis).toBe("ok");
  });
});

describe("Ort direkt hinter dem Gattungswort", () => {
  it("erlaubt dort auch kurze Namen", () => {
    // „Stadtwerke Kiel" meint Kiel — die Position macht es eindeutig, nicht die
    // Länge. Die freie Suche über den ganzen Namen darf das nicht.
    const orte = ortNachGattungswort("Stadtwerke Kiel AG", [{ ags: "01002000", name: "Kiel" }]);
    expect(orte.map((o) => o.name)).toEqual(["Kiel"]);
  });

  it("nimmt den längeren Namen, wenn zwei passen", () => {
    const orte = ortNachGattungswort("Stadtwerke Schwäbisch Hall GmbH", [
      { ags: "08127055", name: "Schwäbisch Hall" },
      { ags: "09999999", name: "Schwäbisch" },
    ]);
    expect(orte.map((o) => o.name)).toEqual(["Schwäbisch Hall"]);
  });
});
