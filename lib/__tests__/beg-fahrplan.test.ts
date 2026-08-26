// Kohärenz-Test für den Fahrplan der BEG-Förderung.
//
// WOGEGEN HIER GEPRÜFT WIRD: gegen die Förderrichtlinie BEG EM vom 17.07.2026
// (Volltext in docs/quellen/BEG-EM-Richtlinie_2026-07-17.pdf), am 26.08.2026
// Nummer für Nummer gelesen und von zwei Legal-Judges gegengeprüft, der zweite
// mit dem Auftrag, den ersten zu widerlegen. Jede Erwartung nennt ihre
// Fundstelle. Wer einen Wert ändert, braucht eine Fundstelle — keine Rechnung.
//
// WARUM ES DIESEN TEST GIBT: `begGrundfoerderung: 0.30` stand ohne Stichtag im
// Code, während die Richtlinie die Halbierung zum ersten Quartal 2027 längst
// festschreibt. Ab Januar hätte der Rechner den doppelten Fördersatz gezeigt —
// kein Absturz, kein roter Test, nur eine falsche Zahl in jedem Ergebnis. Genau
// die Fehlerklasse, die dieses Projekt als schwerste führt.
import { describe, it, expect } from "vitest";
import {
  BEG_FAHRPLAN,
  BEG_WERTSCHOEPFUNGS_BONUS,
  BEG_GELTUNG_BIS_ISO,
  DEFAULT_HEATPUMP_CONFIG,
  begStufeAm,
  begNaechsteStufe,
} from "../heatpump-config";
import { calcBegSubsidy } from "../heatpump";

const CFG = DEFAULT_HEATPUMP_CONFIG;
const stufe = (iso: string) => {
  const s = BEG_FAHRPLAN.find((x) => x.abIso === iso);
  if (!s) throw new Error(`Keine Stufe zum ${iso} im Fahrplan`);
  return s;
};

