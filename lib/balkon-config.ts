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
  selfShareBase: number; // Eigenverbrauchsanteil bei Referenz-Ertrag
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

  specificYield: number;    // Fallback kWh/kWp (optimaler Winkel), von PVGIS überschrieben
  maxFullLoadHours: number; // Wechselrichter-Deckel → Jahres-Volllaststunden-Grenze

  // Eigenverbrauchs-Modell: Anteil sinkt, je größer die Anlage relativ zur
  // Grundlast wird. Kalibriert an der Größenordnung des HTW-Berlin
  // Stecker-Solar-Simulators (800 W / 2 Personen ≈ 55–60 % Eigenverbrauch,
  // ~15 % Autarkie).
  refYieldKwh: number;
  sizeExp: number;
  selfShareMin: number;
  selfShareMax: number;

  // Speicher-Modell: eine Batterie schiebt den Tagesüberschuss in Abend/Nacht,
  // aber nur begrenzt durch (a) den vorhandenen Überschuss, (b) die realistische
  // Jahres-Durchsatzmenge (≈ ein Vollzyklus/Tag, saisonal gebremst × Wirkungsgrad)
  // und (c) den Rest-Haushaltsbedarf. Werte ehrlich: Balkon-Überschuss ist im
  // Winter minimal, an Sonnen-Wochenenden ist die kleine Batterie mittags voll →
  // deshalb keine 365 Vollzyklen und eine Obergrenze beim Eigenverbrauch.
  // Quellen: ADAC/Stiftung Warentest 4/2026, Verbraucherzentrale — mit Speicher
  // steigt der Eigenverbrauch typisch von 30–50 % auf 60–80 %, nicht auf 100 %.
  storageEffCyclesPerYear: number; // effektive Vollzyklen/Jahr
  storageRoundtrip: number;        // Lade-/Entlade-Wirkungsgrad (0–1)
  storageSelfShareCap: number;     // Eigenverbrauchs-Obergrenze mit Speicher (0–1)
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
  presence: [
    { id: "weg", label: "Tagsüber selten", sub: "Meist berufstätig außer Haus", selfShareBase: 0.5 },
    { id: "teils", label: "Teils zuhause", sub: "Homeoffice-Tage, Familie", selfShareBase: 0.62 },
    { id: "home", label: "Oft zuhause", sub: "Homeoffice, Rente, Kinder", selfShareBase: 0.75 },
  ],
  storage: [
    { id: "none", label: "Ohne Speicher", sub: "Überschuss fließt unvergütet ins Netz", kwh: 0, price: 0 },
    { id: "small", label: "~1 kWh Speicher", sub: "Puffert etwas Abendstrom", kwh: 1, price: 500 },
    { id: "large", label: "~2 kWh Speicher", sub: "Für Abend/Nacht bei höherem Verbrauch", kwh: 2, price: 800 },
  ],
  defaultSet: "duo",
  defaultOrientation: "sued_gelaender",
  defaultPresence: "teils",
  defaultStorage: "none",

  specificYield: 950,
  maxFullLoadHours: 1250,

  refYieldKwh: 550,
  sizeExp: 0.30,
  selfShareMin: 0.30,
  selfShareMax: 0.92,

  storageEffCyclesPerYear: 200,
  storageRoundtrip: 0.9,
  storageSelfShareCap: 0.78,
  storageLifeYears: 12,
  storageRecommendMaxPayback: 8,

  lifetimeYears: 20,
  degradation: 0.005,
  gridCo2PerKwh: 0.38,
  stromPrice: 0.34,

  validFrom: "2026-07",
  reviewBy: "2027-07",
};
