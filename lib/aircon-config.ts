// ─── Klimaanlagen-Rechner Configuration ─────────────────────────────────────
// Central, maintainable config for the air-conditioning cost calculator.
// Every number is sourced inline so it stays defensible, and the whole block is
// surfaced on /datenstand. Cooling is sun-aligned: demand peaks midday/summer,
// exactly when PV produces — that is the calculator's core angle.
//
// Kühlung ist der Kern. Split-Geräte können zusätzlich HEIZEN (Luft-Luft-
// Wärmepumpe, Arbeitszahl SCOP) — das modellieren wir als Übergangszeit-Heizung
// (heatSpecKwhPerM2 + device.scop): ehrliche Teilheizung, die Gas spart. Für die
// kalte Kernzeit und das ganze Haus bleibt der Wärmepumpen-Rechner die bessere
// Adresse. Dieselbe Split-Heiz-Funktion (calcAirconHeating) nutzt auch der
// Wärmepumpen-Rechner für seinen „Split als Teil-Ergänzung"-Block.

export type AcDeviceId = "monoblock" | "portasplit" | "split";

// ─── Effizienz-Systematik (SEER) — BLOCKER beim Pflegen ──────────────────────
// Der Gerätevergleich ist der Kern dieser Seite. Er ist nur ehrlich, wenn alle
// drei Typen auf DERSELBEN Grundlage stehen. Das ist nicht trivial, weil die
// Typenschilder es NICHT sind:
//
//   • Split + mobile Split (= "room air conditioner" nach VO (EU) 626/2011)
//     tragen einen SEER: saisonal, mit Teillast, gemessen nach EN 14825 bei
//     realer Temperaturdifferenz (27 °C innen / 35 °C außen).
//   • Monoblock/Einkanal ist von EN 14825 ausdrücklich AUSGESCHLOSSEN und kann
//     regulatorisch gar keinen SEER haben. Sein Label trägt einen Volllast-EER
//     nach EN 14511 — gemessen in EINER 35-°C-Kammer, in der es kein Außen und
//     damit keinen Pfad für nachströmende Warmluft gibt (626/2011 Anhang VII:
//     der Kondensator wird "not supplied with outdoor air, but indoor air").
//
// Die Zahlen sind deshalb nicht nur unterschiedlich streng, sie liegen auf zwei
// Skalen. Topten bringt es auf den Punkt: Ein Einkanalgerät der Klasse A
// (EER 2,6) entspricht bei einem Split der Klasse F (SEER 2,6) — die ist seit
// 2013 verboten. "Alle am Typenschild" wäre also gerade KEINE einheitliche
// Grundlage, sondern der Vergleich zweier verschiedener Messverfahren.
//
// SYSTEMATIK: `seer` ist kein Typenschild-Wert, sondern die EFFEKTIVE
// Jahres-Effizienz (Kühlenergie ab Raum / Strom über die Saison) — genau die
// Größe, die das Modell braucht (electricityKwh = coolingDemandKwh / seer).
// Sie wird für JEDEN Typ nach derselben Formel abgeleitet:
//
//   seer = labelValue × AC_REAL_FACTOR × structuralFactor
//
//   labelValue        markttypischer Labelwert (nicht Bestwert, nicht Minimum)
//   AC_REAL_FACTOR    EINHEITLICH für alle Typen: Abschlag Labor → Realbetrieb
//   structuralFactor  trägt NUR nach, was die jeweilige Prüfnorm strukturell
//                     ausklammert. SEER-Skala = 1,0 (EN 14825 bildet Teillast
//                     und reale ΔT bereits ab). Kein Ermessens-Abschlag!
//
// Der Monoblock ist damit der einzige Typ mit structuralFactor < 1 — und das
// ist keine Ungleichbehandlung, sondern die Korrektur eines physikalischen
// Effekts, den sein Prüfverfahren per Definition nicht enthalten kann.
// Ein Typ darf NUR dann einen structuralFactor < 1 bekommen, wenn benannt ist,
// welcher Effekt außerhalb seiner Prüfnorm-Grenze liegt. "Wert wirkt zu
// optimistisch" ist kein Grund — siehe scripts/klimaanlage-verify.md.
// Erzwungen von lib/__tests__/aircon.test.ts ("Effizienz-Systematik").

/** Abschlag Labor → Realbetrieb, EINHEITLICH für alle Gerätetypen.
 *  Peer-reviewed (Energy and Buildings 2025, akkreditierte kalorimetrische
 *  Messung, 4 Split-Inverter): Abweichung zwischen genormtem SEER und realen
 *  Endnutzer-Einstellungen "bis zu 50 %". "Bis zu" ist der Worst Case; wir
 *  setzen mit 15 % bewusst das konservative Ende an, weil ein Rechner den
 *  typischen Fall treffen soll, nicht den Extremfall. */
