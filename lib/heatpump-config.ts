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
  // BEG funding rates — die Werte des HEUTIGEN Standes.
  //
  // Quelle ist die Förderrichtlinie BEG EM vom 17.07.2026 (in Kraft ab
  // 21.07.2026, Volltext in docs/quellen/BEG-EM-Richtlinie_2026-07-17.pdf),
  // nicht mehr allein das KfW-Merkblatt 458. Der Grund steht bei BEG_AB_2027:
  // Das Merkblatt kennt den Stichtag Q1/2027 gar nicht, die Richtlinie hat nach
  // ihrer eigenen Nr. 9.1 Vorrang.
  //
  // WAS SICH WANN ÄNDERT, steht nicht mehr als Merksatz hier, sondern als Datum
  // und Wert in BEG_AB_2027 weiter unten — dort, wo der Rechner es auch benutzt.
  // Ein Fristvermerk, der einen Menschen an eine Zahl erinnern soll, ist die
  // schwächere Form davon: Er wirkt erst, wenn jemand ihn liest.
  //
  // Die Werte selbst bleiben Vorschlag an den Menschen, nicht Auto-Fix
  // (Wächter-Gate, Teil 4: „BEG-Sätze bleiben Vorschlag").
  begGrundfoerderung: number;    // 30% — jeder Heizungstausch im Bestand (Nr. 8.4.1 Buchst. c Satz 1)
  begKlimaBonus: number;         // 16% — Bestand, Austausch funktionsfähige fossile Heizung (Eigennutzer); Staffel siehe BEG_KLIMABONUS_STAFFEL
  // Einkommens-Bonus: gestaffelt nach zu versteuerndem Haushaltsjahreseinkommen.
  // Aufsteigend nach maxIncome sortiert; der erste Treffer (income ≤ maxIncome) gilt.
  begEinkommensStaffel: { maxIncome: number; rate: number }[];
  begFamilienzuschlag: number;   // € — hebt die maßgebliche Einkommensgrenze bei ≥1 Kind im Haushalt
  begMaxCap: number;             // Förderhöchstbetrag förderfähige Kosten (1. Wohneinheit); Staffel siehe BEG_FAHRPLAN
  begMaxRate: number;            // Gesamt-Obergrenze Fördersatz (Regelfall) — 70%
  begMaxRateLowIncome: number;   // Gesamt-Obergrenze niedrigstes Einkommen (≤30.000 € bzw. ≤40.000 € mit Kind) — 80%
  /**
   * Kumulierungsgrenze: bis zu welchem Anteil der tatsächlich geförderten Kosten
   * öffentliche Mittel INSGESAMT zusammenkommen dürfen — die Schranke, an der ein
   * kommunaler Zuschuss neben der BEG endet.
   *
   * Wortlaut, KfW-Merkblatt 458 (Stand 07/2026, Volltext in docs/quellen/,
   * Abschnitt „Kombination mit anderen Förderprodukten", am 19.08.2026 gelesen):
   *   „Eine Kumulierung mit anderen öffentlichen Fördermitteln wie Krediten,
   *    Zulagen und Zuschüssen ist bis zu 60 Prozent der geförderten
   *    Investitionskosten möglich. Die Kumulierungsgrenze bezieht sich auf die
   *    tatsächlich geförderten Kosten."
   *
   * DIESER SATZ WAR MEHRDEUTIG — die RICHTLINIE ist es nicht (nachgelesen am
   * 26.08.2026, Nr. 8.6):
   *   „Im Falle einer Kombination mit anderen Fördermitteln gilt eine
   *    Höchstgrenze für die Förderung aus öffentlichen Mitteln
   *    (Kumulierungsgrenze) in Höhe von 60 % der geförderten
   *    Investitionsausgaben. … Die Kumulierung bezieht sich dabei auf die
   *    jeweils tatsächlich geförderten Kosten … Maximal ist der jeweilige
   *    Förderhöchstbetrag zu berücksichtigen."
   * „Höchstgrenze für die Förderung aus öffentlichen Mitteln" ist der ganze
   * Stapel, nicht der Zuwachs neben der BEG. Die strenge Lesart, die hier aus
   * Vorsicht gewählt worden war, ist damit die vom Text getragene — und auch
   * die Bezugsgröße bestätigt sich: die tatsächlich geförderten, also am
   * Höchstbetrag gekappten Kosten. Wer beides künftig anzweifelt, liest Nr. 8.6
   * der Richtlinie, nicht den zusammenfassenden Satz des Merkblatts.
   *
   * WAS DIE RICHTLINIE ANDERS LÖST ALS WIR — ohne Folge für die Summe: Bei
   * Überschreitung wird nach Nr. 8.6 „der Anteil der BEG-Förderung … reduziert",
   * nicht der kommunale Zuschuss. Wir kürzen umgekehrt (siehe
   * begKumulierungsSpielraum), weil der Rechner die BEG als feste Größe zeigt
   * und der kommunale Zuschuss der Posten ist, der hinzukommt. Die
   * GESAMTSUMME — und nur die geht in die Wirtschaftlichkeit ein — ist in beiden
   * Richtungen dieselbe. Wer die Aufteilung je einzeln ausweist, muss das
   * umdrehen.
   *
   * Betroffen ist ohnehin nur, wer über den Einkommens-Bonus über 60 % kommt;
   * im Regelfall (30 % + 16 %) bleibt reichlich Spielraum.
   */
  begKumulierungsGrenze: number; // 60% — Summe aller öffentlichen Mittel
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
  begKumulierungsGrenze: 0.60,
  wpTarif: 0.24,
  // Wartung der Wärmepumpe 250 €/a und Grundpreis des WP-Stromzählers 50 €/a —
  // beides Verbraucherzentrale RLP (Beispielrechnung 02.06.2025), dieselbe Quelle
  // wie die fossilen Betriebskosten, damit der Vergleich symmetrisch bleibt.
  // Der WP-Grundpreis fehlte bisher ganz, während Gas einen trug — eine Schieflage
  // zugunsten der Wärmepumpe, auch wenn sie klein war (1.000 € über 20 Jahre).
  wpMaintenance: 250,
  wpFixCostPerYear: 50,
  gridCo2PerKwh: 0.38,   //  CO2/kWh. BEWUSST ueber dem aktuellen Strommix: Das Umweltbundesamt weist
  // fuer 2023 379 g aus, fuer 2024 353 g und fuer 2025 344 g (CLIMATE CHANGE
  // 16/2026, im Repo unter docs/quellen/). Der Wert bleibt statisch und hoch,
  // weil er zulasten der Waermepumpe wirkt — die vorsichtige Richtung. Bis zum
  // 25.08.2026 stand hier „DE-Netzmix 2024", was schlicht das falsche Jahr nannte
  // und die Absicht verschwieg; die Klima-Config beschriftete dieselbe Zahl
  // wieder anders. Wer ihn senkt, senkt ihn in BEIDEN Configs gemeinsam.
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
  // 26.08.2026: Erstmals gegen die FÖRDERRICHTLINIE selbst geprüft, nicht mehr
  // nur gegen das KfW-Merkblatt — und genau das hat die Lücke aufgedeckt, die
  // das Merkblatt nicht zeigt: die Halbierung des Fördersatzes zum 01.01.2027
  // (Nr. 8.4.1 Buchst. c). Der frühere Wecker als Fristvermerk ist dadurch
  // hinfällig; der Fahrplan steht jetzt als Datum und Wert in BEG_FAHRPLAN.
  // Am selben Tag bestätigt: Grundförderung 30 %, Klimabonus 16 %,
  // Einkommensbonus 40/30/10 % bei 30/40/50 T€, Familienzuschlag 10 T€,
  // Förderhöchstbetrag 28.000 € für die erste Wohneinheit, Obergrenze 70 %
  // bzw. 80 % (Nr. 8.4.1 Satz 1). Kein heutiger Wert geändert.
  geprueftFoerderungIso: "2026-08-26",
  reviewBy: "2026-10-20",   // quartalsweiser Wächter (Jan/Apr/Jul/Okt); der Januar-Lauf 2027 fällt zusätzlich vor die Degression der Boni/Förderhöchstbeträge zum 01.02.2027
};

