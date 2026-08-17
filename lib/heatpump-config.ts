// ─── Heat Pump Configuration ───────────────────────────────────────────────
// All constants for the heat pump calculator, centralized for future admin UI.
// Sources documented in-line so every number is defensible.

import { FUEL_PRICE, INSULATION_BESTAND, INSULATION_NEUBAU, type KennwertArt } from "./constants";

export interface HeatPumpConfig {
  // Specific heating demand (kWh/m²·a) by insulation standard.
  // ABGELEITET aus INSULATION_BESTAND/NEUBAU (lib/constants.ts) — dort pflegen,
  // nicht hier. Quelle: dena Gebäudereport, DIN V 18599, dena-Verbrauchsstudie.
  specDemandBestand: number[];   // unsaniert / teilsaniert / gut saniert / vollsaniert
  specDemandNeubau: number[];    // EnEV 2014 / KfW 55 / KfW 40+
  // Was die Kennwerte oben SIND — Norm-Bedarf oder gemessener Verbrauch. Steuert,
  // ob die Bedarf→Verbrauch-Korrektur greift (lib/heat-consumption.ts). Gleiche
  // Reihenfolge wie specDemand*; Quelle ist INSULATION_BESTAND/NEUBAU.
  specDemandArtBestand: KennwertArt[];
  specDemandArtNeubau: KennwertArt[];
  // Specific HEAT LOAD (W/m²) by insulation standard — for sizing the heat pump.
  // Getrennt vom Jahresbedarf (kWh/m²·a): die Heizlast (kW) bestimmt die
  // Anlagengröße, der Bedarf die Betriebskosten. Ebenfalls abgeleitet aus
  // INSULATION_BESTAND/NEUBAU (Feld heatLoadW).
  specHeatLoadBestand: number[];  // unsaniert / teilsaniert / gut saniert / vollsaniert
  specHeatLoadNeubau: number[];   // EnEV / KfW 55 / KfW 40+
  // Reale Auslegung: Wärmepumpen werden monoenergetisch meist auf ~85 % der
  // Norm-Heizlast ausgelegt (E-Heizstab deckt die wenigen kältesten Tage).
  auslegungsfaktor: number;
  // Warm water demand per person (kWh/a)
  // Source: Verbraucherzentrale, DIN V 18599
  wwPerPerson: number;
  // JAZ linear model coefficients: JAZ = a − b × T_flow(°C)
  // Source: Fraunhofer ISE "WPsmart im Bestand" (2018–2021)
  jazLwwp: { a: number; b: number };   // air/water
  jazSwwp: { a: number; b: number };   // brine/water (ground source)
  // Flow temperature by heating system (°C)
  flowTempFbh: number;     // underfloor heating
  flowTempHkNeu: number;   // modern radiators
  flowTempHkAlt: number;   // old radiators
  // Investment: Bruttopreis (inkl. MwSt.) = base + perKw × Heizlast.
  // Quelle LWWP: Verbraucherzentrale Rheinland-Pfalz, „Luft-Wasser-Wärmepumpen:
  // Eine Auswertung von 160 Angeboten aus Rheinland-Pfalz" (Juni 2025) — echte
  // Angebote an Ein-/Zweifamilienhäuser im Bestand, siehe Kalibrierung unten.
  investLwwpBase: number;
  investLwwpPerKw: number;
  investSwwpBase: number;
  investSwwpPerKw: number;
  // Radiator replacement cost (triggered when old radiators selected)
  heizkoerperTauschKosten: number;
  // BEG funding rates — KfW Merkblatt Nr. 458 (BEG EM), gültig ab 21.07.2026 (GmodG)
  //
  // OFFEN (bis 01/2027): Zwei dieser Werte sinken am 01.02.2027 planmäßig — der
  // Termin und die Schrittweite stehen bereits im Merkblatt, nicht erst in einer
  // künftigen Ankündigung. Ohne diese Frist stünden ab dem 01.02.2027 zwei zu
  // hohe Förderwerte im Rechner, bis der Quartals-Wächter zufällig darüber läuft;
  // der Frist-Test (lib/__tests__/offene-punkte-waechter.test.ts) schlägt jetzt
  // vorher an. Beide Schritte wiederholen sich danach halbjährlich zum 01.02. und
  // 01.08. — beim Nachziehen also die Frist mitschieben, nicht streichen:
  //   begMaxCap      −750 € je Schritt (28.000 → 27.250 am 01.02.2027)
  //   begKlimaBonus  −4 Prozentpunkte je Schritt (16 % → 12 % am 01.02.2027);
  //                  ab Antragstellung 01.08.2028 entfällt er ganz
  // Maßgeblich ist der Zeitpunkt der Antragstellung. Beleg: KfW-Merkblatt 458,
  // Abschnitte „Klimageschwindigkeitsbonus" und „Obergrenze des Fördersatzes und
  // Höchstbetrag der förderfähigen Gesamtkosten" (am 08.08.2026 im Volltext
  // geprüft). Die Werte selbst bleiben Vorschlag an den Menschen, nicht Auto-Fix
  // (Wächter-Gate, Teil 4: „BEG-Sätze bleiben Vorschlag").
  begGrundfoerderung: number;    // 30% — jeder Heizungstausch im Bestand
  begKlimaBonus: number;         // 16% — Bestand, Austausch funktionsfähige fossile Heizung (Eigennutzer); sinkt ab 01.02.2027
  // Einkommens-Bonus: gestaffelt nach zu versteuerndem Haushaltsjahreseinkommen.
  // Aufsteigend nach maxIncome sortiert; der erste Treffer (income ≤ maxIncome) gilt.
  begEinkommensStaffel: { maxIncome: number; rate: number }[];
  begFamilienzuschlag: number;   // € — hebt die maßgebliche Einkommensgrenze bei ≥1 Kind im Haushalt
  begMaxCap: number;             // Förderhöchstbetrag förderfähige Kosten (1. Wohneinheit); sinkt ab 01.02.2027
  begMaxRate: number;            // Gesamt-Obergrenze Fördersatz (Regelfall) — 70%
  begMaxRateLowIncome: number;   // Gesamt-Obergrenze niedrigstes Einkommen (≤30.000 € bzw. ≤40.000 € mit Kind) — 80%
  // Electricity price (§14a EnWG WP tariff, BDEW 2026)
  wpTarif: number;               // €/kWh
  wpMaintenance: number;         // €/a
  wpFixCostPerYear: number;      // €/a Grundpreis des WP-Stromzählers
  // Grid electricity CO₂ intensity (kg/kWh) for the heat pump's emissions.
  // Konservativ statisch über die Laufzeit — der reale Strommix wird sauberer,
  // d.h. die WP-Einsparung ist eher unterschätzt (kein Schönrechnen).
  gridCo2PerKwh: number;
  // Gas reference costs
  gasPriceCtPerKwh: number;      // ct/kWh
  gasEfficiency: number;          // Brennwert default
  gasCo2PerKwh: number;          // kg CO₂/kWh
  // Grundgebühr der Referenzheizung, €/a — brennstoffabhängig, weil es hier NICHT
  // um einen Preis geht, sondern um einen Posten, den es bei Heizöl gar nicht gibt:
  // Gas kommt über einen Netzanschluss mit Zähler- und Netzgrundpreis, Heizöl aus
  // einem Tank ohne laufende Anschlussgebühr. Bis 28.07.2026 wurde der Gas-Grundpreis
  // auch der Ölheizung aufgeschlagen — 3.600 € über 20 Jahre zugunsten der Wärmepumpe.
  fixCostPerYear: Record<"gas" | "oil", number>;
  gasMaintenance: number;        // €/a
  // € für eine neue fossile Heizung — die Anschaffung, die man sich mit der
  // Wärmepumpe spart. Gilt im Neubau UND im Bestand: Die Alternative zur
  // Wärmepumpe ist nicht eine unsterbliche Altanlage, sondern ein Kessel, der im
  // 20-Jahres-Horizont ersetzt werden muss. Genau dieser Neueinbau löst auch die
  // Bio-Treppe nach § 43 GModG aus — beides gehört zusammen (siehe unten).
  // Im Ergebnis editierbar: Wer eine junge Heizung hat, trägt 0 ein.
  fossilErsatzInvest: number;
  // Horizon for TCO comparison
  years: number;
  // Annual inflation rates
  gasInflation: number;
  stromInflation: number;
  // Source attribution
  source: string;
  validFrom: string;   // ISO date — Stand der Werte selbst (nur hochsetzen, wenn sich ein Wert ändert)
  /**
   * ISO date — Tag, an dem ein Wächter-Lauf die Markt-Quellen zuletzt wirklich
   * erreicht und die Werte nachgelesen hat (Angebotsauswertung, BDEW-Tarife).
   * Bewusst getrennt von `validFrom`: „geprüft und unverändert" ist das
   * Normalergebnis, und genau das trägt dieses Datum. Es wandert bei JEDEM
   * erreichten Lauf mit — aber nur dann; ein Lauf, der an Paywall, 404 oder
   * Bot-Prüfung gescheitert ist, lässt es stehen (scripts/waechter-gate.md →
   * „Das Prüfdatum wandert mit jedem erreichten Lauf").
   * Sichtbar auf /waermepumpe-rechner über lib/stand.ts.
   */
  geprueftIso: string;
  /**
   * ISO date — eigener Prüftag der BEG-Werte. Zwei Daten statt einem, weil es
   * zwei Sachen sind: Die Förderung hängt am KfW-Merkblatt (eigene Quelle,
   * eigener Fahrplan mit der Absenkung zum 01.02.2027) und wird deshalb auch
   * außer der Reihe geprüft — am 08.08.2026 zum Beispiel ohne die Marktwerte.
   * Ein gemeinsames Datum wäre für eines von beiden gelogen.
   */
  geprueftFoerderungIso: string;
  reviewBy: string;    // ISO date — re-check against official sources by then (see scripts/waermepumpe-verify.md)
}

