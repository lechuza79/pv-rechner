import { describe, it, expect } from "vitest";
import { kostenrennen, RENNEN_OHNE_MIT_PV, type RennHaushalt } from "../kostenrennen";
import { calc, calcEigenverbrauch, calcWeightedFeedIn, estimateCost, batteryReplaceCost } from "../calc";
import { PERSONEN, YEARS, NATIONAL_AVG_YIELD } from "../constants";
import { monthlyFromAnnual } from "../balkon-sim";
import { DEFAULT_PRICES } from "../prices-config";
import { DEFAULT_FEED_IN } from "../feedin-config";

describe("Stromkosten-Rennen", () => {
  const r = kostenrennen(RENNEN_OHNE_MIT_PV);
  const ohne = r.laeufer.find((l) => l.key === "ohne")!;
  const mit = r.laeufer.find((l) => l.key === "mit")!;

  it("rechnet Jahr 0 bis 25, Start ohne Anlage bei null, mit Anlage bei der Anschaffung", () => {
    expect(ohne.kumuliert).toHaveLength(YEARS + 1);
    expect(mit.kumuliert).toHaveLength(YEARS + 1);
    expect(ohne.kumuliert[0]).toBe(0);
    expect(mit.kumuliert[0]).toBe(mit.investition);
    expect(mit.investition).toBe(estimateCost(10, 0, DEFAULT_PRICES));
  });

  it("die Stromrechnung ohne Anlage wächst jedes Jahr um Verbrauch × Preispfad", () => {
    expect(ohne.verbrauchKwh).toBe(PERSONEN[2].verbrauch);
    for (let i = 1; i <= YEARS; i++) {
      const erwartet = ohne.verbrauchKwh * DEFAULT_PRICES.electricityPrice * Math.pow(1 + DEFAULT_PRICES.electricityIncrease, i);
      // Rundung auf ganze Euro je Jahr — der Unterschied darf nicht wachsen.
      expect(Math.abs(ohne.kumuliert[i] - ohne.kumuliert[i - 1] - erwartet)).toBeLessThan(1.5);
    }
  });

  it("der Abstand zwischen den Läufern IST der kumulierte Gewinn des Rechners", () => {
    // Das Rennen darf nichts anderes behaupten als der Rechner: Kosten mit
    // Anlage = Kosten ohne − kum(calc). Nachgerechnet mit denselben Funktionen.
    const ev = calcEigenverbrauch({ personenIdx: 2, nutzungIdx: 1, speicherKwh: 0, wp: "nein", ea: "nein", eaKm: 0, kwp: 10, ertragKwp: NATIONAL_AVG_YIELD });
    const kosten = estimateCost(10, 0, DEFAULT_PRICES);
    const ergebnis = calc({
      kwp: 10, kosten, strompreis: DEFAULT_PRICES.electricityPrice, eigenverbrauch: ev,
      einspeisung: calcWeightedFeedIn(10, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10, DEFAULT_FEED_IN.thresholdKwp),
      stromSteigerung: DEFAULT_PRICES.electricityIncrease, ertragKwp: NATIONAL_AVG_YIELD, monthly: null,
      batteryReplace: 0,
    });
    for (let i = 0; i <= YEARS; i++) {
      expect(Math.abs(ohne.kumuliert[i] - mit.kumuliert[i] - ergebnis.years[i].kum)).toBeLessThanOrEqual(1);
    }
    expect(mit.eigenverbrauchPct).toBe(ev);
  });

  it("das Überholjahr ist die Amortisation des Rechners", () => {
    const ev = calcEigenverbrauch({ personenIdx: 2, nutzungIdx: 1, speicherKwh: 0, wp: "nein", ea: "nein", eaKm: 0, kwp: 10, ertragKwp: NATIONAL_AVG_YIELD });
    const ergebnis = calc({
      kwp: 10, kosten: estimateCost(10, 0, DEFAULT_PRICES), strompreis: DEFAULT_PRICES.electricityPrice, eigenverbrauch: ev,
      einspeisung: calcWeightedFeedIn(10, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10, DEFAULT_FEED_IN.thresholdKwp),
      stromSteigerung: DEFAULT_PRICES.electricityIncrease, ertragKwp: NATIONAL_AVG_YIELD, monthly: null,
      batteryReplace: 0,
    });
    expect(r.ueberholJahr.mit).toBe(ergebnis.be?.i ?? null);
    expect(r.ueberholJahr.mit).not.toBeNull();
    // Vor dem Überholjahr liegt der PV-Haushalt hinten, danach dauerhaft vorn.
    const u = r.ueberholJahr.mit!;
    expect(mit.kumuliert[u - 1]).toBeGreaterThanOrEqual(ohne.kumuliert[u - 1]);
    for (let i = u; i <= YEARS; i++) expect(mit.kumuliert[i]).toBeLessThan(ohne.kumuliert[i]);
  });

  it("in der Grundaufstellung wachsen beide Balken — das Rennen läuft vorwärts", () => {
    for (const l of r.laeufer) {
      for (let i = 1; i <= YEARS; i++) expect(l.kumuliert[i]).toBeGreaterThanOrEqual(l.kumuliert[i - 1]);
    }
  });

  it("mit Speicher können die Netto-Ausgaben sinken — das Widget muss das tragen", () => {
    // Der Eigenverbrauch läuft an die Kappung (Verbrauch ÷ Ertrag), der
    // Einspeise-Erlös übersteigt die restliche Stromrechnung. Kein Fehler,
    // sondern das Modell des Rechners — und der Grund, warum die
    // Grundaufstellung ohne Speicher läuft (siehe RENNEN_OHNE_MIT_PV).
    const s = kostenrennen([RENNEN_OHNE_MIT_PV[0], { ...RENNEN_OHNE_MIT_PV[1], key: "sp", speicherKwh: 10 }]);
    const sp = s.laeufer.find((l) => l.key === "sp")!;
    expect(sp.kumuliert[1]).toBeLessThan(sp.kumuliert[0]);
    expect(sp.investition).toBe(estimateCost(10, 10, DEFAULT_PRICES));
    // Der Akku-Tausch schlägt im Jahr seiner Lebensdauer als Sprung durch.
    expect(sp.kumuliert[15] - sp.kumuliert[14]).toBeGreaterThan(batteryReplaceCost(10, DEFAULT_PRICES) - 1500);
  });

  it("weitere Läufer sind weitere Haushalte, kein weiterer Rechenweg", () => {
    const dritte: RennHaushalt = { key: "ea", label: "Mit PV und E-Auto", kurz: "PV + E-Auto", personenIdx: 2, nutzungIdx: 1, kwp: 10, speicherKwh: 10, ea: "ja", eaKm: 15000 };
    const drei = kostenrennen([...RENNEN_OHNE_MIT_PV, dritte]);
    expect(drei.laeufer).toHaveLength(3);
    const ea = drei.laeufer.find((l) => l.key === "ea")!;
    expect(ea.verbrauchKwh).toBeGreaterThan(mit.verbrauchKwh);
    // Mehr Verbrauch, dieselbe Anlage: höherer Eigenverbrauch, aber auch
    // höhere Stromrechnung am Ende als der PV-Haushalt ohne E-Auto.
    expect(ea.eigenverbrauchPct!).toBeGreaterThan(mit.eigenverbrauchPct!);
    expect(ea.kumuliert[YEARS]).toBeGreaterThan(mit.kumuliert[YEARS]);
    expect(Object.keys(drei.ueberholJahr).sort()).toEqual(["ea", "mit"]);
  });

  it("Monatsschritte: jeder zwölfte Wert ist der Jahreswert; ohne Anlage wächst jeder Monat", () => {
    for (const l of r.laeufer) {
      expect(l.monatlich).toHaveLength(12 * YEARS + 1);
      for (let i = 0; i <= YEARS; i++) expect(l.monatlich[12 * i]).toBe(l.kumuliert[i]);
    }
    for (let k = 1; k <= 12 * YEARS; k++) expect(ohne.monatlich[k]).toBeGreaterThan(ohne.monatlich[k - 1]);
  });

  it("der Sägezahn: im Winter zahlt der PV-Haushalt, im Sommer nimmt er ein", () => {
    // Monatlicher Zuwachs des PV-Haushalts, Jahr 2 (Index 13..24). 10 kWp auf
    // 3.800 kWh speist von April bis September mehr ein, als die Restrechnung
    // kostet — die Kurve fällt dort leicht; im Winter deckt die Anlage nur einen
    // Teil, die Kurve steigt. Gemessen 05.09.2026: Dez +68 €, Jun −59 €.
    const zuwachs = (l: typeof mit, k: number) => l.monatlich[k] - l.monatlich[k - 1];
    const dez = zuwachs(mit, 24), jun = zuwachs(mit, 18), jan = zuwachs(mit, 13);
    expect(dez).toBeGreaterThan(0);
    expect(jan).toBeGreaterThan(0);
    expect(jun).toBeLessThan(0);
    // Selbst im Dezember spart die Anlage noch etwas: Zuwachs unter der Rechnung ohne Anlage.
    expect(dez).toBeLessThan(zuwachs(ohne, 24));
    expect(dez / zuwachs(ohne, 24)).toBeGreaterThan(0.4);
    // Ohne Anlage ist die Winterrechnung höher als die Sommerrechnung (BDEW-Profil).
    expect(zuwachs(ohne, 24)).toBeGreaterThan(zuwachs(ohne, 18));
  });

  it("der Überholmonat liegt im Überholjahr", () => {
    const u = r.ueberholJahr.mit!;
    const um = r.ueberholMonat.mit!;
    expect(um).toBeGreaterThan(12 * (u - 1));
    expect(um).toBeLessThanOrEqual(12 * u);
  });

  it("die Monatsausgabe der Amortisationsrechnung summiert je Jahr exakt auf den Jahresnutzen", () => {
    const ev = calcEigenverbrauch({ personenIdx: 2, nutzungIdx: 1, speicherKwh: 10, wp: "nein", ea: "nein", eaKm: 0, kwp: 10, ertragKwp: NATIONAL_AVG_YIELD });
    const e = calc({
      kwp: 10, kosten: estimateCost(10, 10, DEFAULT_PRICES), strompreis: DEFAULT_PRICES.electricityPrice, eigenverbrauch: ev,
      einspeisung: calcWeightedFeedIn(10, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10, DEFAULT_FEED_IN.thresholdKwp),
      stromSteigerung: DEFAULT_PRICES.electricityIncrease, ertragKwp: NATIONAL_AVG_YIELD, monthly: monthlyFromAnnual(NATIONAL_AVG_YIELD),
      batteryReplace: batteryReplaceCost(10, DEFAULT_PRICES),
    });
    expect(e.monate).toHaveLength(12 * YEARS);
    for (let i = 1; i <= YEARS; i++) {
      const summe = e.monate!.slice(12 * (i - 1), 12 * i).reduce((a, b) => a + b, 0);
      expect(Math.abs(summe - e.years[i].j)).toBeLessThan(1);
    }
    // Ohne Monatsprofil gibt es keine Monatsausgabe — und nichts Erfundenes.
    expect(calc({ kwp: 10, kosten: 14000, strompreis: 0.3, eigenverbrauch: 30, einspeisung: 8, stromSteigerung: 0.02, ertragKwp: 1000, monthly: null }).monate).toBeNull();
  });

  it("ohne Referenz-Haushalt gibt es kein Rennen", () => {
    expect(() => kostenrennen([RENNEN_OHNE_MIT_PV[1]])).toThrow();
  });

  it("die Annahmen tragen die Werte, mit denen gerechnet wurde", () => {
    expect(r.annahmen.strompreisCt).toBeCloseTo(DEFAULT_PRICES.electricityPrice * 100, 1);
    expect(r.annahmen.steigerungPct).toBeCloseTo(DEFAULT_PRICES.electricityIncrease * 100, 1);
    expect(r.annahmen.ertragKwp).toBe(NATIONAL_AVG_YIELD);
    expect(r.annahmen.einspeisungCt).toBeGreaterThan(0);
  });
});