// ─── Der Fahrplan der BEG-Förderung ────────────────────────────────────────
//
// WARUM DAS EIN PLAN IST UND KEIN EINZELWERT: Die Fördersätze der BEG stehen
// nicht still. Die Richtlinie vom 17.07.2026 schreibt ihre eigene Absenkung
// über die volle Laufzeit im Voraus fest — mit Datum, Schrittweite und
// Endwert. Ein Rechner, der nur den heutigen Wert kennt, zeigt ab dem ersten
// Stichtag stillschweigend einen zu hohen Zuschuss; beim Grundfördersatz wäre
// das ab dem 01.01.2027 der DOPPELTE, in einem üblichen Fall rund 12.900 €
// zu viel. Deshalb dieselbe Bauform wie beim Einspeise-Fahrplan
// (FEED_IN_SCHEDULE in lib/feedin-config.ts): Der Wechsel passiert am Stichtag
// von selbst, nicht erst beim nächsten Deploy.
//
// QUELLE — Förderrichtlinie BEG EM vom 17.07.2026, in Kraft ab 21.07.2026,
// Geltungsdauer bis 31.12.2030 (Nr. 10). Volltext:
// docs/quellen/BEG-EM-Richtlinie_2026-07-17.pdf. Am 26.08.2026 Nummer für
// Nummer im Volltext geprüft; die Fundstellen stehen an jedem Feld.
//
// WARUM NICHT DAS KfW-MERKBLATT: Das Merkblatt 458 (Stand 07/2026) nennt
// schlicht „30 %" ohne den Stichtag. Das ist kein Widerspruch, den jemand
// auflösen müsste — die Richtlinie regelt ihren Vorrang selbst (Nr. 9.1:
// „Widersprechen sich die Programminformationen und die vorliegende
// Förderrichtlinie, hat letztere Vorrang"), und das Merkblatt ist eine solche
// Programminformation. Es hinkt hinterher, es widerspricht nicht. Wer künftig
// eine Abweichung findet, prüft deshalb ZUERST die Richtlinie.
//
// MASSGEBLICH IST DIE ANTRAGSTELLUNG, nicht der Einbau und nicht die
// Inbetriebnahme: „Für den Zeitpunkt der Antragstellung ist das Datum des
// Eingangs des Antrags beim Durchführer maßgeblich" (Nr. 9.2.1).
//
// WER DEN FAHRPLAN AUF EINER SEITE BENUTZT, PRÜFT DEREN RENDER-ART. Ein
// Fahrplan, der auf einer rein statisch gebauten Seite ausgewertet wird, friert
// beim Build ein — dann wandert der Wert eben doch erst beim nächsten Deploy,
// und der ganze Zweck ist dahin. Geprüft am 26.08.2026: Die drei
// Server-Aufrufer (Datenstand, beide Wärmepumpen-Ratgeber) tragen alle
// `revalidate = 3600`, bauen sich also stündlich neu; Rechner und
// Förder-Check-Widget sind Client-Komponenten und lösen im Browser des
// Betrachters auf. Ein künftiger Aufrufer ohne Revalidierung braucht eine.

