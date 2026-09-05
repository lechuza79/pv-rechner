import { describe, it, expect } from "vitest";
import { kostenrennenVarianten, preisFaktoren, wetterFaktoren, wetterFenster } from "../kostenrennen-varianten";
import { STRAHLUNG_JAHRE, STRAHLUNG_META } from "../strahlungsjahre";
import { PRICE_HOUSEHOLD, PRICE_YEARS } from "../strommix-history";
import { YEARS } from "../constants";

describe("Aufstellungen des Stromkosten-Rennens", () => {
  const varianten = kostenrennenVarianten();
  const modell = varianten.find((v) => v.key === "modell")!.rennen;
  const wetter = varianten.find((v) => v.key === "wetter")!.rennen;
  const preis = varianten.find((v) => v.key === "preis")!.rennen;
  const vorteil = (r: typeof modell) => r.laeufer[0].kumuliert[YEARS] - r.laeufer[1].kumuliert[YEARS];

  it("die Strahlungsreihe ist lückenlos, plausibel und frisch genug", () => {
    expect(STRAHLUNG_JAHRE[0].jahr).toBe(1991);
    for (let i = 1; i < STRAHLUNG_JAHRE.length; i++) expect(STRAHLUNG_JAHRE[i].jahr).toBe(STRAHLUNG_JAHRE[i - 1].jahr + 1);
    // Deutschland liegt bei rund 1.000–1.250 kWh/m² im Jahr — alles andere ist ein Einlesefehler.
    for (const r of STRAHLUNG_JAHRE) { expect(r.kwhM2).toBeGreaterThan(900); expect(r.kwhM2).toBeLessThan(1300); }
    // Der DWD ergänzt das Vorjahr Mitte Januar; spätestens ab Februar muss es da sein.
    const heute = new Date();
    const erwartet = heute.getMonth() >= 1 ? heute.getFullYear() - 1 : heute.getFullYear() - 2;
    expect(STRAHLUNG_META.letztesJahr, "npm run strahlung:sync ausführen").toBeGreaterThanOrEqual(erwartet);
  });

  it("die Wetterfaktoren sind auf ihr Fenster normiert: Mittel 1, 25 Jahre", () => {
    const f = wetterFaktoren();
    expect(f).toHaveLength(YEARS);
    expect(f.reduce((a, b) => a + b, 0) / f.length).toBeCloseTo(1, 6);
    const { von, bis } = wetterFenster();
    expect(bis - von + 1).toBe(YEARS);
    expect(bis).toBe(STRAHLUNG_META.letztesJahr);
  });

  it("die Erklärung zum Wetter passt zu den Daten: bestes zu schlechtestem Jahr rund ein Fünftel", () => {
    const f = wetterFaktoren();
    const spanne = Math.max(...f) / Math.min(...f);
    expect(spanne).toBeGreaterThan(1.15);
    expect(spanne).toBeLessThan(1.25);
    expect(varianten.find((v) => v.key === "wetter")!.erklaerung).toContain("ein Fünftel");
  });

  it("Wetterjahre verteilen den Ertrag um, ändern die Summe aber kaum", () => {
    // Gleiche Anschaffung, gleiche Stromrechnung ohne Anlage; der 25-Jahres-Vorteil
    // weicht nur durch die Gewichtung mit Preispfad und Alterung ab.
    expect(wetter.laeufer[0].kumuliert).toEqual(modell.laeufer[0].kumuliert);
    expect(Math.abs(vorteil(wetter) - vorteil(modell)) / vorteil(modell)).toBeLessThan(0.02);
    // Aber die Jahre unterscheiden sich: ein gutes Sonnenjahr spart sichtbar mehr.
    const z = (r: typeof modell, i: number) => r.laeufer[1].kumuliert[i] - r.laeufer[1].kumuliert[i - 1];
    const f = wetterFaktoren();
    const gut = f.indexOf(Math.max(...f)) + 1, schlecht = f.indexOf(Math.min(...f)) + 1;
    expect(z(wetter, gut)).toBeLessThan(z(modell, gut));
    expect(z(wetter, schlecht)).toBeGreaterThan(z(modell, schlecht));
  });

  it("der Preispfad wiederholt die Eurostat-Reihe und läuft danach mit dem Modell weiter", () => {
    const { faktoren, von, bis } = preisFaktoren(0.02);
    expect(von).toBe(PRICE_YEARS[0]);
    expect(bis).toBe(PRICE_YEARS[PRICE_YEARS.length - 1]);
    expect(faktoren).toHaveLength(YEARS);
    for (let i = 1; i < PRICE_HOUSEHOLD.length; i++) expect(faktoren[i - 1]).toBeCloseTo(PRICE_HOUSEHOLD[i] / PRICE_HOUSEHOLD[0], 9);
    const n = PRICE_HOUSEHOLD.length - 1;
    expect(faktoren[n] / faktoren[n - 1]).toBeCloseTo(1.02, 9);
    // Der Sprung 2022→2023 ist gut ein Fünftel — so steht es in der Erklärung.
    const i23 = PRICE_YEARS.indexOf(2023), i22 = PRICE_YEARS.indexOf(2022);
    const sprung = PRICE_HOUSEHOLD[i23] / PRICE_HOUSEHOLD[i22];
    expect(sprung).toBeGreaterThan(1.2);
    expect(sprung).toBeLessThan(1.25);
    expect(varianten.find((v) => v.key === "preis")!.erklaerung).toContain("ein Fünftel");
  });

  it("im Preispfad zahlen beide Haushalte denselben Strompreis eines Jahres", () => {
    // Die Referenz muss dem Verlauf folgen — sonst verglichen wir zwei Preiswelten.
    const modellOhne = modell.laeufer[0], preisOhne = preis.laeufer[0];
    expect(preisOhne.kumuliert[1]).toBeGreaterThan(modellOhne.kumuliert[1]);
    // Jahr 1 des Pfads: +5,1 % (2008 gegen 2007) statt +2 %.
    expect(preisOhne.kumuliert[1] / modellOhne.kumuliert[1]).toBeCloseTo((PRICE_HOUSEHOLD[1] / PRICE_HOUSEHOLD[0]) / 1.02, 2);
    // Teurerer Strom: die Anlage lohnt sich früher und stärker.
    expect(vorteil(preis)).toBeGreaterThan(vorteil(modell));
    expect(preis.ueberholJahr.mit!).toBeLessThanOrEqual(modell.ueberholJahr.mit!);
  });

  it("die Annahmen-Sätze folgen der Aufstellung", () => {
    expect(modell.annahmen.preis).toContain("pro Jahr");
    expect(preis.annahmen.preis).toContain("Eurostat");
    expect(wetter.annahmen.wetter).toContain("DWD");
    expect(modell.annahmen.wetter).toContain("Referenzjahr");
  });
});
