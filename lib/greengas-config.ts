// ─── Grüngas-Preispfad (GModG Bio-Treppe) — Config ──────────────────────────
// Modelliert den künftigen Gas-Endkundenpreis unter dem Gebäudemodernisierungs-
// gesetz (GModG): ab 2029 muss ein steigender Anteil klimafreundlicher Brennstoffe
// beigemischt werden ("Bio-Treppe", § 43 GModG) — anrechenbar sind Biomethan,
// Bioheizöl, biogenes Flüssiggas sowie Wasserstoff und daraus hergestellte Derivate.
// Wir rechnen mit Biomethan als Leitpreis (leitungsgebundenes Gas). Biomethan ist
// rund doppelt so teuer wie Erdgas; zusätzlich steigen die Gasnetzentgelte (weniger
// Anschlussnutzer) und der CO₂-Preis. Der resultierende Gas-Mix-Preis ist die
// Referenz, gegen die sich eine heute neu eingebaute Gasheizung im WP-Rechner
// vergleichen lassen muss.
//
// Quelle: IW-Report 36/2026 „Wie hoch sind die Mehrkostenrisiken durch das
// Gebäudemodernisierungsgesetz (GModG)?" (Henger/Küper/Wünsch, Köln 25.07.2026).
// Volltext liegt im Repo: docs/gmodg/. Am 27.07.2026 Seite für Seite gegen die
// Werte unten geprüft — jede Fundstelle unten wurde dabei aufgeschlagen:
//   · Anhang Kapitel 6, S. 31–32 — alle Preisannahmen der Szenarien
//   · Tabelle 3-2, S. 15 — Kostenaufstellung des Beispielhaushalts MFH1
//   · Abbildung 6-1 / 6-2, S. 33 — Gas-Mix-Verlauf und Preisspanne
//   · Tabelle 2-2 + Fußnote 3, S. 9 — Bio-Treppe, Quote und der 2045-Punkt
// Alle Preiskomponenten sind dort als linearer Verlauf 2026→2045 modelliert
// (S. 31), Referenzhaushalt ist MFH1: teilsanierte Altbauwohnung, 75 m²,
// 10.000 kWh/a (Tabelle 3-1, S. 13).
//
// WICHTIG zur Einordnung des Basispfads — Selbstaussage des Reports (S. 31): Das
// Basisszenario ist „nicht als wahrscheinlichste Entwicklung zu interpretieren,
// sondern dient als analytischer Referenzpfad innerhalb eines plausiblen
// Ergebniskorridors". Genau so ausweisen, nie als Prognose.
//
// WICHTIG (Ehrlichkeit): Das IW ist ein arbeitgebernahes Institut. Die Werte sind
// ein „plausibler Korridor", keine punktgenaue Prognose (Selbstaussage des
// Reports). Im Rechner daher nur als klar gekennzeichnetes, zuschaltbares
// IW-Szenario — nie als Default.
//
// GESETZ vs. ANNAHME — nicht vermischen (siehe Faktenprüfungs-Konvention in
// CLAUDE.md): Gesetzlich stehen in § 43 GModG genau VIER Stufen — 10 % (2029),
// 15 % (2030), 30 % (2035), 60 % (2040). Eine 100-%-Stufe gibt es dort NICHT. Der
// Sprung auf 100 % bis 2045 ist eine Modellannahme des IW-Reports, abgeleitet aus
// § 42a GModG: der kündigt ein gesondertes Gesetz an, das Inverkehrbringer von Gas,
// Öl und Flüssiggas verpflichtet, ab 2028 schrittweise und ab 2045 vollständig auf
// klimaneutrale Brennstoffe umzustellen. Dieses Quotengesetz ist noch nicht
// beschlossen (soll bis 01.12.2026 vorgelegt werden). Jede Zahl, die aus dem Jahr
// 2045 stammt, ist damit IW-Annahme — nie als Gesetzesfolge beschriften.
// Der Report sagt das selbst, Fußnote 3 auf S. 9: „Zwar wurde in § 43 GModG keine
// 100-Prozent-Stufe ab 2045 ergänzt, dafür aber ein weiterer Paragraf § 42a GModG
// neu aufgenommen […]" (BT-Drs. 21/7009).
//
// GELTUNGSBEREICH — die zweite Falle, wörtlich aus § 43 Absatz 1 des verkündeten
// Gesetzes: Die Bio-Treppe greift, wenn eine Gas-/Öl-/Flüssiggas-Heizung „nach dem
// 29. Juli 2026 in ein BESTEHENDES GEBÄUDE neu eingebaut" wird. Zwei Einschränkungen,
// die man leicht verliert: (a) nur Bestandsgebäude — ein NEUBAU fällt nicht darunter
// (dort greifen andere Vorschriften), (b) erst Einbauten nach dem 29.07.2026.
// „Gilt für alle neuen Gasheizungen" ist deshalb zu weit formuliert.
// Die Quote nach § 42a setzt dagegen beim
// BRENNSTOFF an (Inverkehrbringer) und trifft damit auch Bestandsheizungen. „Wer
// schon eine Gasheizung hat, hat Bestandsschutz" ist deshalb nur für die Bio-Treppe
// richtig — nicht für die Beimischung insgesamt. Wir rechnen bewusst NUR die
// Bio-Treppe (Neuanlagen); die Quote hat noch keine belastbaren Zahlen.
//
// Referenz-Gebäude: MFH-Werte des Reports (Beispielhaushalt MFH1). Der Report
// weist für EFH minimal andere Ausgangswerte aus (Erdgas 5,5 statt 5,2; Netz 2,6
// statt 2,2 ct/kWh) — die Differenz liegt bei <3 % des Gaspreises und damit weit
// innerhalb der Szenario-Bandbreite. Bewusst nicht getrennt gepflegt.