/** Ein Zeitraum des Fahrplans. `abIso` ist der erste Tag, an dem er gilt. */
export interface BegStufe {
  abIso: string;
  /**
   * Wie der Zeitpunkt dem Nutzer gegenüber zu NENNEN ist — nicht aus `abIso`
   * generiert, und das ist Absicht.
   *
   * Die Richtlinie ist unterschiedlich genau: Die Absenkungen von Bonus und
   * Höchstbetrag datiert sie tagesgenau („ab 1. Februar 2027"), die vier
   * wärmepumpen-relevanten Änderungen dagegen nur auf „Ab Quartal 1 2027" — an
   * fünf Stellen, ohne den Begriff je zu definieren, während sie an anderen
   * Stellen tagesgenau schreibt. `abIso` trägt dafür den 01.01. als
   * Arbeitsannahme („ab" plus Zeitraum meint dessen Beginn); ein Nutzertext,
   * der daraus „ab dem 1. Januar" machte, wäre genauer als die Quelle.
   */
  bezeichnung: string;
  /** Fördersatz für elektrisch angetriebene Wärmepumpen (Nr. 5.3 Buchst. c). */
  grundfoerderung: number;
  /** Klimageschwindigkeits-Bonus (Nr. 8.4.4). 0 = entfallen. */
  klimaBonus: number;
  /** Höchstbetrag förderfähiger Ausgaben, erste Wohneinheit (Nr. 8.3.1 Buchst. a). */
  maxCap: number;
  /** Was sich an DIESEM Stichtag ändert — für die Erklärung im Ergebnis. */
  aenderung: string;
}

