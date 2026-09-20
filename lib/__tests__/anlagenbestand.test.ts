import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  anteil, laenderNachBalkonDichte, laenderNachLeistung, laenderNachProKopf,
  monateSeitStichtag, segmentZeile, verdichteBestand, zeitraumSeitStichtag, zuwachs,
  type Anlagenbestand,
} from "../anlagenbestand";
import { anlagenbestandFaq } from "../faq";
import { anlagenZahlTeile } from "../atlas-format";

// Der Wert dieser Seite ist die Frische ihrer Zahlen — und genau daran hängt
// die Fehlerklasse, gegen die hier geprüft wird: Der Vergleich SIEHT aus wie
// ein Jahresvergleich und ist keiner. Das Register führt je Anlage nur das JAHR
// der Inbetriebnahme; vergleichbar ist ein Jahresendbestand, nicht „vor zwölf
// Monaten". Bis zum 26.08.2026 stand genau dieser falsche Zeitraum in einem
// Social-Post, gegen einen Datenstand vom 5. August — sieben Monate als zwölf
// ausgegeben. Eine Beschriftung, die etwas anderes sagt, als die Zahl misst.

// Gemessene Bundeswerte vom 26.08.2026 (Registerauszug 05.08.2026), auf die
// Struktur reduziert. Absichtlich echte Größenordnungen: Ein Testfall mit
// runden Fantasiezahlen findet die Rundungs- und Anteilsfehler nicht, um die
// es hier geht.
const B: Anlagenbestand = {
  standIso: "2026-08-05T00:00:00+00:00",
  stichtagJahr: 2025,
  gesamt: { anzahl: 6_215_841, kwp: 127_400_000, anzahlStichtag: 5_733_011, kwpStichtag: 117_890_000 },
  segmente: [
    { segment: "steckersolar", label: "Balkonkraftwerke", erklaerung: "…", anzahl: 1_454_592, kwp: 1_560_000, anzahlStichtag: 1_203_761, kwpStichtag: 1_290_000 },
    { segment: "privat_dach", label: "Private Dächer", erklaerung: "…", anzahl: 3_869_314, kwp: 36_250_000, anzahlStichtag: 3_658_372, kwpStichtag: 34_100_000 },
    { segment: "gewerbe_dach", label: "Gewerbliche Dächer", erklaerung: "…", anzahl: 872_561, kwp: 44_650_000, anzahlStichtag: 852_745, kwpStichtag: 42_900_000 },
    { segment: "freiflaeche", label: "Freiflächen", erklaerung: "…", anzahl: 19_374, kwp: 44_940_000, anzahlStichtag: 18_133, kwpStichtag: 39_600_000 },
  ],
  laender: [
    { ags: "09", name: "Bayern", einwohner: 13_248_928, anlagen: 1_399_105, kwp: 34_010_112, balkon: 221_097 },
    { ags: "05", name: "Nordrhein-Westfalen", einwohner: 18_034_454, anlagen: 1_148_171, kwp: 15_459_238, balkon: 289_642 },
    { ags: "12", name: "Brandenburg", einwohner: 2_556_747, anlagen: 187_984, kwp: 9_848_697, balkon: 52_463 },
    { ags: "11", name: "Berlin", einwohner: 3_685_265, anlagen: 62_201, kwp: 546_999, balkon: 26_328 },
  ],
};

