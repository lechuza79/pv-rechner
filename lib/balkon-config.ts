// Balkon-PV / Steckersolar model config.
//
// Steckersolargeräte ("Balkonkraftwerke") sind kleine Anlagen (ein bis vier
// Module) mit einem Wechselrichter, der seit dem Solarpaket I (Mai 2024) bis
// 800 W ins Hausnetz einspeisen darf; die Modulleistung darf bis 2.000 Wp
// betragen. Anmeldung: nur noch Marktstammdatenregister, keine Netzbetreiber-
// Genehmigung mehr.
//
// RECHT vs. NORM — nicht verwechseln (Council-Prüfung 07/2026):
//   GESETZ (§ 8 Abs. 5a EEG): 2.000 Wp Module / 800 VA Wechselrichter. Das ist die
//   einzige verbindliche Grenze. Von 960 Wp steht dort nichts.
//   VORNORM (DIN VDE V 0126-95, seit 01.12.2025): sieht für den Betrieb an einer
//   normalen Schuko-Steckdose max. 960 Wp Module vor (= 800 W + 20 %), darüber eine
//   "spezielle Energiesteckvorrichtung" (technologieoffen formuliert — "Wieland" ist
//   ein Markenname, keine Anforderung). Diese Vornorm ist FREIWILLIG und eine
//   PRODUKTnorm: Adressat sind Hersteller, nicht Betreiber. Die DKE selbst schreibt:
//   "Die Anwendung von Normen ist grundsätzlich freiwillig." Sie ist zudem eine
//   Vornorm ("V") und wird spätestens nach drei Jahren überprüft → schukoMaxWp
//   gehört deshalb an den Wächter (reviewBy), nicht still in den Code.
//   Wichtig: Die Vornorm gilt ausdrücklich NUR für Geräte OHNE Speicher — die DKE:
//   "Die Konformität mit dieser Produktnorm ist nur für Steckersolargeräte ohne
//   Speicher möglich."
// Deshalb formuliert der Rechner hier nie "Pflicht"/"verboten", sondern nennt
// Gesetz und Norm getrennt.
//
// Wirtschaftlich zählt fast nur der SELBST genutzte Strom: für Balkonkraftwerke
// gibt es keine Einspeisevergütung, der Überschuss fließt unvergütet ins Netz.
// Deshalb modellieren wir Ertrag → Eigenverbrauch → Ersparnis, nicht
// Einspeiseerlöse.
//
// Rechen-Basis: siehe CLAUDE.md „Geteilte Rechen-Basis". Standort-Ertrag kommt als
// PVGIS-Monatsprofil, die Haushaltslast aus calcHourlyConsumption, der Tag/Nacht-
// Split über die geteilte tagQuote — hier steht nur, was Balkon-spezifisch ist.

import { NUTZUNG } from "./constants";

export type BalkonSetId = "single" | "duo" | "max";
export type BalkonOrientationId = "sued_flach" | "sued_gelaender" | "ost_west" | "nord_schatten";
export type BalkonPresenceId = "weg" | "teils" | "home";
export type BalkonStorageId = "none" | "small" | "large";

export interface BalkonSet {
  id: BalkonSetId;
  label: string;
  what: string;
  moduleWp: number;   // Modul-Spitzenleistung (Wp)
  inverterW: number;  // Wechselrichter-Grenze (W AC)
  price: number;      // typischer Set-Preis inkl. Halterung (€)
}

export interface BalkonOrientation {
  id: BalkonOrientationId;
  label: string;
  sub: string;
  // Kein Ertragsfaktor mehr: Jede Ausrichtung hat in lib/solar-year.ts eine eigene
  // PVGIS-Stundenreihe mit eigenem Tagesverlauf. Ein Faktor koennte nur die Menge
  // skalieren, nicht die Form — und lag frueher grob daneben (Ost/West 0,85 statt
  // real 0,51; Nord 0,5 statt real 0,20).
  //
  // BEKANNTE GRENZE (HTW-Validierung 07/2026): "ost_west" rechnet mit einer reinen
  // OST-Reihe, und beide Optionen fassen je zwei Faelle zusammen, die sich
  // unterschiedlich verhalten:
  //   - Ost vs. West: In der Menge fast gleich (PVGIS 506 vs. 496 kWh/kWp), im
  //     Eigenverbrauch nicht. West liefert abends, wenn gekocht wird. Die HTW misst
  //     deshalb fuer West MEHR Eigenverbrauch als fuer Ost (294 vs. 288 kWh) trotz
  //     weniger Ertrag — bei uns kommt es andersherum heraus (Ost +12 %). Wir
  //     rechnen West also als Ost und liegen beim Vorzeichen falsch.
  //   - Nord vs. verschattet: Eine verschattete Suedwand hat einen voellig anderen
  //     Tagesverlauf als eine Nordwand; die Reihe ist echtes Nord, ohne Verschattung.
  // Beides ist bewusst offen (eigene West-Reihe + getrennte Verschattungs-Option
  // waeren die Fixes) — es haengt an der Frage, wie fein der Flow fragen soll.
}

