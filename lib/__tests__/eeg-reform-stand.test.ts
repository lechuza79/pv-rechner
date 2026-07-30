import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import {
  EEG_REFORM_STAND, EEG_UEBERGANG_STAFFEL, eegDatum, eegReformStandLabel,
  eegStaffelSatz, eegVerfahrenSatz,
} from "../eeg-reform-config";
import { pvRechnerFaq, pvOhneEinspeisungFaq } from "../faq";
import { ZUBAU_EVENTS } from "../../components/charts/ZubauWidget";

/**
 * Realitäts-Anker für den EEG-Reform-Sachstand (Wächter-Gate Regel 7).
 *
 * Am 29.07.2026 hat das Kabinett den Entwurf der EEG-Novelle 2027 beschlossen.
 * Bis dahin sagten FAQ, Ratgeber, Rechner-Notiz und Zeitleisten-Marke, "der Weg
 * durch Kabinett, Bundestag und Bundesrat" stehe noch aus — ab dem 29.07. war
 * das eine falsche Rechtsaussage auf vier Oberflächen gleichzeitig. Dieser Block
 * hält beides fest: den belegten Sachstand UND die Formulierungsfehler, die der
 * Legal-Judge am 30.07.2026 gefunden hat. Sie kommen sonst beim nächsten
 * Nachschärfen zurück.
 *
 * Fundstellen am 30.07.2026 im Volltext des Referentenentwurfs selbst
 * aufgeschlagen (docs/quellen/, siehe eeg-reform-config.ts) — nicht aus einem
 * Wächter-Report übernommen.
 */
describe("EEG-Reform 2027 — Sachstand", () => {
  it("der Zustand ist Regierungsentwurf, nicht Gesetz", () => {
    // Wächter-Gate Regel 1: ein Auto-Fix darf Werte ändern, nie den Zustand.
    // Wer hier weiterdreht, muss die Sätze bewusst neu formulieren.
    expect(EEG_REFORM_STAND.zustand).toBe("regierungsentwurf");
    expect(EEG_REFORM_STAND.kabinettBeschlussIso).toBe("2026-07-29");
    expect(EEG_REFORM_STAND.entwurfIso).toBe("2026-07-18");
  });

  it("der Entwurf liegt als Primärquelle im Repo", () => {
    // Fundstelle erst beschaffen, dann zitieren (CLAUDE.md, Faktenprüfung 6).
    expect(existsSync(join(__dirname, "..", "..", EEG_REFORM_STAND.primaerquelle))).toBe(true);
  });

  it("solange die Kabinettsfassung unveröffentlicht ist, bleiben Detailwerte Entwurfswerte", () => {
    // Die 36 Monate, der 1-ct-Abschlag und die Leistungsstaffel stehen NUR im
    // Entwurf vom 18.07. Sie dürfen nie als Beschluss beschriftet werden.
    expect(EEG_REFORM_STAND.kabinettsfassungVeroeffentlicht).toBe(false);
  });

  it("die Leistungsstaffel trägt die Werte aus § 21 Abs. 1 S. 1 Nr. 1 a–c", () => {
    expect(EEG_UEBERGANG_STAFFEL.map((s) => [s.jahr, s.unterKw])).toEqual([
      [2027, 50], [2028, 25], [2029, 7],
    ]);
    // "weniger als", nicht "bis" — die Fachpresse schreibt regelmäßig "bis 50 kWp".
    // Und die Einheit steht ausgeschrieben, weil die Seite sonst kWp verwendet.
    expect(eegStaffelSatz()).toBe(
      "2027 unter 50, 2028 unter 25 und 2029 unter 7 Kilowatt installierter Leistung",
    );
  });

  it("Datum und Stand-Label werden aus dem ISO-Datum erzeugt, nicht getippt", () => {
    expect(eegDatum("2026-07-29")).toBe("29. Juli 2026");
    expect(eegReformStandLabel()).toBe("30. Juli 2026");
  });

  it("ein Zustandswechsel erbt keinen Satz, sondern erzwingt eine neue Formulierung", () => {
    expect(() =>
      eegVerfahrenSatz({}, { ...EEG_REFORM_STAND, zustand: "bundestag-beschlossen" }),
    ).toThrow(/Zustandswechsel|neu formulieren/);
  });
});