describe("Verdichten: Gesamtbestand und Stichtag aus denselben Zeilen", () => {
  const zeilen = [
    { segment: "privat_dach", year: 2024, count: 10, kwp: 90 },
    { segment: "privat_dach", year: 2025, count: 5, kwp: 45 },
    { segment: "privat_dach", year: 2026, count: 3, kwp: 27 },
    { segment: "freiflaeche", year: 2026, count: 1, kwp: 2000 },
    // Fehlerhaftes Baujahr aus einem Eingabefehler im Register.
    { segment: "steckersolar", year: 1900, count: 2, kwp: 1.6 },
    // Andere Energieträger tragen kein Solar-Segment.
    { segment: "n/a", year: 2025, count: 999, kwp: 99_999 },
  ];

  it("zählt nur, was jünger als der Stichtag ist, aus dem Stichtagsbestand heraus", () => {
    const v = verdichteBestand(zeilen, 2025);
    expect(v.gesamt.anzahl).toBe(21);
    expect(v.gesamt.kwp).toBeCloseTo(2163.6, 6);
    // 2026er Zeilen fallen heraus: 21 − 3 − 1 = 17 Anlagen, 2163,6 − 27 − 2000.
    expect(v.stichtagGesamt.anzahl).toBe(17);
    expect(v.stichtagGesamt.kwp).toBeCloseTo(136.6, 6);
  });

  it("lässt ein fehlerhaftes Baujahr im Bestand stehen", () => {
    // Eine Anlage von „1900" ist ein Eingabefehler, aber sie steht da — und sie
    // stand auch am Stichtag schon da. Sie herauszuwerfen hieße, den Bestand um
    // einen Datenfehler zu kürzen, statt ihn abzubilden.
    const v = verdichteBestand(zeilen, 2025);
    const stecker = v.segmente.find((s) => s.segment === "steckersolar")!;
    expect(stecker.anzahl).toBe(2);
    expect(stecker.stichtag.anzahl).toBe(2);
  });

  it("ignoriert Zeilen ohne Solar-Segment", () => {
    const v = verdichteBestand(zeilen, 2025);
    expect(v.segmente.map((s) => s.segment)).not.toContain("n/a");
    expect(v.gesamt.anzahl).toBeLessThan(999);
  });

  it("sortiert vom kleinsten zum größten Anlagentyp", () => {
    const v = verdichteBestand(zeilen, 2025);
    expect(v.segmente.map((s) => s.segment)).toEqual(["steckersolar", "privat_dach", "freiflaeche"]);
  });

  it("verschiebt den Stichtag mit dem übergebenen Jahr", () => {
    // Die Gegenprobe zum Filter: Ein Jahr weiter zurück muss weniger zählen.
    expect(verdichteBestand(zeilen, 2024).stichtagGesamt.anzahl).toBe(12);
    expect(verdichteBestand(zeilen, 2026).stichtagGesamt.anzahl).toBe(21);
  });
});

describe("Zeitraum: benannt, nicht behauptet", () => {
  it("zählt die Monate zwischen Jahresstichtag und Datenstand", () => {
    expect(monateSeitStichtag("2026-08-05", 2025)).toBe(8);
    expect(monateSeitStichtag("2026-01-31", 2025)).toBe(1);
    expect(monateSeitStichtag("2026-12-15", 2025)).toBe(12);
    // Ein Datenstand, der zwei Jahre nach dem Stichtag liegt (Registerauszug
    // hinkt hinterher): Der Abstand ist dann größer als ein Jahr und muss es
    // auch sagen dürfen.
    expect(monateSeitStichtag("2027-03-01", 2025)).toBe(15);
  });

  it("nennt bei einem Datenstand im August NIE zwölf Monate", () => {
    const t = zeitraumSeitStichtag("2026-08-05", 2025);
    expect(t).not.toMatch(/zwölf|12 Monat|Jahr(esvergleich)? gegenüber/i);
    expect(t).toContain("2026");
  });

  it("wird im Dezember zum vollen Jahr — und sagt es erst dann", () => {
    expect(zeitraumSeitStichtag("2026-12-31", 2025)).toContain("zwölf");
    expect(zeitraumSeitStichtag("2026-08-05", 2025)).toContain("acht");
  });

  it("fällt sauber zurück, wenn der Datenstand vor dem Stichtagsende liegt", () => {
    // Kann vorkommen, wenn ein Auszug älter ist als das Stichtagsjahr suggeriert.
    // „in den ersten null Monaten" wäre Unsinn; „seit Ende 2025" ist wahr.
    expect(zeitraumSeitStichtag("2025-11-01", 2025)).toBe("seit Ende 2025");
  });
});

