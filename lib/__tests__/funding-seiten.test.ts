import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  seitenSchluessel, gleicheSeite, technikenSchreiben, technikenLesen,
  abdeckungJeTechnik, offeneTechniken, brauchtLesen, leseReihenfolge, fundEinfuegen,
  type FoerderSeite,
  istInterneRoute,
  istVorlagenRest,
  programmDecktSeite,
} from "../funding-seiten";

const seite = (p: Partial<FoerderSeite> & Pick<FoerderSeite, "url">): FoerderSeite => ({
  regionId: "08111", techniken: [], quelle: "suche", zustand: "erreichbar", ...p,
});

describe("Adressen — der Schlüssel, an dem Dubletten hängen", () => {
  it("erkennt dieselbe Seite trotz Schema, www, Anker und Schrägstrich", () => {
    const formen = [
      "https://www.koeln.de/foerderung",
      "http://koeln.de/foerderung/",
      "https://KOELN.de/foerderung#antrag",
      "www.koeln.de/foerderung",
    ];
    const schluessel = new Set(formen.map(seitenSchluessel));
    expect(schluessel.size, `Verschiedene Schlüssel: ${[...schluessel].join(" | ")}`).toBe(1);
  });

  it("behält den Query-Teil — viele Verwaltungssysteme adressieren NUR darüber", () => {
    // Würde der Query wegfallen, fiele eine ganze Gemeinde auf eine Seite zusammen.
    expect(gleicheSeite("https://stadt.de/index.php?id=12", "https://stadt.de/index.php?id=99")).toBe(false);
  });

  it("hält zwei echte Seiten derselben Gemeinde auseinander", () => {
    expect(gleicheSeite("https://stadt.de/pv", "https://stadt.de/balkonkraftwerk")).toBe(false);
  });

  it("schreibt den Pfad nicht klein — Pfade sind bei manchen Systemen empfindlich", () => {
    expect(gleicheSeite("https://stadt.de/Foerderung", "https://stadt.de/foerderung")).toBe(false);
  });
});

describe("Techniken", () => {
  it("schreibt und liest verlustfrei, in fester Reihenfolge", () => {
    expect(technikenLesen(technikenSchreiben(["waermepumpe", "pv"]))).toEqual(["pv", "waermepumpe"]);
  });

  it("rät NICHT auf PV, wenn nichts eingeordnet ist", () => {
    // Anders als im Katalog: dort ist ["pv"] ein ehrlicher Altbestand-Default,
    // hier wäre es eine Behauptung über eine nie eingeordnete Seite.
    expect(technikenLesen(null)).toEqual([]);
    expect(technikenLesen("")).toEqual([]);
    expect(technikenLesen("quatsch")).toEqual([]);
  });
});

describe("Abdeckung je Technik — Punkt 1 nachprüfbar gemacht", () => {
  it("zählt nur GELESENE Seiten, nicht bloße Fundstellen", () => {
    const nurGefunden = [seite({ url: "https://stadt.de/pv", techniken: ["pv"] })];
    expect(abdeckungJeTechnik(nurGefunden).pv).toBe(false);

    const gelesen = [seite({
      url: "https://stadt.de/pv", techniken: ["pv"],
      gelesenAm: "2026-08-19", gelesenErgebnis: "aufgenommen",
    })];
    expect(abdeckungJeTechnik(gelesen).pv).toBe(true);
  });

  it("eine gelesene Seite ohne Förderung deckt die Technik NICHT ab", () => {
    const s = [seite({
      url: "https://stadt.de/pv", techniken: ["pv"],
      gelesenAm: "2026-08-19", gelesenErgebnis: "keine-foerderung",
    })];
    expect(abdeckungJeTechnik(s).pv).toBe(false);
  });

  it("meldet offene Techniken nur, solange sie nicht schon abgedeckt sind", () => {
    const s = [
      seite({ url: "https://stadt.de/a", techniken: ["pv"], gelesenAm: "2026-08-19", gelesenErgebnis: "aufgenommen" }),
      seite({ url: "https://stadt.de/b", techniken: ["pv", "balkon"] }),
    ];
    expect(offeneTechniken(s)).toEqual(["balkon"]);
  });
});

