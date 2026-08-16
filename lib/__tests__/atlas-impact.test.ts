import { describe, it, expect } from "vitest";
import {
  ATLAS_GRID_CO2,
  EIGENVERBRAUCH_ANTEIL_ANNAHME,
  PRAXIS_FAKTOR,
  balkonEigenverbrauchAnteil,
  co2Tonnen,
  einspeiseCt,
  ertragForRegionId,
  erzeugungKwh,
  marktErloesCt,
  segmentWertEuro,
  stromwertBestandteile,
  stromwertEuro,
  stromwertSaetze,
} from "../atlas-impact";
import { BL_ERTRAG } from "../bundesland-ertrag";
import { NATIONAL_AVG_YIELD } from "../constants";
import { DEFAULT_PRICES } from "../prices-config";
import { feedInRatesForCommissioning } from "../feedin-config";
import { FREIFLAECHE_AW_CT } from "../freiflaeche-config";

/**
 * Der Jahrgang, für den die Sätze "heute" gelten. Die Tests, die die Systematik
 * der Anlagenarten prüfen (Rangfolge, Bänder), beziehen sich seit der
 * Jahrgangs-Rechnung ausdrücklich auf eine NEU gebaute Anlage — für eine von
 * 2010 gelten andere Größenordnungen, und zwar zu Recht.
 */
const HEUTE = new Date().getFullYear();

/** Einspeisesatz eines heute gebauten privaten Dachs — aus derselben
 *  Gesetzeskette wie der Rechner, nicht aus der Atlas-Rechnung gespiegelt. */
const HEUTE_DACH_CT = feedInRatesForCommissioning(`${HEUTE}-07-01`)?.teilUnder10 as number;

/**
 * Die Wirkungs-Werte des Atlas (CO₂-Ersparnis, Stromwert) sind Modellwerte aus
 * der geteilten Rechen-Basis. Diese Tests sind Realitäts-Anker, keine Spiegel
 * der Implementierung: sie prüfen gegen unabhängig bekannte Bänder.
 */
describe("Bundesland-Ertrag je Region", () => {
  it("ordnet den amtlichen Gemeindeschlüssel dem richtigen Bundesland zu", () => {
    // München (09…) liegt in Bayern, Kiel (01…) in Schleswig-Holstein — der
    // Nord-Süd-Gradient ist der Grund, warum die Spalten überhaupt regional
    // rechnen statt mit einem Bundesschnitt.
    expect(ertragForRegionId("09162000")).toBe(BL_ERTRAG.BY);
    expect(ertragForRegionId("01002000")).toBe(BL_ERTRAG.SH);
    // Bundesland-Zeilen der Deutschland-Seite tragen zweistellige Schlüssel.
    expect(ertragForRegionId("08")).toBe(BL_ERTRAG.BW);
  });

  it("fällt bei unbekanntem Schlüssel auf den Bundesschnitt zurück", () => {
    expect(ertragForRegionId("")).toBe(NATIONAL_AVG_YIELD);
    expect(ertragForRegionId("99999999")).toBe(NATIONAL_AVG_YIELD);
  });

  it("liegt überall im plausiblen deutschen Ertragsband", () => {
    // PVGIS-Bundesland-Schnitte: kein deutsches Bundesland liegt unter ~950
    // oder über ~1.150 kWh je kWp und Jahr (optimale Ausrichtung).
    for (const ertrag of Object.values(BL_ERTRAG)) {
      expect(ertrag).toBeGreaterThan(950);
      expect(ertrag).toBeLessThan(1150);
    }
  });
});

describe("Flotten-Kalibrierung (Realitäts-Anker)", () => {
  it("trifft die gemessene Erzeugung des deutschen Bestands 2025", () => {
    // Fraunhofer ISE, Jahresbilanz 2025: im Jahresmittel ~108,7 GW installierte
    // Leistung erzeugten ~87 TWh (Netz + Eigenverbrauch). Ein Modell, das den
    // Bestand mit Optimal-Erträgen rechnet (108,7 GW × ~1.050 kWh/kWp
    // Bundesschnitt), läge bei ~114 TWh statt 87 — rund ein Drittel zu hoch.
    // Der Test schlägt an, wenn diese Fehlerklasse zurückkommt. (Hier stand
    // einmal 137 TWh — falsch, und wäre beim nächsten Nachrechnen als Beleg
    // weitergereicht worden.)
    const twh = erzeugungKwh(108_700_000, "") / 1_000_000_000;
    expect(twh).toBeGreaterThan(82);
    expect(twh).toBeLessThan(92);
  });

  it("hält den Praxis-Faktor im plausiblen Band realer Anlagenflotten", () => {
    // Reale Dächer (gemischte Ausrichtung, Verschattung, Degradation) liegen
    // bekanntermaßen 20–30 % unter dem Optimal-Ertrag.
    expect(PRAXIS_FAKTOR).toBeGreaterThan(0.68);
    expect(PRAXIS_FAKTOR).toBeLessThan(0.85);
  });
});

