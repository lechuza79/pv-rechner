import { describe, it, expect } from "vitest";
import { ATLAS_CITIES, fundingFor, fundingForFrom, publishedCities, indexedCities, cityIndexFreigegeben } from "../atlas-cities";
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
 * Leer, und das ist das Ergebnis vom 19.08.2026: Bis dahin nahm dieser Test
 * eine ganze KLASSE von Programmen von der Seitenpflicht aus — alle mit
 * achtstelligem Gemeindeschlüssel, seinerzeit 61 Stück. Die Begründung war
 * richtig (das Verzeichnis führte fünfstellige Kreisschlüssel, und eine
 * Gemeinde damit einzutragen hätte den Bestand des ganzen Landkreises unter
 * ihren Namen gesetzt), aber eine Ausnahme, die mit jedem gefundenen
 * Dorfprogramm mitwächst, hört auf, eine Ausnahme zu sein: Sie hat den Zustand
 * festgehalten, statt ihn zu befristen. Jetzt trägt das Verzeichnis
 * achtstellige Schlüssel, und die Regel ist weg.
 */
const OHNE_SEITE: Record<string, string> = {};

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

  // Der Kern der Umstellung vom 19.08.2026: Ein Programm einer kreisangehörigen
  // Gemeinde bekommt seine Seite über den ACHTSTELLIGEN Schlüssel. Trüge der
  // Eintrag den fünfstelligen des Landkreises, stünde dessen Anlagenbestand
  // unter dem Ortsnamen — die Seite sähe dabei völlig normal aus.
  it("ein Gemeinde-Programm hängt an einem Eintrag mit Gemeindeschlüssel", () => {
    const falsch = regional
      .filter((p) => p.agsCode && p.agsCode.length === 8)
      .map((p) => ({ p, c: ATLAS_CITIES.find((c) => fundingFor(c)?.id === p.id) }))
      .filter(({ c }) => c && c.ags.length !== 8)
      .map(({ p, c }) => `${p.id} → ${c!.slug} (ags ${c!.ags})`);
    expect(falsch, `Kreisschlüssel unter Ortsnamen: ${falsch.join(", ")}`).toEqual([]);
  });

  // Jeder Eintrag mit Gemeindeschlüssel nennt seinen Landkreis: Mühlhausen und
  // Senden gibt es mehrfach in Deutschland, und ohne den Kreis daneben liest
  // man den Bestand des einen als den des anderen.
  it("jede kreisangehörige Gemeinde nennt ihren Landkreis", () => {
    const ohneKreis = ATLAS_CITIES.filter((c) => c.ags.length === 8 && !c.kreis).map((c) => c.slug);
    expect(ohneKreis, `ohne Landkreis: ${ohneKreis.join(", ")}`).toEqual([]);
  });

  it("keine Stadt zeigt auf ein Programm, das es nicht gibt", () => {
    const kaputt = ATLAS_CITIES.filter((c) => c.fundingId && !fundingFor(c)).map((c) => c.slug);
    expect(kaputt, `verwaiste Verknüpfung: ${kaputt.join(", ")}`).toEqual([]);
  });

  it("veröffentlicht wird nur, wo es auch ein Programm gibt", () => {
    for (const c of publishedCities()) expect(fundingFor(c), c.slug).toBeDefined();
  });
});

