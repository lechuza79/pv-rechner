// ─── CO2 Price Path Configuration (BEHG national → EU ETS2 market) ───────────
// Single source of truth for the CO2 price (€/t) used in the WP-vs-fossil-fuel
// comparison (calcFuelCost). Anchored to ABSOLUTE calendar years so the
// year→price mapping does NOT silently drift when YEAR (= new Date().getFullYear())
// rolls over. A projection that starts in 2027 must still price the year 2028 at
// the 2028 rate — not at "second projection year" leftovers from a 2026 start.
//
// Legal basis (Stand Juni 2026):
//  - BEHG (nationaler Brennstoffemissionshandel): gesetzlicher Preiskorridor
//    55–65 €/t gilt für 2026 UND 2027 (Koalitionsausschuss 12.05.2026,
//    "CO2-Preis soll 2027 nicht steigen").
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
    2027: 65, // BEHG-Korridor-Decke (für 2027 eingefroren, Koalitionsausschuss 05/2026)
  },
  annualIncrease: 8,
  validFrom: "2026-06-20",
  reviewBy: "2027-01-31",
  source: "BEHG (Koalitionsausschuss 05/2026) + EU ETS2 ab 2028 (EU-Umweltrat 11/2025), konservative Forecast-Kurve",
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