describe("BEG-Fahrplan: die belegten Werte", () => {
  // Nr. 8.4.1 Buchst. c: „Für Maßnahmen nach Nummer 5.3 beträgt der Fördersatz
  // 30 %. Ab Quartal 1 2027: Abweichend davon beträgt der Fördersatz für
  // Maßnahmen nach Nummer 5.3 Buchstabe c 15 %." — Nr. 5.3 Buchst. c sind die
  // elektrisch angetriebenen Wärmepumpen.
  it("halbiert den Grundfördersatz zum ersten Quartal 2027", () => {
    expect(stufe("2026-07-21").grundfoerderung).toBe(0.30);
    expect(stufe("2027-01-01").grundfoerderung).toBe(0.15);
  });

  it("senkt den Fördersatz danach nicht weiter — die Richtlinie sieht nur diesen einen Schritt vor", () => {
    const nach2027 = BEG_FAHRPLAN.filter((s) => s.abIso >= "2027-01-01");
    expect(nach2027.every((s) => s.grundfoerderung === 0.15)).toBe(true);
  });

  // Nr. 8.4.4: „ab 21. Juli 2026 bis 31. Januar 2027: 16 Prozentpunkte / ab
  // 1. Februar 2027 bis 31. Juli 2027: 12 / ab 1. August 2027 bis 31. Januar
  // 2028: 8 / ab 1. Februar 2028 bis 31. Juli 2028: 4 / Ab 1. August 2028
  // entfällt der Bonus."
  it("führt die Staffel des Klimageschwindigkeits-Bonus zellgenau", () => {
    expect(stufe("2026-07-21").klimaBonus).toBe(0.16);
    expect(stufe("2027-02-01").klimaBonus).toBe(0.12);
    expect(stufe("2027-08-01").klimaBonus).toBe(0.08);
    expect(stufe("2028-02-01").klimaBonus).toBe(0.04);
    expect(stufe("2028-08-01").klimaBonus).toBe(0);
  });

  // Nr. 8.3.1 Buchst. a: sinkt „für die erste Wohneinheit beginnend ab
  // 1. Februar 2027 alle sechs Monate … um 750 Euro", ausgeschrieben von
  // 28.000 € bis 22.000 € ab dem 1. August 2030.
  it("führt die neun Stufen des Höchstbetrags zellgenau", () => {
    const erwartet: Record<string, number> = {
      "2026-07-21": 28000, "2027-01-01": 28000, "2027-02-01": 27250,
      "2027-08-01": 26500, "2028-02-01": 25750, "2028-08-01": 25000,
      "2029-02-01": 24250, "2029-08-01": 23500, "2030-02-01": 22750,
      "2030-08-01": 22000,
    };
    for (const [iso, cap] of Object.entries(erwartet)) {
      expect(stufe(iso).maxCap).toBe(cap);
    }
  });

  it("senkt den Höchstbetrag in Schritten von genau 750 €, und zwar erst ab Februar 2027", () => {
    // Der Fördersatz springt einen Monat früher als Bonus und Höchstbetrag.
    // Genau deshalb ist der Januar 2027 eine eigene Stufe: halbierter Satz,
    // aber noch voller Bonus und voller Höchstbetrag. Ihn zu übergehen wäre für
    // jeden falsch, der in diesem Monat beantragt.
    expect(stufe("2027-01-01").maxCap).toBe(stufe("2026-07-21").maxCap);
    expect(stufe("2027-01-01").klimaBonus).toBe(stufe("2026-07-21").klimaBonus);
    const abFeb = BEG_FAHRPLAN.filter((s) => s.abIso >= "2027-02-01");
    for (let i = 1; i < abFeb.length; i++) {
      expect(abFeb[i - 1].maxCap - abFeb[i].maxCap).toBe(750);
    }
  });

  it("ist aufsteigend sortiert und beginnt mit dem Inkrafttreten der Richtlinie", () => {
    // begStufeAm() nimmt den letzten Treffer und setzt die Sortierung voraus.
    for (let i = 1; i < BEG_FAHRPLAN.length; i++) {
      expect(BEG_FAHRPLAN[i].abIso > BEG_FAHRPLAN[i - 1].abIso).toBe(true);
    }
    expect(BEG_FAHRPLAN[0].abIso).toBe("2026-07-21");
  });

  it("reicht nicht über die Geltungsdauer der Richtlinie hinaus (Nr. 10)", () => {
    const letzte = BEG_FAHRPLAN[BEG_FAHRPLAN.length - 1];
    expect(letzte.abIso <= BEG_GELTUNG_BIS_ISO).toBe(true);
  });

  it("nennt den Q1-2027-Stichtag NICHT tagesgenau", () => {
    // Die Richtlinie datiert ihre übrigen Stichtage tagesgenau („ab 1. Februar
    // 2027"), diesen einen aber nur auf „Ab Quartal 1 2027" — an fünf Stellen,
    // ohne den Begriff je zu definieren. `abIso` trägt den 01.01. als
    // Arbeitsannahme; die Beschriftung darf sie nicht zur Tagesangabe machen.
    // Genauer zu klingen als die Quelle ist hier derselbe Fehler wie eine
    // falsche Zahl.
    expect(stufe("2027-01-01").bezeichnung).toBe("Anfang 2027");
    expect(stufe("2027-01-01").bezeichnung).not.toMatch(/\d+\.\s*Januar|1\.1\.|01\.01\./);
  });
});