// Aus der Prüfrunde am 18.08.2026 — beide Fälle waren latent, kein Test hätte
// angeschlagen, und beide hätten Geld bewegt bzw. eine indexierte Seite entfernt.
describe("Zuordnung über den Gemeindeschlüssel", () => {
  const stadt = (ags: string) =>
    ({ slug: "test", name: "Test", ags, bundesland: "Rheinland-Pfalz", yieldKwhKwp: 1000 }) as any;

  it("ein Gemeinde-Programm gilt NICHT für den ganzen Landkreis", () => {
    // Höhr-Grenzhausen (07143032) liegt im Westerwaldkreis (07143). Die frühere
    // Fassung kürzte auf fünf Stellen und hätte den Zuschuss jeder Postleitzahl
    // des Kreises zugerechnet.
    expect(fundingFor(stadt("07143"))).toBeUndefined();
  });

  it("der spezifischere Schlüssel gewinnt, statt dass sich zwei aufheben", () => {
    const land = { id: "land", level: "land", agsCode: "04", status: "aktiv" } as any;
    const kommune = { id: "kommune", level: "kommune", agsCode: "04011", status: "aktiv" } as any;
    expect(fundingForFrom([land, kommune], stadt("04011"))?.id).toBe("kommune");
    // Ohne eigenes Programm bleibt es beim Landesprogramm — so kam Bremerhaven
    // überhaupt erst zu seiner Seite.
    expect(fundingForFrom([land, kommune], stadt("04012"))?.id).toBe("land");
  });

  it("echte Mehrdeutigkeit bleibt ungelöst, statt geraten zu werden", () => {
    const a = { id: "a", level: "kommune", agsCode: "06412", status: "aktiv" } as any;
    const b = { id: "b", level: "kommune", agsCode: "06412", status: "aktiv" } as any;
    expect(fundingForFrom([a, b], stadt("06412"))).toBeUndefined();
  });
});

// ─── Gebaut heißt nicht freigegeben ──────────────────────────────────────────
//
// Die 60 Gemeindeseiten sind fertig, dürfen aber noch nicht in den Index: Für
// denselben Ort darf nie gleichzeitig eine frische Förder- und eine frische
// Atlas-Ortsseite erscheinen — Google braucht Wochen für die Zuordnung, und ein
// falsch zugeordneter Ort ist teuer zu korrigieren. Die Reihenfolge kommt aus
// dem Releaseplan.
/**
 * Kreisangehörige Städte, die schon vor der Welle im Index standen.
 *
 * Aachen, Hannover und Saarbrücken sind rechtlich kreisangehörig (StädteRegion,
 * Region, Regionalverband) und tragen seit dem 19.08.2026 deshalb ebenfalls
 * einen achtstelligen Schlüssel — vorher stand dort der der übergeordneten
 * Region, und die Seiten zeigten deren Bestand unter dem Stadtnamen. Sie sind
 * damit zwar kreisangehörig, gehören aber nicht zur neuen Welle: Ihre Seiten
 * gibt es seit Juni.
 */
const SCHON_IM_INDEX = ["aachen", "hannover", "saarbruecken"];

describe("Index-Freigabe", () => {
  it("die neuen Gemeindeseiten stehen noch nicht im Index", () => {
    const offen = ATLAS_CITIES.filter(
      (c) => c.kreis && !SCHON_IM_INDEX.includes(c.slug) && cityIndexFreigegeben(c),
    ).map((c) => c.slug);
    expect(
      offen,
      `freigegeben, obwohl der Releaseplan noch keine Reihenfolge nennt: ${offen.join(", ")}. ` +
        "Freischalten ist eine bewusste Entscheidung — dann gehört dieser Test mit angepasst, nicht gelöscht.",
    ).toEqual([]);
  });

  it("die Seiten, die es längst gibt, bleiben freigegeben", () => {
    // Gegenrichtung: Die Sperre darf nicht auf die Seiten übergreifen, die seit
    // Juni im Index stehen — auch nicht auf die drei, die durch die
    // Schlüsselkorrektur nachträglich kreisangehörig wurden.
    const gesperrt = ATLAS_CITIES.filter(
      (c) => (!c.kreis || SCHON_IM_INDEX.includes(c.slug)) && !cityIndexFreigegeben(c),
    ).map((c) => c.slug);
    expect(gesperrt, `unerwartet gesperrt: ${gesperrt.join(", ")}`).toEqual([]);
  });

  it("was nicht in den Index darf, steht auch nicht in der Sitemap", () => {
    // Sitemap und robots-Angabe hängen beide an cityIndexFreigegeben. Der Test
    // hält fest, dass niemand die eine Stelle ändert und die andere vergisst:
    // Eine Seite per Sitemap anzubieten und per robots zu verweigern wäre ein
    // Widerspruch, den von außen niemand sieht.
    const widerspruch = indexedCities().filter((c) => c.indexFreigabe === false).map((c) => c.slug);
    expect(widerspruch, `in der Sitemap trotz Sperre: ${widerspruch.join(", ")}`).toEqual([]);
  });
});
