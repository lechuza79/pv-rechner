// ─── Grüngas-Preispfad (GModG Bio-Treppe) — Config ──────────────────────────
// Modelliert den künftigen Gas-Endkundenpreis unter dem Gebäudemodernisierungs-
// gesetz (GModG): ab 2029 muss ein steigender Anteil klimafreundlicher Brennstoffe
// beigemischt werden ("Bio-Treppe", § 43 GModG) — anrechenbar sind Biomethan,
// Bioöl, biogenes Flüssiggas sowie Wasserstoff und daraus hergestellte Derivate.
// Wir rechnen mit Biomethan als Leitpreis (leitungsgebundenes Gas). Biomethan ist
// rund doppelt so teuer wie Erdgas; zusätzlich steigen die Gasnetzentgelte (weniger
// Anschlussnutzer) und der CO₂-Preis. Der resultierende Gas-Mix-Preis ist die
// Referenz, gegen die sich eine heute neu eingebaute Gasheizung im WP-Rechner
// vergleichen lassen muss.
//
// Quelle: IW-Report 36/2026 „Wie hoch sind die Mehrkostenrisiken durch das
// Gebäudemodernisierungsgesetz (GModG)?" (Henger/Küper/Wünsch, Köln 25.07.2026),
// Anhang Kapitel 6 (Preisszenarien) + Tabelle 3-2. Alle Preiskomponenten sind
// dort als linearer Verlauf 2026→2045 modelliert.
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
//
// GELTUNGSBEREICH — die zweite Falle: Die Bio-Treppe erfasst nur Heizungen, die NACH
// Inkrafttreten des GModG eingebaut werden. Die Quote nach § 42a setzt dagegen beim
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
  // Die Bio-Treppe hat KEINE 2028er-Stufe. Das „bis zu 1 % ab 2028", das in
  // Berichten kursiert, gehört zur Quote nach § 42a (Inverkehrbringer-Ebene) und
  // ist in ihrer Höhe noch nicht gesetzlich festgelegt — hier deshalb konservativ
  // als 0 angesetzt (wie im IW-Report, Abb. 4-3).
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
    "IW-Report 36/2026 (Henger/Küper/Wünsch), Anhang Kap. 6 — Preisszenarien GModG-Gas-Mix, MFH-Referenz",
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
 *  Stand Juli 2026: Bundestag und Bundesrat haben das GModG am 10.07.2026
 *  beschlossen; die Verkündung im Bundesgesetzblatt stand noch aus. Die
 *  Heizungsregeln (inkl. Bio-Treppe) treten unmittelbar mit der Verkündung in
 *  Kraft. Wird die Verkündung nachgezogen, ist DAS hier die einzige Stelle.
 *  Quellen: gmodg.bund.de (GEG-Infoportal, Chronologie), bundesregierung.de.
 *  Gepflegt vom täglichen `foerder-news-waechter` (Schritt 4c) nach dem Runbook
 *  scripts/gruengas-verify.md — ohne den würde `verkuendet: false` still veralten. */
export const GMODG_RECHTSSTAND = {
  stand: "Juli 2026",
  beschlossenAm: "10. Juli 2026",
  verkuendet: false,
  /** § 42a GModG: die eigentliche Grüngasquote für Inverkehrbringer soll bis zu
   *  diesem Datum in einem gesonderten Gesetz festgelegt werden. */
  quoteGesetzBis: "1. Dezember 2026",
} as const;

/** Ein Satz zum Verfahrensstand — für Ratgeber, FAQ und Rechner-Modal. */
export function gmodgStandSatz(): string {
  return GMODG_RECHTSSTAND.verkuendet
    ? `Das GModG wurde am ${GMODG_RECHTSSTAND.beschlossenAm} beschlossen und ist verkündet — die Bio-Treppe ist damit geltendes Recht.`
    : `Bundestag und Bundesrat haben das GModG am ${GMODG_RECHTSSTAND.beschlossenAm} beschlossen. Die Verkündung im Bundesgesetzblatt stand im ${GMODG_RECHTSSTAND.stand} noch aus; die Heizungsregeln gelten unmittelbar ab der Verkündung.`;
}
