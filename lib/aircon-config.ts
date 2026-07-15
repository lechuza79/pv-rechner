// ─── Klimaanlagen-Rechner Configuration ─────────────────────────────────────
// Central, maintainable config for the air-conditioning cost calculator.
// Every number is sourced inline so it stays defensible, and the whole block is
// surfaced on /datenstand. Cooling is sun-aligned: demand peaks midday/summer,
// exactly when PV produces — that is the calculator's core angle.
//
// Kühlung ist der Kern. Split-Geräte können zusätzlich HEIZEN (Luft-Luft-
// Wärmepumpe, Arbeitszahl SCOP) — das modellieren wir als Übergangszeit-Heizung
// (heatStandards × heatTransitionShare + device.scop): ehrliche Teilheizung, die
// Gas spart. Für die kalte Kernzeit und das ganze Haus bleibt der
// Wärmepumpen-Rechner die bessere Adresse. Split-Heizen gibt es NUR hier
// (calcAirconHeating hat genau einen Aufrufer: den Klimaanlagen-Rechner).

import { INSULATION_BESTAND, INSULATION_NEUBAU } from "./constants";

export type AcDeviceId = "monoblock" | "portasplit" | "split";

// Gebäudestandard für das HEIZEN mit Split. Beim Kühlen fragen wir bewusst
// Sonne/Lage statt Dämmung (solare Gewinne dominieren, siehe exposureOptions) —
// beim Heizen ist die Dämmung dagegen der dominante Hebel, ein Wert für alle wäre
// grob falsch (Altbau ~3× Neubau).
//
// GETEILTE RECHEN-BASIS: Der Jahres-Heizwärmebedarf je m² kommt aus
// INSULATION_BESTAND / INSULATION_NEUBAU (lib/constants.ts) — dieselbe Tabelle
// (dena Gebäudereport, DIN V 18599), auf der der Wärmepumpen-Rechner rechnet.
// Hier NICHT nachbauen: sonst driften Klima- und WP-Rechner auseinander.
// Die specKwh sind kanonisch; label/sub sind UI-Text dieses Rechners.
export interface AcHeatStandard {
  id: string;
  label: string;
  sub: string;
  specKwh: number;   // kWh/m²·a Jahres-Heizwärmebedarf (kanonisch aus constants.ts)
}

export const AC_HEAT_STANDARDS: AcHeatStandard[] = [
  { id: "unsaniert",   label: INSULATION_BESTAND[0].label, sub: INSULATION_BESTAND[0].sub, specKwh: INSULATION_BESTAND[0].specKwh },
  { id: "teilsaniert", label: INSULATION_BESTAND[1].label, sub: INSULATION_BESTAND[1].sub, specKwh: INSULATION_BESTAND[1].specKwh },
  { id: "saniert",     label: INSULATION_BESTAND[2].label, sub: INSULATION_BESTAND[2].sub, specKwh: INSULATION_BESTAND[2].specKwh },
  // Neubau: gesetzlicher Mindeststandard als Bucket. Wer KfW 55/40 hat, liegt
  // darunter und korrigiert die Heizwärme direkt im Ergebnis (InlineEdit).
  { id: "neubau",      label: "Neubau (EnEV 2014)", sub: INSULATION_NEUBAU[0].sub, specKwh: INSULATION_NEUBAU[0].specKwh },
];

export interface AcDevice {
  id: AcDeviceId;
  label: string;
  what: string;            // plain-language "what it is" (shown in the UI)
  seer: number;            // Seasonal Energy Efficiency Ratio (cooling). Strom = Kühlenergie / SEER
  // Heizen: Split-Geräte sind reversibel (Luft-Luft-Wärmepumpe). scop = Seasonal
  // Coefficient of Performance (Heizen); Heizstrom = Heizwärme / SCOP. canHeat=false
  // für Monoblocks — die heizen real kaum sinnvoll.
  canHeat: boolean;
  scop?: number;
  // Acquisition price model. Monoblock + PortaSplit: one device per room →
  // pricePerUnit × Räume. Fest installierte Split: Sockel (Außengerät/Anfahrt) +
  // pro Raum (Innengerät + Kernbohrung + Leitungen + Vakuum/Befüllung + Montage
  // durch zertifizierten Fachbetrieb). Die Montage ist weitgehend PRO INNENGERÄT
  // fix — nicht von der kW abhängig. Quelle: daibau/reduco/ADAC 2026.
  perRoom: boolean;
  pricePerUnit?: number;   // € je Gerät (monoblock/portasplit)
  priceBase?: number;      // € Sockel: Außengerät + Anfahrt/Inbetriebnahme (split)
  pricePerRoom?: number;   // € je Innengerät inkl. Montage durch Fachbetrieb (split)
  // Realistische Spanne als Faktor auf den Mittelwert (Gerät, Anbieter, Leitungsweg, Region).
  priceRange: [number, number];
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

