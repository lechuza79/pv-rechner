import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ausZeilen,
  sichtbareAnzahl,
  kfwQuellenzeile,
  KFW_REPORT_STAND,
  HEIZUNGSFOERDERUNG,
  VWZ_BASIS,
  VWZ_KLIMABONUS,
  VWZ_EINKOMMENSBONUS,
  VWZ_EFFIZIENZBONUS,
  type BundZeile,
} from "../kfw-format";
import { calcBegSubsidy, calcInvestBrutto, calcHeatLoad } from "../heatpump";

const ROOT = join(__dirname, "..", "..");

/**
 * Die Regeln, unter denen die KfW-Zahlen im Produkt stehen dürfen.
 *
 * Drei davon sind Auflagen, keine Geschmacksfragen: die Unterdrückungsschwelle,
 * der fehlende Nenner in der Fläche und der Wortlaut der Quellenzeile. Die
 * vierte ist der Realitäts-Anker — die einzige Prüfung im Projekt, die unsere
 * eigene Förderrechnung gegen eine unabhängig gemessene Wirklichkeit hält.
 */

/**
 * Die Bundeszahlen des Jahrgangs 2025, wie der Einlese-Lauf sie am 26.08.2026
 * abgelegt hat.
 *
 * Sie stehen hier als Anker, nicht als Datenquelle: Ein Unit-Test kann die
 * Datenbank nicht lesen, und ein Test, der nur die Ableitung gegen sich selbst
 * prüft, prüft nichts. Alle fünf Werte sind gegen den Bericht abgeglichen — die
 * Summe der fünf Teilbeträge (500,0 + 1.093,5 + 395,2 + 45,7 + 3.191,4)
 * ergibt exakt das Programmvolumen von 5.225,8 Mio €, und die Kreissumme über
 * 400 Kreise trifft dieselben 5.225,8.
 */
const ZEILEN_2025: BundZeile[] = [
  { programm: HEIZUNGSFOERDERUNG, verwendungszweck: "", anzahl: 375475, volumen_mio: 5225.8 },
  { programm: HEIZUNGSFOERDERUNG, verwendungszweck: VWZ_BASIS, anzahl: 314049, volumen_mio: 3191.4 },
  { programm: HEIZUNGSFOERDERUNG, verwendungszweck: VWZ_KLIMABONUS, anzahl: 212700, volumen_mio: 1093.5 },
  { programm: HEIZUNGSFOERDERUNG, verwendungszweck: VWZ_EINKOMMENSBONUS, anzahl: 74393, volumen_mio: 500.0 },
  { programm: HEIZUNGSFOERDERUNG, verwendungszweck: VWZ_EFFIZIENZBONUS, anzahl: 230834, volumen_mio: 395.2 },
];
const JG_2025 = { jahr: 2025, stichtag: "2025-12-31" };

describe("Die Ableitung", () => {
  const d = ausZeilen(JG_2025, ZEILEN_2025)!;

  it("rechnet den Durchschnitt gegen die ZUSAGEN", () => {
    // Nicht gegen die Maßnahmen: Beide Zahlen stehen im Bericht, sie sind
    // verschieden (375.475 gegen 314.049), und über Kreuz gerechnet käme ein
    // Betrag heraus, den es nirgends gibt.
    expect(d.schnittJeZusage).toBe(Math.round((5225.8 * 1_000_000) / 375475));
    expect(d.schnittJeZusage).toBe(13918);
  });

  it("rechnet die Bonusanteile gegen die MASSNAHMEN mit Grundförderung", () => {
    const klima = d.boni.find((b) => b.name === "Klimageschwindigkeits-Bonus")!;
    expect(klima.massnahmen).toBe(212700);
    expect(klima.anteil).toBeCloseTo(212700 / 314049, 6);
    expect(Math.round(klima.anteil * 100)).toBe(68);
  });

  it("zeigt nur Boni, die es HEUTE noch gibt", () => {
    // Der Effizienzbonus ist mit der Neufassung der Förderrichtlinie vom
    // 17.07.2026 entfallen — das Merkblatt 458 nennt als Boni nur noch
    // Klimageschwindigkeits- und Einkommensbonus. Ihn in die Reihe „so oft kam
    // der Bonus zum Tragen" zu stellen hieße, jemandem einen Zuschuss in
    // Aussicht zu stellen, den es nicht mehr gibt.
    expect(d.boni.map((b) => b.name)).toEqual(["Klimageschwindigkeits-Bonus", "Einkommens-Bonus"]);
    // Er verschwindet aber nicht: Er erklärt, warum der Durchschnitt von 2025
    // über dem liegt, was heute herauskäme — und steht deshalb als Vorbehalt da.
    expect(d.effizienzbonus).not.toBeNull();
  });

  it("sortiert die Boni nach Häufigkeit, nicht nach Reihenfolge im Bericht", () => {
    expect(d.boni[0].anteil).toBeGreaterThan(d.boni[1].anteil);
  });
});

