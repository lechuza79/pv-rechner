// ─── Klimaanlagen-Rechner Configuration ─────────────────────────────────────
// Central, maintainable config for the air-conditioning cost calculator.
// Every number is sourced inline so it stays defensible, and the whole block is
// surfaced on /datenstand. Cooling is sun-aligned: demand peaks midday/summer,
// exactly when PV produces — that is the calculator's core angle.
//
// WICHTIG: nur Kühlung. Klimageräte können auch heizen; das modellieren wir hier
// bewusst NICHT — Heizen läuft über den Wärmepumpen-Rechner.

export type AcDeviceId = "monoblock" | "portasplit" | "split";

export interface AcDevice {
  id: AcDeviceId;
  label: string;
  what: string;            // plain-language "what it is" (shown in the UI)
  seer: number;            // Seasonal Energy Efficiency Ratio (cooling). Strom = Kühlenergie / SEER
  // Acquisition price model. Monoblock + PortaSplit: one device per room →
  // pricePerUnit × Räume. Fest installierte Split: Sockel + €/kW (inkl. Montage),
  // analog zu €/kWp bei PV.
  perRoom: boolean;
  pricePerUnit?: number;   // € je Gerät (monoblock/portasplit)
  priceBase?: number;      // € Montage-Sockel (split)
  pricePerKw?: number;     // € je kW Kühlleistung inkl. Montage (split)
}

// Cooling-degree-hours = Σ max(0, T_außen − Schwelle) über ein Jahr. Maß dafür,
// wie oft und wie weit es über der „ab hier wird gekühlt"-Temperatur lag.
// Jahres-Referenz je Bundesland (Schwelle 22 °C außen), grob aus Open-Meteo-
// Klimatologie der letzten Sommer abgeleitet. Süden/Ballungsraum wärmer, Küste
// kühler. Die Live-API (/api/cooling-degree) verfeinert pro PLZ; diese Werte
// sind Pflege-Baseline + Fallback.
export interface AcConfig {
  devices: AcDevice[];

  // Cooling demand model: Kühlenergie = gain × Fläche × Kühlgradstunden / 1000
  // gain = effektiver Kühl-Kennwert in Wh/(m²·K·h). Kein reiner U-Wert: enthält
  // Sonneneintrag, Latentlast (Entfeuchtung) und reales Nutzerverhalten, kalibriert
  // an veröffentlichten Verbräuchen (Split-Einzelraum ~100 kWh Strom/Jahr).
  buildingGain: number;

  defaultRooms: number;
  defaultRoomM2: number;       // gekühlte Fläche je Raum (nicht ganze Wohnfläche!)
  defaultTargetTemp: number;   // Wunsch-Innentemperatur °C
  targetTempOptions: number[];

  // Wunschtemperatur verschiebt die Kühlschwelle → mehr/weniger Kühlgradstunden.
  // Faktor relativ zu 24 °C.
  targetFactor: Record<number, number>;

  // Zeitfenster filtert die Stunden, in denen gekühlt wird.
  windowFactor: { allday: number; day: number; night: number };

  // Geräte-Dimensionierung (Spitzen-Kühllast): ~80 W/m² gut gedämmt, ~120 W/m²
  // Dachgeschoss/Altbau (ADAC/Handwerker-Faustregel).
  sizingWPerM2: number;

  // PV-Deckung: Anteil des Kühlstroms, den die eigene PV-Anlage übernimmt.
  // Kühlen tagsüber ist sonnen-deckungsstark, nachts kaum. Für typische Heim-PV
  // (Mittagsleistung >> Kühllast) weitgehend unabhängig von der kWp.
  pvCoverage: { allday: number; day: number; night: number };

  // Außentemperatur-Schwelle, ab der gekühlt wird (Kühlgradstunden-Basis)
  coolBaseTemp: number;        // °C

  // Klimatologie-Referenz (Kühlgradstunden/Jahr) — Fallback ohne PLZ. Repräsentiert
  // den Modus „Ø letzte Jahre". cdhByBundesland ist die gepflegte Baseline.
  cdhNational: number;
  cdhByBundesland: Record<string, number>;

  // Drei Standort-Modi für die Kühlgradstunden (im Ergebnis umschaltbar):
  avgYears: number;            // „Ø letzte N Jahre" (Wetterarchiv)
  // Fallback-Faktoren relativ zur Ø-Klimatologie, falls die Live-Daten fehlen:
  lastSummerFactor: number;    // letzter Sommer war wärmer als der Schnitt
  projectionFactor: number;    // Projektion ~20 Jahre vs. heute (Klimawandel)
  // Projektionsfenster relativ zum aktuellen Jahr (rollover-sicher, gegen 2050 geclamped)
  projectionYearsAhead: { start: number; end: number };
  climateModel: string;        // CMIP6-Downscaling-Modell (Open-Meteo Climate API)

