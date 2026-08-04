import { describe, it, expect } from "vitest";
import {
  einspeiseVerlauf,
  anzulegenderWertCt,
  einspeiseDeckelKw,
  mittlererSatzCt,
  profilFaktorAus,
  type RegimeInput,
} from "../einspeise-regime";
import { EEG_ENTWURF_WERTE } from "../eeg-reform-config";
import {
  MARKTWERT_NIVEAU_CT,
  PREISFORM_MONAT_STUNDE,
  SOLARPROFIL_MONAT_STUNDE,
  MARKTWERT_SOLAR_HISTORIE,
} from "../marktwert-config";
import { calc } from "../calc";
import { simulateSolarYear, monthlyFromAnnual } from "../balkon-sim";
import { YEARS, FEED_IN_YEARS } from "../constants";
import type { HouseholdProfile } from "../consumption";

/** Eine Stunden-Jahressimulation mit Preisform — die Grundlage jedes Profilfaktors. */
function simuliere({ kwp, batterie, baseKwh = 3800, exportCapKw }: {
  kwp: number; batterie: number; baseKwh?: number; exportCapKw?: number;
}) {
  const haushalt: HouseholdProfile = { baseKwh, tagQuote: 0.3, wpActive: false, eaActive: false };
  return simulateSolarYear({
    moduleKwp: kwp, inverterKw: kwp, monthlyYieldPerKwp: monthlyFromAnnual(1000),
    orientation: "sued_flach", household: haushalt, batteryKwh: batterie, roundtrip: 0.9,
    priceShape: PREISFORM_MONAT_STUNDE, exportCapKw,
  });
}

const basis = (over: Partial<RegimeInput> = {}): RegimeInput => ({
  regime: "reform2027",
  kwp: 10,
  inbetriebnahmeJahr: 2027,
  heuteSatzCt: 7.7,
  marktErloes: true,
  profilFaktor: 1,
  ...over,
});

describe("Status quo bleibt Status quo", () => {
  // Der Umbau darf den heutigen Fall nicht anfassen. Er ist der Default für
  // jede bestehende Berechnung und jeden geteilten Link.
  it("zahlt 20 Jahre den festen Satz und danach nichts", () => {
    const v = einspeiseVerlauf(basis({ regime: "heute" }));
    expect(v).toHaveLength(YEARS);
    expect(v[0].satzCt).toBe(7.7);
    expect(v[FEED_IN_YEARS - 1].satzCt).toBe(7.7);
    expect(v[FEED_IN_YEARS].satzCt).toBe(0);
    expect(v.every((j) => j.fixkosten === 0)).toBe(true);
  });

  it("rechnet über das Einspeisemodell dasselbe wie über den festen Satz", () => {
    // Wenn beide Wege dasselbe Ergebnis liefern, ist der neue Weg kein Risiko
    // für die bestehende Rechnung.
    const gemeinsam = {
      kwp: 10, kosten: 16000, strompreis: 0.31, eigenverbrauch: 35,
      stromSteigerung: 0.03, ertragKwp: 1000, monthly: null,
    };
    const alt = calc({ ...gemeinsam, einspeisung: 7.7 });
    const neu = calc({
      ...gemeinsam,
      einspeisung: 0,
      einspeiseModell: { satzCtImJahr: (i) => (i <= FEED_IN_YEARS ? 7.7 : 0) },
    });
    expect(neu.total).toBe(alt.total);
    expect(neu.be?.i).toBe(alt.be?.i);
  });
});

describe("Entwurf ab 2027: die Abfolge stimmt", () => {
  it("zahlt drei Jahre die Übergangszahlung, danach den Markt", () => {
    const v = einspeiseVerlauf(basis());
    // § 53 Abs. 1: anzulegender Wert minus 1 ct. 2027: 6,2 − 1,0 = 5,2.
    expect(v[0].art).toBe("uebergang");
    expect(v[0].satzCt).toBe(5.2);
    expect(v[2].satzCt).toBe(5.2);
    expect(v[3].art).toBe("markt-bonus");
    expect(v[2].fixkosten).toBe(0); // Netzbetreiberabnahme kostet keine Gebühr
    expect(v[3].fixkosten).toBeGreaterThan(0);
  });

  it("gewährt den Bonus vier Jahre AB dem Eintritt in die Direktvermarktung", () => {
    // Übergangszahlung und Bonus schließen einander aus (§ 50c Abs. 2), die
    // 48-Monats-Frist startet also erst nach den 36 Monaten. Wer sie ab
    // Inbetriebnahme rechnet, lässt den Bonus ein Jahr zu früh auslaufen.
    const v = einspeiseVerlauf(basis());
    const mitBonus = v.filter((j) => j.art === "markt-bonus");
    expect(mitBonus.map((j) => j.i)).toEqual([4, 5, 6, 7]);
    expect(v[7].art).toBe("markt");
    // Der Bonus muss sich als 1,5 ct im Satz wiederfinden.
    expect(v[6].satzCt - v[7].satzCt).toBeCloseTo(EEG_ENTWURF_WERTE.bonusCt, 2);
  });

  it("kennt den Bonus nur unter 25 Kilowatt", () => {
    const gross = einspeiseVerlauf(basis({ kwp: 30, inbetriebnahmeJahr: 2027 }));
    expect(gross.some((j) => j.art === "markt-bonus")).toBe(false);
  });
});