describe("Die Unterdrückungsschwelle", () => {
  it("lässt keine Zahl unter zehn durch — auch keine, die in der Datenbank steht", () => {
    // Doppelt gesichert. Der Einlese-Lauf legt eine unterdrückte Zelle schon
    // als „unbekannt" ab; hier steht die Schranke ein zweites Mal, weil eine
    // Zahl aus der Datenbank nicht beweist, WIE sie dorthin kam.
    expect(sichtbareAnzahl(9)).toBeNull();
    expect(sichtbareAnzahl(1)).toBeNull();
    expect(sichtbareAnzahl(0)).toBeNull();
    expect(sichtbareAnzahl(10)).toBe(10);
    expect(sichtbareAnzahl(null)).toBeNull();
    expect(sichtbareAnzahl(undefined)).toBeNull();
  });

  it("gibt keine Bonuszahl aus, die unter der Schwelle liegt", () => {
    const wenig = ZEILEN_2025.map((z) =>
      z.verwendungszweck === VWZ_EINKOMMENSBONUS ? { ...z, anzahl: 4 } : z,
    );
    const d = ausZeilen(JG_2025, wenig)!;
    expect(d.boni.map((b) => b.name)).toEqual(["Klimageschwindigkeits-Bonus"]);
  });
});

describe("Kein Nenner in der Fläche", () => {
  /**
   * Unsere eigene Konvention verlangt, dass jede Pro-Kopf-Zahl ihren Nenner
   * sichtbar trägt — genau das macht sie umkehrbar: „14,2 je 1.000 Einwohner,
   * Bezugsgröße 57.000" IST die Rohzahl mit einem Zwischenschritt. Bei dieser
   * Quelle kollidiert das mit der Unterdrückungsschwelle der KfW.
   *
   * Die Auflösung ist keine Formulierungsregel, sondern eine Bauweise: Es gibt
   * überhaupt keinen Weg, mehrere Kreise auf einmal zu bekommen, und zu einem
   * einzelnen Kreis keine Bezugsgröße. Was hier nicht herauskommt, kann keine
   * Oberfläche zeigen — und der nächste, der eine Karte daraus bauen will, muss
   * die Entscheidung neu treffen statt sie zu umgehen.
   */
  const leseModul = readFileSync(join(ROOT, "lib", "kfw-foerderdaten.ts"), "utf8");
  const kreisRoute = readFileSync(join(ROOT, "app", "api", "kfw", "kreis", "route.ts"), "utf8");

  it("die Leseschicht liefert immer nur EINEN Kreis", () => {
    // Kein `in(...)`, kein `like` auf dem Gebietsschlüssel, kein Abruf ohne
    // Gleichheitsbedingung — jede dieser Bauformen wäre die flächendeckende
    // Abfrage, gegen die diese Regel steht.
    expect(leseModul).toMatch(/\.eq\("region_id", regionId\)/);
    expect(leseModul).not.toMatch(/kfw_report_kreis[\s\S]{0,400}\.in\(/);
    expect(leseModul).not.toMatch(/kfw_report_kreis[\s\S]{0,400}\.like\(/);
  });

  it("die Route nimmt genau einen Ortsschlüssel entgegen", () => {
    expect(kreisRoute).toMatch(/searchParams\.get\("ags"\)/);
    // Kein zweiter Parameter, über den sich eine Liste holen ließe.
    const parameter = [...kreisRoute.matchAll(/searchParams\.get\("(\w+)"\)/g)].map((m) => m[1]);
    expect(parameter).toEqual(["ags"]);
  });

  it("zu einem Kreis wird keine Bezugsgröße herausgegeben", () => {
    // Einwohnerzahl, Fläche, Anteile — nichts davon. Mit einer Bezugsgröße
    // wäre eine unterdrückte Zelle über die Differenz rekonstruierbar.
    expect(kreisRoute).not.toMatch(/population|einwohner|flaeche|anteil/i);
  });
});

describe("Die Quellenzeile", () => {
  it("steht im vorgeschriebenen Wortlaut, mit Jahrgang und eigenem Stichtag", () => {
    // Die Erlaubnis der KfW steht unter Quellenvorbehalt; „Eigene Berechnung"
    // ist Pflicht, weil das Änderungsverbot von der Newsroom-Ausnahme nicht
    // aufgehoben wird. Beides sind Auflagen, keine Formulierungen.
    expect(kfwQuellenzeile(2025, "2025-12-31")).toBe(
      "Quelle: KfW-Förderreport 2025, Stichtag 31.12.2025, KfW Bankengruppe. Eigene Berechnung.",
    );
    expect(kfwQuellenzeile(2024, "2024-12-31")).toBe(
      "Quelle: KfW-Förderreport 2024, Stichtag 31.12.2024, KfW Bankengruppe. Eigene Berechnung.",
    );
  });

  it("die Karte zeigt sie IMMER — nicht hinter einem Schalter", () => {
    const karte = readFileSync(join(ROOT, "components", "KfwFoerderpraxis.tsx"), "utf8");
    expect(karte).toMatch(/kfwQuellenzeile\(d\.jahr, d\.stichtagIso\)/);
    // Sie darf an keiner Bedingung hängen — auch nicht am Marken-Schalter,
    // den Embeds kennen.
    expect(karte).not.toMatch(/branding[\s\S]{0,200}kfwQuellenzeile/);
  });

  it("sagt bei den Bonusanteilen, dass sie keine Wahrscheinlichkeit sind", () => {
    // Auf dem Förder-Ratgeber steht diese Karte unmittelbar neben den
    // ANSPRUCHSVORAUSSETZUNGEN. Nebeneinander liest sich „68 %" leicht als
    // „so wahrscheinlich ist es bei mir" — gemessen wurde aber, wer den Bonus
    // bekommen HAT. Wer daraus seine eigene Chance ableitet, hat sich
    // verrechnet, und die Seite hätte ihn dazu eingeladen.
    const karte = readFileSync(join(ROOT, "components", "KfwFoerderpraxis.tsx"), "utf8");
    expect(karte).toMatch(/Beobachtung, keine Wahrscheinlichkeit/);
    // Und die Bedingungen, an denen es wirklich hängt, werden benannt — sonst
    // ist der Satz eine Warnung ohne Ausweg.
    expect(karte).toMatch(/alte[\s\S]{0,40}Heizung/);
    expect(karte).toMatch(/Einkommen/);
    expect(karte).toMatch(/selbst dort wohnst/);
  });

  it("nennt die KfW nicht als Mitwirkende", () => {
    const karte = readFileSync(join(ROOT, "components", "KfwFoerderpraxis.tsx"), "utf8");
    expect(karte).not.toMatch(/in Zusammenarbeit|gemeinsam mit der KfW|mit freundlicher/i);
  });
});

describe("Realitäts-Anker: unsere Förderrechnung gegen den Bundesdurchschnitt", () => {
  /**
   * Der eigentliche Grund, diese Zahlen überhaupt zu holen — MIT seiner Grenze.
   *
   * Über 2.100 Tests prüfen unsere Rechnung gegen sich selbst. Der Förderreport
   * ist die erste unabhängige Messung derselben Größe: was der Bund für einen
   * Heizungstausch tatsächlich ausgezahlt hat.
   *
   * ────────────────────────────────────────────────────────────────────────
   * WAS DIESER TEST NICHT IST: ein Genauigkeitsnachweis
   * ────────────────────────────────────────────────────────────────────────
   *
   * Die beiden Zahlen messen nicht dasselbe. Unsere sind EIN Fall — 130 m²,
   * teilsaniert, Luft/Wasser, Selbstnutzer mit alter fossiler Heizung. Die des
   * Bundes ist der MITTELWERT über alle Zusagen: über Gebäudegrößen,
   * Einkommensstufen und Heiztechniken.
   *
   * Die Vermischung der Techniken ist aus dieser Quelle NICHT zu beheben, und
   * das ist nachgesehen, nicht vermutet: Der Bericht schlüsselt die
   * Heizungsförderung nach Verwendungszwecken auf — Basisförderung und die
   * einzelnen Boni —, nicht nach Wärmeerzeuger. Eine Kreuztabelle Technik ×
   * Betrag gibt es nirgends in ihm. Wer sich die Wärmepumpen-Teilmenge über
   * einen Bonus zusammenreimt, macht denselben Fehler wie mit der kursierenden
   * 87-Prozent-Quote.
   *
   * Dazu kommt: Der Wert stammt aus einem Jahr MIT Effizienzbonus, den es heute
   * nicht mehr gibt — er liegt deshalb über dem, was dieselbe Anlage heute
   * bekäme.
   *
   * ────────────────────────────────────────────────────────────────────────
   * WENN ER ROT WIRD: ZUERST DEN BUNDESSCHNITT VERDÄCHTIGEN
   * ────────────────────────────────────────────────────────────────────────
   *
   * Er kann rot werden, ohne dass an unserem Modell etwas falsch ist — es
   * genügt, dass sich die Zusammensetzung der Bewilligungen verschiebt oder die
   * KfW im nächsten Jahrgang anders abgrenzt. Wer hier ansetzt, prüft in dieser
   * Reihenfolge: (1) Hat sich der Bundeswert verschoben, und wodurch? (2) Hat
   * sich die Förderstufe geändert (BEG_FAHRPLAN)? Erst danach (3) unsere
   * Rechnung. Andersherum sucht man am falschen Ende.
   *
   * Ein enger Korridor wäre bei dieser Streuung eine Scheingenauigkeit. Was der
   * Test fängt, ist die Größenordnung: ein Vorzeichenfehler, ein vergessener
   * Deckel, ein doppelt gezählter Bonus. Gemessen am 26.08.2026: 12.880 € gegen
   * 13.918 €, Verhältnis 0,93.
   */
  const REFERENZ_WOHNFLAECHE = 130;
  const REFERENZ_DAEMMUNG = 1; // teilsaniert
  const SCHNITT_2025 = 13918; // €, aus ZEILEN_2025 abgeleitet

  const heizlast = calcHeatLoad("bestand", REFERENZ_WOHNFLAECHE, REFERENZ_DAEMMUNG, 1);
  const investBrutto = calcInvestBrutto("lwwp", heizlast, false);
  // Der Regelfall des Rechners: selbstnutzender Eigentümer, alte fossile
  // Heizung, kein Einkommens-Bonus.
  const beg = calcBegSubsidy("bestand", "lwwp", investBrutto, { klimaBonus: true });

  it("belegt die Größenordnung — nicht die Richtigkeit im Einzelfall", () => {
    const verhaeltnis = beg.amount / SCHNITT_2025;
    expect(verhaeltnis).toBeGreaterThan(0.6);
    expect(verhaeltnis).toBeLessThan(1.6);
  });

  it("und der Bericht gibt keine engere Prüfung her — es gibt keine Technik-Spalte", () => {
    // Nachgesehen, nicht vermutet: Die Verwendungszwecke sind Basisförderung
    // und Boni. Gäbe es eine nach Wärmeerzeuger, ließe sich gegen die
    // Wärmepumpen-Teilmenge prüfen statt gegen den Gesamtschnitt — und dieser
    // Test dürfte enger werden. Solange diese Zusicherung hält, darf niemand
    // den Korridor verschärfen und dabei glauben, er vergleiche dieselbe Technik.
    const vwz = ZEILEN_2025.map((z) => z.verwendungszweck);
    expect(vwz.some((v) => /wärmepumpe|biomasse|solarthermie|wärmenetz/i.test(v))).toBe(false);
  });

  it("bleibt unter dem Höchstbetrag, den die Richtlinie zulässt", () => {
    expect(beg.amount).toBeLessThanOrEqual(investBrutto);
    expect(beg.rate).toBeLessThanOrEqual(0.8);
  });

  it("der Anker selbst stimmt mit den abgelegten Zahlen überein", () => {
    // Sonst prüft der Test oben gegen eine Zahl, die niemand mehr nachvollzieht.
    expect(ausZeilen(JG_2025, ZEILEN_2025)!.schnittJeZusage).toBe(SCHNITT_2025);
  });
});

describe("Der Stand", () => {
  it("nennt den Stichtag des jüngsten eingelesenen Jahrgangs", () => {
    expect(KFW_REPORT_STAND.wertIso).toBe(JG_2025.stichtag);
  });

  it("ist ein echtes Datum und nicht die Uhr", () => {
    // Ein mitlaufendes Datum behauptet eine Prüfung, die nie stattgefunden hat.
    const modul = readFileSync(join(ROOT, "lib", "kfw-format.ts"), "utf8");
    expect(modul).not.toMatch(/new Date\(\)/);
    expect(KFW_REPORT_STAND.geprueftIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