describe("Arbeitsvorrat", () => {
  it("nie gelesen heißt: muss gelesen werden", () => {
    expect(brauchtLesen(seite({ url: "https://stadt.de/a" }))).toBe(true);
  });

  it("gelesen und seither unbewegt heißt: fertig", () => {
    expect(brauchtLesen(seite({
      url: "https://stadt.de/a", gelesenAm: "2026-08-19", gelesenErgebnis: "keine-foerderung",
    }))).toBe(false);
  });

  it("nach dem Lesen bewegt heißt: noch einmal ansehen", () => {
    expect(brauchtLesen(seite({
      url: "https://stadt.de/a", gelesenAm: "2026-08-01", gelesenErgebnis: "aufgenommen",
      seiteGeaendertAm: "2026-08-15T10:00:00Z",
    }))).toBe(true);
  });

  it("eine Bewegung VOR dem Lesen löst nichts aus", () => {
    expect(brauchtLesen(seite({
      url: "https://stadt.de/a", gelesenAm: "2026-08-19", gelesenErgebnis: "aufgenommen",
      seiteGeaendertAm: "2026-08-01T10:00:00Z",
    }))).toBe(false);
  });

  it("unerreichbare Seiten stehen nicht im Lese-Vorrat", () => {
    expect(brauchtLesen(seite({ url: "https://stadt.de/a", zustand: "unerreichbar" }))).toBe(false);
  });

  it("bewegt vor nie-gelesen — dort kann ein FALSCHER Wert im Katalog stehen", () => {
    const bewegt = seite({
      url: "https://stadt.de/bewegt", gelesenAm: "2026-08-01", gelesenErgebnis: "aufgenommen",
      seiteGeaendertAm: "2026-08-15T10:00:00Z",
    });
    const neu = seite({ url: "https://stadt.de/neu" });
    expect(leseReihenfolge([neu, bewegt]).map((s) => s.url)).toEqual([
      "https://stadt.de/bewegt", "https://stadt.de/neu",
    ]);
  });
});

describe("Fund einfügen", () => {
  it("legt eine unbekannte Seite an — normalisiert", () => {
    const raus = fundEinfuegen([], seite({ url: "https://www.stadt.de/pv/", techniken: ["pv"] }));
    expect(raus).toHaveLength(1);
    expect(raus[0].url).toBe("stadt.de/pv");
  });

  it("vereinigt Techniken statt sie zu ersetzen", () => {
    // Ein Lauf, der nur nach Balkon sucht, darf ein bekanntes PV-Signal nicht löschen.
    const bestand = [seite({ url: "stadt.de/foerderung", techniken: ["pv"] })];
    const raus = fundEinfuegen(bestand, seite({ url: "https://www.stadt.de/foerderung/", techniken: ["balkon"] }));
    expect(raus).toHaveLength(1);
    expect(raus[0].techniken).toEqual(["pv", "balkon"]);
  });

  it("vergisst beim erneuten Fund kein Leseergebnis", () => {
    const bestand = [seite({
      url: "stadt.de/foerderung", techniken: ["pv"],
      gelesenAm: "2026-08-01", gelesenErgebnis: "keine-foerderung", gelesenNotiz: "ist eine Beratung",
    })];
    const raus = fundEinfuegen(bestand, seite({ url: "stadt.de/foerderung", techniken: ["pv"] }));
    expect(raus[0].gelesenErgebnis).toBe("keine-foerderung");
    expect(raus[0].gelesenNotiz).toBe("ist eine Beratung");
  });

  it("eine zweite echte Seite derselben Gemeinde kommt dazu, statt die erste zu überschreiben", () => {
    // Der ganze Zweck des Umbaus.
    const bestand = [seite({ url: "stadt.de/photovoltaik", techniken: ["pv"] })];
    const raus = fundEinfuegen(bestand, seite({ url: "stadt.de/balkonkraftwerk", techniken: ["balkon"] }));
    expect(raus).toHaveLength(2);
  });

  it("von Hand eingetragen sticht automatisch gefunden", () => {
    const bestand = [seite({ url: "stadt.de/a", quelle: "hand" })];
    expect(fundEinfuegen(bestand, seite({ url: "stadt.de/a", quelle: "suche" }))[0].quelle).toBe("hand");
  });
});