  // Hitzewelle (DWD-nahe Definition: ≥ 3 Tage mit Tagesmaximum ≥ Schwelle)
  heatwaveThreshold: number;   // °C
  heatwaveMinDays: number;

  // Strom + CO₂ (Default; UI nutzt den zentralen Strompreis aus /api/prices)
  stromPrice: number;          // €/kWh
  gridCo2PerKwh: number;       // kg CO₂/kWh (deutscher Strommix)

  source: string;
  validFrom: string;           // ISO — Stand der Werte
  reviewBy: string;            // ISO — bis dahin gegen Quellen prüfen (scripts/klimaanlage-verify.md)
}

export const DEFAULT_AIRCON_CONFIG: AcConfig = {
  devices: [
    {
      id: "monoblock",
      label: "Monoblock mit Abluftschlauch",
      what: "Ein Gerät, Schlauch zum Fenster raus. Günstig und laut — durch den Schlauchspalt zieht warme Luft nach, daher ineffizient. Der typische Hitzewellen-Spontankauf.",
      seer: 2.5,         // Monoblock SEER ~2,0–2,8 (Verbraucher-Tests 2025/26)
      perRoom: true,
      pricePerUnit: 400, // Gerätepreis, keine Montage
    },
    {
      id: "portasplit",
      label: "Mobile Split-Anlage (z. B. Midea PortaSplit)",
      what: "Tragbares Split-Gerät, Kompressor außen, kein Festeinbau. Deutlich effizienter als ein Monoblock. Ein Gerät pro Raum.",
      seer: 4.3,         // A++ mobile Split (Midea PortaSplit Cool)
      perRoom: true,
      pricePerUnit: 800, // ~780–899 € (UVP/Amazon 2026)
    },
    {
      id: "split",
      label: "Fest installierte Split-Anlage",
      what: "Innen- und Außeneinheit, fest montiert. Effizientester Typ, braucht aber Installation durch einen Fachbetrieb. Mehrere Räume als Multisplit.",
      seer: 6.0,         // fest installierte Split SEER ~5–8
      perRoom: false,
      priceBase: 1200,   // Sockel inkl. Außeneinheit/Leitungen
      pricePerKw: 600,   // €/kW Kühlleistung inkl. Montage (ADAC/Handwerkerdaten)
    },
  ],

  buildingGain: 33,      // Wh/(m²·K·h), kalibriert (siehe oben)

  defaultRooms: 1,
  defaultRoomM2: 20,
  defaultTargetTemp: 24,
  targetTempOptions: [22, 24, 26],
  targetFactor: { 22: 1.5, 24: 1.0, 26: 0.6 },

  windowFactor: { allday: 1.0, day: 0.75, night: 0.35 },

  sizingWPerM2: 85,

  pvCoverage: { allday: 0.55, day: 0.8, night: 0.1 },

  coolBaseTemp: 22,

  cdhNational: 1200,
  cdhByBundesland: {
    BW: 1380, BY: 1350, BE: 1320, BB: 1300, HB: 950, HH: 980,
    HE: 1280, MV: 1000, NI: 1050, NW: 1180, RP: 1300, SL: 1280,
    SN: 1280, ST: 1240, SH: 920, TH: 1180,
  },

  avgYears: 5,
  lastSummerFactor: 1.3,
  projectionFactor: 1.5,
  projectionYearsAhead: { start: 18, end: 22 },
  climateModel: "MRI_AGCM3_2_S",   // CMIP6-Downscaling, 10 km (Open-Meteo Climate API)

  heatwaveThreshold: 30,
  heatwaveMinDays: 3,

  stromPrice: 0.34,
  gridCo2PerKwh: 0.38,   // kg CO₂/kWh deutscher Strommix (UBA 2023, sinkend) — wie heatpump.ts

  source: "Open-Meteo Wetterarchiv + Climate API (CMIP6, Kühlgradstunden), DWD/UBA (Hitzetage-Trend), Verbraucher-Tests 2025/26 (SEER), ADAC/Handwerkerdaten (Preise), BDEW (Strom), UBA (Strommix-CO₂)",
  validFrom: "2026-06-28",
  reviewBy: "2027-04-30",
};