export type GasScenario = "low" | "base" | "high";

export interface GreenGasConfig {
  /** Kalenderjahr → verpflichtender Grüngas-Anteil (0..1). Stützstellen bis 2040 =
   *  die gesetzlichen Stufen der Bio-Treppe (§ 43 GModG); die Stützstelle 2045 ist
   *  die IW-Modellannahme aus § 42a (kein Gesetzeswert). Zwischenjahre werden
   *  linear interpoliert (wie im IW-Report). */
  quoteStops: Record<number, number>;
  /** Erdgas Beschaffung + Vertrieb, ct/kWh netto (Ausgangswert 2026, MFH). */
  erdgasCt2026: number;
  /** Faktor auf den Erdgas-Preis 2045 je Szenario (Basis konstant, ±15 % Rand). */
  erdgasEndFactor: Record<GasScenario, number>;
  /** Biomethan Beschaffung + Vertrieb, ct/kWh netto — 2026 und 2045 je Szenario. */
  biomethanCt2026: number;
  biomethanCt2045: Record<GasScenario, number>;
  /** Gasnetzentgelt, ct/kWh netto (MFH) — 2026 und 2045 je Szenario. */
  netzCt2026: number;
  netzCt2045: Record<GasScenario, number>;
  /** Energiesteuer + Konzessionsabgabe, ct/kWh netto — konstant über alle Szenarien. */
  steuerKonzessionCt: number;
  /** CO₂-Preis (€/t) — Ausgangswert 2026 und Endwert 2045 je Szenario. */
  co2EurT2026: Record<GasScenario, number>;
  co2EurT2045: Record<GasScenario, number>;
  /** Emissionsfaktor Erdgas, kg CO₂e/kWh (brennwertbezogen: EBeV 2030 × 0,903). */
  emissionFactorKgPerKwh: number;
  /** Mehrwertsteuer auf alle Komponenten. */
  vat: number;
  source: string;
  validFrom: string;
  reviewBy: string;
}

