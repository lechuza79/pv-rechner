import { describe, it, expect } from "vitest";
import {
  MIN_VERGLEICH,
  PRIVATE_DACH_SEGMENTE,
  abstandTeile,
  briefVergleichSatz,
  gemeindeVergleich,
  proKopfSatz,
} from "../gemeinde-vergleich";

// Dieser Test ist der Mechanismus, nicht die Dokumentation.
//
// Der Fehler, gegen den er steht, war NICHT in einem Browser zu sehen: Brief
// und Gemeindeseite waren jede für sich richtig. Sichtbar wurde er erst, als
// jemand beide nebeneinander legte — 18 echte Briefe, vier davon betroffen.
// Genau deshalb kann ihn keine Abnahme fangen, nur eine Prüfung, die beide
// Oberflächen gleichzeitig fragt.

type Ort = { privat_dach: number; steckersolar?: number; gewerbe_dach?: number; freiflaeche?: number };

const atlasVon = (o: Ort) => ({
  solar: {
    total_kwp: Object.values(o).reduce((a, b) => a + (b ?? 0), 0),
    by_segment: Object.entries(o).map(([segment, kwp]) => ({ segment, kwp: kwp ?? 0 })),
  },
});

/** Referenz-Bundesland: 200 Wp/Kopf auf privaten Dächern, 500 Wp/Kopf gesamt. */
const LAND = atlasVon({ privat_dach: 200_000, gewerbe_dach: 150_000, freiflaeche: 150_000 });
const LAND_POP = 1_000_000;

const vergleichFuer = (o: Ort, pop: number) =>
  gemeindeVergleich({
    atlas: atlasVon(o),
    population: pop,
    blAtlas: LAND,
    blPopulation: LAND_POP,
    blName: "Hessen",
  });