describe("BEG-Fahrplan: Auflösung nach Datum", () => {
  it("liefert zu jedem Tag die dann geltende Stufe", () => {
    expect(begStufeAm(new Date("2026-12-31")).grundfoerderung).toBe(0.30);
    expect(begStufeAm(new Date("2027-01-01")).grundfoerderung).toBe(0.15);
    expect(begStufeAm(new Date("2027-01-31")).klimaBonus).toBe(0.16);
    expect(begStufeAm(new Date("2027-02-01")).klimaBonus).toBe(0.12);
    expect(begStufeAm(new Date("2029-06-15")).maxCap).toBe(24250);
  });

  it("fällt vor dem Inkrafttreten auf die erste Stufe zurück statt undefined zu liefern", () => {
    // Ein Rechner ohne Fördersatz wäre schlimmer als einer mit dem ersten.
    expect(begStufeAm(new Date("2026-01-01")).grundfoerderung).toBe(0.30);
  });

  it("nennt als nächste Stufe immer die auf das Datum folgende", () => {
    expect(begNaechsteStufe(new Date("2026-08-26"))?.abIso).toBe("2027-01-01");
    expect(begNaechsteStufe(new Date("2027-01-15"))?.abIso).toBe("2027-02-01");
  });

  it("liefert keine nächste Stufe mehr, wenn der Fahrplan ausgelaufen ist", () => {
    // Der Umschalter blendet sich dann aus — zwei Reiter mit demselben Inhalt
    // sähen kaputt aus.
    expect(begNaechsteStufe(new Date("2030-09-01"))).toBeUndefined();
  });
});

describe("BEG-Rechnung: beide Zustände", () => {
  // Referenzfall: Bestand, Luft/Wasser, Investition oberhalb des Höchstbetrags,
  // damit die Kappung auf die förderfähigen Kosten sichtbar wird.
  const INVEST = 35000;
  const rate = (iso: string, opts = {}) =>
    calcBegSubsidy("bestand", "lwwp", INVEST, { stufe: stufe(iso), ...opts }, CFG).rate;
  const betrag = (iso: string, opts = {}) =>
    calcBegSubsidy("bestand", "lwwp", INVEST, { stufe: stufe(iso), ...opts }, CFG).amount;

  it("rechnet heute 30 % + 16 % Klimabonus auf höchstens 28.000 €", () => {
    expect(rate("2026-07-21")).toBeCloseTo(0.46, 10);
    expect(betrag("2026-07-21")).toBe(Math.round(28000 * 0.46));
  });

  it("rechnet Anfang 2027 nur noch 15 % + 16 %", () => {
    expect(rate("2027-01-01")).toBeCloseTo(0.31, 10);
  });

  // DIE KERNAUSSAGE DER REFORM, und der Grund, warum dieser Rechner den
  // Ursprung des Geräts überhaupt fragt: Nr. 8.4.6 gibt ab demselben Zeitpunkt
  // 15 Prozentpunkte für eine Wärmepumpe mit Ursprung in der Union — genau so
  // viel, wie Nr. 8.4.1 Buchst. c wegnimmt. Ohne Obergrenze ändert sich für ein
  // solches Gerät also GAR NICHTS. Eine erste Fassung ließ den Bonus weg und
  // hätte damit eine Kürzung behauptet, die es für einen Teil der Geräte nicht
  // gibt — nicht zu vorsichtig gerechnet, sondern die falsche Frage beantwortet.
  it("gleicht die Halbierung für ein Gerät aus der EU exakt aus", () => {
    expect(rate("2027-01-01", { euUrsprung: true })).toBeCloseTo(rate("2026-07-21"), 10);
    expect(betrag("2027-01-01", { euUrsprung: true })).toBe(betrag("2026-07-21"));
  });

  it("gibt den EU-Bonus nicht vor seinem Stichtag", () => {
    expect(rate("2026-07-21", { euUrsprung: true })).toBe(rate("2026-07-21"));
  });

  it("bindet den EU-Bonus NICHT an die Selbstnutzung — anders als Klima- und Einkommens-Bonus", () => {
    // Nr. 8.4.6 nennt keine Selbstnutzer-Voraussetzung. Ein Vermieter bekommt
    // ihn also, obwohl ihm sonst nur die Grundförderung zusteht.
    const vermieterOhne = rate("2027-01-01", { klimaBonus: false });
    const vermieterMit = rate("2027-01-01", { klimaBonus: false, euUrsprung: true });
    expect(vermieterOhne).toBeCloseTo(0.15, 10);
    expect(vermieterMit).toBeCloseTo(0.30, 10);
  });

  it("lässt die Obergrenzen 70 % und 80 % unberührt — sie tragen keinen Stichtag", () => {
    // Nr. 8.4.1 Satz 1 nennt sie ohne jedes Datum.
    const reich = { haushaltseinkommen: undefined };
    const arm = { haushaltseinkommen: 25000 };
    for (const iso of ["2026-07-21", "2027-01-01", "2030-08-01"]) {
      expect(rate(iso, { ...reich, euUrsprung: true, klimaBonus: true })).toBeLessThanOrEqual(CFG.begMaxRate);
      expect(rate(iso, { ...arm, euUrsprung: true, klimaBonus: true })).toBeLessThanOrEqual(CFG.begMaxRateLowIncome);
    }
  });

  it("kappt den Haushalt mit niedrigem Einkommen heute bei 80 % — die Kappung greift wirklich", () => {
    // 30 + 16 + 40 = 86 Punkte, gekappt auf 80. Das ist der Grund, warum der
    // Unterschied im Ergebnis in EURO stehen muss und nicht in Prozentpunkten:
    // Dieser Haushalt verliert durch die Halbierung nicht 15 Punkte, sondern 9.
    expect(rate("2026-07-21", { haushaltseinkommen: 25000 })).toBeCloseTo(0.80, 10);
    expect(rate("2027-01-01", { haushaltseinkommen: 25000 })).toBeCloseTo(0.71, 10);
  });

  it("trifft einen Haushalt ohne Boni dagegen mit der vollen Halbierung", () => {
    const ohne = { klimaBonus: false, haushaltseinkommen: undefined };
    expect(betrag("2027-01-01", ohne)).toBe(Math.round(betrag("2026-07-21", ohne) / 2));
  });

  it("zeigt keine Klimabonus-Zeile mehr, wenn es ihn nicht mehr gibt", () => {
    // Ab dem 1. August 2028 trägt die Stufe 0. Eine Zeile über null Euro in der
    // Aufschlüsselung wäre ein Posten, den es nicht gibt.
    const b = calcBegSubsidy("bestand", "lwwp", INVEST, { stufe: stufe("2028-08-01"), klimaBonus: true }, CFG);
    expect(b.breakdown.some((z) => z.label.includes("Klima"))).toBe(false);
  });

  it("gibt im Neubau unabhängig von der Stufe nichts", () => {
    for (const iso of ["2026-07-21", "2027-01-01"]) {
      expect(calcBegSubsidy("neubau", "lwwp", INVEST, { stufe: stufe(iso) }, CFG).amount).toBe(0);
    }
  });
});

