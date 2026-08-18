import { describe, it, expect } from "vitest";
import { ATLAS_CITIES, fundingFor, publishedCities } from "../atlas-cities";
import { allFundingPrograms } from "../funding-programs";

// ─── Katalog und Städte-Verzeichnis dürfen nicht auseinanderlaufen ───────────
//
// Es sind zwei Listen: die Förderprogramme und die Städte, für die es eine Seite
// gibt. Verknüpft wurden sie bis zum 18.08.2026 von Hand über das Feld
// `fundingId` — und das wurde vergessen. Herne und Ludwigshafen standen im
// Verzeichnis, ihre Programme waren aufgenommen, die Seite sagte trotzdem nichts
// davon. Bremerhaven verpasste sogar ein AKTIVES Landesprogramm.
//
// Seither leitet fundingFor() die Zuordnung über den Gemeindeschlüssel ab.
// Dieser Test hält die andere Richtung fest: Kein Programm darf ohne Seite
// dastehen, ohne dass jemand den Grund hingeschrieben hat.

/**
 * Programme, die bewusst (noch) keine Stadtseite haben — mit Grund.
 *
 * Bad Homburg, Göttingen und Waiblingen sind keine kreisfreien Städte. Das
 * Städte-Verzeichnis führt fünfstellige Kreisschlüssel; würde man sie damit
 * eintragen, stünde unter dem Stadtnamen der Anlagenbestand des ganzen
 * Landkreises — ein falscher Nenner, und das ist im Projekt die schwerste
 * Fehlerklasse. Die Seiten kommen, wenn der Atlas Gemeinde-Ebene trägt.
 */
const OHNE_SEITE: Record<string, string> = {
  "badhomburg-energiespar": "OFFEN (bis 12/2026): keine kreisfreie Stadt — Seite braucht Atlas-Daten auf Gemeinde-Ebene",
  "goettingen-klimafonds": "OFFEN (bis 12/2026): keine kreisfreie Stadt — Seite braucht Atlas-Daten auf Gemeinde-Ebene",
  "waiblingen-klimaschutz": "OFFEN (bis 12/2026): keine kreisfreie Stadt — Seite braucht Atlas-Daten auf Gemeinde-Ebene",
};

describe("Förderkatalog und Stadtseiten bleiben synchron", () => {
  const regional = allFundingPrograms().filter((p) => p.level !== "bund");

  it("jedes regionale Programm hat eine Stadtseite — oder einen ausgeschriebenen Grund", () => {
    const ohne = regional
      .filter((p) => !ATLAS_CITIES.some((c) => fundingFor(c)?.id === p.id))
      .map((p) => p.id);
    const unerklaert = ohne.filter((id) => !OHNE_SEITE[id]);
    expect(unerklaert, `ohne Seite und ohne Begründung: ${unerklaert.join(", ")}`).toEqual([]);
  });

  it("die Ausnahmeliste enthält nichts, was längst eine Seite hat", () => {
    // Sonst bleibt eine Begründung stehen, die niemand mehr prüft.
    const veraltet = Object.keys(OHNE_SEITE).filter((id) =>
      ATLAS_CITIES.some((c) => fundingFor(c)?.id === id),
    );
    expect(veraltet, `Ausnahme überflüssig: ${veraltet.join(", ")}`).toEqual([]);
  });

  it("jede Ausnahme nennt eine Frist", () => {
    for (const [id, grund] of Object.entries(OHNE_SEITE)) {
      expect(grund, id).toMatch(/OFFEN \(bis \d{2}\/\d{4}\)/);
    }
  });

  it("keine Stadt zeigt auf ein Programm, das es nicht gibt", () => {
    const kaputt = ATLAS_CITIES.filter((c) => c.fundingId && !fundingFor(c)).map((c) => c.slug);
    expect(kaputt, `verwaiste Verknüpfung: ${kaputt.join(", ")}`).toEqual([]);
  });

  it("veröffentlicht wird nur, wo es auch ein Programm gibt", () => {
    for (const c of publishedCities()) expect(fundingFor(c), c.slug).toBeDefined();
  });
});
