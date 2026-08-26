import { describe, it, expect } from "vitest";
import { ATLAS_CITIES, fundingFor, fundingForFrom, publishedCities, indexedCities, cityIndexFreigegeben, liveCities, archivedCities } from "../atlas-cities";
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
const SCHON_IM_INDEX = [
  "aachen",
  "hannover",
  "saarbruecken",
  // Nidda kam am 26.08.2026 dazu, und zwar über den Releaseplan
  // (Schub „w4-nidda-rueckmeldung", status live) — also genau auf dem Weg, den
  // dieser Test verlangt, nicht an ihm vorbei.
  //
  // Der Grund ist bewusst KEIN Suchvolumen: Die Klimaschutz-Beauftragte der
  // Stadt hat uns ihr Förderprogramm selbst geschickt, und für den
  // Kommunen-Outreach ist der Satz „Ihr Programm steht in unserem Rechner" mit
  // Seite ein Link und ohne Seite eine Behauptung. Die volle Begründung samt
  // Messung steht am Schub.
  //
  // Damit ist die Welle NICHT eröffnet: Die übrigen kreisangehörigen Orte
  // bleiben gesperrt, und w1 bleibt zurückgenommen. Wer hier einen weiteren
  // Slug einträgt, braucht einen eigenen Schub mit eigenem Nachweis.
  "nidda",
];

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

  it("dieser Zweig stellt keine einzige Seite zusätzlich in den Index", () => {
    // Die härteste Formulierung der Zusage — und die einzige, die auch den Fall
    // fängt, an den man nicht denkt: Zweibrücken bekam seine Seite nicht durch
    // einen neuen Eintrag, sondern weil ein zu eng gefasster Programmschlüssel
    // korrigiert wurde. Es hat keinen Landkreis (kreisfrei) und wäre jeder
    // Prüfung entgangen, die auf „kreisangehörig" abfragt — und wäre am Tag des
    // Merges unangekündigt im Index gestanden.
    //
    // 37 war der Stand vom 19.08.2026, deckungsgleich mit dem eingefrorenen
    // Altbestand des Releaseplans. Wächst die Zahl, ist eine Seite
    // veröffentlicht worden, ohne dass jemand es entschieden hat.
    //
    // 38 seit dem 26.08.2026: Nidda, über den Schub „w4-nidda-rueckmeldung".
    // Die Zahl anzuheben ist hier ausdrücklich KEIN Aufweichen der Schwelle —
    // sie ist die Buchführung über bewusste Freischaltungen, und diese eine ist
    // im Releaseplan begründet und mit Nachweis versehen. Wer sie erhöht, ohne
    // dass ein Schub auf „live" steht, hat genau den Fehler gemacht, den der
    // Test verhindern soll.
    expect(indexedCities().length).toBe(38);
  });

  it("die Seiten, die es längst gibt, bleiben freigegeben — und zwar dieselben", () => {
    // Gegenrichtung: Die Sperre darf nicht auf die Seiten übergreifen, die seit
    // Juni im Index stehen.
    //
    // Geprüft wird die IDENTITÄT, nicht nur die Anzahl. Der Test darüber hält
    // 37 fest; das allein überlebt einen Tausch (eine Seite fällt raus, eine
    // andere kommt rein) unbemerkt. Genau das stand am 19.08.2026 bevor: Die
    // Schlüsselkorrektur von Hannover (03241 = Region, 1,14 Mio. Einwohner →
    // 03241001 = Stadt) hätte der Stadt still die Freigabe genommen.
    //
    // Gemessen wird an den Städten, die ihr Programmstatus überhaupt
    // veröffentlichbar macht — NICHT am ganzen Verzeichnis: Die rund 70
    // programmlosen Städte (Nürnberg, Leipzig, Hamburg …) hatten nie eine Seite
    // und liefern seit Juni 404. Für sie eine Freigabe zu verlangen hieße, sie
    // für Seiten zu fordern, die es nicht gibt.
    const SEIT_JUNI_IM_INDEX = [
      "baden-baden", "berlin", "bonn", "bottrop", "bremen", "bremerhaven", "darmstadt",
      "dortmund", "duesseldorf", "essen", "frankfurt", "freiburg", "hannover", "heidelberg",
      "herne", "karlsruhe", "koeln", "krefeld", "kreis-bergstrasse", "kreis-viersen",
      "ludwigshafen", "mainz", "mannheim", "mayen-koblenz", "memmingen", "muenchen",
      "muenster", "osnabrueck", "potsdam", "regensburg", "rhein-erft-kreis", "schweinfurt",
      "schwerin", "stuttgart", "wiesbaden", "wolfsburg", "wuerzburg",
      // Nachträglich freigeschaltet, nicht seit Juni dabei: Nidda (26.08.2026,
      // Schub „w4-nidda-rueckmeldung"). Steht hier, weil dieser Test die
      // IDENTITÄT der freigegebenen Seiten hält — eine bewusste Freischaltung
      // muss sichtbar dazukommen, sonst könnte ein stiller Tausch sie ersetzen.
      "nidda",
    ];
    expect(indexedCities().map((c) => c.slug).sort()).toEqual([...SEIT_JUNI_IM_INDEX].sort());
  });

  it("was nicht in den Index darf, steht auch nicht in der Sitemap", () => {
    // Sitemap und robots-Angabe hängen beide an cityIndexFreigegeben. Der Test
    // hält fest, dass niemand die eine Stelle ändert und die andere vergisst:
    // Eine Seite per Sitemap anzubieten und per robots zu verweigern wäre ein
    // Widerspruch, den von außen niemand sieht.
    //
    // Seit dem 19.08.2026 antwortet dort der Releaseplan statt eines Feldes je
    // Stadt (siehe cityIndexFreigegeben). Geprüft wird deshalb gegen den Plan.
    const widerspruch = indexedCities().filter((c) => !cityIndexFreigegeben(c)).map((c) => c.slug);
    expect(widerspruch, `in der Sitemap trotz Sperre: ${widerspruch.join(", ")}`).toEqual([]);
  });

  it("die Sperre in der Sitemap ist tragend, nicht dekorativ", () => {
    // Der Test darüber wäre für sich allein wertlos: Beide Seiten der Gleichung
    // fragen inzwischen denselben Plan, er kann also gar nicht mehr rot werden.
    // Erst zusammen mit dieser Prüfung sagt er etwas aus — nämlich dass es
    // überhaupt Städte GIBT, die der Filter entfernt.
    //
    // app/sitemap.ts baut seine Liste aus liveCities()/archivedCities(), und die
    // fragen nur den Programmstatus. Fiele der Filter dort weg, stünden diese
    // Städte am nächsten Tag in der Sitemap. Wird die Zahl hier 0, ist der
    // Filter tot und eine Regression unsichtbar.
    const vomFilterEntfernt = [...liveCities(), ...archivedCities()].filter((c) => !cityIndexFreigegeben(c));
    expect(vomFilterEntfernt.length).toBeGreaterThan(0);
  });
});
