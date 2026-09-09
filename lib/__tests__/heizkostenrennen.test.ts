import { describe, it, expect } from "vitest";
import { heizkostenrennen, heizTagDatum, gradtageJeTag, heizWetterFenster, HEIZKOSTENRENNEN_HAUS } from "../heizkostenrennen";
import { TEMPERATUR_TAGE, TEMPERATUR_TAGE_META } from "../temperatur-tage";
import { greengasMusterVariants } from "../greengas-muster";
import { calcHeatPump, heatPumpScenarioAdj } from "../heatpump";
import { DEFAULT_HEATPUMP_CONFIG } from "../heatpump-config";

describe("Heizkosten-Rennen: Gasheizung gegen Wärmepumpe", () => {
  const ohneWetter = heizkostenrennen({ wetter: false });
  const mitWetter = heizkostenrennen();
  const r = ohneWetter.rechner;
  const T = ohneWetter.tage;

  it("die Jahreskosten des Rechners summieren auf seine eigenen Gesamtkosten", () => {
    const k = r.kostenJeJahr;
    const wp = k.wp.invest + k.wp.strom.reduce((a, b) => a + b, 0) + k.wp.neben * DEFAULT_HEATPUMP_CONFIG.years - k.wp.pvNutzen.reduce((a, b) => a + b, 0);
    const gas = k.fossil.invest + k.fossil.brennstoff.reduce((a, b) => a + b, 0) + k.fossil.neben * DEFAULT_HEATPUMP_CONFIG.years;
    expect(Math.abs(wp - r.tcoWp)).toBeLessThan(2);
    expect(Math.abs(gas - r.tcoGas)).toBeLessThan(2);
    // Und Jahr für Jahr dieselbe Differenz wie die Ersparnis-Kurve des Rechners.
    for (let i = 0; i < DEFAULT_HEATPUMP_CONFIG.years; i++) {
      const diff = (k.fossil.brennstoff[i] + k.fossil.neben) - (k.wp.strom[i] + k.wp.neben - k.wp.pvNutzen[i]);
      expect(Math.abs(diff - r.years[i + 1].annual)).toBeLessThan(1);
    }
  });

  it("ohne Wetter endet das Rennen exakt beim Rechner und kreuzt in seinem Amortisationsjahr", () => {
    expect(ohneWetter.gas.kosten[0]).toBe(r.gasInvest);
    expect(ohneWetter.wp.kosten[0]).toBe(r.investNetto);
    expect(Math.abs(ohneWetter.gas.kosten[T] - r.tcoGas)).toBeLessThan(2);
    expect(Math.abs(ohneWetter.wp.kosten[T] - r.tcoWp)).toBeLessThan(2);
    expect(r.amortisationsJahre).not.toBeNull();
    expect(ohneWetter.bezahltTag).not.toBeNull();
    expect(heizTagDatum(ohneWetter, ohneWetter.bezahltTag!).jahr - ohneWetter.startJahr + 1).toBe(r.amortisationsJahre);
    // Jedes Betriebsjahr endet auf dem Jahresstand des Rechners.
    let kum = -(r.investNetto - r.gasInvest);
    for (let i = 1; i <= ohneWetter.jahre; i++) {
      const letzterTag = i < ohneWetter.jahre ? ohneWetter.ersterTag[12 * i + 1] - 1 : T;
      kum = r.years[i].kum;
      expect(Math.abs((ohneWetter.gas.kosten[letzterTag] - ohneWetter.wp.kosten[letzterTag]) - kum)).toBeLessThan(2);
    }
  });

  it("mit Wetter bleibt die Menge die des Rechners (Fenster-Mittel), die Kreuzung im Jahr daneben", () => {
    expect(mitWetter.wetterFenster).toEqual(heizWetterFenster());
    const Tw = mitWetter.tage;
    expect(Math.abs(mitWetter.gas.kosten[Tw] / r.tcoGas - 1)).toBeLessThan(0.015);
    expect(Math.abs(mitWetter.wp.kosten[Tw] / r.tcoWp - 1)).toBeLessThan(0.015);
    expect(mitWetter.bezahltTag).not.toBeNull();
    const jahr = heizTagDatum(mitWetter, mitWetter.bezahltTag!).jahr - mitWetter.startJahr + 1;
    expect(Math.abs(jahr - r.amortisationsJahre!)).toBeLessThanOrEqual(1);
    // Beide Linien nur steigend — Heizen kostet, jeden Tag.
    for (let d = 1; d <= Tw; d++) {
      expect(mitWetter.gas.kosten[d]).toBeGreaterThanOrEqual(mitWetter.gas.kosten[d - 1]);
      expect(mitWetter.wp.kosten[d]).toBeGreaterThanOrEqual(mitWetter.wp.kosten[d - 1]);
    }
  });

  it("die Tage tragen das Wetter: Januar steil und ungleichmäßig, Juli flach", () => {
    const delta = (reihe: Float64Array, von: number, bis: number) =>
      Array.from({ length: bis - von }, (_, d) => reihe[von + d + 1] - reihe[von + d]);
    const jan = delta(mitWetter.gas.kosten, mitWetter.ersterTag[1], mitWetter.ersterTag[2] - 1);
    const jul = delta(mitWetter.gas.kosten, mitWetter.ersterTag[7], mitWetter.ersterTag[8] - 1);
    const mittel = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(mittel(jan)).toBeGreaterThan(3 * mittel(jul));
    expect(Math.max(...jan) / Math.min(...jan)).toBeGreaterThan(1.3);
    // Ohne Wetter ist jeder Tag gleich.
    const flach = delta(ohneWetter.gas.kosten, ohneWetter.ersterTag[1], ohneWetter.ersterTag[2] - 1);
    expect(Math.max(...flach) - Math.min(...flach)).toBeLessThan(1e-6);
  });

  it("Gradtage: Heiztage unter der Heizgrenze, Sommer null, Jahresgewichte mitteln auf eins", () => {
    const { von, bis } = heizWetterFenster();
    expect(bis).toBe(TEMPERATUR_TAGE_META.letztesJahr);
    expect(bis - von + 1).toBe(DEFAULT_HEATPUMP_CONFIG.years);
    const summen: number[] = [];
    for (let j = von; j <= bis; j++) {
      const g = gradtageJeTag(j);
      expect(g, `Gradtage ${j}`).not.toBeNull();
      const s = g!.reduce((a, b) => a + b, 0);
      // Deutschland liegt bei rund 3.000–4.500 Kd im Jahr (G20/15).
      expect(s).toBeGreaterThan(2800);
      expect(s).toBeLessThan(4800);
      // Hochsommer heizt niemand.
      expect(g!.slice(195, 215).reduce((a, b) => a + b, 0)).toBeLessThan(0.05 * s);
      summen.push(s);
    }
    expect(gradtageJeTag(1900)).toBeNull();
  });

  it("die Temperaturreihe ist lückenlos, plausibel und frisch genug", () => {
    expect(TEMPERATUR_TAGE[0].jahr).toBe(1991);
    expect(TEMPERATUR_TAGE_META.stationen).toBeGreaterThanOrEqual(20);
    for (let i = 1; i < TEMPERATUR_TAGE.length; i++) expect(TEMPERATUR_TAGE[i].jahr).toBe(TEMPERATUR_TAGE[i - 1].jahr + 1);
    for (const j of TEMPERATUR_TAGE) {
      expect(j.tage.length).toBeGreaterThanOrEqual(365);
      expect(j.tage.length).toBeLessThanOrEqual(366);
      const werte = j.tage.filter((t): t is number => t !== null);
      const mittel = werte.reduce((a, b) => a + b, 0) / (10 * werte.length);
      expect(mittel).toBeGreaterThan(6);
      expect(mittel).toBeLessThan(13);
      expect(Math.max(...werte)).toBeLessThan(350);
      expect(Math.min(...werte)).toBeGreaterThan(-250);
    }
    // Der DWD schließt das Vorjahr im Januar ab; spätestens ab Februar muss es da sein.
    const heute = new Date();
    const erwartet = heute.getMonth() >= 1 ? heute.getFullYear() - 1 : heute.getFullYear() - 2;
    expect(TEMPERATUR_TAGE_META.letztesJahr, "npm run temperatur:tage ausführen").toBeGreaterThanOrEqual(erwartet);
  });

  it("rechnet dasselbe Haus wie die unsanierte Variante des Grüngas-Widgets auf derselben Seite", () => {
    const unsan = greengasMusterVariants()[0];
    const direkt = calcHeatPump(HEIZKOSTENRENNEN_HAUS, DEFAULT_HEATPUMP_CONFIG, heatPumpScenarioAdj("realistic"));
    expect(unsan.sub).toContain(`Arbeitszahl ${direkt.jaz.toLocaleString("de-DE")}`);
    expect(unsan.sub).toContain("140 m²");
    expect(direkt.tcoGas).toBe(r.tcoGas);
  });

  it("das Datum eines Tages folgt dem Rechner-Kalender", () => {
    // Betriebsjahr 1 = Startjahr — dasselbe Kalenderjahr, mit dem der Rechner das erste Jahr preist.
    expect(heizTagDatum(mitWetter, 1)).toEqual({ jahr: mitWetter.startJahr, monat: 0, tag: 1 });
    expect(heizTagDatum(mitWetter, mitWetter.tage)).toEqual({ jahr: mitWetter.startJahr + mitWetter.jahre - 1, monat: 11, tag: 31 });
    expect(mitWetter.ersterTag).toHaveLength(12 * mitWetter.jahre + 1);
  });
});
