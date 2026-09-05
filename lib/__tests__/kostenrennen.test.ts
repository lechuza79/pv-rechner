import { describe, it, expect } from "vitest";
import { kostenrennen, RENNEN_OHNE_MIT_PV, wetterFenster, wetterMonatsprofile, type RennHaushalt } from "../kostenrennen";
import { calc, calcEigenverbrauch, calcWeightedFeedIn, estimateCost, batteryReplaceCost, BATTERY_LIFETIME_YEARS } from "../calc";
import { PERSONEN, YEARS, NATIONAL_AVG_YIELD } from "../constants";
import { DEFAULT_PRICES } from "../prices-config";
import { DEFAULT_FEED_IN } from "../feedin-config";
import { monthlyFromAnnual } from "../balkon-sim";
import { STRAHLUNG_JAHRE, STRAHLUNG_META } from "../strahlungsjahre";

describe("Amortisations-Rennen — glattes Referenzjahr", () => {
  const r = kostenrennen(RENNEN_OHNE_MIT_PV, { wetter: "referenz" });
  const ohne = r.laeufer.find((l) => l.key === "ohne")!;
  const mit = r.laeufer.find((l) => l.key === "mit")!;

  it("rechnet Jahr 0 bis 25, Start ohne Anlage bei null, mit Anlage bei der Anschaffung", () => {
    expect(ohne.kumuliert).toHaveLength(YEARS + 1);
    expect(mit.kumuliert).toHaveLength(YEARS + 1);
    expect(ohne.kumuliert[0]).toBe(0);
    expect(mit.kumuliert[0]).toBe(mit.investition);
    expect(mit.investition).toBe(estimateCost(10, 0, DEFAULT_PRICES));
    expect(r.wetterFenster).toBeNull();
  });

  it("die Stromrechnung ohne Anlage wächst jedes Jahr um Verbrauch × Preispfad", () => {
    expect(ohne.verbrauchKwh).toBe(PERSONEN[2].verbrauch);
    for (let i = 1; i <= YEARS; i++) {
      const erwartet = ohne.verbrauchKwh * DEFAULT_PRICES.electricityPrice * Math.pow(1 + DEFAULT_PRICES.electricityIncrease, i);
      expect(Math.abs(ohne.kumuliert[i] - ohne.kumuliert[i - 1] - erwartet)).toBeLessThan(1.5);
    }
  });

  it("der Abstand zwischen den Läufern IST der kumulierte Gewinn des Rechners", () => {
    const ev = calcEigenverbrauch({ personenIdx: 2, nutzungIdx: 1, speicherKwh: 0, wp: "nein", ea: "nein", eaKm: 0, kwp: 10, ertragKwp: NATIONAL_AVG_YIELD });
    const kosten = estimateCost(10, 0, DEFAULT_PRICES);
    const ergebnis = calc({
      kwp: 10, kosten, strompreis: DEFAULT_PRICES.electricityPrice, eigenverbrauch: ev,
      einspeisung: calcWeightedFeedIn(10, DEFAULT_FEED_IN.teilUnder10, DEFAULT_FEED_IN.teilOver10, DEFAULT_FEED_IN.thresholdKwp),
      stromSteigerung: DEFAULT_PRICES.electricityIncrease, ertragKwp: NATIONAL_AVG_YIELD, monthly: null,
    });
    for (let i = 0; i <= YEARS; i++) {
      expect(Math.abs(ohne.kumuliert[i] - mit.kumuliert[i] - ergebnis.years[i].kum)).toBeLessThanOrEqual(1);
    }
    expect(mit.eigenverbrauchPct).toBe(ev);
    expect(r.ueberholJahr.mit).toBe(ergebnis.be?.i ?? null);
    expect(r.ueberholJahr.mit).not.toBeNull();
  });

  it("der eingebrachte Nutzen ist Kosten ohne minus Kosten mit plus Anschaffung — ab null", () => {
    expect(mit.nutzen[0]).toBe(0);
    expect(ohne.nutzen.every((x) => x === 0)).toBe(true);
    for (let k = 0; k <= 12 * YEARS; k++) {
      expect(Math.abs(mit.nutzen[k] - (ohne.monatlich[k] - mit.monatlich[k] + mit.investition))).toBeLessThanOrEqual(2);
    }
    const um = r.ueberholMonat.mit!;
    expect(mit.nutzen[um]).toBeGreaterThanOrEqual(mit.investition);
    expect(mit.nutzen[um - 1]).toBeLessThan(mit.investition);
    expect(um).toBeGreaterThan(12 * (r.ueberholJahr.mit! - 1));
    expect(um).toBeLessThanOrEqual(12 * r.ueberholJahr.mit!);
  });

  it("Monatsschritte: jeder zwölfte Wert ist der Jahreswert; der Nutzen wächst jeden Monat", () => {
    for (const l of r.laeufer) {
      expect(l.monatlich).toHaveLength(12 * YEARS + 1);
      for (let i = 0; i <= YEARS; i++) expect(l.monatlich[12 * i]).toBe(l.kumuliert[i]);
    }
    for (let k = 1; k <= 12 * YEARS; k++) expect(mit.nutzen[k]).toBeGreaterThan(mit.nutzen[k - 1]);
  });

  it("der Sägezahn: im Winter bringt die Anlage wenig, im Sommer viel", () => {
    const zuwachs = (k: number) => mit.nutzen[k] - mit.nutzen[k - 1];
    expect(zuwachs(18)).toBeGreaterThan(2.5 * zuwachs(24)); // Juni gegen Dezember, Jahr 2
    expect(zuwachs(13)).toBeLessThan(zuwachs(19)); // Januar gegen Juli
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
    // Der Akku-Tausch fällt in den ersten Monat seines Jahres.
    expect(e.monate![12 * (BATTERY_LIFETIME_YEARS - 1)]).toBeLessThan(0);
    // Ohne Monatsprofil gibt es keine Monatsausgabe — und nichts Erfundenes.
    expect(calc({ kwp: 10, kosten: 14000, strompreis: 0.3, eigenverbrauch: 30, einspeisung: 8, stromSteigerung: 0.02, ertragKwp: 1000, monthly: null }).monate).toBeNull();
  });

  it("weitere Läufer sind weitere Haushalte, kein weiterer Rechenweg", () => {
    const dritte: RennHaushalt = { key: "ea", label: "Mit PV und E-Auto", kurz: "PV + E-Auto", personenIdx: 2, nutzungIdx: 1, kwp: 10, speicherKwh: 10, ea: "ja", eaKm: 15000 };
    const drei = kostenrennen([...RENNEN_OHNE_MIT_PV, dritte], { wetter: "referenz" });
    const ea = drei.laeufer.find((l) => l.key === "ea")!;
    expect(ea.verbrauchKwh).toBeGreaterThan(mit.verbrauchKwh);
    expect(ea.eigenverbrauchPct!).toBeGreaterThan(mit.eigenverbrauchPct!);
    expect(Object.keys(drei.ueberholJahr).sort()).toEqual(["ea", "mit"]);
    // Speicher: der Akku-Tausch nimmt dem Nutzen einmal etwas weg.
    expect(ea.nutzen[12 * (BATTERY_LIFETIME_YEARS - 1) + 1]).toBeLessThan(ea.nutzen[12 * (BATTERY_LIFETIME_YEARS - 1)]);
  });

  it("ohne Referenz-Haushalt gibt es kein Rennen", () => {
    expect(() => kostenrennen([RENNEN_OHNE_MIT_PV[1]])).toThrow();
  });
});