/**
 * Der Fahrplan, aufsteigend nach Datum.
 *
 * Drei Größen sinken hier, und sie sinken NICHT im Gleichschritt — das ist der
 * Grund, warum sie in einer gemeinsamen Tabelle stehen müssen und nicht als
 * drei einzelne Fristen:
 *
 *   • Der Grundfördersatz halbiert sich EINMAL, zum 01.01.2027, von 30 % auf
 *     15 % (Nr. 8.4.1 Buchst. c: „Für Maßnahmen nach Nummer 5.3 beträgt der
 *     Fördersatz 30 %. Ab Quartal 1 2027: Abweichend davon beträgt der
 *     Fördersatz für Maßnahmen nach Nummer 5.3 Buchstabe c 15 %."). Danach
 *     bleibt er, soweit die Richtlinie reicht, unverändert.
 *   • Klimageschwindigkeits-Bonus und Höchstbetrag sinken halbjährlich, aber
 *     erst ab dem 01.02.2027 (Nr. 8.4.4 bzw. Nr. 8.3.1 Buchst. a).
 *
 * Der Januar 2027 ist deshalb ein eigener Zeitraum: halbierte Grundförderung,
 * aber noch der volle Bonus und der volle Höchstbetrag. Ihn zu übergehen wäre
 * bequem und für jeden falsch, der in diesem Monat beantragt.
 *
 * NUR 5.3 Buchst. c IST BETROFFEN. Die Halbierung trifft die elektrisch
 * angetriebenen Wärmepumpen und sonst nichts: Solarthermie (Buchst. a) und
 * Biomasseheizungen (Buchst. b) behalten ihre 30 %. In der Fördersatz-Tabelle
 * unter Nr. 8.4.1 hängt die Fußnote „Der Fördersatz reduziert sich ggf. gemäß
 * Nummer 8.4.1 Buchstabe c" an der Wärmepumpen-Zeile und an keiner anderen.
 * Dieser Rechner kennt nur Wärmepumpen — wer ihn je um eine andere Technik
 * erweitert, darf diesen Fahrplan nicht mitbenutzen.
 */
export const BEG_FAHRPLAN: BegStufe[] = [
  // Nr. 8.4.1 Buchst. c Satz 1 · Nr. 8.4.4 erster Spiegelstrich · Nr. 8.3.1 Buchst. a
  { abIso: "2026-07-21", bezeichnung: "heute", grundfoerderung: 0.30, klimaBonus: 0.16, maxCap: 28000,
    aenderung: "Inkrafttreten der Richtlinie" },
  // Nr. 8.4.1 Buchst. c Satz 2 — der einzige Sprung beim Fördersatz, und der
  // einzige Stichtag, den die Richtlinie nicht tagesgenau nennt.
  { abIso: "2027-01-01", bezeichnung: "Anfang 2027", grundfoerderung: 0.15, klimaBonus: 0.16, maxCap: 28000,
    aenderung: "Der Grundfördersatz für Wärmepumpen halbiert sich von 30 auf 15 Prozent." },
  { abIso: "2027-02-01", bezeichnung: "Februar 2027", grundfoerderung: 0.15, klimaBonus: 0.12, maxCap: 27250,
    aenderung: "Der Klimageschwindigkeits-Bonus sinkt auf 12 Prozent, der Höchstbetrag auf 27.250 €." },
  { abIso: "2027-08-01", bezeichnung: "August 2027", grundfoerderung: 0.15, klimaBonus: 0.08, maxCap: 26500,
    aenderung: "Der Klimageschwindigkeits-Bonus sinkt auf 8 Prozent, der Höchstbetrag auf 26.500 €." },
  { abIso: "2028-02-01", bezeichnung: "Februar 2028", grundfoerderung: 0.15, klimaBonus: 0.04, maxCap: 25750,
    aenderung: "Der Klimageschwindigkeits-Bonus sinkt auf 4 Prozent, der Höchstbetrag auf 25.750 €." },
  // Nr. 8.4.4 letzter Satz: „Ab 1. August 2028 entfällt der Bonus."
  { abIso: "2028-08-01", bezeichnung: "August 2028", grundfoerderung: 0.15, klimaBonus: 0, maxCap: 25000,
    aenderung: "Der Klimageschwindigkeits-Bonus entfällt, der Höchstbetrag sinkt auf 25.000 €." },
  { abIso: "2029-02-01", bezeichnung: "Februar 2029", grundfoerderung: 0.15, klimaBonus: 0, maxCap: 24250,
    aenderung: "Der Höchstbetrag sinkt auf 24.250 €." },
  { abIso: "2029-08-01", bezeichnung: "August 2029", grundfoerderung: 0.15, klimaBonus: 0, maxCap: 23500,
    aenderung: "Der Höchstbetrag sinkt auf 23.500 €." },
  { abIso: "2030-02-01", bezeichnung: "Februar 2030", grundfoerderung: 0.15, klimaBonus: 0, maxCap: 22750,
    aenderung: "Der Höchstbetrag sinkt auf 22.750 €." },
  { abIso: "2030-08-01", bezeichnung: "August 2030", grundfoerderung: 0.15, klimaBonus: 0, maxCap: 22000,
    aenderung: "Der Höchstbetrag sinkt auf 22.000 €." },
];

/** Letzter Tag der Geltungsdauer der Richtlinie (Nr. 10). */
export const BEG_GELTUNG_BIS_ISO = "2030-12-31";