describe("Dubletten, die der erste echte Lauf zutage gefördert hat (19.08.2026)", () => {
  it("die Vorschau-Adresse des Redaktionssystems ist dieselbe Seite", () => {
    // Leipzig lieferte drei Seiten doppelt, einmal blank und einmal mit ?ADMCMD_prev=LIVE.
    expect(gleicheSeite(
      "https://www.leipzig.de/leipzig-strategie/energie-und-klima/foerderung-privater-stecker-solar-geraete",
      "https://www.leipzig.de/leipzig-strategie/energie-und-klima/foerderung-privater-stecker-solar-geraete?ADMCMD_prev=LIVE",
    )).toBe(true);
  });

  it("ein Verweis-Parameter macht keine neue Seite", () => {
    expect(seitenSchluessel("https://www.aachen.de/melden/?referer=https://www.aachen.de/foerderprogramme"))
      .toBe("aachen.de/melden");
  });

  it("ein echter Kennungs-Parameter bleibt erhalten", () => {
    // Sonst fiele eine ganze Gemeinde auf eine einzige Seite zusammen.
    expect(gleicheSeite("https://stadt.de/index.php?id=12", "https://stadt.de/index.php?id=13")).toBe(false);
    expect(seitenSchluessel("https://stadt.de/s?id=12&print=1")).toBe("stadt.de/s?id=12");
  });

  it("Übersetzungs- und Maschinenrouten sind keine eigenen Fundstellen", () => {
    // Aachen liefert seine Förderseite zusätzlich unter /:translation/en|fr|nl/.
    expect(istInterneRoute("https://www.aachen.de/:translation/en/stadt-aachen/de/foerderprogramme")).toBe(true);
    expect(istInterneRoute("https://www.borgholzhausen.de/:res/modules/view.css")).toBe(true);
    expect(istInterneRoute("https://www.aachen.de/in-aachen-leben/klima-umwelt/klimaschutz/foerderprogramme")).toBe(false);
  });
});

describe("Vorlagen-Reste sind keine Adressen", () => {
  it("erkennt den unaufgelösten Ausdruck, kodiert wie unkodiert", () => {
    // Beide am 17.09.2026 am Server gemessen: HTTP 400, der Server weist sie selbst ab.
    expect(istVorlagenRest(
      "https://www.amt-trave-land.de/newsfeed/schieren/richtlinie-zum-foerderprogramm-loeschwasserversorgung-im-aussenbereich/%7B%7B%20item%20|%20generateUrl:'https://www.amt-trave-land.de/ratsinfo/gremium/%id%/%name%/'%20%7D%7D",
    )).toBe(true);
    expect(istVorlagenRest("https://www.emlichheim.de/wirtschaft-bauen/klimaschutz/foerderprogramme/%7B%7B%20item.uri%20%7D%7D")).toBe(true);
    expect(istVorlagenRest("https://www.stadt.de/foerderung/{{ item.self.webUrl }}")).toBe(true);
  });

  it("DIE ECHTE FÖRDERSEITE ÜBERLEBT — der Rest hängt nur als Unterpfad an ihr", () => {
    // Gegenprobe zu dem Fall, an dem ein zu breiter Filter teuer würde: In der
    // Kürzung auf 150 Zeichen sind beide Adressen zeichengleich, und die erste
    // ist ein bestätigtes Programm.
    expect(istVorlagenRest(
      "https://www.bad-marienberg.de/bauen-gewerbe-umwelt/sanierung-lohnt-sich/foerderprogramm-zur-ortskernvitalisierung-klimaanpassung-und-nutzung-erneuerbarer-energien",
    )).toBe(false);
    expect(istVorlagenRest(
      "https://www.bad-marienberg.de/bauen-gewerbe-umwelt/sanierung-lohnt-sich/foerderprogramm-zur-ortskernvitalisierung-klimaanpassung-und-nutzung-erneuerbarer-energien/%7B%7B%20item.uri%20%7D%7D",
    )).toBe(true);
  });

  it("eine EINFACHE Klammer ist kein Vorlagen-Rest", () => {
    // Geschweifte Klammern sind in einem Pfad erlaubt; erst die doppelte ist der
    // Ausdruck. Die Regel aufzuweichen ist nie die Lösung — sie zu verbreitern auch nicht.
    expect(istVorlagenRest("https://www.stadt.de/foerderung/{jahr}")).toBe(false);
    expect(istVorlagenRest("https://www.stadt.de/foerderung/%7Bjahr%7D")).toBe(false);
  });

  it("die Platzhalter allein reichen NICHT als Merkmal", () => {
    // Gegen den Bestand gemessen (17.09.2026): kein einziger Rest trägt einen
    // Platzhalter ohne die Klammer. Wer auf sie prüft, fängt keine Zeile mehr.
    expect(istVorlagenRest("https://www.stadt.de/ratsinfo/gremium/%id%/%name%/")).toBe(false);
  });
});