export interface BalkonPresence {
  id: BalkonPresenceId;
  label: string;
  sub: string;
  // Tag-Anteil am Haushaltsverbrauch (7–18 Uhr). GETEILTE Größe: dieselbe, mit der
  // der PV-Rechner rechnet (NUTZUNG.tagQuote, BDEW H0) — nicht neu erfinden.
  tagQuote: number;
}

export interface BalkonStorage {
  id: BalkonStorageId;
  label: string;
  sub: string;
  kwh: number;   // nutzbare Kapazität (kWh)
  price: number; // Mehrkosten inkl. Wechselrichter/App (€), 0 = ohne Speicher
}

export interface BalkonConfig {
  sets: BalkonSet[];
  orientations: BalkonOrientation[];
  presence: BalkonPresence[];
  storage: BalkonStorage[];
  defaultSet: BalkonSetId;
  defaultOrientation: BalkonOrientationId;
  defaultPresence: BalkonPresenceId;
  defaultStorage: BalkonStorageId;

  specificYield: number;    // Fallback kWh/kWp im Jahr, wenn keine PLZ gesetzt ist.
                            // Mit PLZ kommen die 12 Monatswerte direkt von PVGIS.

  // Modulleistung, bis zu der die VDE-Vornorm den Betrieb an einer normalen
  // Schuko-Steckdose vorsieht. FREIWILLIGE Vornorm, kein Gesetz (siehe Kopf) —
  // wird spätestens 2028 überprüft, deshalb im Wächter-Runbook geführt.
  schukoMaxWp: number;
  // Was die Vornorm oberhalb davon vorsieht (Einbau durch Elektrofachkraft).
  // Marktangabe, keine Norm-/Gesetzesgröße → Wächter prüft sie mit.
  energySocketCostMin: number;
  energySocketCostMax: number;

  // HINWEIS: Clipping-Deckel, Eigenverbrauchs-Power-Law und Speicher-Durchsatz
  // standen früher hier als kalibrierte Konstanten. Sie sind ersatzlos entfallen —
  // lib/balkon-sim.ts simuliert das Jahr stündlich auf der geteilten Basis
  // (PVGIS-Monatswerte + calcHourlyConsumption), damit ergeben sich Clipping,
  // Eigenverbrauch und Speicher-Nutzen als Ergebnis statt als Annahme.

  // Lade-/Entlade-Wirkungsgrad (0–1), Physik. OFFENER PUNKT aus der HTW-Validierung
  // (07/2026): Die HTW misst 82,5 % (Laden 91,7 % × Entladen 92 % × Batterie 97,8 %,
  // PerMod-Modell) — unsere 90 % sind optimistischer. Die HTW rechnet allerdings
  // AC-gekoppelt (zwei volle Wandlungen), waehrend die realen Balkonspeicher
  // DC-gekoppelt sind und eine davon sparen; 90 % ist dort Herstellerangabe, also
  // eher Obergrenze. Ein Wert um 85 % waere vermutlich ehrlicher — das senkt den
  // Speicher-Zugewinn um rund 6 % und damit die Speicher-Empfehlung. Bewusst NICHT
  // im Vorbeigehen geaendert: Der Wert steht auf /datenstand und veraendert
  // Nutzer-Ergebnisse.
  storageRoundtrip: number;
  storageLifeYears: number;        // realistische Speicher-Lebensdauer (Jahre) — der
                                   // Speicher-Zusatznutzen zählt nur bis hierhin, danach
                                   // laufen die Module weiter.
  storageRecommendMaxPayback: number; // Ein Speicher wird nur EMPFOHLEN, wenn er sich
                                   // innerhalb dieser Jahre selbst amortisiert. Deutlich
                                   // unter der Lebensdauer, damit die Empfehlung ehrlich
                                   // bleibt: Speicher nur da, wo er sich klar rechnet
                                   // (viel Überschuss = tagsüber wenig Eigenverbrauch),
                                   // sonst empfehlen wir bewusst ohne — Balkonspeicher
                                   // amortisieren sich oft nicht.

  lifetimeYears: number;
  degradation: number;
  gridCo2PerKwh: number;    // kg CO₂/kWh, DE-Netzmix (= WP-Rechner)
  stromPrice: number;       // Fallback €/kWh