describe("Eine Rechnung für beide Oberflächen", () => {
  //
  // DIE ZENTRALE ZUSAGE. Sagt der Brief „X % mehr auf den privaten Dächern",
  // muss die Seite, die derselbe Brief zum Nachprüfen verlinkt, dieselbe Zahl
  // tragen — sonst steht wieder Zahl gegen Zahl.
  //
  // Durchgerechnet über ein Raster statt an drei Beispielen: Der Audit-Fall lag
  // genau im Übergangsbereich (privat vorn, gesamt hinten), und ein
  // Beispieltest hätte ihn treffen müssen, um ihn zu finden.
  it("wo der Brief einen Vorsprung behauptet, widerspricht die Seite ihm nie", () => {
    // Die Zusage ist NICHT „beide nennen dieselbe Zahl". Liegt der Ort auch
    // über alle Anlagen vorn, trägt die Gesamtzahl den Satz der Seite, und
    // nichts widerspricht dem Brief — zwei positive Aussagen über zwei Größen
    // sind kein Widerspruch.
    //
    // Die Zusage ist: Sagt die Seite „unter dem Schnitt", während der Brief
    // einen Vorsprung meldet, dann muss sie die private Zahl DES BRIEFES
    // nennen und die schwächere Größe als „für alle Anlagen" kennzeichnen.
    // Genau das fehlte, und genau das haben vier Pressestellen als Widerspruch
    // lesen können.
    let mitAufloesung = 0;
    let ohneKonflikt = 0;
    for (let privat = 0; privat <= 4_000; privat += 50) {
      for (const gewerbe of [0, 500, 2_000, 20_000]) {
        const v = vergleichFuer({ privat_dach: privat, gewerbe_dach: gewerbe }, 10_000);
        const brief = briefVergleichSatz(v, "in Hessen");
        if (!brief) continue;
        const seite = proKopfSatz(v);
        const lage = `privat=${privat} gewerbe=${gewerbe}`;
        const t = abstandTeile(v.privat!.abstand);
        const zahl = t.vielfaches ? `${t.vielfaches}-fache` : t.prozent;
        expect(brief, lage).toContain(zahl);

        if (v.gesamt!.abstand < 0) {
          // Die Seite muss den Konflikt auflösen, nicht verschweigen.
          expect(seite, lage).toContain("auf den privaten Dächern");
          expect(seite, lage).toContain(zahl);
          expect(seite, lage).toContain("für alle Anlagen");
          expect(seite, lage).not.toContain("Luft nach oben");
          mitAufloesung++;
        } else {
          // Kein Konflikt: Die Seite sagt ebenfalls „über dem Schnitt".
          expect(seite, lage).not.toContain("unter dem");
          ohneKonflikt++;
        }
      }
    }
    // Ein Test, der einen der beiden Zweige nie erreicht, ist grün und blind —
    // und der erste Zweig ist genau der Fall aus dem Audit.
    expect(mitAufloesung).toBeGreaterThan(20);
    expect(ohneKonflikt).toBeGreaterThan(20);
  });

  it("die Seite sagt nie Luft-nach-oben, während der Brief einen Vorsprung meldet", () => {
    // Das war der gemessene Widerspruch: Brief „39 % mehr", Seite „6 % unter
    // dem Hessen-Schnitt, hier ist also noch viel Luft nach oben".
    for (let privat = 0; privat <= 900_000; privat += 10_000) {
      const v = vergleichFuer({ privat_dach: privat, gewerbe_dach: 300_000 }, 1_000);
      if (!briefVergleichSatz(v, "in Hessen")) continue;
      expect(proKopfSatz(v), `privat=${privat}`).not.toContain("Luft nach oben");
    }
  });

  it("geht es auseinander, benennt die Seite die andere Messgröße", () => {
    // Melsungen-Fall: privat vorn, gesamt hinten.
    const v = vergleichFuer({ privat_dach: 3_000, gewerbe_dach: 1_000 }, 10_000);
    expect(v.privat!.abstand).toBeCloseTo(0.5, 6);
    expect(v.gesamt!.abstand).toBeCloseTo(-0.2, 6);
    expect(proKopfSatz(v)).toContain("für alle Anlagen");
  });

  it("eine Schwelle für das Vielfache, nicht zwei", () => {
    // Brief und Seite trugen denselben Kommentar („ab dem Dreifachen") über
    // zwei verschiedenen Zahlen: der Brief schaltete beim Dreifachen um, die
    // Seite erst beim Vierfachen. Der Kommentar behauptete dabei ausdrücklich
    // Gleichheit — niemand hat es nachgerechnet.
    // Der Brief rechnet auf den privaten Dächern (Landesschnitt 200 Wp/Kopf),
    // die Seite in diesem Zweig auf der Gesamtleistung (500 Wp/Kopf). Deshalb
    // je Oberfläche ein eigenes Beispiel — geprüft wird, dass beide bei
    // DEMSELBEN Abstand umschalten, nicht bei derselben Leistung.
    const briefSatz = (privatProKopf: number) =>
      briefVergleichSatz(vergleichFuer({ privat_dach: privatProKopf * 10 }, 10_000), "in Hessen");
    expect(briefSatz(590)).not.toContain("-fache"); // Abstand 1,95
    expect(briefSatz(610)).toContain("-fache"); // Abstand 2,05

    const seitenSatz = (gesamtProKopf: number) =>
      proKopfSatz(vergleichFuer({ privat_dach: 0, gewerbe_dach: gesamtProKopf * 10 }, 10_000));
    expect(seitenSatz(1_490)).not.toContain("-fache"); // Abstand 1,98
    expect(seitenSatz(1_510)).toContain("-fache"); // Abstand 2,02

    // Und die Schwelle liegt wirklich am Dreifachen, nicht am Vierfachen: Das
    // war der Wert, mit dem die Seite rechnete, während ihr Kommentar das
    // Dreifache behauptete.
    expect(abstandTeile(1.99).vielfaches).toBeNull();
    expect(abstandTeile(2.0).vielfaches).toBe("3");
  });
});