describe("CO₂-Ersparnis (Realitäts-Anker)", () => {
  it("rechnet eine typische 10-kWp-Anlage in Bayern auf 2,5 bis 4,5 Tonnen im Jahr", () => {
    // Bekanntes Band: ~8.000–9.500 kWh Praxis-Erzeugung × ~0,4 kg/kWh ≈ 3–4 t.
    const t = co2Tonnen(erzeugungKwh(10, "09162000"));
    expect(t).toBeGreaterThan(2.5);
    expect(t).toBeLessThan(4.5);
  });

  it("nutzt denselben CO₂-Faktor wie die übrigen Rechner", () => {
    // Geteilte Rechen-Basis: weicht der Atlas ab, widersprechen sich zwei
    // Seiten desselben Projekts. 0,3–0,5 kg/kWh ist das UBA-Band der letzten Jahre.
    expect(ATLAS_GRID_CO2).toBeGreaterThan(0.3);
    expect(ATLAS_GRID_CO2).toBeLessThan(0.5);
  });
});

describe("Stromwert je Anlagenart (Realitäts-Anker)", () => {
  it("bewertet ein privates Dach zwischen Einspeisevergütung und Haushaltsstrompreis", () => {
    // Der Mischwert kann logisch nur zwischen seinen beiden Bestandteilen
    // liegen — sonst ist die Gewichtung kaputt.
    const ct = stromwertSaetze(HEUTE).privat_dach.ct;
    expect(ct).toBeGreaterThan(HEUTE_DACH_CT);
    expect(ct).toBeLessThan(DEFAULT_PRICES.electricityPrice * 100);
  });

  it("hält die Rangfolge der Anlagenarten für eine heute gebaute Anlage ein", () => {
    // Der Grund für die ganze Aufteilung: Eine selbst genutzte Kilowattstunde
    // ersetzt teuren Netzbezug, eine verkaufte bringt nur den Börsenwert.
    // Kippt diese Reihenfolge, rechnet die Tabelle etwas anderes, als sie sagt.
    //
    // Das Balkongerät steht bewusst GANZ OBEN, auch wenn es keinen Cent
    // Vergütung bekommt: Es ist so klein, dass der Haushalt fast zwei Drittel
    // seines Ertrags direkt verbraucht, und jede dieser Kilowattstunden ist den
    // vollen Haushaltsstrompreis wert. Die Dachanlage speist dagegen zwei
    // Drittel für rund ein Viertel dieses Preises ein. Eine frühere Fassung
    // hatte die beiden andersherum erwartet, weil sie dem Balkon den
    // Eigenverbrauchsanteil einer Dachanlage unterschob.
    //
    // Ausdrücklich für den HEUTIGEN Jahrgang: Bei einem Dach von 2010 steht das
    // private Dach oben, weil seine Vergütung damals über dem heutigen
    // Haushaltsstrompreis lag. Das ist kein Fehler, sondern der Grund, warum die
    // Tabelle überhaupt nach Baujahr rechnet.
    const s = stromwertSaetze(HEUTE);
    expect(s.steckersolar.ct).toBeGreaterThan(s.privat_dach.ct);
    expect(s.privat_dach.ct).toBeGreaterThan(s.gewerbe_dach.ct);
    expect(s.gewerbe_dach.ct).toBeGreaterThan(s.freiflaeche.ct);
  });

  it("leitet den Balkon-Eigenverbrauch aus der Simulation ab, nicht vom Dach", () => {
    // Ein Steckersolargerät gegen die Grundlast eines Haushalts deckt einen
    // weit größeren Teil selbst als eine Dachanlage — bekanntes Band grob
    // 50–80 %. Läge der Wert beim Dach-Anteil, wäre die Simulation umgangen.
    const anteil = balkonEigenverbrauchAnteil();
    expect(anteil).toBeGreaterThan(0.5);
    expect(anteil).toBeLessThan(0.8);
    expect(anteil).toBeGreaterThan(EIGENVERBRAUCH_ANTEIL_ANNAHME * 1.5);
  });

  it("bleibt für jede heute gebaute Anlagenart im plausiblen Erlösband", () => {
    // Keine Anlagenart erlöst mehr als den Haushaltsstrompreis (mehr als den
    // teuersten vermiedenen Bezug kann eine kWh nicht wert sein) und keine
    // weniger als null. Gilt für NEUE Anlagen — Altjahrgänge liegen zu Recht
    // darüber, ihre Vergütung war höher als der heutige Strompreis.
    for (const satz of Object.values(stromwertSaetze(HEUTE))) {
      expect(satz.ct).toBeGreaterThan(0);
      expect(satz.ct).toBeLessThanOrEqual(DEFAULT_PRICES.electricityPrice * 100);
      expect(satz.herkunft.length).toBeGreaterThan(10);
    }
  });

  it("bewertet 1.000 kWh zu 15 ct mit 150 €", () => {
    expect(stromwertEuro(1000, 15)).toBe(150);
  });

  it("bewertet dieselbe Leistung je nach Anlagenart verschieden", () => {
    // Genau das konnte der frühere Einheitssatz nicht: Ein Freiflächen-Park
    // und ein privates Dach gleicher Größe standen mit demselben Betrag da.
    // Gleicher Jahrgang auf beiden Seiten — sonst mischt der Test zwei Effekte.
    const dach = segmentWertEuro(1000, "09162000", "privat_dach", HEUTE);
    const frei = segmentWertEuro(1000, "09162000", "freiflaeche", HEUTE);
    expect(dach).toBeGreaterThan(frei * 2);
  });
});

