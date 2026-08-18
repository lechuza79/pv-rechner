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
const GEMEINDE_EBENE_OFFEN =
  "OFFEN (bis 12/2026): Förderseite für kreisangehörige Gemeinden — Bestandsdaten liegen vor, das Städte-Verzeichnis führt aber noch Kreisschlüssel";

/**
 * Programme kreisangehöriger Gemeinden (achtstelliger Gemeindeschlüssel) haben
 * noch keine FÖRDERseite. Im Rechner wirken sie, dort zählt die Postleitzahl.
 *
 * KORREKTUR 18.08.2026: Die frühere Begründung hier war falsch — sie behauptete,
 * dem Atlas fehlten Daten auf Gemeinde-Ebene. Die gibt es sehr wohl
 * (`mastr_aggregates_gem`, Seiten wie
 * /solar-atlas/baden-wuerttemberg/landkreis-rems-murr-kreis/waiblingen). Der
 * Betreiber hat das richtiggestellt.
 *
 * Der echte Grund ist enger: ATLAS_CITIES führt fünfstellige KREIS-Schlüssel.
 * Eine Gemeinde dort mit ihrem Kreisschlüssel einzutragen würde den Bestand des
 * Landkreises unter den Ortsnamen setzen — falscher Nenner. Zu tun ist also
 * nicht "Atlas erweitern", sondern das Verzeichnis auf achtstellige Schlüssel
 * vorzubereiten und die Seite an die Gemeindedaten zu hängen.
 *
 * Als REGEL statt als Einzelliste: Sonst wächst die Ausnahmeliste mit jedem
 * gefundenen Dorfprogramm, und niemand sieht mehr, was Ausnahme und was System
 * ist.
 */
function nurImRechner(agsCode: string | undefined): boolean {
  return !!agsCode && agsCode.length > 5;
}

const OHNE_SEITE: Record<string, string> = {};

describe("Förderkatalog und Stadtseiten bleiben synchron", () => {
  const regional = allFundingPrograms().filter((p) => p.level !== "bund");

  it("jedes regionale Programm hat eine Stadtseite — oder einen ausgeschriebenen Grund", () => {
    const ohne = regional
      .filter((p) => !ATLAS_CITIES.some((c) => fundingFor(c)?.id === p.id))
      .map((p) => p.id);
    const unerklaert = ohne.filter((id) => {
      const p = regional.find((x) => x.id === id)!;
      return !OHNE_SEITE[id] && !nurImRechner(p.agsCode);
    });
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
    expect(GEMEINDE_EBENE_OFFEN).toMatch(/OFFEN \(bis \d{2}\/\d{4}\)/);
  });

  it("keine Stadt zeigt auf ein Programm, das es nicht gibt", () => {
    const kaputt = ATLAS_CITIES.filter((c) => c.fundingId && !fundingFor(c)).map((c) => c.slug);
    expect(kaputt, `verwaiste Verknüpfung: ${kaputt.join(", ")}`).toEqual([]);
  });

  it("veröffentlicht wird nur, wo es auch ein Programm gibt", () => {
    for (const c of publishedCities()) expect(fundingFor(c), c.slug).toBeDefined();
  });
});