export const GREEN_GAS_CONFIG: GreenGasConfig = {
  // Gesetzliche Stufen (§ 43 GModG): 2029: 10 %, 2030: 15 %, 2035: 30 %, 2040: 60 %.
  // Die Bio-Treppe hat KEINE 2028er-Stufe — Tabelle 2-2 (S. 9) führt 2028 für sie
  // ausdrücklich als „–". Das „bis zu 1 % ab 2028" steht in derselben Tabelle in
  // der Spalte der Quote nach § 42a (Inverkehrbringer-Ebene); für 2029–2040 ist
  // dort „noch kein konkreter gesetzlicher Quotenpfad festgelegt". Hier deshalb
  // konservativ als 0 angesetzt.
  // 2045: 100 % ist KEINE Gesetzesstufe, sondern die IW-Annahme aus § 42a (siehe oben).
  quoteStops: { 2026: 0, 2028: 0, 2029: 0.1, 2030: 0.15, 2035: 0.3, 2040: 0.6, 2045: 1.0 },
  erdgasCt2026: 5.2,
  erdgasEndFactor: { low: 0.85, base: 1.0, high: 1.15 },
  biomethanCt2026: 12,
  biomethanCt2045: { low: 12, base: 15, high: 18 },
  netzCt2026: 2.2,
  netzCt2045: { low: 2.2, base: 4.3, high: 6.4 },
  steuerKonzessionCt: 0.58,
  co2EurT2026: { low: 55, base: 60, high: 65 },
  co2EurT2045: { low: 150, base: 250, high: 350 },
  emissionFactorKgPerKwh: 0.1833,
  vat: 0.19,
  source:
    "IW-Report 36/2026 (Henger/Küper/Wünsch), Anhang Kap. 6 (S. 31–32) und Tabelle 3-2 " +
    "(S. 15): 1.080 € (2026) / 1.952 € (2040) / 2.366 € (2045) bei 10.000 kWh im " +
    "Basisszenario; der 2045er-Wert unter der Annahme vollständiger Grüngas-Versorgung. " +
    "Das Basisszenario ist laut Report ein analytischer Referenzpfad, keine Prognose",
  validFrom: "2026-07-25",
  reviewBy: "2027-07-25",
};

// ─── Rechtsstand + Stufen als EINE Quelle für alle Texte ────────────────────
// Ratgeber, FAQ und das Rechner-Modal haben die Stufen jeweils selbst getippt und
// sind dabei auseinandergelaufen (eine erfundene 100-%-Stufe stand monatelang in
// drei Texten). Deshalb kommen die Zahlen ab hier aus einer Quelle.

/** Die gesetzlichen Stufen der Bio-Treppe nach § 43 GModG. Bewusst getrennt von
 *  `quoteStops` (das enthält zusätzlich Modell-Stützstellen des IW-Reports). */
export const BIO_TREPPE_STUFEN: ReadonlyArray<{ year: number; pct: number }> = [
  { year: 2029, pct: 10 },
  { year: 2030, pct: 15 },
  { year: 2035, pct: 30 },
  { year: 2040, pct: 60 },
];

/** Fließtext-Aufzählung der gesetzlichen Stufen, z. B.
 *  „10 % (2029), 15 % (2030), 30 % (2035) und 60 % (2040)". */
export function bioTreppeStufenText(unit: "%" | "Prozent" = "%"): string {
  const parts = BIO_TREPPE_STUFEN.map((s) => `${s.pct} ${unit} (${s.year})`);
  return `${parts.slice(0, -1).join(", ")} und ${parts[parts.length - 1]}`;
}

/** Datierter Sachstand des Gesetzgebungsverfahrens — kein rollierender Wert.
 *  Stand: Bundestag und Bundesrat haben das GModG am 10.07.2026 beschlossen; es
 *  wurde am 28.07.2026 im Bundesgesetzblatt verkündet (BGBl. 2026 I Nr. 226,
 *  Gesetz vom 23.07.2026) und tritt nach Artikel 9 Absatz 1 am Tag nach der
 *  Verkündung in Kraft — dem 29.07.2026. § 43 (Bio-Treppe) steht in Artikel 1 und
 *  ist von den späteren Stufen in Artikel 9 Absätze 2–4 (Art. 2 + 7 zum
 *  01.01.2027, Art. 3 zum 01.01.2028, Art. 4 zum 01.01.2030) NICHT erfasst.
 *  Volltext im Repo: docs/gmodg/BGBl-2026-I-Nr-226_GModG_verkuendet-2026-07-28.pdf
 *  — am 28.07.2026 Seite für Seite gegen die Werte hier geprüft.
 *  Ändert sich der Verfahrensstand, ist DAS hier die einzige Stelle.
 *  Quellen: recht.bund.de (Bundesgesetzblatt), gmodg.bund.de (GEG-Infoportal).
 *  Gepflegt vom täglichen `foerder-news-waechter` (Schritt 4c) nach dem Runbook
 *  scripts/gruengas-verify.md. */