/**
 * Der Jahrgang ist die zweite große Spreizung neben der Anlagenart — und die
 * einzige, die man einer fertigen Zahl nicht ansieht. Diese Anker prüfen sie
 * gegen unabhängig bekannte Größen (die amtlichen Sätze der jeweiligen Jahre),
 * nicht gegen die eigene Rechnung.
 */
describe("Stromwert nach Baujahr (Realitäts-Anker)", () => {
  it("vergütet ein privates Dach von 2010 um ein Vielfaches höher als eines von 2024", () => {
    // Amtlich: 34,05 ct ab 01.07.2010 (EEG 2009 § 20 Abs. 4 i. d. F. v.
    // 11.08.2010) gegen 8,11 ct für die Jahresmitte 2024 (§§ 48/49/53 EEG 2023).
    // Das ist der Faktor vier auf der Einspeiseseite — wer den Bestand ohne
    // Baujahr rechnet, unterschlägt genau ihn.
    expect(einspeiseCt("privat_dach", 2010)).toBeGreaterThan(einspeiseCt("privat_dach", 2024) * 3);

    // Auf dem Mischsatz bleibt davon weniger übrig, weil der Eigenverbrauch bei
    // beiden gleich zählt — aber deutlich mehr als ein Rundungsunterschied.
    const alt = stromwertSaetze(2010).privat_dach.ct;
    const neu = stromwertSaetze(2024).privat_dach.ct;
    expect(alt).toBeGreaterThan(neu * 1.8);
  });

  it("nimmt einen Jahrgang jenseits der 20-Jahres-Frist aus der Vergütung", () => {
    // § 25 EEG: Die Zahlung endet am 31.12. des zwanzigsten Jahres. Danach läuft
    // die Anlage weiter und verkauft am Markt — die Spalte darf sie also nicht
    // stillschweigend weiter zum Satz ihres Baujahrs führen.
    const abgelaufen = new Date().getFullYear() - 21;
    expect(einspeiseCt("privat_dach", abgelaufen)).toBeCloseTo(marktErloesCt(), 6);
    expect(einspeiseCt("gewerbe_dach", abgelaufen)).toBeCloseTo(marktErloesCt(), 6);
    expect(einspeiseCt("freiflaeche", abgelaufen)).toBeCloseTo(marktErloesCt(), 6);

    // Und der abgelaufene Jahrgang muss unter dem liegen, der gerade noch drin
    // ist — sonst greift die Frist nicht, sondern es rundet nur.
    expect(stromwertSaetze(abgelaufen).gewerbe_dach.ct).toBeLessThan(
      stromwertSaetze(new Date().getFullYear() - 19).gewerbe_dach.ct,
    );
  });

  it("rechnet den Jahrgang 2012 mit den neuen, niedrigeren Sätzen", () => {
    // 2012 ist der einzige geteilte Jahrgang: bis 31.03. galten 24,43 ct
    // (BNetzA-Blatt ab 01.01.2012), ab 01.04. die EEG-2012-Monatstabelle. Die
    // Jahresmitte fällt hinter den Stichtag, und das ist zugleich die
    // vorsichtigere Wahl. Amtlich für 07/2012: 18,92 ct.
    expect(einspeiseCt("privat_dach", 2012)).toBeCloseTo(18.92, 6);
    expect(einspeiseCt("privat_dach", 2012)).toBeLessThan(einspeiseCt("privat_dach", 2011));
  });

  it("bewertet Freiflächen mit dem anzulegenden Wert, nicht mit dem Börsenpreis", () => {
    // Ein Park in der Direktvermarktung bekommt die Marktprämie auf den
    // anzulegenden Wert — sein Erlös hängt am Zuschlagswert der Ausschreibung
    // (BNetzA, 4,66–5,00 ct in den letzten vier Runden), nicht am Marktwert.
    expect(FREIFLAECHE_AW_CT).toBeGreaterThan(4.5);
    expect(FREIFLAECHE_AW_CT).toBeLessThan(5.1);
    expect(einspeiseCt("freiflaeche", HEUTE)).toBeCloseTo(FREIFLAECHE_AW_CT - 0.3, 6);

    // Alte Parks lagen um ein Vielfaches darüber (2010: 25,02 ct Freifläche).
    expect(einspeiseCt("freiflaeche", 2010)).toBeGreaterThan(einspeiseCt("freiflaeche", HEUTE) * 4);
  });

  it("lässt ein Steckersolargerät in jedem Jahrgang unvergütet", () => {
    // Projektkonvention (Balkon-Rechner) — und für die alten Jahrgänge der
    // richtige Fall: Steckersolargeräte gab es damals praktisch nicht.
    expect(einspeiseCt("steckersolar", 2010)).toBe(0);
    expect(einspeiseCt("steckersolar", HEUTE)).toBe(0);
  });
});

