/**
 * DIE ARBEITSZEIT IST EINE VEREINIGUNG, DIE RÜCKRECHNUNG IST EINE SCHÄTZUNG.
 *
 * Zwei Fehler, die diese Erfassung wertlos machen würden, und beide sind von
 * außen unsichtbar — die Zahl sieht in beiden Fällen völlig normal aus:
 *
 *  1. Die Sitzungsdauern addieren statt zusammenlegen. An diesem Repo laufen
 *     regelmäßig bis zu elf Arbeitsstände gleichzeitig; addiert kamen für
 *     dieselben 48 Tage 662 Stunden heraus, zusammengelegt 261. Knapp 14
 *     Stunden am Tag hätte niemand hinterfragt.
 *  2. Einen Protokoll-Zeitstempel wie einen gemeinten Tag behandeln. Zwischen
 *     22:00 und Mitternacht deutscher Zeit steht in der Weltzeit noch der
 *     Vortag — eine Abendschicht läge dann auf dem falschen Tag. Genau diese
 *     Vermischung hat im Projekt schon zweimal Geld gekostet (Einspeise-Plan
 *     und BEG-Fahrplan lieferten am Stichtag zwei Stunden lang den alten Satz).
 *
 * Beide Ränder werden geprüft, und in BEIDEN Zeitregimen: Im Sommer liegt die
 * deutsche Mitternacht zwei Stunden vor der Weltzeit-Mitternacht, im Winter
 * eine. Ein Test, der nur einen Fall kennt, prüft die Gegenrichtung nicht.
 */

import { describe, it, expect } from "vitest";
import {
  tagVon,
  vereinigeBloecke,
  verteileZeit,
  grenzeNach,
  kennwertAus,
  schaetzeTag,
  summiere,
  type Statistiktag,
} from "../projekt-statistik";

const tag = (t: string, teil: Partial<Statistiktag> = {}): Statistiktag => ({
  tag: t, herkunft: "gemessen", tokensGelesen: 0, tokensNeu: 0, tokensEingabe: 0,
  tokensAusgabe: 0, sitzungen: 0, nachrichtenGetippt: 0, nachrichtenLang: 0,
  antworten: 0, werkzeugschritte: 0, arbeitsminuten: 0, commits: 0, ...teil,
});

describe("Kalendertag eines Zeitpunkts", () => {
  it("liest 22:30 Weltzeit im Sommer als den FOLGENDEN deutschen Tag", () => {
    expect(tagVon(Date.parse("2026-08-01T22:30:00Z"))).toBe("2026-08-02");
  });

  it("liest 22:30 Weltzeit im Winter noch als denselben Tag", () => {
    // Der Versatz beträgt hier nur eine Stunde — genau deshalb wäre ein fest
    // hingeschriebener Versatz in einem der beiden Regime falsch.
    expect(tagVon(Date.parse("2026-01-15T22:30:00Z"))).toBe("2026-01-15");
  });

  it("liest 23:30 Weltzeit im Winter als den folgenden Tag", () => {
    expect(tagVon(Date.parse("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
  });
});

describe("Arbeitszeit: vereinigen statt addieren", () => {
  it("zählt zwei parallele Arbeitsstände nur einmal", () => {
    const eine = Date.parse("2026-08-01T08:00:00Z");
    const std = 3600_000;
    const vereint = vereinigeBloecke([
      { von: eine, bis: eine + 2 * std },
      { von: eine + std, bis: eine + 3 * std }, // überlappt eine Stunde
    ]);
    expect(vereint).toHaveLength(1);
    expect(vereint[0].bis - vereint[0].von).toBe(3 * std);
  });

  it("lässt getrennte Blöcke getrennt", () => {
    const eine = Date.parse("2026-08-01T08:00:00Z");
    const std = 3600_000;
    const vereint = vereinigeBloecke([
      { von: eine, bis: eine + std },
      { von: eine + 5 * std, bis: eine + 6 * std },
    ]);
    expect(vereint).toHaveLength(2);
  });

  it("verteilt einen Block über Mitternacht auf beide deutschen Tage", () => {
    // 21:00 bis 23:00 Weltzeit im Sommer = 23:00 bis 01:00 deutscher Zeit.
    const tage = new Map([["2026-08-01", tag("2026-08-01")], ["2026-08-02", tag("2026-08-02")]]);
    verteileZeit([{
      von: Date.parse("2026-08-01T21:00:00Z"),
      bis: Date.parse("2026-08-01T23:00:00Z"),
    }], tage);
    expect(tage.get("2026-08-01")!.arbeitsminuten).toBe(60);
    expect(tage.get("2026-08-02")!.arbeitsminuten).toBe(60);
  });

  it("findet die Tagesgrenze im Winter eine Stunde später als im Sommer", () => {
    const sommer = grenzeNach(Date.parse("2026-08-01T20:00:00Z"), Date.parse("2026-08-02T04:00:00Z"));
    const winter = grenzeNach(Date.parse("2026-01-15T20:00:00Z"), Date.parse("2026-01-16T04:00:00Z"));
    expect(new Date(sommer).toISOString()).toMatch(/T22:00:0/);
    expect(new Date(winter).toISOString()).toMatch(/T23:00:0/);
  });
});

describe("Rückrechnung der Zeit ohne Protokolle", () => {
  const gemessen = [
    tag("2026-07-15", { commits: 10, tokensGelesen: 1000, tokensAusgabe: 100, antworten: 50, arbeitsminuten: 120 }),
    tag("2026-07-16", { commits: 10, tokensGelesen: 3000, tokensAusgabe: 300, antworten: 150, arbeitsminuten: 120 }),
  ];

  it("rechnet aus Commits hoch, nicht aus Kalendertagen", () => {
    const k = kennwertAus(gemessen)!;
    // 4.000 gelesene Tokens auf 20 Commits = 200 je Commit.
    expect(k.tokensGelesenJeCommit).toBe(200);
    const geschaetzt = schaetzeTag("2026-05-01", 5, k);
    expect(geschaetzt.tokensGelesen).toBe(1000);
  });

  it("kennzeichnet jede hochgerechnete Zeile als Schätzung", () => {
    const k = kennwertAus(gemessen)!;
    expect(schaetzeTag("2026-05-01", 5, k).herkunft).toBe("geschaetzt");
  });

  it("erfindet keine Sitzungen — die sind aus Commits nicht ableitbar", () => {
    // Ein Tag mit zehn Änderungen kann eine Sitzung gewesen sein oder fünf.
    // Null ist hier ehrlicher als eine gerechnete Zahl.
    const k = kennwertAus(gemessen)!;
    expect(schaetzeTag("2026-05-01", 5, k).sitzungen).toBe(0);
  });

  it("liefert ohne Commits gar keinen Kennwert statt einer Division durch null", () => {
    expect(kennwertAus([tag("2026-07-15")])).toBeNull();
    expect(kennwertAus([])).toBeNull();
  });
});

describe("Summe", () => {
  it("zählt alle vier Tokenarten in die Gesamtsumme", () => {
    const s = summiere([tag("2026-07-15", {
      tokensGelesen: 1, tokensNeu: 2, tokensEingabe: 4, tokensAusgabe: 8,
    })]);
    expect(s.tokensGesamt).toBe(15);
  });

  it("rechnet die Minuten in volle Stunden um", () => {
    const s = summiere([tag("a", { arbeitsminuten: 90 }), tag("b", { arbeitsminuten: 90 })]);
    expect(s.arbeitsstunden).toBe(3);
  });
});
