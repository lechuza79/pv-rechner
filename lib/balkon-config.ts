// Balkon-PV / Steckersolar model config.
//
// Steckersolargeräte ("Balkonkraftwerke") sind kleine Anlagen (ein bis vier
// Module) mit einem Wechselrichter, der seit dem Solarpaket I (Mai 2024) bis
// 800 W ins Hausnetz einspeisen darf; die Modulleistung darf bis 2.000 Wp
// betragen. Anmeldung: nur noch Marktstammdatenregister, keine Netzbetreiber-
// Genehmigung mehr.
//
// Wirtschaftlich zählt fast nur der SELBST genutzte Strom: Überschuss fließt in
// der Regel unvergütet ins Netz (eine EEG-Einspeisevergütung lohnt die Anmeldung
// bei dieser Größe nicht). Deshalb modellieren wir Ertrag → Eigenverbrauch →
// Ersparnis, nicht Einspeiseerlöse.

export type BalkonSetId = "single" | "duo" | "max";
export type BalkonOrientationId = "sued_flach" | "sued_gelaender" | "ost_west" | "nord_schatten";
export type BalkonPresenceId = "weg" | "teils" | "home";

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

export interface BalkonConfig {
  sets: BalkonSet[];
  orientations: BalkonOrientation[];
  presence: BalkonPresence[];
  defaultSet: BalkonSetId;
  defaultOrientation: BalkonOrientationId;
  defaultPresence: BalkonPresenceId;

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
  defaultSet: "duo",
  defaultOrientation: "sued_gelaender",
  defaultPresence: "teils",

  specificYield: 950,
  maxFullLoadHours: 1250,

  refYieldKwh: 550,
  sizeExp: 0.30,
  selfShareMin: 0.30,
  selfShareMax: 0.92,

  lifetimeYears: 20,
  degradation: 0.005,
  gridCo2PerKwh: 0.38,
  stromPrice: 0.34,

  validFrom: "2026-07",
  reviewBy: "2027-07",
};