describe("Der Filter wird auch BENUTZT, nicht nur gebaut", () => {
  // Geprüft wird die VERWENDUNG, nicht das Vorhandensein: Ein Filter, den niemand
  // aufruft, ist von keinem nicht zu unterscheiden. Beim Einchecken absichtlich
  // kaputtgemacht — der Typprüfer fängt nur die verwaiste Einfuhr, nicht den Fall,
  // dass Aufruf UND Einfuhr zusammen verschwinden.
  const quelle = (pfad: string): string =>
    readFileSync(resolve(__dirname, "..", "..", pfad), "utf8");

  it("die Aufnahme neuer Fundstellen filtert Vorlagen-Reste weg", () => {
    expect(quelle("scripts/funding-discover.ts")).toMatch(/istVorlagenRest\(/);
  });

  it("der Aufräumlauf entfernt Vorlagen-Reste aus dem Bestand", () => {
    expect(quelle("scripts/funding-seiten-backfill.ts")).toMatch(/istVorlagenRest\(/);
  });
});

describe("Sprachfassungen sind Dubletten, die deutsche Fassung nicht", () => {
  it("erkennt fremdsprachige Fassungen derselben Seite", () => {
    // Mainz lieferte dieselbe Seite unter /en/, /es/, /fr/ und /uk/.
    for (const l of ["en", "es", "fr", "uk"]) {
      expect(istInterneRoute(`https://www.mainz.de/${l}/vv/produkte/schulamt/x`), l).toBe(true);
    }
  });

  it("lässt /de/ in Ruhe — dort liegt bei vielen die EINZIGE Fassung", () => {
    expect(istInterneRoute("https://www.luebeck.de/de/stadtentwicklung/klima/gruendachfoerderung")).toBe(false);
    expect(istInterneRoute("https://www.bad-homburg.de/de/suche")).toBe(false);
  });

  it("verwechselt kein normales Pfadsegment mit einem Sprachkürzel", () => {
    expect(istInterneRoute("https://www.stadt.de/pv/foerderung")).toBe(false);
  });
});

describe("Fördergebiet deckt Gemeinde — die Richtung ist der ganze Punkt", () => {
  it("ein Kreis-Programm gilt der Gemeinde darin", () => {
    // Würzburgs Katalog-Eintrag trägt 09663, seine Seite 09663000.
    expect(programmDecktSeite("09663", "09663000")).toBe(true);
  });

  it("ein Landesprogramm gilt jeder Gemeinde des Landes", () => {
    expect(programmDecktSeite("11", "11000000")).toBe(true);
  });

  it("ein Gemeinde-Programm gilt NICHT dem ganzen Kreis", () => {
    // Höhr-Grenzhausens Dorfzuschuss darf nie für den Westerwaldkreis zählen.
    expect(programmDecktSeite("07143032", "07143")).toBe(false);
  });

  it("Nachbargemeinden mit gemeinsamem Kreis-Präfix treffen sich nicht", () => {
    expect(programmDecktSeite("07143032", "07143099")).toBe(false);
  });

  it("leere Schlüssel decken nichts", () => {
    expect(programmDecktSeite("", "09663000")).toBe(false);
    expect(programmDecktSeite("09663", "")).toBe(false);
  });
});