  validFrom: string;            // ISO — Stand der Preis-/Marktwerte
  reviewBy: string;             // ISO — bis dahin gegen Quellen prüfen (scripts/balkon-verify.md)
}

export const DEFAULT_BALKON_CONFIG: BalkonConfig = {
  sets: [
    { id: "single", label: "1 Modul", what: "~500 Wp mit kleinem Wechselrichter — für schmale Balkone oder eine Wand.", moduleWp: 500, inverterW: 600, price: 300 },
    // 960 Wp statt früher 1.000: genau die Grenze, bis zu der die VDE-Vornorm den
    // normalen Schuko-Stecker vorsieht. Der Markt verkauft seit der Norm exakt
    // solche Sets — damit ist die gängigste Größe ohne Sternchen normkonform.
    { id: "duo", label: "2 Module (Standard)", what: "~960 Wp am 800-W-Wechselrichter — die gängigste Größe, läuft am normalen Schuko-Stecker.", moduleWp: 960, inverterW: 800, price: 500 },
    { id: "max", label: "4 Module (Maximum)", what: "~2.000 Wp am 800-W-Wechselrichter — mehr Ertrag morgens und abends, die Mittagsspitze wird gedrosselt. Gesetzlich erlaubt; die VDE-Vornorm sieht dafür eine spezielle Einspeisesteckdose vor.", moduleWp: 2000, inverterW: 800, price: 800 },
  ],
  orientations: [
    { id: "sued_flach", label: "Süd, aufgeständert", sub: "Optimaler Winkel (Flachdach, Garten, Terrasse)" },
    { id: "sued_gelaender", label: "Süd, senkrecht am Geländer", sub: "Klassischer Balkon" },
    { id: "ost_west", label: "Ost oder West, senkrecht", sub: "Halbtags Sonne — rund halber Ertrag" },
    { id: "nord_schatten", label: "Nord oder verschattet", sub: "Wenig direkte Sonne — lohnt selten" },
  ],
  // tagQuote wird aus der geteilten NUTZUNG-Tabelle referenziert (nicht abgeschrieben),
  // damit Balkon- und PV-Rechner nicht auseinanderlaufen.
  presence: [
    { id: "weg", label: "Tagsüber selten", sub: "Meist berufstätig außer Haus", tagQuote: NUTZUNG[0].tagQuote },
    { id: "teils", label: "Teils zuhause", sub: "Homeoffice-Tage, Familie", tagQuote: NUTZUNG[1].tagQuote },
    { id: "home", label: "Oft zuhause", sub: "Homeoffice, Rente, Kinder", tagQuote: NUTZUNG[2].tagQuote },
  ],
  // Größen und Preise an echten, getesteten Geräten (Stand 2026-07). Das Segment
  // unter ~1,5 kWh ist als Einstieg vom Markt verschwunden (Zendure AB1000 läuft
  // nur noch als Altbestand) — Einstieg ist heute ~1,6 kWh.
  //   ~1,6 kWh: Anker Solarbank 2 Pro (~410–460 €)
  //   ~2,7 kWh: Anker Solarbank 3 Pro (ab ~890 €, Testsieger)
  // Quervergleich: Growatt Noah 2000 (2,0 kWh, ab 600 €), Zendure SolarFlow 800 Pro
  // (1,9 kWh, ab 730 €). Marktspanne reiner Balkonspeicher: 400–1.500 €.
  storage: [
    { id: "none", label: "Ohne Speicher", sub: "Überschuss fließt unvergütet ins Netz", kwh: 0, price: 0 },
    { id: "small", label: "~1,6 kWh Speicher", sub: "Einstiegsgröße, deckt den Abend", kwh: 1.6, price: 430 },
    { id: "large", label: "~2,7 kWh Speicher", sub: "Mehr Puffer — mehr, als ein Balkon meist füllen kann", kwh: 2.7, price: 890 },
  ],
  defaultSet: "duo",
  defaultOrientation: "sued_gelaender",
  defaultPresence: "teils",
  defaultStorage: "none",

  specificYield: 950,

  schukoMaxWp: 960,
  energySocketCostMin: 100,
  energySocketCostMax: 300,

  storageRoundtrip: 0.9,
  storageLifeYears: 12,
  storageRecommendMaxPayback: 8,

  lifetimeYears: 20,
  degradation: 0.005,
  gridCo2PerKwh: 0.38,
  stromPrice: 0.34,

  validFrom: "2026-07",
  reviewBy: "2026-10", // Quartals-Rhythmus (scripts/balkon-verify.md), nicht jährlich
};