/**
 * Der Wertschöpfungs-Bonus nach Nr. 8.4.6 — 15 Prozentpunkte ab dem ersten
 * Quartal 2027, „wenn die geförderte Wärmepumpe ihren Ursprung in der Union
 * hat".
 *
 * ER IST BETRAGSGLEICH MIT DER HALBIERUNG, und darin liegt die eigentliche
 * Aussage der Reform: Der Grundsatz sinkt um 15 Punkte, dieser Bonus gibt 15
 * Punkte zurück. Wo keine Obergrenze greift, ändert sich der Fördersatz für
 * eine Wärmepumpe aus der EU ab 2027 GAR NICHT. Die Reform ist damit keine
 * Kürzung, sondern eine Bedingung: voller Satz bei EU-Herkunft, halber sonst.
 *
 * DESHALB WIRD ER GEFRAGT UND NICHT WEGGELASSEN. Eine erste Fassung dieses
 * Rechners ließ ihn aus, weil sein Ursprung „aus unseren Daten nicht ableitbar"
 * sei — richtig beobachtet, falsch geschlossen: Herausgekommen wäre eine
 * behauptete Kürzung, die es für einen Teil der Geräte nicht gibt. Nicht „etwas
 * zu vorsichtig gerechnet", sondern die falsche Frage beantwortet. Der Nutzer
 * kann sie dagegen beantworten — spätestens sein Angebot nennt das Gerät.
 *
 * WAS WIR TATSÄCHLICH NICHT KÖNNEN, ist es ihm abzunehmen:
 *   • „Ursprung in der Union" ist eine zollrechtliche Kategorie. Sie hängt am
 *     Produktionsort und an der Fertigungstiefe, nicht am Firmensitz — ein
 *     deutscher Markenname belegt ihn so wenig, wie ein koreanischer ihn
 *     ausschließt; mehrere asiatische Hersteller fertigen in Europa.
 *   • Die amtliche BAFA-Geräteliste führt kein Ursprungsfeld (geprüft
 *     26.08.2026: Marke, Bezeichnung, Artikelnummer, EAN, Pumpentyp,
 *     Nennwärmeleistung, ETAs, Kältemittel, Netzdienlichkeit,
 *     Schallleistungspegel, Energieeffizienzklasse).
 *   • Die Richtlinie verweist für die Einzelheiten selbst weiter: „Näheres
 *     regelt das ,Infoblatt zu den förderfähigen Maßnahmen und Leistungen'."
 *     Dieses Infoblatt liegt uns nicht vor.
 * Deshalb ist die Voreinstellung „nein" und die Frage steht sichtbar daneben,
 * samt beider Beträge.
 *
 * KEINE SELBSTNUTZER-BINDUNG, anders als Klima- und Einkommens-Bonus: Nr. 8.4.6
 * nennt keine. Ein Vermieter bekommt ihn, obwohl ihm sonst nur die
 * Grundförderung zusteht.
 */
export const BEG_WERTSCHOEPFUNGS_BONUS = { abIso: "2027-01-01", satz: 0.15 } as const;

/** Welche Stufe des Fahrplans gerechnet wird. */
export type BegStand = "jetzt" | "naechste";

/** Die Stufe, die an einem gegebenen Tag gilt. */
export function begStufeAm(datum: Date, fahrplan: BegStufe[] = BEG_FAHRPLAN): BegStufe {
  const iso = datum.toISOString().slice(0, 10);
  let treffer = fahrplan[0];
  for (const stufe of fahrplan) {
    if (stufe.abIso <= iso) treffer = stufe;
  }
  return treffer;
}

/**
 * Die nächste Stufe nach der heute geltenden — oder `undefined`, wenn der
 * Fahrplan ausgelaufen ist.
 *
 * Der Umschalter im Ergebnis stellt genau diese beiden Stände gegenüber. Er ist
 * bewusst NICHT auf das feste Jahr 2027 verdrahtet: „heute" und „ab 2027" wären
 * am 01.01.2027 dieselbe Sache, und ein Rechner, der zwei gleiche Zustände
 * anbietet, sieht kaputt aus. So wandert die Frage mit — sie lautet immer „was
 * ändert sich, wenn ich erst nach dem nächsten Stichtag beantrage?".
 */
export function begNaechsteStufe(datum: Date, fahrplan: BegStufe[] = BEG_FAHRPLAN): BegStufe | undefined {
  const iso = datum.toISOString().slice(0, 10);
  return fahrplan.find((stufe) => stufe.abIso > iso);
}
