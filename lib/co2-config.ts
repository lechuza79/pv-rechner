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
//    werden soll das durch das Dritte BEHG-Änderungsgesetz. Stand 14.08.2026 ist
//    das ein REGIERUNGSENTWURF: Das Bundeskabinett hat ihn am 12.08.2026
//    beschlossen ("Gesetzentwurf der Bundesregierung (Kabinettbeschluss am
//    12. August 2026)", BMUKN-Gesetzesseite; Volltext in docs/quellen/
//    BEHG-3-AendG_Regierungsentwurf_Kabinett_2026-08-12.pdf), am 14.08.2026 ging
//    er als besonders eilbedürftige Vorlage nach Art. 76 Abs. 2 S. 4 GG an den
//    Bundesrat (BR-Drs. 462/26, Fristablauf 25.09.2026). Im Bundestag ist er
//    weder eingebracht noch beschlossen, nicht verkündet, nicht in Kraft.
//    Bis zum 12.08.2026 stand hier "Referentenentwurf, ohne Kabinettsbeschluss" —
//    das ist seit dem Beschluss falsch (Wächter-Gate Regel 1: der Zustand ist eine
//    eigene Änderung mit eigener Fundstelle; Council 3/3 + Legal-Judge 14.08.2026).
//    Wortlaut des Entwurfs, Art. 1 Nr. 4 Buchst. a (§ 10 Abs. 2 S. 4 BEHG-E):
//    "Für die Jahre 2026 und 2027 wird ein Preiskorridor mit einem Mindestpreis
//    von 55 Euro pro Emissionszertifikat und einem Höchstpreis von 65 Euro pro
//    Emissionszertifikat festgelegt."
//    NIE "Bundestag und Bundesrat müssen zustimmen" schreiben: Das BEHG-ÄndG ist
//    ein EINSPRUCHSGESETZ (der Bundesrat führt das 2. BEHG-ÄndG selbst unter
//    "Gesetzeskategorie: Einspruchsgesetz"; der Entwurf enthält keinen
//    Zustimmungstatbestand). Dieselbe Verschärfung ohne Fundstelle wurde beim
//    GModG und beim EEG schon zweimal korrigiert.
//    Das GELTENDE BEHG knüpft den nationalen Preis für 2027 dagegen an den Preis
//    im europäischen Emissionshandel (EU-ETS 1) an, der derzeit über dem Korridor
//    liegt. Unsere 65 €/t sind damit auch bei einem Scheitern des Entwurfs die
//    vorsichtige Richtung: Sie unterschätzen die fossilen Kosten eher, als sie zu
//    überzeichnen. Der Kabinettsbeschluss ändert deshalb den Zustand, nicht den
//    Wert — die Stützstellen sind unverändert.
//
//    OFFEN (bis 11/2026): 2026 und 2027 haben nach dem Entwurf DENSELBEN Korridor
//    (55–65), wir setzen aber 2026 auf den Boden und 2027 auf die Decke. Beide
//    Enden sind je für sich begründet (2026 gegen die eigene Wärmepumpe gerechnet,
//    2027 gegen das Scheitern des Entwurfs) — zusammen gelesen ist es eine
//    Asymmetrie, die niemand aus den Zahlen ablesen kann. Beim nächsten Lauf nach
//    scripts/co2-preis-verify.md entweder auflösen (ein Ende für beide Jahre) oder
//    die Asymmetrie im Methodik-Text ausschreiben. Frist bewusst VOR dem erwarteten
//    Bundestagsbeschluss (Herbst 2026), nicht danach.
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
  validFrom: "2026-08-14",
  // Bewusst VOR dem erwarteten Bundestagsbeschluss (Herbst 2026): Ein Satz, der
  // "Bundestag steht aus" sagt, wird am Tag des Beschlusses von selbst falsch.
  reviewBy: "2026-11-30",
  source: "BEHG für 2026 (Korridor-Boden 55 €/t); für 2027 die Korridor-Decke von 65 €/t aus dem Gesetzentwurf zum Einfrieren des Korridors 55–65 €/t — Regierungsentwurf, vom Bundeskabinett am 12.08.2026 beschlossen, seit 14.08.2026 im Bundesrat (BR-Drs. 462/26), Bundestagsbeschluss und Verkündung stehen aus; ab 2028 EU-Emissionshandel (Start 2028, EU-Umweltrat 11/2025) als konservative Forecast-Kurve",
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
