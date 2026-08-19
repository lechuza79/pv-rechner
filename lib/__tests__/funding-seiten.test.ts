import { describe, it, expect } from "vitest";
import {
  seitenSchluessel, gleicheSeite, technikenSchreiben, technikenLesen,
  abdeckungJeTechnik, offeneTechniken, brauchtLesen, leseReihenfolge, fundEinfuegen,
  type FoerderSeite,
  istInterneRoute,
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