  // Sonnen-/Lage-Faktor auf den Kühlbedarf. Beim Kühlen dominieren die SOLAREN
  // Gewinne (Fenster, Ausrichtung, Verschattung, Dachgeschoss) — Wärmedämmung ist
  // dagegen ein schwacher, teils kontraproduktiver Hebel (UBA, gebaeudeforum.de).
  // Deshalb fragen wir Sonne/Lage, NICHT den Dämmstandard.
  exposureOptions: { id: string; label: string; sub: string; factor: number }[];
  defaultExposure: string;

  // Geräte-Dimensionierung (Spitzen-Kühllast): ~80 W/m² gut gedämmt, ~120 W/m²
  // Dachgeschoss/Altbau (ADAC/Handwerker-Faustregel).
  sizingWPerM2: number;

  // Heizen mit Split: Heizwärme je m² beheizter Fläche in der ÜBERGANGSZEIT.
  //   Heizwärme/m²·a = heatStandards[x].specKwh × heatTransitionShare
  // Der Gebäudestandard kommt aus der geteilten Tabelle (siehe AC_HEAT_STANDARDS),
  // der Übergangszeit-Anteil ist die einzige klima-spezifische Annahme hier.
  // Heizstrom = Heizwärme / device.scop.
  heatStandards: AcHeatStandard[];
  // Anteil des JAHRES-Heizwärmebedarfs, der in der Übergangszeit anfällt
  // (Frühherbst, Frühjahr, milde Wintertage) — also dort, wo ein Split-Gerät die
  // Last realistisch übernimmt. Die kalte Kernzeit (Dez–Feb) bleibt bewusst
  // draußen: dort fällt die Effizienz und die Wärmepumpe ist die bessere Adresse.
  // Herleitung über Heizgradtage: von ~2.100 Kd/a entfallen ~45 % auf Tage über
  // ~5 °C Mitteltemperatur; konservativ auf 40 % gerundet. Modell-Annahme, kein
  // Marktwert — im Ergebnis über die Heizwärme direkt editierbar.
  heatTransitionShare: number;
  defaultHeatStandard: string;   // id aus heatStandards (Vorbelegung im Ergebnis)