export const AC_REAL_FACTOR = 0.85;

/** Effektive Jahres-Effizienz aus Labelwert + struktureller Korrektur.
 *  Einziger Weg, einen seer-Wert zu setzen — Handwerte driften. */
export function effectiveSeer(labelValue: number, structuralFactor: number): number {
  return Math.round(labelValue * AC_REAL_FACTOR * structuralFactor * 10) / 10;
}

export interface AcDevice {
  id: AcDeviceId;
  label: string;
  what: string;            // plain-language "what it is" (shown in the UI)
  // ─ Typenschild (Transparenz + Prüfbarkeit; geht NICHT in die Rechnung) ─
  labelMetric: "SEER" | "EER"; // Skala des Labels: Einkanal → EER, sonst SEER
  labelValue: number;      // markttypischer Labelwert auf dieser Skala
  labelClass: string;      // EU-Effizienzklasse zu labelValue (626/2011 Anh. II)
  /** Trägt nach, was die Prüfnorm strukturell ausklammert. 1,0 = nichts. */
  structuralFactor: number;
  seer: number;            // EFFEKTIVE Jahres-Effizienz = effectiveSeer(...). Strom = Kühlenergie / seer
  // Heizen: Split-Geräte sind reversibel (Luft-Luft-Wärmepumpe). scop = Seasonal
  // Coefficient of Performance (Heizen); Heizstrom = Heizwärme / SCOP. canHeat=false
  // für Monoblocks — die heizen real kaum sinnvoll.
  // OFFEN (07/2026): `scop` ist noch ein TYPENSCHILD-Wert, `seer` dagegen bereits
  // die effektive Jahres-Effizienz. Innerhalb eines Geräts ist Kühlen damit
  // realistisch und Heizen optimistisch gerechnet — dieselbe Asymmetrie, die die
  // SEER-Systematik gerade beseitigt hat, nur auf der anderen Achse. Die Studie
  // hinter AC_REAL_FACTOR misst SEER *und* SCOP, der Faktor wäre also belegt.
  // Bewusst NICHT mitgezogen: `scop` hängt am Wärmepumpen-Rechner (Split als
  // Teil-Ergänzung, calcAirconHeating) — das ist eigener Scope mit eigener
  // Abnahme. Siehe scripts/klimaanlage-verify.md → "Offener Punkt: SCOP".
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

  defaultDeviceId: AcDeviceId; // typisches Standardgerät (Schnellschätzung, Modal-Vorbelegung)
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