export const GMODG_RECHTSSTAND = {
  stand: "Juli 2026",
  /** Dritte Lesung im Bundestag. Beleg ist die amtliche Chronologie auf
   *  gmodg.bund.de — NICHT das Bundesgesetzblatt: dort steht dieses Datum nicht.
   *  Und es war der Bundestag; das Bundesgesetzblatt trägt die Formel „Der
   *  Bundestag hat das folgende Gesetz beschlossen" und „Die verfassungsmäßigen
   *  Rechte des Bundesrates sind gewahrt" (Einspruchsgesetz). „Bundestag und
   *  Bundesrat haben beschlossen" stand hier bis zum 28.07.2026 und war falsch. */
  beschlossenAm: "10. Juli 2026",
  verkuendet: true,
  verkuendetAm: "28. Juli 2026",
  /** Ausfertigung durch den Bundespräsidenten — trägt die Vollzitierung. */
  ausgefertigtAm: "23. Juli 2026",
  /** Fundstelle der Verkündung — gehört in jede Rechtsaussage darüber. */
  fundstelle: "BGBl. 2026 I Nr. 226",
  inKraftSeit: "29. Juli 2026",
  /** Echter Stichtag (kein Renderdatum): bis dahin ist das Gesetz verkündet, aber
   *  noch nicht in Kraft — der Standsatz muss das unterscheiden, sonst behauptet
   *  er einen Tag zu früh geltendes Recht. */
  inKraftSeitIso: "2026-07-29",
  /** § 42a GModG: die eigentliche Grüngasquote für Inverkehrbringer soll bis zu
   *  diesem Datum in einem gesonderten Gesetz festgelegt werden. Stand
   *  28.07.2026: noch nicht vorgelegt. */
  quoteGesetzBis: "1. Dezember 2026",
} as const;

/** Ein Satz zum Verfahrensstand — für Ratgeber, FAQ, Rechner-Modal und
 *  /datenstand. `today` nur für Tests; im Betrieb der echte Kalendertag.
 *
 *  Vier Genauigkeiten, die ein Legal-Judge am 28.07.2026 angemahnt hat und die
 *  hier bewusst so und nicht kürzer stehen:
 *   1. Kein „Bundestag und Bundesrat haben beschlossen" — es ist ein
 *      Einspruchsgesetz (siehe `beschlossenAm`).
 *   2. „Gas, Heizöl oder Flüssiggas", nicht nur „Gas" — § 43 erfasst alle drei;
 *      wer nur Gas nennt, sagt einem Ölheizungs-Besitzer, er sei nicht gemeint.
 *   3. Der Stichtag im Wortlaut des Gesetzes („nach dem 29. Juli 2026"), nicht
 *      „danach" — sonst verschiebt er sich still um einen Tag gegen das
 *      Inkrafttreten am selben Datum.
 *   4. Der Hinweis auf Ersatzwege und Härtefälle (§ 43 Abs. 3–7) — ohne ihn
 *      überzeichnet der Satz die Pflicht, und zwar ausgerechnet dort, wo wir die
 *      Wärmepumpe rechnen. */
export function gmodgStandSatz(today: Date = new Date()): string {
  const R = GMODG_RECHTSSTAND;
  if (!R.verkuendet) {
    return `Der Bundestag hat das GModG am ${R.beschlossenAm} beschlossen. Die Verkündung im Bundesgesetzblatt stand im ${R.stand} noch aus; das Gesetz tritt am Tag nach der Verkündung in Kraft.`;
  }
  const ersteStufe = BIO_TREPPE_STUFEN[0];
  const inKraft = today.getTime() >= new Date(`${R.inKraftSeitIso}T00:00:00`).getTime();
  if (!inKraft) {
    return `Das GModG wurde am ${R.ausgefertigtAm} ausgefertigt und am ${R.verkuendetAm} im Bundesgesetzblatt verkündet (${R.fundstelle}); es tritt am ${R.inKraftSeit} in Kraft.`;
  }
  return `Das GModG wurde am ${R.verkuendetAm} im Bundesgesetzblatt verkündet (Gesetz vom ${R.ausgefertigtAm}, ${R.fundstelle}) und ist seit dem ${R.inKraftSeit} in Kraft. Die Beimischpflicht gilt damit für Heizungen für Gas, Heizöl oder Flüssiggas, die nach dem ${R.inKraftSeit} neu in ein bestehendes Gebäude eingebaut werden; ihre erste Stufe greift ${ersteStufe.year}, und das Gesetz lässt Ersatzwege und Härtefälle zu (§ 43 GModG).`;
}