describe("Amortisations-Rennen — echtes Wetter (DWD)", () => {
  const r = kostenrennen(RENNEN_OHNE_MIT_PV);
  const glatt = kostenrennen(RENNEN_OHNE_MIT_PV, { wetter: "referenz" });
  const mit = r.laeufer.find((l) => l.key === "mit")!;
  const mitGlatt = glatt.laeufer.find((l) => l.key === "mit")!;

  it("die Strahlungsreihe ist lückenlos, plausibel, monatlich und frisch genug", () => {
    expect(STRAHLUNG_JAHRE[0].jahr).toBe(1991);
    for (let i = 1; i < STRAHLUNG_JAHRE.length; i++) expect(STRAHLUNG_JAHRE[i].jahr).toBe(STRAHLUNG_JAHRE[i - 1].jahr + 1);
    for (const j of STRAHLUNG_JAHRE) {
      // Deutschland liegt bei rund 1.000–1.250 kWh/m² im Jahr — alles andere ist ein Einlesefehler.
      expect(j.kwhM2).toBeGreaterThan(900);
      expect(j.kwhM2).toBeLessThan(1300);
      expect(j.monate).toHaveLength(12);
      expect(Math.abs(j.monate.reduce((a, b) => a + b, 0) - j.kwhM2)).toBeLessThan(1);
      // Der Sommer liefert das Vielfache des Winters — sonst sind die Monate vertauscht.
      expect(j.monate[6]).toBeGreaterThan(3 * j.monate[11]);
    }
    // Der DWD ergänzt das Vorjahr Mitte Januar; spätestens ab Februar muss es da sein.
    const heute = new Date();
    const erwartet = heute.getMonth() >= 1 ? heute.getFullYear() - 1 : heute.getFullYear() - 2;
    expect(STRAHLUNG_META.letztesJahr, "npm run strahlung:sync ausführen").toBeGreaterThanOrEqual(erwartet);
  });

  it("das Wetterfenster sind die letzten 25 Jahre, normiert auf ihr Mittel", () => {
    const { von, bis } = wetterFenster();
    expect(bis - von + 1).toBe(YEARS);
    expect(bis).toBe(STRAHLUNG_META.letztesJahr);
    expect(r.wetterFenster).toEqual({ von, bis });
    const profile = wetterMonatsprofile(NATIONAL_AVG_YIELD);
    expect(profile).toHaveLength(YEARS);
    const gesamt = profile.reduce((a, p) => a + p.reduce((x, y) => x + y, 0), 0);
    expect(gesamt / YEARS).toBeCloseTo(NATIONAL_AVG_YIELD, 6);
  });

  it("kein Jahr gleicht dem anderen — im glatten Modell schon", () => {
    const jahresnutzen = (l: typeof mit, i: number) => l.nutzen[12 * i] - l.nutzen[12 * (i - 1)];
    const echt = Array.from({ length: YEARS }, (_, i) => jahresnutzen(mit, i + 1));
    const modell = Array.from({ length: YEARS }, (_, i) => jahresnutzen(mitGlatt, i + 1));
    // Glatt: Jahr zu Jahr nur Preis- und Alterungstrend (unter 3 %) — bis auf das
    // Ende der Vergütung nach 20 Jahren. Echt: bestes zu schlechtestem Jahr deutlich.
    for (let i = 1; i < 20; i++) expect(Math.abs(modell[i] / modell[i - 1] - 1)).toBeLessThan(0.03);
    expect(Math.max(...echt.slice(0, 20)) / Math.min(...echt.slice(0, 20))).toBeGreaterThan(1.12);
    // Und innerhalb des Jahres: derselbe Monat fällt in verschiedenen Jahren verschieden aus.
    const mai = Array.from({ length: 20 }, (_, i) => mit.nutzen[12 * i + 5] - mit.nutzen[12 * i + 4]);
    expect(Math.max(...mai) / Math.min(...mai)).toBeGreaterThan(1.2);
  });

  it("die Menge über 25 Jahre bleibt die des Rechners — nur die Verteilung ist echt", () => {
    // Gleiche Anschaffung, gleiche Stromrechnung ohne Anlage; der Vorteil weicht
    // nur durch die Gewichtung mit Preispfad und Alterung um wenige Prozent ab.
    const ohne = r.laeufer.find((l) => l.key === "ohne")!;
    expect(ohne.kumuliert).toEqual(glatt.laeufer.find((l) => l.key === "ohne")!.kumuliert);
    expect(Math.abs(mit.nutzen[12 * YEARS] - mitGlatt.nutzen[12 * YEARS]) / mitGlatt.nutzen[12 * YEARS]).toBeLessThan(0.03);
    expect(Math.abs((r.ueberholJahr.mit ?? 0) - (glatt.ueberholJahr.mit ?? 0))).toBeLessThanOrEqual(1);
    expect(r.annahmen.wetter).toContain("Deutscher Wetterdienst");
  });
});