  // Heizen mit Split: thermische Heizwärme je m² beheizter Fläche in der
  // ÜBERGANGSZEIT (Frühherbst, Frühjahr, milde Wintertage) — nicht das ganze
  // Jahr und nicht die kalte Kernzeit. Grober Anhalt; im Ergebnis editierbar.
  // Heizstrom = Heizwärme / device.scop. Auch der WP-Rechner nutzt diesen Wert
  // für seinen „Split als Teil-Ergänzung"-Block (dort × Deckungsanteil).
  heatSpecKwhPerM2: number;

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
      // Label: EER 2,6 = Klasse A, der markttypische Wert (z. B. Klarstein
      // Grandbreeze Pro). Gesetzliches Minimum 2,34 (R290), A+ ist am Markt die
      // faktische Obergrenze. Kein SEER — EN 14825 schließt Einkanal aus.
      labelMetric: "EER",
      labelValue: 2.6,
      labelClass: "A",
      // Struktureller Nachtrag: INFILTRATION. Das Gerät bläst Raumluft durch den
      // Schlauch nach draußen; der Unterdruck zieht 35-°C-Luft durch Fenster-/
      // Türspalt nach. Im Prüfstand kann das nicht auftreten (Messung in einer
      // einzigen 35-°C-Kammer, kein Außen), der Effekt liegt also außerhalb der
      // Norm-Grenze — nicht "übersehen", sondern per Definition nicht drin.
      // Höhe: In der EU quantifiziert das niemand. Das US-DOE rechnet ihn als
      // einziger Regulator heraus (10 CFR 430 App. CC: sensible + latente Wärme
      // der nachströmenden Luft wird von der Kälteleistung abgezogen), verwirft
      // aber einen festen Umrechnungsfaktor ausdrücklich, weil Luftmengen je
      // Gerät zu stark streuen. Deutsche Einordnung (energie-lexikon.info):
      // nominell "ein SEER um 3", real "effektiv sogar deutlich unter 2".
      // 0,7 ist der Faktor, der genau diesen Korridor trifft (2,6 → 1,5).
      // Gegenprobe: ergibt Monoblock/Split ≈ 3,7× — plausibel zwischen den
      // ~2–3×, die Verbrauchsangaben nahelegen, und den "bis zu siebenmal
      // geringer", die test.de aus eigenen Messungen nennt (29.05.2026).
      // KEIN Teillast-Bonus obendrauf: Monoblöcke takten an/aus, der SEER-
      // Aufschlag "EER + 3" (Topten) gilt nur für Inverter-Geräte.
      structuralFactor: 0.7,
      seer: effectiveSeer(2.6, 0.7),   // → 1,5
      canHeat: false,    // Monoblock heizt real kaum sinnvoll (Abluftschlauch)
      perRoom: true,
      pricePerUnit: 400, // Gerätepreis, keine Montage
      priceRange: [0.65, 1.5], // ~250–600 € (Verbraucher-Tests 2025/26)
    },
    {
      id: "portasplit",
      label: "Mobile Split-Anlage (z. B. Midea PortaSplit)",
      what: "Tragbares Split-Gerät, Kompressor außen, kein Festeinbau. Deutlich effizienter als ein Monoblock. Ein Gerät pro Raum.",
      // Label: SEER 6,1 = A++ (Midea PortaSplit Datenblatt, 3,5 kW). Mobile
      // Splits sind regulatorisch "room air conditioner" und stehen damit auf
      // DERSELBEN SEER-Skala wie fest installierte — direkt vergleichbar.
      labelMetric: "SEER",
      labelValue: 6.1,
      labelClass: "A++",
      // 1,0: EN 14825 misst Teillast bei realer Temperaturdifferenz, es fehlt
      // strukturell nichts. Der Nachteil des mobilen Splits (Kompressor-Einheit
      // näher am Raum) steckt bereits im gemessenen Labelwert — 6,1 liegt genau
      // deshalb am unteren Rand des Split-Markts (6–7).
      // Der frühere Wert 4,3 war ein ~30-%-Abschlag auf genau dieses Label, den
      // sonst kein Typ bekam — er machte den Vergleich kaputt, statt ihn zu
      // härten. Deckt sich jetzt mit test.de (2025): die PortaSplit erreichte
      // "eine Effizienz auf dem Niveau mancher fester Splitgeräte".
      structuralFactor: 1.0,
      seer: effectiveSeer(6.1, 1.0),   // → 5,2
      canHeat: true,
      scop: 3.6,         // mobile Split Heizen ~3,4–3,8 (Herstellerangaben 2026)
                         // Typenschild-Wert — siehe "OFFEN (07/2026)" oben im Interface.
      perRoom: true,
      pricePerUnit: 800, // ~780–899 € (UVP/Amazon 2026)
      priceRange: [0.75, 1.3], // ~600–1.050 € je Gerät
    },
    {
      id: "split",
      label: "Fest installierte Split-Anlage",
      what: "Innen- und Außeneinheit, fest montiert. Effizientester Typ, braucht aber Installation durch einen Fachbetrieb. Mehrere Räume als Multisplit.",
      // Label: SEER 6,5 = A++, Mitte des Marktkorridors 6–7, in dem die meisten
      // Modelle liegen. Bewusst NICHT die Spitze (8,5–9,5, Topten-BAT-Liste) und
      // nicht das gesetzliche Minimum 4,6 — der Rechner soll das Gerät treffen,
      // das Leute tatsächlich einbauen lassen.
      labelMetric: "SEER",
      labelValue: 6.5,
      labelClass: "A++",
      structuralFactor: 1.0,   // EN 14825, siehe portasplit
      seer: effectiveSeer(6.5, 1.0),   // → 5,5
      canHeat: true,
      scop: 4.2,         // fest installierte Split Heizen ~4,0–4,6 (A+++ Wärmepumpen-Split)
                         // Typenschild-Wert — siehe "OFFEN (07/2026)" oben im Interface.
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

  defaultDeviceId: "portasplit",
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

  heatSpecKwhPerM2: 55,   // Übergangszeit-Heizwärme je m² (kWh/m²·a), editierbar

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

  source: "Open-Meteo Wetterarchiv + Climate API (CMIP6, Kühlgradstunden), DWD/UBA (Hitzetage-Trend), EU-Verordnung 626/2011 + EN 14825/14511 (Effizienz-Skalen), Topten.eu + Hersteller-Datenblätter (Labelwerte), Energy and Buildings 2025 + test.de 2025/26 (Realbetrieb), ADAC/daibau/reduco Festpreise 2026 (Anschaffung/Montage), BDEW (Strom), UBA (Strommix-CO₂)",
  validFrom: "2026-07-15",
  reviewBy: "2027-04-30",
};