describe("EEG-Reform 2027 — Formulierungsfehler, die nicht zurückkommen dürfen", () => {
  // Alle sichtbaren Texte, die den Sachstand tragen, an einer Stelle einsammeln.
  const texte = [
    ...pvRechnerFaq().map((e) => e.a),
    ...pvOhneEinspeisungFaq().map((e) => e.a),
    ZUBAU_EVENTS.find((e) => e.year === 2027)?.text ?? "",
    eegVerfahrenSatz(),
    eegVerfahrenSatz({ kurz: true }),
  ].join("\n");

  it("nennt den Kabinettsbeschluss und behauptet nicht, das Kabinett stehe noch aus", () => {
    expect(texte).toMatch(/29\. Juli 2026/);
    expect(texte).not.toMatch(/Weg durch Kabinett/);
    // "Referentenentwurf" war die Bezeichnung bis zum 28.07. — ein
    // Referentenentwurf ist die Position eines Ministeriums, ein
    // Regierungsentwurf die abgestimmte Position der Bundesregierung.
    expect(texte).not.toMatch(/Referentenentwurf/);
  });

  it("macht aus dem Einspruchsgesetz kein Zustimmungsgesetz", () => {
    // Legal-Judge 30.07.2026: EEG-Novellen sind Einspruchsgesetze, eine
    // Zustimmungsbedürftigkeit des Bundesrates stand nirgends. Derselbe Fehler
    // wurde zwei Tage vorher schon beim GModG korrigiert.
    expect(texte).not.toMatch(/Bundesrat (müssen|muss) zustimmen/);
    expect(texte).not.toMatch(/Bundestag und Bundesrat müssen/);
  });

  it("nennt keinen Beratungstermin, den keine amtliche Stelle genannt hat", () => {
    // "ab September" stand nur in der Fachpresse.
    expect(texte).not.toMatch(/im September/);
  });

  it("stellt den Entwurf nicht als geltendes Recht dar", () => {
    const lang = pvOhneEinspeisungFaq().map((e) => e.a).join("\n");
    expect(lang).toMatch(/nicht das Gesetz|noch nicht/);
    expect(lang).toMatch(/verbindlich ist allein die offizielle Gesetzeslage/);
  });

  it("begrenzt die 50-Prozent-Regel sichtbar auf Neuanlagen und nennt ihren Nenner", () => {
    // § 9 Abs. 2b Begründung S. 190: "findet nur auf Neuanlagen Anwendung".
    // Ohne das "neu" liest ein PV-Besitzer, seine laufende Anlage werde gekappt.
    const lang = pvOhneEinspeisungFaq().map((e) => e.a).join("\n");
    expect(lang).toMatch(/neuer Dachanlagen/);
    expect(lang).toMatch(/50 Prozent ihrer installierten Leistung/);
    expect(lang).toMatch(/bereits in Betrieb sind, gilt das nicht/);
  });

  it("ergänzt keine Leistungsschwelle, die im Entwurf noch offen ist", () => {
    // § 9 Abs. 2b trägt dort "[weniger als 25/weniger als 100 Kilowatt]".
    // Deshalb bleibt es bei "kleine und mittlere Dachanlagen" — auch nicht
    // später "zur Präzisierung" eine Zahl einsetzen.
    expect(texte).not.toMatch(/50 Prozent[^.]{0,80}(unter|bis) (25|100) Kilowatt/);
  });

  it("behauptet keine Abfolge der beiden Zahlungen, die nicht belegt ist", () => {
    // Der Direktvermarktungsbonus läuft "vier Jahre nach erstmaligem Eintritt in
    // die Direktvermarktung" — die Fristen können überlappen. Die Abfolge
    // ("danach") stammt aus Presse.
    expect(texte).not.toMatch(/36 Monate[^.]{0,60}danach/);
  });

  it("erklärt den Bestandsschutz aus dem Entwurf, nicht aus einem unveröffentlichten Text", () => {
    const lang = pvOhneEinspeisungFaq().map((e) => e.a).join("\n");
    expect(lang).toMatch(/18\. Juli 2026/);
    // Der Wortlaut der Fassung vom 29.07. lag nicht vor — sich darauf zu
    // berufen wäre ein Beleg auf einen Text, den niemand lesen kann.
    expect(lang).not.toMatch(/Gesetzentwurf vom 29\. Juli 2026 ausdrücklich/);
  });

  it("erklärt den Bestandsschutz eng genug — Vergütungsanspruch, nicht 'nicht betroffen'", () => {
    const kurz = pvRechnerFaq().map((e) => e.a).join("\n");
    expect(kurz).toMatch(/Vergütungsanspruch/);
    expect(kurz).not.toMatch(/von der Änderung nicht betroffen/);
  });

  it("lässt die Übergangszahlung nach 2030 nicht endgültig enden", () => {
    // § 85 Abs. 2 Nr. 2a: die Bundesnetzagentur kann sie bis 31.12.2032
    // verlängern, wenn die Direktvermarktung nicht praxistauglich ist.
    const lang = pvOhneEinspeisungFaq().map((e) => e.a).join("\n");
    if (/ab 2030/.test(lang)) expect(lang).toMatch(/verlängern/);
  });

  it("der Sachstand steht auf allen Oberflächen mit demselben Datum", () => {
    // Der Verfahrens-Halbsatz wird am Tag des Bundestagsbeschlusses überall
    // gleichzeitig falsch — deshalb kommt er aus einer Quelle, nicht sechsmal
    // getippt.
    const tag = eegDatum(EEG_REFORM_STAND.kabinettBeschlussIso);
    for (const t of [
      pvRechnerFaq().map((e) => e.a).join("\n"),
      pvOhneEinspeisungFaq().map((e) => e.a).join("\n"),
      ZUBAU_EVENTS.find((e) => e.year === 2027)?.text ?? "",
    ]) {
      expect(t).toContain(tag);
    }
  });
});