export const DEFAULT_HEATPUMP_CONFIG: HeatPumpConfig = {
  // Aus der Dämmzustands-Tabelle abgeleitet (lib/constants.ts) — eine Quelle für
  // UI-Auswahl und Rechnung, damit Beschriftung und Rechenwert nicht driften können.
  specDemandBestand: INSULATION_BESTAND.map(i => i.specKwh),
  specDemandNeubau: INSULATION_NEUBAU.map(i => i.specKwh),
  specDemandArtBestand: INSULATION_BESTAND.map(i => i.art),
  specDemandArtNeubau: INSULATION_NEUBAU.map(i => i.art),
  specHeatLoadBestand: INSULATION_BESTAND.map(i => i.heatLoadW),
  specHeatLoadNeubau: INSULATION_NEUBAU.map(i => i.heatLoadW),
  auslegungsfaktor: 0.85,
  wwPerPerson: 650,
  jazLwwp: { a: 5.5, b: 0.05 },
  jazSwwp: { a: 6.5, b: 0.05 },
  flowTempFbh: 35,
  flowTempHkNeu: 45,
  flowTempHkAlt: 55,
  // LWWP-Investition, kalibriert an echten Angeboten statt an Portal-Kostenseiten.
  // Quelle: Verbraucherzentrale RLP, Auswertung von 160 Luft-Wasser-Angeboten
  // (Angebote 01.10.2024–09.05.2025, Bruttopreise inkl. MwSt.; Volltext in
  // docs/quellen/VZ-RLP_Auswertung-160-Waermepumpen-Angebote_2025-06.pdf):
  //   Gesamtkosten  Median 34.979 € · Mittelwert 36.279 € (Min 20.228, Max 63.061), S. 4
  //   Leistung      4–18 kW, Median 10 kW, S. 4
  //   Kostenkategorien (Mittelwerte, S. 9): Montage/Lohn 6.997 + Elektro 3.032 +
  //   Fundament 1.507 + hydraulischer Abgleich 1.159 + Warmwasser 2.589 +
  //   Puffer 1.368 = 16.652 € — allesamt NICHT leistungsabhängig.
  // Daraus: Basis 16.500 € (der größenunabhängige Block) und Steigung 1.850 €/kW,
  // so dass der Median-Fall (10 kW) auf den Median-Preis 35.000 € trifft. Der Rest
  // (Aggregat, Material, Marge) skaliert mit der Leistung.
  // Die Nachfolge-Auswertung (VZ RLP, PM vom 02.07.2026, 160 Angebote) bestätigt das
  // Niveau: 21.099–54.168 €, Ø ~36.400 €.
  // WARUM nicht mehr gescrapt: Die frühere Basis (9.500 €) kam aus der
  // taptaphome-Kostenübersicht und ergab für ein kleines Haus ~15.000 € — unter dem
  // GÜNSTIGSTEN von 160 realen Angeboten. Die Quelle beziffert den Einbau mit
  // 3.000–7.500 €, während allein Montage/Elektro/Fundament/Abgleich real ~12.700 €
  // kosten. Ein Korrekturfaktor darauf wäre geraten — deshalb Config + Wächter
  // (scripts/waermepumpe-verify.md), analog zu Sole/Wasser.
  investLwwpBase: 16500,
  investLwwpPerKw: 1850,
  // Sole/Wasser = LWWP-Niveau + Erschließung (Bohrung), abzüglich Außeneinheit/Fundament.
  // Ergibt bei 10 kW 46.000 € (LWWP 35.000 + ~11.000 € Bohrung) — im Marktband für
  // Erdwärme-EFH. Nicht scrapebar (Bohrkosten hängen an Bohrmetern, nicht an kW).
  investSwwpBase: 28000,
  investSwwpPerKw: 1800,
  // Heizkörpertausch: VZ RLP S. 6 — Ø 679 €, Median 642 € je Heizkörper (18 Angebote).
  // Angesetzt sind ~6 kritische Heizkörper (Ziel: Vorlauf 55 → 45 °C), nicht die
  // komplette Heizkörper-Sanierung.
  heizkoerperTauschKosten: 4000,
  begGrundfoerderung: 0.30,
  begKlimaBonus: 0.16,
  begEinkommensStaffel: [
    { maxIncome: 30000, rate: 0.40 },
    { maxIncome: 40000, rate: 0.30 },
    { maxIncome: 50000, rate: 0.10 },
  ],
  begFamilienzuschlag: 10000,
  begMaxCap: 28000,
  begMaxRate: 0.70,
  begMaxRateLowIncome: 0.80,
  wpTarif: 0.24,
  // Wartung der Wärmepumpe 250 €/a und Grundpreis des WP-Stromzählers 50 €/a —
  // beides Verbraucherzentrale RLP (Beispielrechnung 02.06.2025), dieselbe Quelle
  // wie die fossilen Betriebskosten, damit der Vergleich symmetrisch bleibt.
  // Der WP-Grundpreis fehlte bisher ganz, während Gas einen trug — eine Schieflage
  // zugunsten der Wärmepumpe, auch wenn sie klein war (1.000 € über 20 Jahre).
  wpMaintenance: 250,
  wpFixCostPerYear: 50,
  gridCo2PerKwh: 0.38,   // DE-Netzmix 2024, konservativ statisch
  gasPriceCtPerKwh: Math.round(FUEL_PRICE.gas.price * 100), // = 11, aus FUEL_PRICE (Single Source)
  gasEfficiency: 0.95,
  gasCo2PerKwh: FUEL_PRICE.gas.co2PerKwh, // = 0.20, aus FUEL_PRICE

  // Gas: Grund-/Zählerpreis des Netzanschlusses, 165 €/a — Verbraucherzentrale RLP,
  // „Gasheizung oder Wärmepumpe – Ein Vergleich" (Beispielrechnung Stand 02.06.2025,
  // 150-m²-EFH; Volltext docs/quellen/). Öl: 0 — es gibt keinen Anschluss, an dem eine
  // laufende Gebühr hängen könnte (Strukturfrage, kein Preis: der Wert bleibt 0, auch
  // wenn der Gas-Grundpreis steigt).
  // Die WARTUNG bleibt für Gas und Öl gleich: dass eine Ölheizung mit Tankprüfung real
  // teurer ist, ist plausibel, aber unbelegt — beide zitierten Quellen führen Heizöl
  // nicht getrennt. OFFEN (bis 01/2027): Öl-Wartungswert beschaffen oder die
  // Gleichsetzung bestätigen (scripts/waermepumpe-verify.md).
  fixCostPerYear: { gas: 165, oil: 0 },
  // Wartung + Schornsteinfeger der fossilen Heizung, 300 €/a (VZ RLP, ebd.).
  // Fraunhofer ISE setzt in der Kurzstudie zur Bio-Treppe (23.06.2026, S. 15, Quelle
  // BDEW-Heizkostenvergleich) sogar 500 €/a für JEDES System an — wir folgen der
  // differenzierten VZ-Rechnung, die Gas und Wärmepumpe unterscheidet, und liegen
  // damit konservativ unter dem höheren Ansatz.
  gasMaintenance: 300,
  // Komplette neue fossile Heizung inkl. Einbau, brutto. Zwei unabhängige
  // Trägerquellen, die denselben Fall rechnen wie wir (alte Heizung wird ersetzt):
  //   · Fraunhofer ISE, Kurzstudie „Vergleich Wärmeversorgung / Auswirkungen der
  //     Biotreppe in § 43" (23.06.2026, S. 14): Gaskessel EFH 11.400–20.400 €
  //     brutto bei 10 kW (Bandbreite aus dem KWW-Technikkatalog, Q4/2025).
  //     → Mittelwert 15.900 €.
  //   · Verbraucherzentrale RLP, „Gasheizung oder Wärmepumpe – Ein Vergleich"
  //     (02.06.2025): 16.000 € für die neue Gasheizung im 150-m²-EFH.
  // Beide treffen sich bei rund 16.000 €; wir nehmen den Fraunhofer-Mittelwert.
  // Der frühere Wert (12.000 €) stammte aus einer breiten Portal-Spanne und lag am
  // unteren Rand — also zulasten der Wärmepumpe. Für Heizöl setzen wir denselben
  // Betrag an: dass ein Ölkessel mit Tank und Abgasweg teurer ist, ist plausibel,
  // aber keine der beiden Quellen weist Öl getrennt aus.
  // Im Ergebnis editierbar (0 = die vorhandene Heizung hält die Laufzeit durch).
  fossilErsatzInvest: 15900,
  years: 20,
  gasInflation: 0.02,
  stromInflation: 0.02, // p.a. — konsistent mit PV-Rechner (SCENARIOS realistic + electricityIncrease)
  source: "Fraunhofer ISE WPsmart, Verbraucherzentrale RLP (Auswertung 160 Wärmepumpen-Angebote, Juni 2025; bestätigt durch den zweiten Check vom 02.07.2026: Median 34.898 €, Mittelwert 36.397 €, Spanne 21.099–54.168 €), KfW Merkblatt 458 (BEG EM, Stand 07/2026), BDEW, dena-Gebäudereport + dena-Studie „Auswertung von Verbrauchskennwerten energieeffizienter Wohngebäude“ (Heizwärmebedarf nach Sanierung)",
  validFrom: "2026-07-27",
  // Wächter-Lauf vom 17.08.2026 (der erste überhaupt — der Auftrag war seit
  // seiner Einrichtung nie gefeuert): Die Folge-Auswertung der
  // Verbraucherzentrale RLP vom 02.07.2026 im Volltext gelesen und gegen das
  // Modell gerechnet. Median über alle 160 Angebote 34.898 € (Tabelle 1, S. 5;
  // einen Median je Leistungsklasse weist der Bericht nicht aus, die häufigste
  // Klasse 10–12 kW steht separat auf S. 8) gegen unsere 35.000 € im
  // 10-kW-Fall — 0,3 % Abweichung, deshalb kein Wert
  // geändert und `validFrom` unverändert. Genau dafür gibt es dieses Datum.
  geprueftIso: "2026-08-17",
  // Förderung am selben Tag am KfW-Merkblatt 458 (Stand 07/2026) nachgelesen:
  // Grundförderung 30 %, Klimabonus 16 % (sinkt erstmalig 01.02.2027 um 4 pp,
  // ab Antragstellung 01.08.2028 keiner mehr), Einkommensbonus 40/30/10 % bei
  // 30/40/50 T€, Familienzuschlag 10 T€, Förderhöchstbetrag 28.000 € für die
  // erste Wohneinheit (sinkt ab 01.02.2027 halbjährlich um 750 €), Obergrenze
  // 70 % bzw. 80 %. Alles unverändert — damit ist auch der [auto]-Fix vom
  // 08.08.2026 (Wecker für die Absenkung) an der Quelle nachgeprüft.
  geprueftFoerderungIso: "2026-08-17",
  reviewBy: "2026-10-20",   // quartalsweiser Wächter (Jan/Apr/Jul/Okt); der Januar-Lauf 2027 fällt zusätzlich vor die Degression der Boni/Förderhöchstbeträge zum 01.02.2027
};