describe("Die Größenstaffel liest 'weniger als', nicht 'bis'", () => {
  // Die Fachpresse schreibt regelmäßig "bis 50 kWp". Der Entwurf sagt
  // "weniger als 50 Kilowatt" (§ 21 Abs. 1 S. 1 Nr. 1 a). Eine Anlage mit genau
  // 50 kW ist NICHT dabei.
  it.each([
    [2027, 49.9, true],
    [2027, 50, false],
    [2028, 24.9, true],
    [2028, 25, false],
    [2029, 6.9, true],
    [2029, 7, false],
  ])("Inbetriebnahme %i mit %s kWp → Übergangszahlung: %s", (jahr, kwp, erwartet) => {
    const v = einspeiseVerlauf(basis({ kwp, inbetriebnahmeJahr: jahr }));
    expect(v[0].art === "uebergang").toBe(erwartet);
  });

  it("kennt ab 2030 keine Übergangszahlung mehr", () => {
    const v = einspeiseVerlauf(basis({ kwp: 5, inbetriebnahmeJahr: 2030 }));
    expect(v.some((j) => j.art === "uebergang")).toBe(false);
    expect(v[0].art).toBe("markt-bonus");
  });
});

describe("Degression des anzulegenden Werts (§ 49 Satz 1)", () => {
  // Ab 01.08.2027, dann alle sechs Monate 1 %. Zum 1. Januar gemessen sind das
  // 2027: 0 Schritte, 2028: 1, 2029: 3, 2030: 5.
  it.each([
    [2027, 6.2],
    [2028, 6.14],
    [2029, 6.02],
    [2030, 5.9],
  ])("Inbetriebnahme %i → %s ct/kWh", (jahr, erwartet) => {
    expect(anzulegenderWertCt(jahr)).toBeCloseTo(erwartet, 2);
  });

  it("gibt die Degression an die Übergangszahlung weiter", () => {
    const v2029 = einspeiseVerlauf(basis({ kwp: 5, inbetriebnahmeJahr: 2029 }));
    expect(v2029[0].satzCt).toBeCloseTo(6.02 - 1.0, 2);
  });
});

describe("Markterlös lässt sich abschalten", () => {
  it("setzt nach der Übergangszahlung null an, wenn er aus ist", () => {
    const v = einspeiseVerlauf(basis({ marktErloes: false }));
    expect(v[0].satzCt).toBe(5.2);
    expect(v[3].satzCt).toBe(0);
    expect(v[3].art).toBe("keine");
    // Ohne Vermarktung darf auch keine Grundgebühr anfallen.
    expect(v[3].fixkosten).toBe(0);
  });

  it("ist ohne Markterlös immer schlechter als mit", () => {
    const mit = mittlererSatzCt(einspeiseVerlauf(basis({ marktErloes: true })));
    const ohne = mittlererSatzCt(einspeiseVerlauf(basis({ marktErloes: false })));
    expect(mit).toBeGreaterThan(ohne);
  });
});

describe("Profilfaktor wirkt auf den Markterlös, nicht auf die Übergangszahlung", () => {
  it("skaliert nur die Marktjahre", () => {
    const voll = einspeiseVerlauf(basis({ profilFaktor: 1 }));
    const halb = einspeiseVerlauf(basis({ profilFaktor: 0.5 }));
    expect(halb[0].satzCt).toBe(voll[0].satzCt); // Übergangszahlung ist gesetzlich fix
    expect(halb[10].satzCt).toBeLessThan(voll[10].satzCt);
  });
});