  // PV-Deckung: Anteil des Kühlstroms, den die eigene PV-Anlage übernimmt.
  // Kühlen tagsüber ist sonnen-deckungsstark, nachts kaum. Mit Batteriespeicher
  // wird Tagstrom in den Abend/die Nacht verschoben → deutlich höhere Deckung,
  // vor allem bei Nachtkühlung. Für typische Heim-PV (Mittagsleistung >> Kühllast,
  // ~10-kWh-Akku >> Tageskühlbedarf) weitgehend unabhängig von kWp/Akkugröße.
  pvCoverage: {
    battery: { allday: number; day: number; night: number };
    noBattery: { allday: number; day: number; night: number };
  };

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
      canHeat: false,    // Monoblock heizt real kaum sinnvoll (Abluftschlauch)
      perRoom: true,
      pricePerUnit: 400, // Gerätepreis, keine Montage
      priceRange: [0.65, 1.5], // ~250–600 € (Verbraucher-Tests 2025/26)
    },
    {
      id: "portasplit",
      label: "Mobile Split-Anlage (z. B. Midea PortaSplit)",
      what: "Tragbares Split-Gerät, Kompressor außen, kein Festeinbau. Deutlich effizienter als ein Monoblock. Ein Gerät pro Raum.",
      seer: 4.3,         // A++ mobile Split (Midea PortaSplit Cool)
      canHeat: true,
      scop: 3.6,         // mobile Split Heizen ~3,4–3,8 (Herstellerangaben 2026)
      perRoom: true,
      pricePerUnit: 800, // ~780–899 € (UVP/Amazon 2026)
      priceRange: [0.75, 1.3], // ~600–1.050 € je Gerät
    },
    {
      id: "split",
      label: "Fest installierte Split-Anlage",
      what: "Innen- und Außeneinheit, fest montiert. Effizientester Typ, braucht aber Installation durch einen Fachbetrieb. Mehrere Räume als Multisplit.",
      seer: 6.0,         // fest installierte Split SEER ~5–8
      canHeat: true,
      scop: 4.2,         // fest installierte Split Heizen ~4,0–4,6 (A+++ Wärmepumpen-Split)
      perRoom: false,
      // 1 Raum (Monosplit) ~2.600 €, je weiterer Raum ~+1.900 € → 3 Räume ~6.400 €.
      // Deckt sich mit Festpreisen 2026: Monosplit 1.800–3.500 €, Montage allein
      // 1.000–2.500 € je Einheit (Fachbetrieb), Multisplit 3 Räume 5.000–8.000 €.
      priceBase: 700,    // Außengerät + Anfahrt/Inbetriebnahme
      pricePerRoom: 1900, // Innengerät + Kernbohrung + Leitungen + Montage je Raum
      priceRange: [0.7, 1.35], // 1 Raum ~1.800–3.500 €, je nach Anbieter/Leitungsweg
    },
  ],

  buildingGain: 33,      // Wh/(m²·K·h), kalibriert (siehe oben)

  defaultRooms: 1,
  defaultRoomM2: 20,
  defaultTargetTemp: 24,
  targetTempOptions: [22, 24, 26],
  targetFactor: { 22: 1.5, 24: 1.0, 26: 0.6 },

  windowFactor: { allday: 1.0, day: 0.75, night: 0.35 },

  exposureOptions: [
    { id: "high", label: "Sehr sonnig", sub: "Dachgeschoss oder große Fenster nach Süden/Westen, ohne Verschattung", factor: 1.5 },
    { id: "normal", label: "Normal", sub: "Durchschnittliche Fenster und Lage", factor: 1.0 },
    { id: "low", label: "Eher schattig", sub: "Nordseite, verschattet oder mit Rollläden/Außenjalousie", factor: 0.6 },
  ],
  defaultExposure: "normal",

  sizingWPerM2: 85,

  heatStandards: AC_HEAT_STANDARDS,
  heatTransitionShare: 0.4,
  // Vorbelegung: „Teilsaniert" — der Median des deutschen Bestands und der
  // realistische Fall für den Gas-Vergleich in diesem Block. Ergibt 64 kWh/m²·a
  // (vorher: 55 pauschal für ALLE, d. h. Neubau um Faktor ~2 zu hoch).
  defaultHeatStandard: "teilsaniert",

  pvCoverage: {
    // Mit Speicher (Default): Akku verschiebt Tagstrom in Abend/Nacht.
    battery: { allday: 0.85, day: 0.92, night: 0.75 },
    // Ohne Speicher: reine Direktnutzung — nachts liefert die Sonne nichts.
    noBattery: { allday: 0.55, day: 0.8, night: 0.1 },
  },

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

  source: "Open-Meteo Wetterarchiv + Climate API (CMIP6, Kühlgradstunden), DWD/UBA (Hitzetage-Trend), Verbraucher-Tests 2025/26 (SEER/SCOP), ADAC/daibau/reduco Festpreise 2026 (Anschaffung/Montage), dena Gebäudereport/DIN V 18599 (Heizwärmebedarf je Gebäudestandard, geteilt mit dem Wärmepumpen-Rechner), BDEW (Strom/Gas), UBA (Strommix-CO₂)",
  validFrom: "2026-07-15",
  reviewBy: "2026-10-15",
};