describe("Zuwachs", () => {
  it("rechnet absolut und relativ", () => {
    const z = zuwachs(1_454_592, 1_203_761)!;
    expect(z.absolut).toBe(250_831);
    expect(z.anteil).toBeCloseTo(0.2084, 3);
  });

  it("liefert nichts statt Unendlich, wenn die Basis fehlt", () => {
    // Ein Wachstum gegen null ist keine Steigerung, sondern eine fehlende
    // Vergleichszahl — und die gehört nicht als Prozentsatz auf eine Seite.
    expect(zuwachs(100, 0)).toBeNull();
    expect(zuwachs(100, -5)).toBeNull();
  });
});

describe("Anteile und Reihenfolgen", () => {
  it("teilt nicht durch null", () => {
    expect(anteil(5, 0)).toBe(0);
  });

  it("die Anteile aller Segmente ergeben zusammen eins", () => {
    // Bewusst über die ABLEITUNG geprüft, nicht über die Fixture: „Summe der
    // Segmente gleich Gesamtwert" hätte nur bewiesen, dass die Testdaten
    // konsistent getippt sind — ein Test, der den Fehler mit sich selbst
    // vergleicht. Dass Segmente und Gesamtwert wirklich aus einer Auswertung
    // kommen, sichert die Konstruktion in getNationalSolarStock: Beide werden
    // in derselben Schleife über dieselben Zeilen aufsummiert.
    const summe = B.segmente.reduce((s, x) => s + anteil(x.kwp, B.gesamt.kwp), 0);
    expect(summe).toBeCloseTo(1, 6);
  });

  it("sortiert Länder nach Leistung, Dichte und Pro-Kopf-Wert verschieden", () => {
    // Die drei Ranglisten beantworten drei verschiedene Fragen. Fielen sie
    // zusammen, wäre eine davon überflüssig — dass sie es nicht tun, ist der
    // Grund, warum die Seite die Spalte „je Einwohner" überhaupt zeigt.
    expect(laenderNachLeistung(B)[0].name).toBe("Bayern");
    expect(laenderNachProKopf(B)[0].name).toBe("Brandenburg");
    expect(laenderNachBalkonDichte(B)[0].name).toBe("Brandenburg");
    expect(laenderNachBalkonDichte(B).at(-1)!.name).toBe("Berlin");
  });

  it("findet ein Segment über seinen Schlüssel", () => {
    expect(segmentZeile(B, "steckersolar")?.anzahl).toBe(1_454_592);
    expect(segmentZeile(B, "n/a" as never)).toBeUndefined();
  });
});

describe("Stückzahl-Formatierung", () => {
  it("kürzt ab einer Million, sonst voll", () => {
    expect(anlagenZahlTeile(6_215_841)).toEqual({ value: "6,22", unit: "Mio. Anlagen" });
    expect(anlagenZahlTeile(19_374)).toEqual({ value: "19.374", unit: "Anlagen" });
  });

  it("baut den Singular mit", () => {
    // Kommt im Bundesbestand nie vor, in einer Segmentzeile aber schon —
    // „1 Anlagen" ist derselbe Fehler wie eine falsche Einheit, nur in Worten.
    expect(anlagenZahlTeile(1).unit).toBe("Anlage");
  });

  it("hält 1,45 und 1,50 Millionen auseinander", () => {
    // Auf eine Nachkommastelle gerundet wären beide „1,5 Mio." — und der
    // Abstand zum Vorjahresbestand verschwände in der Rundung.
    expect(anlagenZahlTeile(1_454_592).value).not.toBe(anlagenZahlTeile(1_500_000).value);
  });
});