describe("Einspeisegrenze (§ 9 Abs. 2b)", () => {
  it("deckelt nur im Reform-Regime und dort auf die Hälfte", () => {
    expect(einspeiseDeckelKw(10, "heute")).toBeUndefined();
    expect(einspeiseDeckelKw(10, "reform2027")).toBe(5);
  });

  it("kostet Einspeisung — und der Speicher fängt einen Teil davon auf", () => {
    // Der Deckel ist der Punkt, an dem der Entwurf Speicher anreizen will.
    // Wenn unsere Simulation das nicht zeigt, bildet sie ihn nicht ab.
    const ohneDeckel = simuliere({ kwp: 10, batterie: 0 });
    const mitDeckel = simuliere({ kwp: 10, batterie: 0, exportCapKw: 5 });
    const mitDeckelUndSpeicher = simuliere({ kwp: 10, batterie: 10, exportCapKw: 5 });

    expect(ohneDeckel.curtailedKwh).toBe(0);
    expect(mitDeckel.curtailedKwh).toBeGreaterThan(0);
    expect(mitDeckel.feedInKwh).toBeLessThan(ohneDeckel.feedInKwh);
    // Der Speicher nimmt die Spitze weg, bevor sie am Deckel verloren geht.
    expect(mitDeckelUndSpeicher.curtailedKwh).toBeLessThan(mitDeckel.curtailedKwh);
  });
});

describe("Preisform: das Mittagstal ist der Kern der Aussage", () => {
  it("hat für jeden Monat 24 Stunden mit positiven Werten", () => {
    expect(PREISFORM_MONAT_STUNDE).toHaveLength(12);
    for (const monat of PREISFORM_MONAT_STUNDE) {
      expect(monat).toHaveLength(24);
      expect(monat.every((x) => x > 0)).toBe(true);
    }
  });

  it("bewertet die Sommermittagsstunden deutlich unter dem Schnitt", () => {
    // Mai–Juli, 12–14 Uhr: genau die Stunden, in die ein Haushalt einspeist.
    for (const m of [4, 5, 6]) {
      for (const h of [12, 13, 14]) {
        expect(PREISFORM_MONAT_STUNDE[m][h]).toBeLessThan(0.8);
      }
    }
    // Winterabende dagegen über dem Schnitt.
    expect(PREISFORM_MONAT_STUNDE[11][17]).toBeGreaterThan(1.5);
  });

  it("ist so normiert, dass das nationale Solarprofil genau 1,0 ergibt", () => {
    // Die Gegenprobe zur Normierung — und der Test, der den ersten, falsch
    // normierten Stand hätte auffliegen lassen (Nenner aus einer anderen Basis,
    // Ergebnis 5,4 % daneben). Wer die Form neu erzeugt, muss hier landen.
    let summe = 0, gewicht = 0;
    for (let m = 0; m < 12; m++) {
      for (let h = 0; h < 24; h++) {
        gewicht += SOLARPROFIL_MONAT_STUNDE[m][h];
        summe += SOLARPROFIL_MONAT_STUNDE[m][h] * PREISFORM_MONAT_STUNDE[m][h];
      }
    }
    expect(gewicht).toBeCloseTo(1, 2);
    expect(summe / gewicht).toBeCloseTo(1, 2);
  });

  it("gibt einem echten Haushalt einen Profilfaktor unter 1", () => {
    // Die zentrale Aussage der Marktrechnung: Vom Ertrag bleibt nach dem
    // Eigenverbrauch die schlechter bezahlte Hälfte übrig. Käme hier ein Faktor
    // über 1 heraus, wäre das Modell falsch herum verdrahtet.
    //
    // Gemessen 08/2026 (Süd-Dach, 3.800-kWh-Haushalt, ohne Speicher):
    //   5 kWp 0,92 · 10 kWp 0,96 · 15 kWp 0,97 · 20 kWp 0,98
    // Je größer die Anlage, desto näher an 1 — bei viel Überschuss fällt ins
    // Gewicht, was der Haushalt wegnimmt, immer weniger.
    const faktor = profilFaktorAus(simuliere({ kwp: 10, batterie: 0 }));
    expect(faktor).toBeGreaterThan(0.85);
    expect(faktor).toBeLessThan(1);
  });

  it("senkt den Profilfaktor, wenn ein Speicher dazukommt", () => {
    // Kontraintuitiv, aber richtig, und deshalb festgenagelt: Ein HAUSspeicher
    // handelt nicht, er deckt den eigenen Verbrauch. Er nimmt dem Haushalt genau
    // die Randstunden-Einspeisung weg (morgens, abends — die gut bezahlten) und
    // lässt die tiefe Mittagsspitze übrig, für die er keinen Platz mehr hat. Die
    // verbleibende Kilowattstunde ist also SCHLECHTER bezahlt als ohne Speicher.
    // Gemessen: 10 kWp ohne Speicher 0,96, mit 10 kWh nur noch 0,76.
    //
    // Das ist kein Argument gegen den Speicher: Er verdient sein Geld über den
    // Eigenverbrauch, und der ist ein Vielfaches wert. Aber wer erwartet, ein
    // Hausspeicher hebe den Markterlös je eingespeister Kilowattstunde,
    // verwechselt ihn mit einem Großspeicher, der in den Abend hinein verkauft.
    const ohne = simuliere({ kwp: 10, batterie: 0 });
    const mit = simuliere({ kwp: 10, batterie: 10 });
    expect(profilFaktorAus(mit)).toBeLessThan(profilFaktorAus(ohne));
    expect(profilFaktorAus(mit)).toBeGreaterThan(0.5);
    // Er speist weniger ein und verbraucht mehr selbst — dort liegt sein Nutzen.
    expect(mit.feedInKwh).toBeLessThan(ohne.feedInKwh);
    expect(mit.selfUsedKwh).toBeGreaterThan(ohne.selfUsedKwh);
  });

  it("gibt einer Anlage, die alles einspeist, genau 1,0", () => {
    // Der Bezugspunkt per Konstruktion — und für genau diesen Fall gilt der
    // amtliche Marktwert Solar, mit dem das Niveau gesetzt wird. Ohne diesen
    // Anker wäre der Faktor eine Zahl ohne Bedeutung.
    const ohneLast = simuliere({ kwp: 10, batterie: 0, baseKwh: 0 });
    expect(profilFaktorAus(ohneLast)).toBeCloseTo(1, 2);
  });
});

