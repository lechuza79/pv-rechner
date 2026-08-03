// ─── CO2 Price Path Configuration (BEHG national → EU ETS2 market) ───────────
// Single source of truth for the CO2 price (€/t) used in the WP-vs-fossil-fuel
// comparison (calcFuelCost). Anchored to ABSOLUTE calendar years so the
// year→price mapping does NOT silently drift when YEAR (= new Date().getFullYear())
// rolls over. A projection that starts in 2027 must still price the year 2028 at
// the 2028 rate — not at "second projection year" leftovers from a 2026 start.
//
// Legal basis (Stand August 2026) — der Erkenntniszustand ist je Jahr ein anderer
// und darf nicht verschmelzen (Wächter-Gate, Regel 1):
//  - 2026: geltendes Recht. Das BEHG schreibt den Preiskorridor 55–65 €/t fest.
//  - 2027: NOCH NICHT GELTENDES RECHT. Der Koalitionsausschuss hat am 12.05.2026
//    beschlossen, den Korridor auch 2027 bei 55–65 €/t einzufrieren; umgesetzt
//    werden soll das durch das Dritte BEHG-Änderungsgesetz. Das lag am 03.08.2026
//    als REFERENTENENTWURF des BMUKN vor (veröffentlicht 03.07.2026, Länder- und
//    Verbändeanhörung bis 15.07.2026) — ohne Kabinettsbeschluss, ohne Bundestag.
//    Das GELTENDE BEHG knüpft den nationalen Preis für 2027 dagegen an den Preis
//    im europäischen Emissionshandel (EU-ETS 1) an, der derzeit über dem Korridor
//    liegt. Unsere 65 €/t sind damit auch bei einem Scheitern des Entwurfs die
//    vorsichtige Richtung: Sie unterschätzen die fossilen Kosten eher, als sie zu
//    überzeichnen. Wird der Entwurf verabschiedet, ändert sich hier nur der
//    Zustand, nicht der Wert.
//    Beleg: BMUKN, "Referentenentwurf eines Dritten Gesetzes zur Änderung des
//    Brennstoffemissionshandelsgesetzes" (bundesumweltministerium.de).
//  - EU ETS2 (freier Markt) startet 2028 — verschoben von 2027 (EU-Umweltrat
//    05.11.2025). Hat einen Preisstabilitätsmechanismus (Soft-Cap ~45 €/t in
//    2020-Preisen, setzt zusätzliche Zertifikate frei bei Überschreitung) — hier
//    bewusst nicht modelliert.
//
// Wert für das aktuelle Jahr (2026) bewusst am Korridor-BODEN (55) statt an der
// Decke (65) angesetzt: konservativ zugunsten der Gas-Referenz (unterschätzt die
// fossilen Kosten eher, als sie zu überzeichnen).
//
// PRÜFUNG: Jährlich gegen offizielle Prognosen abgleichen — Runbook
// scripts/co2-preis-verify.md. Solange ETS2 nicht mit echten Marktpreisen läuft,
// ist die Kurve ab 2028 eine konservative Schätzung (+8 €/t pro Jahr ab der
// 65er-Korridordecke).

export interface Co2PriceConfig {
  /** Gesetzlich fixierte/bekannte Stützstellen: absolutes Kalenderjahr → €/t. Muss lückenlos sein. */
  anchors: Record<number, number>;
  /** Jährlicher Anstieg in €/t ab dem Jahr nach der letzten Stützstelle (ETS2 freier Markt). */
  annualIncrease: number;
  validFrom: string;  // ISO date — wann die Stützstellen zuletzt verifiziert wurden
  reviewBy: string;   // ISO date — bis wann gegen offizielle Prognosen neu zu prüfen
  source: string;
}

export const CO2_PRICE: Co2PriceConfig = {
  anchors: {
    2026: 55, // BEHG-Korridor-Boden (konservativ; gesetzliche Spanne 55–65)
    2027: 65, // Korridor-Decke; das Einfrieren für 2027 ist erst ein Gesetzentwurf (siehe oben)
  },
  annualIncrease: 8,
  validFrom: "2026-08-03",
  reviewBy: "2027-01-31",
  source: "BEHG für 2026; für 2027 der Gesetzentwurf zum Einfrieren des Korridors (Referentenentwurf 07/2026, noch nicht beschlossen); ab 2028 EU-Emissionshandel (Start 2028, EU-Umweltrat 11/2025) als konservative Forecast-Kurve",
};

/** CO2-Preis in €/t für ein absolutes Kalenderjahr (rollover-sicher). */
export function co2PriceForCalendarYear(year: number, cfg: Co2PriceConfig = CO2_PRICE): number {
  const anchorYears = Object.keys(cfg.anchors).map(Number).sort((a, b) => a - b);
  const firstYear = anchorYears[0];
  const lastYear = anchorYears[anchorYears.length - 1];
  // Vor der ersten Stützstelle: auf den Boden klemmen (sollte real nicht vorkommen).
  if (year <= firstYear) return cfg.anchors[firstYear];
  // Innerhalb der (lückenlosen) Stützstellen: exakter gesetzlicher Wert.
  if (cfg.anchors[year] !== undefined) return cfg.anchors[year];
  // Ab dem Jahr nach der letzten Stützstelle: linearer ETS2-Markt-Anstieg ab Decke.
  return cfg.anchors[lastYear] + (year - lastYear) * cfg.annualIncrease;
}