describe("FAQ: jede Zahl kommt aus den Daten", () => {
  const faq = anlagenbestandFaq(B);

  it("beantwortet die gesuchten Fragen wörtlich", () => {
    const fragen = faq.map((f) => f.q).join(" | ");
    expect(fragen).toContain("Wie viele Photovoltaikanlagen gibt es in Deutschland?");
    expect(fragen).toContain("Wie viele Balkonkraftwerke gibt es in Deutschland?");
  });

  it("nennt die Bestandszahlen aus den übergebenen Daten", () => {
    const alles = faq.map((f) => f.a).join(" ");
    expect(alles).toContain("6.215.841");
    expect(alles).toContain("1.454.592");
    expect(alles).toContain("127,4 GWp");
  });

  it("bewegt sich mit, wenn sich die Zahlen bewegen", () => {
    // Der eigentliche Test: Eine handgetippte Zahl bliebe hier stehen.
    const doppelt = anlagenbestandFaq({
      ...B,
      gesamt: { ...B.gesamt, anzahl: 7_000_000 },
    });
    expect(doppelt.map((f) => f.a).join(" ")).toContain("7.000.000");
  });

  it("behauptet keinen Zwölf-Monats-Zeitraum", () => {
    expect(faq.map((f) => f.a).join(" ")).not.toMatch(/zwölf Monaten|letzten Jahr|Vorjahresvergleich/i);
  });

  it("nennt den Datenstand in jeder Bestandsantwort", () => {
    // Ohne Stand ist eine Bestandszahl eine Behauptung mit Verfallsdatum, das
    // niemand sieht — und Frische ist der ganze Vorteil dieser Seite.
    for (const f of faq.slice(0, 3)) {
      expect(f.a, `„${f.q}" nennt keinen Datenstand`).toMatch(/Stand August 2026/);
    }
  });

  it("sagt dazu, dass die Balkon-Zahl eine Untergrenze ist", () => {
    // Nicht angemeldete Geräte fehlen. Wer das weglässt, verkauft eine
    // Meldestatistik als Bestandszählung.
    const balkonAntwort = faq.find((f) => f.q.includes("Balkonkraftwerke"))!.a;
    expect(balkonAntwort).toMatch(/Untergrenze/);
  });
});

describe("Eine Quelle für die Bundeszahlen", () => {
  const quelle = readFileSync(join(__dirname, "..", "social-kennzahlen.ts"), "utf8");

  it("die Datengeschichten rechnen den Bundesbestand nicht selbst", () => {
    // Award-Tabelle und Rollup liefern nicht dieselbe Bundessumme (gemessen:
    // 1.453.026 gegen 1.454.592 Steckersolargeräte). Solange die Posts die
    // einzige Oberfläche waren, fiel das in gerundeten Millionen nicht auf;
    // seit die Bestandsseite dieselben Zahlen groß hinschreibt, wären es zwei
    // Zahlen für dieselbe Größe auf einer Seite.
    //
    // Geprüft werden die ZUWEISUNGEN, nicht die gelesenen Spalten: Die
    // Jahresstände der Award-Tabelle werden weiterhin gebraucht, nur eben für
    // Größen mit Einwohnerbezug, die der Rollup gar nicht kennt. Die erste
    // Fassung verbot die Spalten und wurde rot, sobald jemand eine solche
    // Kennzahl ergänzte — ein Wächter, der die falsche Frage stellt.
    expect(quelle).toContain("getNationalSolarStock");
    const zuweisung = (feld: string) =>
      new RegExp(`${feld}:\\s*(gem|zeilen|bewertbar)\\.|${feld}:\\s*summe\\(`).test(quelle);
    for (const feld of ["balkonJetzt", "balkonVorJahr", "solarKwpJetzt", "solarKwpVorJahr",
                        "privatDachKwp", "gewerbeDachKwp", "freiflaecheKwp", "solarGesamtKwp"]) {
      expect(zuweisung(feld), `${feld} wird aus den Gemeindezeilen summiert`).toBe(false);
    }
  });
});
