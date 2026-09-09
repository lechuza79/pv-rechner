import { describe, it, expect } from "vitest";
import { ATLAS_CITIES, fundingFor, fundingForFrom, publishedCities, indexedCities, cityIndexFreigegeben, liveCities, archivedCities, foerderseiteTraegt } from "../atlas-cities";
import { allFundingPrograms } from "../funding-programs";
import { ALTBESTAND, ortSchluessel } from "../release-plan";

/** Seit Juni live — wird von einer neuen Regel nicht rückwirkend eingezogen. */
const ALT = new Set(ALTBESTAND["foerder-stadt"].map(ortSchluessel));
const istAlt = (ags: string) => ALT.has(ortSchluessel(ags));

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
  it("gibt genau die Orte frei, deren Programm aktiv ist und Dach-PV fördert", () => {
    // ENTSCHEIDUNG DES BETREIBERS, 01.09.2026: Eine Förderseite geht live,
    // sobald ihr Programm die Schwelle besteht — sie braucht keinen eigenen
    // Schub mehr (lib/atlas-cities.ts → foerderseiteTraegt). Der Test hält
    // seitdem nicht mehr eine Liste fest, sondern die REGEL: Was aktiv ist und
    // Dach-PV fördert, ist freigegeben; alles andere nicht.
    //
    // Das ist keine Aufweichung, sondern die schärfere Prüfung: Eine feste Zahl
    // hätte den Fall nicht gefangen, dass ein Programm auf „ausgeschöpft"
    // wechselt und seine Seite trotzdem stehen bleibt.
    const sollte = ATLAS_CITIES.filter((c) => {
      const p = fundingFor(c);
      return !!p && p.status === "aktiv" && (p.foerdert ?? ["pv"]).includes("pv");
    });
    const ist = ATLAS_CITIES.filter((c) => cityIndexFreigegeben(c));

    // Der Altbestand aus dem Releaseplan darf zusätzlich freigegeben sein — er
    // stand vor dieser Regel live und wird nicht rückwirkend eingezogen.
    const zuviel = ist
      .filter((c) => !sollte.includes(c))
      .filter((c) => !SCHON_IM_INDEX.includes(c.slug) && !istAlt(c.ags))
      .filter((c) => {
        const p = fundingFor(c);
        return !p || p.status === "aktiv";
      })
      .map((c) => c.slug);
    const zuwenig = sollte.filter((c) => !ist.includes(c)).map((c) => c.slug);

    expect(zuwenig, `Programm aktiv und Dach-PV, aber keine Seite: ${zuwenig.join(", ")}`).toEqual([]);
    expect(zuviel, `freigegeben ohne aktives Dach-PV-Programm: ${zuviel.join(", ")}`).toEqual([]);
  });

  it("gibt keine Seite frei, deren Topf leer ist", () => {
    // Eine Förderseite ohne abrufbares Geld beantwortet die Frage nicht, für die
    // jemand kommt. Betrifft Göttingen, Weyhe und Feucht.
    const leer = ATLAS_CITIES.filter((c) => {
      const p = fundingFor(c);
      return !!p && p.status === "ausgeschoepft" && !SCHON_IM_INDEX.includes(c.slug) && !istAlt(c.ags);
    }).filter((c) => cityIndexFreigegeben(c));
    expect(leer.map((c) => c.slug), "ausgeschöpftes Programm, trotzdem freigegeben").toEqual([]);
  });

  it("gibt keine Seite frei, die nur Balkonkraftwerke fördert", () => {
    // Der Seitentitel verspricht Photovoltaik-Förderung. 35 Orte fördern nur
    // Steckersolar — die brauchen eine eigene Seitenfamilie, keine falsche
    // Überschrift.
    const nurBalkon = ATLAS_CITIES.filter((c) => {
      const p = fundingFor(c);
      const f = p?.foerdert ?? ["pv"];
      return !!p && !f.includes("pv") && !SCHON_IM_INDEX.includes(c.slug) && !istAlt(c.ags);
    }).filter((c) => cityIndexFreigegeben(c));
    expect(nurBalkon.map((c) => c.slug), "nur Balkon-Förderung, trotzdem als PV-Seite freigegeben").toEqual([]);
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
    // GEPRÜFT WIRD DIE TEILMENGE, NICHT DIE GLEICHHEIT (05.09.2026).
    //
    // Bis hierher stand hier toEqual — der Test war damit zugleich eine
    // WACHSTUMSSPERRE. Das war bis zum 01.09.2026 richtig: Damals entschied der
    // Releaseplan über jede Freischaltung, eine neue Seite ohne Schub wäre eine
    // Nebenwirkung gewesen. Seitdem hat der Betreiber entschieden, dass eine
    // Förderseite live geht, sobald ihr Programm aktiv ist und Dach-PV fördert.
    // Der Test wurde bei dieser Umstellung nicht nachgezogen — und blieb grün,
    // weil isCityPublished sie ebenfalls nicht mitbekam. Zwei überholte
    // Annahmen, die einander bestätigten, während 21 Adressen in der Sitemap
    // standen und mit HTTP 404 antworteten.
    //
    // Was der Test WEITERHIN leistet und leisten soll: Keine der Seiten, die
    // seit Juni im Index stehen, darf ihre Freigabe still verlieren — genau der
    // Fall, den die Hannover-Schlüsselkorrektur ausgelöst hätte. Das ist eine
    // Teilmengen-Frage, keine Gleichheits-Frage.
    const freigegeben = new Set(indexedCities().map((c) => c.slug));
    const verloren = SEIT_JUNI_IM_INDEX.filter((s) => !freigegeben.has(s));
    expect(verloren, "seit Juni im Index und jetzt nicht mehr freigegeben").toEqual([]);

    // Und die Gegenrichtung, damit aus der Lockerung keine offene Tür wird: Was
    // NEU dazukommt, kommt über den zweiten, benannten Weg — nicht über einen
    // dritten, den niemand angemeldet hat.
    const altbestand = new Set(SEIT_JUNI_IM_INDEX);
    const ohneGrund = indexedCities()
      .filter((c) => !altbestand.has(c.slug) && !foerderseiteTraegt(c))
      .map((c) => c.slug);
    expect(ohneGrund, "neu im Index, ohne dass das Programm die Schwelle trägt").toEqual([]);
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