describe("Realitäts-Anker der Marktwert-Daten", () => {
  // Wächter-Gate: jede auto-gepflegte Zahl braucht einen Anker. Hier ist es der
  // Abgleich zwischen dem amtlich veröffentlichten Jahresmarktwert und dem
  // unabhängig aus Erzeugung × Börsenpreis nachgerechneten Wert. Läuft der
  // auseinander, stimmt entweder die Zahl oder die Methode nicht mehr.
  it("hält amtlichen und nachgerechneten Jahreswert innerhalb von 5 %", () => {
    for (const jahr of MARKTWERT_SOLAR_HISTORIE) {
      const abweichung = Math.abs(jahr.nachgerechnetCtKwh - jahr.ctKwh) / jahr.ctKwh;
      expect(abweichung, `Marktwert Solar ${jahr.jahr}`).toBeLessThan(0.05);
    }
  });

  it("liegt das gerechnete Niveau über dem rohen Marktwert", () => {
    // Wir rechnen mit dem bei null gekappten Wert (negative Stunden zahlen
    // nichts, statt Geld zu kosten). Der MUSS über dem veröffentlichten Wert
    // liegen — läge er darunter, wäre die Kappung falsch herum angewendet.
    const letzter = MARKTWERT_SOLAR_HISTORIE[MARKTWERT_SOLAR_HISTORIE.length - 1];
    expect(MARKTWERT_NIVEAU_CT).toBeGreaterThan(letzter.ctKwh);
    // Aber nicht beliebig darüber — 2025 lagen 24 % der Erzeugung im Minus.
    expect(MARKTWERT_NIVEAU_CT).toBeLessThan(letzter.ctKwh * 1.3);
  });
});

describe("Die Reform ist für einen Haushalt schlechter als heute", () => {
  // Keine Meinung, sondern eine Rechenprobe: 5,2 ct für drei Jahre plus
  // Marktwert danach kann 7,7 ct über 20 Jahre nicht schlagen. Käme im Ergebnis
  // das Gegenteil heraus, wäre irgendwo ein Vorzeichen gedreht.
  it("liefert über die Laufzeit weniger als die heutige Vergütung", () => {
    const heute = mittlererSatzCt(einspeiseVerlauf(basis({ regime: "heute" })));
    const reform = mittlererSatzCt(einspeiseVerlauf(basis()));
    expect(reform).toBeLessThan(heute);
  });
});