/**
 * Der Tooltip zeigt NICHT die Mischsätze, sondern ihre Bestandteile — bewusst,
 * weil nebeneinandergestellte Mischsätze sich als Wertung lesen. Der Preis
 * dafür: Erklärung und Rechnung sind zwei Ableitungen derselben Größen und
 * können auseinanderlaufen, ohne dass irgendetwas rot wird. Genau das nagelt
 * dieser Test fest.
 */
describe("Hilfetext und Rechnung bleiben dieselbe Quelle", () => {
  it("nennt für jede Anlagenart denselben Einspeisesatz, mit dem gerechnet wird", () => {
    // Der Tooltip zeigt den HEUTIGEN Jahrgang — er muss also gegen genau diesen
    // geprüft werden. Dass er seinen Jahrgang selbst mitliefert, ist der Grund,
    // warum hier kein zweites Mal ein Jahr getippt wird.
    const { eigenverbrauchCt, einspeisung, jahrgang } = stromwertBestandteile();
    const saetze = stromwertSaetze(jahrgang);
    const finde = (label: string) => einspeisung.find((e) => e.label === label);

    expect(jahrgang).toBe(HEUTE);

    // Gewerbedach: kein Eigenverbrauch angesetzt → der Mischsatz IST der
    // Einspeisesatz. Läuft das auseinander, behauptet der Tooltip eine Zahl,
    // die in der Spalte nicht steckt.
    expect(finde("gewerbliches Dach")?.ct).toBeCloseTo(saetze.gewerbe_dach.ct, 6);

    // Freifläche: ebenfalls kein Eigenverbrauch.
    expect(finde("Freiflächen-Park")?.ct).toBeCloseTo(saetze.freiflaeche.ct, 6);

    // Balkon: unvergütet — der Tooltip darf dort keinen Satz nennen.
    expect(finde("Balkonkraftwerk")?.ct).toBeNull();

    // Privates Dach: Mischsatz aus beiden Bestandteilen. Der Tooltip nennt die
    // Bestandteile; die Rechnung muss sich aus genau ihnen ergeben.
    const dachEinspeisung = finde("privates Dach")?.ct as number;
    const nachgerechnet =
      EIGENVERBRAUCH_ANTEIL_ANNAHME * eigenverbrauchCt +
      (1 - EIGENVERBRAUCH_ANTEIL_ANNAHME) * dachEinspeisung;
    expect(nachgerechnet).toBeCloseTo(saetze.privat_dach.ct, 6);

    // Und der Balkon-Satz muss sich aus dem Eigenverbrauchspreis ergeben,
    // den der Tooltip nennt.
    expect(balkonEigenverbrauchAnteil() * eigenverbrauchCt).toBeCloseTo(saetze.steckersolar.ct, 6);
  });
});
