import { describe, it, expect } from "vitest";
import {
  ATLAS_GRID_CO2,
  EIGENVERBRAUCH_ANTEIL_RUECKFALL,
  PRAXIS_FAKTOR,
  balkonEigenverbrauchAnteil,
  co2Tonnen,
  eigenverbrauchAnteilRegion,
  einspeiseCt,
  einspeiseSatz,
  einspeiseZeilen,
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
import { altFeedInRatesFor } from "../feedin-archiv-alt";
import {
  FREIFLAECHE_AUSSCHREIBUNG_JAHRE,
  FREIFLAECHE_AW_CT,
  FREIFLAECHE_ZUSCHLAG_AB,
  FREIFLAECHE_ZUSCHLAG_BIS,
} from "../freiflaeche-config";
import { DIREKTVERMARKTUNG } from "../marktwert-config";

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

/**
 * Der Eigenverbrauchsanteil war bis 08/2026 eine feste 0,3 für jede Region —
 * gesetzt, nicht gerechnet, und am optimistischen Rand. Jetzt kommt er aus den
 * Zahlen der Region selbst. Diese Anker prüfen die RICHTUNGEN und BÄNDER, die
 * unabhängig von der Formel gelten müssen; wer sie gegen die Formel selbst
 * prüfte, prüfte gar nichts.
 */
describe("Eigenverbrauch je Region (Realitäts-Anker)", () => {
  /** 1.000 private Dächer mit je 9,8 kWp — die Größenordnung der mittleren
   *  deutschen Dachanlage. Batterien werden je Fall dazugegeben. */
  const bestand = (batterieCount: number, batterieKwh: number) => ({
    dachCount: 1000,
    dachKwp: 9800,
    batterieCount,
    batterieKwh,
  });
  const BY = "09162000";

  it("hebt den Anteil, je mehr Speicher auf den Dächern der Region steht", () => {
    // Die Aussage der ganzen Änderung: Eine Region mit vielen Hausbatterien
    // behält mehr Strom im Haus als eine ohne. Vorher standen beide bei 30 %.
    const ohne = eigenverbrauchAnteilRegion(bestand(0, 0), BY) as number;
    const wenig = eigenverbrauchAnteilRegion(bestand(200, 200 * 10), BY) as number;
    const viel = eigenverbrauchAnteilRegion(bestand(600, 600 * 10), BY) as number;
    expect(wenig).toBeGreaterThan(ohne);
    expect(viel).toBeGreaterThan(wenig);
  });

  it("senkt den Anteil, je größer die Anlagen im Verhältnis zum Haushalt sind", () => {
    // Physik, nicht Formel: Ein größeres Dach erzeugt zur selben Zeit mehr, als
    // dasselbe Haus verbrauchen kann — der Anteil MUSS fallen.
    const klein = eigenverbrauchAnteilRegion({ ...bestand(0, 0), dachKwp: 6000 }, BY) as number;
    const mittel = eigenverbrauchAnteilRegion(bestand(0, 0), BY) as number;
    const gross = eigenverbrauchAnteilRegion({ ...bestand(0, 0), dachKwp: 20000 }, BY) as number;
    expect(klein).toBeGreaterThan(mittel);
    expect(mittel).toBeGreaterThan(gross);
  });

  it("bleibt für realistische Bestände im Band 10 bis 60 Prozent", () => {
    // Bekanntes Band aus der PV-Literatur: eine Dachanlage ohne Speicher behält
    // grob 10–25 %, mit Speicher 40–60 %. Darüber kommt ein Haushalt ohne
    // Wärmepumpe oder E-Auto nicht — und darunter läge nur ein Rechenfehler.
    for (const b of [bestand(0, 0), bestand(300, 3000), bestand(1000, 10_000), bestand(1000, 15_000)]) {
      const anteil = eigenverbrauchAnteilRegion(b, BY) as number;
      expect(Number.isFinite(anteil)).toBe(true);
      expect(anteil).toBeGreaterThanOrEqual(0.1);
      expect(anteil).toBeLessThanOrEqual(0.6);
    }
  });

  it("rechnet Speicher als Mischung, nicht als über alle Dächer gemittelte Batterie", () => {
    // Der Speicher-Term sättigt: Die zehnte Kilowattstunde bringt weniger als
    // die erste. Wer den Speicherbestand über ALLE Dächer mittelt (hier 3 kWh je
    // Dach), behandelt jedes Dach so, als hätte es ein Drittel Batterie — und
    // rechnet damit systematisch zu hoch. Die Mischung „30 % der Dächer haben
    // 10 kWh" muss deshalb darunter liegen.
    const mischung = eigenverbrauchAnteilRegion(bestand(300, 3000), BY) as number;
    const gemittelt = eigenverbrauchAnteilRegion(bestand(1000, 3000), BY) as number;
    expect(mischung).toBeLessThan(gemittelt);
  });

  it("liefert für Regionen ohne private Dächer kein NaN, sondern gar keine Zahl", () => {
    // Kein Nenner, keine Quote: Die Spalte zeigt dann „—". Eine 0 oder ein NaN
    // wären beide falsch — das eine behauptet etwas, das andere bricht die
    // Sortierung.
    expect(eigenverbrauchAnteilRegion({ dachCount: 0, dachKwp: 0, batterieCount: 0, batterieKwh: 0 }, BY)).toBeNull();
    expect(eigenverbrauchAnteilRegion({ dachCount: 0, dachKwp: 120, batterieCount: 5, batterieKwh: 50 }, BY)).toBeNull();
  });

  it("verkraftet mehr Batterien als Dächer, ohne über den Vollausbau zu gehen", () => {
    // Speicher werden nachgerüstet und stehen als eigene Einheit im Register —
    // in einer kleinen Gemeinde kann ihre Zahl die der Dächer übersteigen. Der
    // Anteil darf davon nicht über den Fall hinauslaufen, in dem JEDES Dach eine
    // Batterie hat.
    const alle = eigenverbrauchAnteilRegion(bestand(1000, 10_000), BY) as number;
    const uebervoll = eigenverbrauchAnteilRegion(bestand(1500, 15_000), BY) as number;
    expect(uebervoll).toBeCloseTo(alle, 6);
  });

  it("hält den Rückfall dort, wo eine Dachanlage ohne Speicher wirklich liegt", () => {
    // Er ist keine gesetzte Zahl mehr, sondern dieselbe Rechnung an der
    // Voreinstellung des Rechners. Die früheren 30 % waren der Wert einer Anlage
    // MIT rund 8 kWh Speicher — das Band einer Anlage ohne liegt bei 10–20 %.
    expect(EIGENVERBRAUCH_ANTEIL_RUECKFALL).toBeGreaterThanOrEqual(0.1);
    expect(EIGENVERBRAUCH_ANTEIL_RUECKFALL).toBeLessThan(0.2);
  });

  it("schlägt bis in den Stromwert durch", () => {
    // Sonst wäre die Spalte eine Anzeige ohne Wirkung: Eine Region mit viel
    // Speicher behält mehr Strom im Haus, und der ist mehr wert als eingespeister.
    const wenig = eigenverbrauchAnteilRegion(bestand(0, 0), BY) as number;
    const viel = eigenverbrauchAnteilRegion(bestand(600, 6000), BY) as number;
    const wertWenig = segmentWertEuro(1000, BY, "privat_dach", HEUTE, 9.8, wenig);
    const wertViel = segmentWertEuro(1000, BY, "privat_dach", HEUTE, 9.8, viel);
    expect(wertViel).toBeGreaterThan(wertWenig);

    // Und die alte Pauschale von 30 % lag über beiden — der Stromwert privater
    // Dächer sinkt durch die Umstellung, und das ist der Punkt.
    const wertPauschal = segmentWertEuro(1000, BY, "privat_dach", HEUTE, 9.8, 0.3);
    expect(wertPauschal).toBeGreaterThan(wertViel);
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
    // Und weit über dem, was ein Dach behält — sonst hätte jemand den
    // Dach-Anteil untergeschoben.
    expect(anteil).toBeGreaterThan(EIGENVERBRAUCH_ANTEIL_RUECKFALL * 2);
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

  it("hält die beiden Faktoren ein, die der Hilfetext behauptet", () => {
    // Der Hilfetext sagt zwei Dinge über ein privates Dach von 2010: seine
    // VERGÜTUNG sei rund das Vierfache der heutigen, in der SPALTE bleibe davon
    // mehr als das Doppelte übrig. Beides sind überprüfbare Aussagen — vorher
    // stand dort einmal "das Vierfache" für die Spalte, wo es 2,2-fach ist.
    const verguetung = einspeiseCt("privat_dach", 2010) / einspeiseCt("privat_dach", HEUTE);
    expect(verguetung).toBeGreaterThan(3.5);
    expect(verguetung).toBeLessThan(4.5);

    // Der Spalten-Faktor hängt am Eigenverbrauchsanteil, und der ist seit 08/2026
    // je Region ein anderer. Geprüft wird deshalb das ganze Band, das im Atlas
    // vorkommt (Dächer ohne Speicher bis Regionen mit viel Batterie) — nicht ein
    // einzelner Wert, der zufällig gerade gilt.
    for (const ev of [0.1, 0.15, 0.2, 0.25, 0.3, 0.35]) {
      const spalte =
        stromwertSaetze(2010, null, ev).privat_dach.ct / stromwertSaetze(HEUTE, null, ev).privat_dach.ct;
      expect(spalte).toBeGreaterThan(2);
      // Und immer unter dem Vergütungs-Faktor: Der selbst verbrauchte Strom ist
      // bei beiden Jahrgängen gleich viel wert und dämpft den Abstand.
      expect(spalte).toBeLessThan(verguetung);
    }
  });

  it("lässt den Grenzjahrgang (Frist läuft dieses Jahr aus) noch voll vergütet", () => {
    // DER Fall, an dem sich die Frist entscheidet: Ein Jahrgang, dessen 20 Jahre
    // am 31.12. DIESES Jahres enden, bekommt bis dahin seine volle Vergütung
    // (§ 25 EEG). Genau hier lag der Fehler: Jahrgang 2006 fiel auf den
    // Börsenwert, weil die Tabelle erst ab 2007 Sätze führte — 12,60 statt
    // 43,81 ct, Faktor 3,5 zu niedrig. Und der Fehler wandert jedes Jahr weiter.
    const grenze = new Date().getFullYear() - 20;

    for (const segment of ["privat_dach", "gewerbe_dach"]) {
      // Unabhängige Prüfung, ohne die Sätze zu spiegeln: Der Grenzjahrgang muss
      // (1) etwas anderes als den Börsenwert bekommen und (2) mehr als eine
      // heute gebaute Anlage — die Vergütung ist seit damals monoton gefallen.
      const ct = einspeiseCt(segment, grenze);
      expect(ct).toBeGreaterThan(marktErloesCt() * 2);
      expect(ct).toBeGreaterThan(einspeiseCt(segment, HEUTE));
    }

    // Freifläche genauso: Ein Grenzjahrgang aus der gesetzlichen Ära liegt weit
    // über dem heutigen Niveau, einer aus der Ausschreibungs-Ära (ab 2015)
    // zumindest darüber — die Zuschläge sind seit 2015 durchweg gefallen.
    if (grenze < FREIFLAECHE_ZUSCHLAG_AB) {
      expect(einspeiseCt("freiflaeche", grenze)).toBeGreaterThan(einspeiseCt("freiflaeche", HEUTE) * 2);
    } else {
      expect(grenze).toBeLessThanOrEqual(FREIFLAECHE_ZUSCHLAG_BIS);
      expect(einspeiseCt("freiflaeche", grenze)).toBeGreaterThan(einspeiseCt("freiflaeche", HEUTE));
    }

    // Und der Jahrgang direkt davor ist zum Jahreswechsel ausgelaufen.
    expect(einspeiseCt("privat_dach", grenze - 1)).toBeCloseTo(marktErloesCt(), 6);
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

  it("bewertet Freiflächen nach dem Satz ihres Baujahrs, nicht alle gleich", () => {
    // Vorher bekam JEDER Freiflächen-Jahrgang von 2012 bis heute denselben Wert
    // (das aktuelle Ausschreibungsniveau), während der Hilfetext daneben
    // versprach, jede Anlage zähle mit dem Satz ihres Baujahrs.
    //
    // Unabhängige Größe: die amtlichen Sätze nach § 32 Abs. 1 EEG 2012
    // (BNetzA-Tabelle "PV-Vergütungssätze April 2012 bis Juli 2014", Stand
    // jeweils 1. Juli): 13,10 · 10,44 · 8,92 ct.
    expect(einspeiseCt("freiflaeche", 2012)).toBeCloseTo(13.1, 6);
    expect(einspeiseCt("freiflaeche", 2013)).toBeCloseTo(10.44, 6);
    expect(einspeiseCt("freiflaeche", 2014)).toBeCloseTo(8.92, 6);

    // Die Reihe fällt und liegt durchweg über dem heutigen Niveau.
    expect(einspeiseCt("freiflaeche", 2012)).toBeGreaterThan(einspeiseCt("freiflaeche", 2013));
    expect(einspeiseCt("freiflaeche", 2014)).toBeGreaterThan(einspeiseCt("freiflaeche", HEUTE) * 1.5);

  });

  it("gibt jedem Ausschreibungs-Jahrgang seinen eigenen Zuschlagswert", () => {
    // Bis 08/2026 fielen ALLE Jahrgänge 2015–2024 auf dasselbe heutige Niveau
    // (~4,55 ct netto) — eine flache Reihe, obwohl hinter einem Park von 2015
    // Zuschläge um 8,50 ct stehen. Genau diese Flachheit war der Fehler.
    //
    // Geprüft wird gegen UNABHÄNGIGE Bänder aus den BNetzA-Einzelrunden, nicht
    // gegen die Konfigurationstabelle — sonst prüft der Test seine eigene Zeile.
    const jahrgaenge = Array.from(
      { length: FREIFLAECHE_ZUSCHLAG_BIS - FREIFLAECHE_ZUSCHLAG_AB + 1 },
      (_, i) => FREIFLAECHE_ZUSCHLAG_AB + i,
    );
    const saetze = jahrgaenge.map((j) => einspeiseCt("freiflaeche", j));

    // (1) Die Reihe VARIIERT. Vorher war sie flach.
    expect(Math.max(...saetze) / Math.min(...saetze)).toBeGreaterThan(1.5);

    // (2) Ein Park von 2017 (Zuschläge 2015/2016: alle Runden zwischen 6,90 und
    //     9,17 ct) erlöst deutlich mehr als einer von 2024 (Zuschläge 2022/2023).
    const ct2017 = einspeiseCt("freiflaeche", 2017);
    const ct2024 = einspeiseCt("freiflaeche", 2024);
    expect(ct2017 / ct2024).toBeGreaterThan(1.25);
    expect(ct2017).toBeGreaterThan(6);
    expect(ct2017).toBeLessThan(9);

    // (3) Jahrgang 2016 stammt aus der ersten Ausschreibung (2015, ~8,50 ct) und
    //     muss klar über Jahrgang 2020 liegen (Zuschläge 2018/2019, ~5 ct).
    expect(einspeiseCt("freiflaeche", 2016)).toBeGreaterThan(einspeiseCt("freiflaeche", 2020) * 1.4);

    // (4) Kein Jahrgang der Ausschreibungs-Ära liegt über dem letzten
    //     GESETZLICHEN Satz (8,92 ct 2014) oder unter dem niedrigsten je
    //     zugeschlagenen Einzelwert — die Zuschläge lagen durchweg dazwischen.
    //     Untere Schranke unabhängig aus den BNetzA-Einzelrunden: Der
    //     niedrigste mengengewichtete Rundenwert seit 2015 war 4,33 ct
    //     (Gebotstermin 01.02.2018), netto also gut 4 ct.
    for (const ct of saetze) {
      expect(ct).toBeLessThan(einspeiseCt("freiflaeche", 2014));
      expect(ct).toBeGreaterThan(4);
    }

    // (5) Die Vermarktungsgebühr geht ab — dieselbe Behandlung wie beim heutigen
    //     Jahrgang, denn wer einen Zuschlag hat, ist in der Direktvermarktung.
    //     Unabhängig gerechnet aus dem Jahresmittel 2015 (8,50 ct), das für die
    //     Jahrgänge 2015 und 2016 gilt.
    expect(einspeiseCt("freiflaeche", 2016)).toBeCloseTo(8.5 - DIREKTVERMARKTUNG.gebuehrCtKwh, 6);

    // (6) Und der Hinweis sagt, WAS die Zahl ist: kein Gesetzessatz, sondern ein
    //     Zuschlagswert mit Versatz.
    expect(einspeiseSatz("freiflaeche", 2018).hinweis).toMatch(/Zuschlagswert/);
    expect(einspeiseSatz("freiflaeche", 2018).hinweis).toMatch(/zwei Jahre vor Inbetriebnahme/);
  });

  it("rechnet die EEG-Staffel anteilig, nicht als Sprungtarif", () => {
    // § 12 Abs. 2 Satz 1 EEG 2004 / § 18 Abs. 1 EEG 2009 / heute § 48 EEG: Die
    // Vergütung bestimmt sich "anteilig nach der Leistung der Anlage im
    // Verhältnis zu dem jeweils anzuwendenden Schwellenwert". Vorher nahm die
    // Spalte die Klassensätze roh — für die ganze Klasse zwischen Schwelle und
    // Obergrenze also zu wenig.
    //
    // Nachgerechnet wird hier aus den KLASSENSÄTZEN der jeweiligen Ära, nicht
    // aus der Atlas-Rechnung: sonst prüft der Test seine eigene Formel.
    const heuteRates = feedInRatesForCommissioning(`${HEUTE}-07-01`)!;
    const erwartet35 = (10 * heuteRates.teilUnder10 + 25 * heuteRates.teilOver10) / 35;
    expect(einspeiseCt("gewerbe_dach", HEUTE, 35)).toBeCloseTo(erwartet35, 6);
    // Der Unterschied zum rohen Klassensatz ist die eigentliche Aussage.
    expect(erwartet35).toBeGreaterThan(heuteRates.teilOver10);

    // Alte Ära: dieselbe Vorschrift, andere Schwelle (30 statt 10 kW).
    const alt = altFeedInRatesFor("2010-07-01")!;
    const erwartet50 = (30 * alt.roofUpTo30 + 20 * alt.roofUpTo100) / 50;
    expect(einspeiseCt("gewerbe_dach", 2010, 50)).toBeCloseTo(erwartet50, 6);
    expect(erwartet50).toBeGreaterThan(alt.roofUpTo100);

    // Ein privates Dach liegt per Definition unter der 30-kW-Grenze — dort ist
    // der anteilige Satz schlicht der kleine Klassensatz.
    expect(einspeiseCt("privat_dach", 2010, 9.8)).toBeCloseTo(alt.roofUpTo30, 6);

    // Zellen ohne Anzahl (Größe unbekannt oder null) dürfen NIE NaN liefern,
    // sondern fallen auf den Klassensatz zurück.
    for (const groesse of [null, undefined, 0, Number.NaN]) {
      for (const jahrgang of [2010, HEUTE]) {
        const ct = einspeiseCt("gewerbe_dach", jahrgang, groesse);
        expect(Number.isFinite(ct)).toBe(true);
        expect(ct).toBeCloseTo(einspeiseCt("gewerbe_dach", jahrgang), 6);
      }
    }

    // Und die Staffel muss bis in die Geld-Spalte durchschlagen: dieselbe
    // Leistung, einmal als 35 große Anlagen und einmal ohne Größenangabe.
    const mitStaffel = segmentWertEuro(1000, "09162000", "gewerbe_dach", HEUTE, 35);
    const ohne = segmentWertEuro(1000, "09162000", "gewerbe_dach", HEUTE);
    expect(mitStaffel).toBeGreaterThan(ohne);
  });

  it("bewertet Freiflächen mit dem anzulegenden Wert, nicht mit dem Börsenpreis", () => {
    // Ein Park in der Direktvermarktung bekommt die Marktprämie auf den
    // anzulegenden Wert — sein Erlös hängt am Zuschlagswert der Ausschreibung
    // (BNetzA, 4,66–5,00 ct in den letzten vier Runden), nicht am Marktwert.
    expect(FREIFLAECHE_AW_CT).toBeGreaterThan(4.5);
    expect(FREIFLAECHE_AW_CT).toBeLessThan(5.1);

    // Ein Park, der 2026 ans Netz geht, hängt aber NICHT an den Zuschlägen von
    // 2026, sondern an denen von 2024 und 2025 (§ 37e EEG: bis zu 24 Monate
    // zwischen Zuschlagsbekanntgabe und Inbetriebnahme). Bis 08/2026 stand hier
    // das heutige Niveau — die Reihe brach dadurch beim Jahrgang 2025 um 18 %
    // nach unten.
    //
    // Nachgerechnet aus den veröffentlichten BNetzA-EINZELRUNDEN (bezuschlagte
    // Menge in MW, mengengewichteter Zuschlagswert in ct/kWh), nicht aus der
    // Jahrestabelle der Konfiguration — sonst prüft der Test seine eigene Zeile.
    const runden: Record<number, ReadonlyArray<readonly [number, number]>> = {
      2024: [
        [2233.87, 5.11],
        [2152.29, 5.05],
        [2149.71, 4.76],
      ],
      2025: [
        [2638.39, 4.66],
        [2271.48, 4.84],
        [2340.77, 5.0],
      ],
    };
    const jahresmittel = (jahr: number) => {
      const rs = runden[jahr];
      return rs.reduce((s, [mw, ct]) => s + mw * ct, 0) / rs.reduce((s, [mw]) => s + mw, 0);
    };
    const erwartet2026 =
      (jahresmittel(2024) + jahresmittel(2025)) / 2 - DIREKTVERMARKTUNG.gebuehrCtKwh;
    // Toleranz, weil die Jahrestabelle die Jahresmittel auf zwei Stellen rundet.
    expect(Math.abs(einspeiseCt("freiflaeche", 2026) - erwartet2026)).toBeLessThan(0.02);

    // Alte Parks lagen um ein Vielfaches darüber (2010: 25,02 ct Freifläche).
    expect(einspeiseCt("freiflaeche", 2010)).toBeGreaterThan(einspeiseCt("freiflaeche", HEUTE) * 4);
  });

  it("lässt die Jahrgangs-Reihe der Freiflächen nirgends springen", () => {
    // DER Anker gegen die Fehlerklasse, die diese Reihe schon zweimal hatte:
    // ein zweites Regelwerk am jungen Ende. Bis 08/2026 rechneten die Jahrgänge
    // ab 2025 mit dem HEUTIGEN Ausschreibungsniveau statt mit dem Versatz —
    // 4,92 · 5,56 · 4,55 ct für 2023 · 2024 · 2025, also ein Absturz um 18 % an
    // einer Stelle, an der sich in der Sache nichts geändert hat.
    //
    // Geprüft wird gegen die AUSSCHREIBUNGSTABELLE, nicht gegen die
    // Ausgabewerte: Jeder Jahrgang ist ein Mittel zweier benachbarter
    // Ausschreibungsjahre, also kann der Abstand zweier benachbarter Jahrgänge
    // den größten Abstand zweier benachbarter Ausschreibungsjahre nicht
    // überschreiten. Tut er es doch, rechnet irgendwo eine zweite Regel mit.
    const jahre = [...FREIFLAECHE_AUSSCHREIBUNG_JAHRE].sort((a, b) => a.jahr - b.jahr);

    // Die Reihe muss aufsteigend stehen: Der obere Rand der Regel liest das
    // letzte Element als jüngstes Jahr. Eine falsch einsortierte Zeile würde
    // sonst still das Randjahr verstellen.
    expect(FREIFLAECHE_AUSSCHREIBUNG_JAHRE.map((r) => r.jahr)).toEqual(jahre.map((r) => r.jahr));

    const maxAusschreibungsSprung = Math.max(
      ...jahre.slice(1).map((r, i) => Math.abs(r.ct - jahre[i].ct)),
    );
    expect(maxAusschreibungsSprung).toBeGreaterThan(0);

    // Bis drei Jahre über das letzte belegte Ausschreibungsjahr hinaus: Die
    // Regel darf für künftige Baujahre nicht ins Leere laufen (kein null, kein
    // NaN, kein Sprung auf ein anderes Niveau).
    const erstes = jahre[0].jahr;
    const letztes = jahre[jahre.length - 1].jahr;
    const ctVonJahr = (j: number) => jahre.find((r) => r.jahr === j)!.ct;

    for (let j = FREIFLAECHE_ZUSCHLAG_AB; j <= letztes + 3; j++) {
      const ct = einspeiseCt("freiflaeche", j);
      expect(Number.isFinite(ct)).toBe(true);
      expect(ct).toBeGreaterThan(0);

      // (a) Die schärfere Schranke: Jeder Jahrgang muss INNERHALB der beiden
      //     Ausschreibungsjahre liegen, aus denen seine Anlagen stammen können —
      //     ein Mittelwert kann seine eigenen Summanden nicht verlassen. Genau
      //     das verletzte die alte Fassung: Jahrgang 2025 stand bei 4,55 ct,
      //     während seine Zuschlagsjahre 2023/2024 zwischen 4,68 und 5,98 ct
      //     (netto) liegen. Der reine Sprungtest hätte das durchgelassen.
      const fenster = [j - 2, j - 1].map((y) => Math.min(Math.max(y, erstes), letztes)).map(ctVonJahr);
      expect(ct).toBeGreaterThanOrEqual(
        Math.min(...fenster) - DIREKTVERMARKTUNG.gebuehrCtKwh - 1e-9,
      );
      expect(ct).toBeLessThanOrEqual(Math.max(...fenster) - DIREKTVERMARKTUNG.gebuehrCtKwh + 1e-9);

      // (b) Und kein Abstand zwischen zwei benachbarten Baujahren ist größer
      //     als der größte Abstand zweier benachbarter Ausschreibungsjahre.
      if (j === FREIFLAECHE_ZUSCHLAG_AB) continue;
      const sprung = Math.abs(ct - einspeiseCt("freiflaeche", j - 1));
      expect(sprung).toBeLessThanOrEqual(maxAusschreibungsSprung + 1e-9);
    }

    // Und die Naht zum gesetzlichen Regime davor (2014 → 2015) hält dieselbe
    // Schranke ein — dort wechselt nicht nur die Tabelle, sondern das
    // Vergütungssystem.
    expect(
      Math.abs(einspeiseCt("freiflaeche", 2015) - einspeiseCt("freiflaeche", 2014)),
    ).toBeLessThanOrEqual(maxAusschreibungsSprung);
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
    // die in der Spalte nicht steckt. Beide ohne Anlagengröße — die Spalte
    // rechnet je Zelle mit der mittleren Größe und liegt deshalb höher, was der
    // Hilfetext auch sagt.
    expect(finde("gewerbliches Dach")?.ct).toBeCloseTo(saetze.gewerbe_dach.ct, 6);

    // Freifläche: ebenfalls kein Eigenverbrauch.
    expect(finde("Freiflächen-Park")?.ct).toBeCloseTo(saetze.freiflaeche.ct, 6);

    // Balkon: unvergütet — der Tooltip darf dort keinen Satz nennen.
    expect(finde("Balkonkraftwerk")?.ct).toBeNull();

    // Privates Dach: Mischsatz aus beiden Bestandteilen. Der Tooltip nennt die
    // Bestandteile; die Rechnung muss sich aus genau ihnen ergeben.
    const dachEinspeisung = finde("privates Dach")?.ct as number;
    const nachgerechnet =
      EIGENVERBRAUCH_ANTEIL_RUECKFALL * eigenverbrauchCt +
      (1 - EIGENVERBRAUCH_ANTEIL_RUECKFALL) * dachEinspeisung;
    expect(nachgerechnet).toBeCloseTo(saetze.privat_dach.ct, 6);

    // Und der Balkon-Satz muss sich aus dem Eigenverbrauchspreis ergeben,
    // den der Tooltip nennt.
    expect(balkonEigenverbrauchAnteil() * eigenverbrauchCt).toBeCloseTo(saetze.steckersolar.ct, 6);
  });

  it("nennt die Eigenverbrauchs-Anteile, mit denen gerechnet wird", () => {
    // Ohne sie lassen sich die genannten Bestandteile nicht zur Spaltenzahl
    // zusammenrechnen — der Tooltip nannte zwei Preise und verschwieg die
    // Gewichte, mit denen sie gemischt werden.
    const t = stromwertBestandteile();
    expect(t.dachEigenverbrauchAnteil).toBe(EIGENVERBRAUCH_ANTEIL_RUECKFALL);
    expect(t.balkonEigenverbrauchAnteil).toBe(balkonEigenverbrauchAnteil());

    // Und wer den Anteil der Region hereinreicht, bekommt genau ihn zurück: Der
    // Hilfetext der Tabelle nennt die Spannweite ihrer Liste, nicht den
    // Rückfall — sonst behauptete er einen Anteil, mit dem nirgends gerechnet
    // wird.
    expect(stromwertBestandteile(undefined, 0.22).dachEigenverbrauchAnteil).toBe(0.22);
  });

  it("schreibt zu JEDER Anlagenart dazu, was die Zahl ist", () => {
    // Vorher wurde der Hinweis nur gerendert, wenn gar kein Satz da war — also
    // ausschließlich beim Balkonkraftwerk. Der Freiflächenwert stand damit ohne
    // Etikett neben zwei Einspeisevergütungen und las sich als eine.
    const zeilen = einspeiseZeilen();
    expect(zeilen).toHaveLength(stromwertBestandteile().einspeisung.length);
    for (const e of stromwertBestandteile().einspeisung) {
      const zeile = zeilen.find((z) => z.startsWith(e.label)) as string;
      expect(zeile).toBeDefined();
      expect(zeile).toContain(e.hinweis);
      expect(e.hinweis.length).toBeGreaterThan(10);
    }

    // Das Etikett beschreibt den AUSGEGEBENEN Wert: Ausgegeben wird der
    // Zuschlagswert abzüglich Vermarktungsgebühr, nicht der Zuschlagswert.
    const frei = zeilen.find((z) => z.startsWith("Freiflächen-Park")) as string;
    expect(frei).toMatch(/Vermarktungsgebühr/);
  });
});
