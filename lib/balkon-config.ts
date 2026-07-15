// Balkon-PV / Steckersolar model config.
//
// Steckersolargeräte ("Balkonkraftwerke") sind kleine Anlagen (ein bis vier
// Module) mit einem Wechselrichter, der seit dem Solarpaket I (Mai 2024) bis
// 800 W ins Hausnetz einspeisen darf; die Modulleistung darf bis 2.000 Wp
// betragen. Anmeldung: nur noch Marktstammdatenregister, keine Netzbetreiber-
// Genehmigung mehr.
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
  factor: number;     // Ertragsfaktor vs. optimal geneigter Südausrichtung
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

  // HINWEIS: Clipping-Deckel, Eigenverbrauchs-Power-Law und Speicher-Durchsatz
  // standen früher hier als kalibrierte Konstanten. Sie sind ersatzlos entfallen —
  // lib/balkon-sim.ts simuliert das Jahr stündlich auf der geteilten Basis
  // (PVGIS-Monatswerte + calcHourlyConsumption), damit ergeben sich Clipping,
  // Eigenverbrauch und Speicher-Nutzen als Ergebnis statt als Annahme.

  storageRoundtrip: number;        // Lade-/Entlade-Wirkungsgrad (0–1), Physik
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
    { id: "duo", label: "2 Module (Standard)", what: "~1.000 Wp am 800-W-Wechselrichter — die gängigste Größe.", moduleWp: 1000, inverterW: 800, price: 500 },
    { id: "max", label: "4 Module (Maximum)", what: "~2.000 Wp am 800-W-Wechselrichter — mehr Ertrag morgens und abends, die Mittagsspitze wird gedrosselt.", moduleWp: 2000, inverterW: 800, price: 800 },
  ],
  orientations: [
    { id: "sued_flach", label: "Süd, aufgeständert", sub: "Optimaler Winkel (Flachdach, Garten, Terrasse)", factor: 1.0 },
    { id: "sued_gelaender", label: "Süd, senkrecht am Geländer", sub: "Klassischer Balkon", factor: 0.72 },
    { id: "ost_west", label: "Ost oder West", sub: "Halbtags Sonne", factor: 0.85 },
    { id: "nord_schatten", label: "Nord oder verschattet", sub: "Wenig direkte Sonne", factor: 0.5 },
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