describe("Was als Leistung auf privaten Dächern zählt", () => {
  //
  // ZWEITER BEFUND DESSELBEN AUDITS: „privat" bedeutete an zwei Stellen zwei
  // verschiedene Dinge. Der Eigentümer-Filter der Gemeindeseite zählt alles in
  // Bürgerhand (Dach UND Balkon), diese Größe hier nur die Dächer.
  //
  // Gemessen an Eichenzell (06631006, Stand 05.08.2026, 11.849 Einwohner):
  // 14.041,48 kWp auf privaten Dächern, dazu 199 Balkongeräte mit 228,68 kWp.
  // Auf der Seite standen deshalb 1.185 Wp (Auszeichnung) und 1.204 Wp
  // (Privat-Kachel) — beide richtig, beide über „privat".
  it("Balkonkraftwerke zählen nicht mit — sie hängen nicht auf dem Dach", () => {
    expect([...PRIVATE_DACH_SEGMENTE]).toEqual(["privat_dach"]);
    const mitBalkon = vergleichFuer({ privat_dach: 14_041.48, steckersolar: 228.68 }, 11_849);
    const ohneBalkon = vergleichFuer({ privat_dach: 14_041.48 }, 11_849);
    expect(Math.round(mitBalkon.privat!.proKopf)).toBe(1185);
    expect(Math.round(ohneBalkon.privat!.proKopf)).toBe(1185);
  });

  it("die Auszeichnung der Gemeindeseite rechnet auf derselben Größe", () => {
    // 1.185 Wp weist die Auszeichnung „die meiste private Solarleistung auf
    // den Dächern je Einwohner" für Eichenzell aus (am 20.08.2026 an der
    // Produktion abgelesen). Käme der Einleitungssatz auf eine andere Zahl,
    // stünden auf EINER Seite zwei Werte für denselben Satz — der Fehler, der
    // hier gerade behoben wird, nur eine Zeile weiter unten.
    const v = vergleichFuer(
      { privat_dach: 14_041.48, steckersolar: 228.68, gewerbe_dach: 14_485.45, freiflaeche: 18_574.2 },
      11_849,
    );
    expect(Math.round(v.privat!.proKopf)).toBe(1185);

    // Eichenzell selbst ist NICHT der Konfliktfall: Zwei Freiflächen-Anlagen
    // heben die Gesamtleistung weit über den Landesschnitt, also trägt sie den
    // Satz. Die private Zahl steht dort nur, wo sie gebraucht wird.
    expect(v.gesamt!.abstand).toBeGreaterThan(0);
    expect(proKopfSatz(v)).not.toContain("für alle Anlagen");
  });
});

describe("Grenzfälle", () => {
  it("ohne Einwohnerzahl gibt es keine Pro-Kopf-Aussage", () => {
    const v = gemeindeVergleich({
      atlas: atlasVon({ privat_dach: 5_000 }),
      population: null,
      blAtlas: LAND,
      blPopulation: LAND_POP,
      blName: "Hessen",
    });
    expect(v.privat).toBeNull();
    expect(v.gesamt).toBeNull();
    expect(proKopfSatz(v)).toBe("");
    expect(briefVergleichSatz(v, "in Hessen")).toBe("");
  });

  it("eine Einwohnerzahl von null erzeugt keine Unendlich-Zahl", () => {
    const v = vergleichFuer({ privat_dach: 5_000 }, 0);
    expect(v.privat).toBeNull();
    expect(proKopfSatz(v)).toBe("");
  });

  it("unter der Meldeschwelle schweigt der Brief, die Seite nicht", () => {
    // 205 gegen 200 Wp/Kopf: Für einen Leser ist das kein Unterschied, und die
    // Einwohnerzahlen haben einen anderen Stichtag als die Anlagendaten.
    const v = vergleichFuer({ privat_dach: 205_000, gewerbe_dach: 400_000 }, 1_000_000);
    expect(v.privat!.abstand).toBeLessThan(MIN_VERGLEICH);
    expect(briefVergleichSatz(v, "in Hessen")).toBe("");
    expect(proKopfSatz(v)).toContain("Je Einwohner");
  });
});
