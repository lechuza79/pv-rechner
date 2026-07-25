// ─── Grüngas-Preispfad (GModG Bio-Treppe) — Config ──────────────────────────
// Modelliert den künftigen Gas-Endkundenpreis unter dem Gebäudemodernisierungs-
// gesetz (GModG): ab 2029 muss ein steigender Anteil klimaneutraler Gase
// (Biomethan) beigemischt werden ("Bio-Treppe", § 43 GModG). Biomethan ist rund
// doppelt so teuer wie Erdgas; zusätzlich steigen die Gasnetzentgelte (weniger
// Anschlussnutzer) und der CO₂-Preis. Der resultierende Gas-Mix-Preis ist die
// Referenz, gegen die sich eine heute neu eingebaute Gasheizung im WP-Rechner
// vergleichen lassen muss.
//
// Quelle: IW-Report 36/2026 „Wie hoch sind die Mehrkostenrisiken durch das
// Gebäudemodernisierungsgesetz (GModG)?" (Henger/Küper/Wünsch, Köln 25.07.2026),
// Anhang Kapitel 6 (Preisszenarien) + Tabelle 3-2. Alle Preiskomponenten sind
// dort als linearer Verlauf 2026→2045 modelliert; die Bio-Treppe folgt § 43 GModG
// bzw. der GEG-Übergangsregelung.
//
// WICHTIG (Ehrlichkeit): Das IW ist ein arbeitgebernahes Institut, und die
// Grüngasquote ist noch NICHT als eigenes Gesetz beschlossen (muss bis 01.12.2026
// vorgelegt werden). Die Werte sind ein „plausibler Korridor", keine punktgenaue
// Prognose (Selbstaussage des Reports). Im Rechner daher nur als klar
// gekennzeichnetes, zuschaltbares IW-Szenario — nie als Default.
//
// Referenz-Gebäude: MFH-Werte des Reports (Beispielhaushalt MFH1). Der Report
// weist für EFH minimal andere Ausgangswerte aus (Erdgas 5,5 statt 5,2; Netz 2,6
// statt 2,2 ct/kWh) — die Differenz liegt bei <3 % des Gaspreises und damit weit
// innerhalb der Szenario-Bandbreite. Bewusst nicht getrennt gepflegt.

export type GasScenario = "low" | "base" | "high";

export interface GreenGasConfig {
  /** Bio-Treppe (§ 43 GModG): Kalenderjahr → verpflichtender Grüngas-Anteil (0..1).
   *  Stützstellen; Zwischenjahre werden linear interpoliert (wie im IW-Report). */
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
  // Bio-Treppe: 2028 „bis zu 1 %" → als 0 angesetzt (konservativ, wie Abb. 4-3),
  // 2029: 10 %, 2030: 15 %, 2035: 30 %, 2040: 60 %, ab 2045: 100 %.
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