describe("BEG-Fahrplan: Herkunft der heutigen Werte", () => {
  it("hält die Config-Werte mit der heute geltenden Stufe zusammen", () => {
    // Zwei Quellen für denselben Wert dürfen nicht auseinanderlaufen. Der
    // Fahrplan ist die Quelle für den ZEITVERLAUF, die Config trägt den
    // heutigen Stand für alles, was ihn direkt liest.
    const heute = stufe("2026-07-21");
    expect(heute.grundfoerderung).toBe(CFG.begGrundfoerderung);
    expect(heute.klimaBonus).toBe(CFG.begKlimaBonus);
    expect(heute.maxCap).toBe(CFG.begMaxCap);
  });

  it("beginnt den EU-Bonus zum selben Stichtag wie die Halbierung", () => {
    // Fielen sie auseinander, gäbe es einen Zeitraum mit halbem Satz und ohne
    // Ausgleich — und die Aussage „das eine gleicht das andere aus" wäre für
    // diesen Zeitraum falsch.
    expect(BEG_WERTSCHOEPFUNGS_BONUS.abIso).toBe(stufe("2027-01-01").abIso);
    expect(BEG_WERTSCHOEPFUNGS_BONUS.satz)
      .toBeCloseTo(stufe("2026-07-21").grundfoerderung - stufe("2027-01-01").grundfoerderung, 10);
  });
});
