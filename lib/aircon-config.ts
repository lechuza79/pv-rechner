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

import { INSULATION_BESTAND, INSULATION_NEUBAU, type KennwertArt } from "./constants";
import { DEFAULT_PRICES } from "./prices-config";

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

/**
 * Dasselbe fürs HEIZEN (SCOP): Typenschild → Realbetrieb.
 *
 * Der struktureller Faktor ist hier 1,0 und hat deshalb kein Argument: Was die
 * Prüfnorm beim Heizen ausklammern könnte (Hilfsenergie, Abtauung), ist in
 * EN 14825 Abschnitt 3.19 bereits enthalten. Der eine echte Effekt außerhalb
 * der Normgrenze — ein Split-Gerät ist eine Punktquelle, die Norm unterstellt
 * ideale Wärmeverteilung — ist von niemandem quantifiziert; ihn zu schätzen
 * wäre der Ermessens-Abschlag, den die Systematik verbietet.
 *
 * ÜBERTRAGENER FAKTOR, BEWUSST KONSERVATIV (Entscheidung des Betreibers,
 * 28.07.2026): `AC_REAL_FACTOR` ist am Kühlen belegt, nicht am Heizen. Die
 * Leitquelle (Erginer & Aydoğdu) misst beide Richtungen am selben Gerät, nennt
 * frei aber nur den gemeinsamen Wert — die Aufteilung je Metrik steht im
 * kostenpflichtigen Volltext. Vorher stand hier ein Handwert ohne jede
 * Herleitung, und Heizen war dadurch optimistischer gerechnet als Kühlen: die
 * Ersparnis gegenüber Gas fiel rund ein Drittel zu hoch aus. Die Übertragung
 * ist die konservative Wahl — sie kann die Ersparnis höchstens zu niedrig
 * zeigen, und das ist bei einer Ersparnis-Angabe die richtige Richtung.
 * Steht der Volltext zur Verfügung, wird der Heiz-Faktor durch den dort
 * belegten ersetzt (Runbook scripts/klimaanlage-verify.md → 4.5).
 */
export function effectiveScop(labelValue: number): number {
  return Math.round(labelValue * AC_REAL_FACTOR * 10) / 10;
}

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
  specKwh: number;   // kWh/m²·a Jahres-Heizwärme-NORMBEDARF (kanonisch aus constants.ts)
  /** Norm-Bedarf oder bereits gemessener Verbrauch (siehe INSULATION_BESTAND).
   *  Entscheidet zusammen mit `situation`, ob die Bedarf→Verbrauch-Korrektur greift
   *  (lib/heat-consumption.ts) — beides als Feld und nicht über die id erkannt,
   *  damit kein Aufrufer den Sonderfall an einem Zeichenketten-Vergleich nachbaut. */
  art: KennwertArt;
  /** Bestand oder Neubau — im Neubau wird NICHT nach unten korrigiert (dort liegt
   *  der gemessene Verbrauch eher über dem Bedarf, FHNW PRO380 S. 17). */
  situation: "bestand" | "neubau";
}

/** Stabile ids der Bestandsstufen. Sie hängen an der Stufe, NICHT an ihrer
 *  Position — `defaultHeatStandard` und gemerkte Auswahlen bleiben gültig, auch
 *  wenn die Tabelle wächst oder umsortiert wird. */
const BESTAND_IDS: Record<string, string> = {
  "Unsaniert": "unsaniert",
  "Teilsaniert": "teilsaniert",
  "Gut saniert": "saniert",
  "Vollsaniert": "vollsaniert",
};

/** id für eine Stufe: gepflegter Wert, sonst aus dem Label abgeleitet. */
function bestandId(label: string): string {
  return BESTAND_IDS[label] ?? label.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Die Bestandsstufen werden AUS der geteilten Tabelle gebaut, nicht Stufe für
// Stufe abgeschrieben: Eine neue Dämmstufe in INSULATION_BESTAND (zuletzt
// „Vollsaniert", 28.07.2026) taucht hier sonst still gar nicht auf — der
// Klima-Rechner böte dann weniger Stufen an als der WP-Rechner, ohne dass
// irgendetwas rot wird. Festgenagelt von lib/__tests__/aircon.test.ts
// („Dämmstufen-Vollständigkeit").
export const AC_HEAT_STANDARDS: AcHeatStandard[] = [
  ...INSULATION_BESTAND.map(i => ({ id: bestandId(i.label), label: i.label, sub: i.sub, specKwh: i.specKwh, art: i.art, situation: "bestand" as const })),
  // Neubau: gesetzlicher Mindeststandard als Bucket. Wer KfW 55/40 hat, liegt
  // darunter und korrigiert die Heizwärme direkt im Ergebnis (InlineEdit).
  { id: "neubau", label: `Neubau (${INSULATION_NEUBAU[0].label})`, sub: INSULATION_NEUBAU[0].sub, specKwh: INSULATION_NEUBAU[0].specKwh, art: INSULATION_NEUBAU[0].art, situation: "neubau" as const },
];

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
  // `scop` läuft seit 28.07.2026 über DIESELBE Ableitung wie `seer`
  // (effectiveScop = labelScop × AC_REAL_FACTOR). Davor war es ein Handwert, und
  // Kühlen war realistisch, Heizen optimistisch gerechnet — dieselbe Asymmetrie,
  // die die SEER-Systematik zuvor auf der Kühlachse beseitigt hatte. Wirkung der
  // Umstellung: Die Ersparnis gegenüber Gas im „Auch heizen?"-Block war rund ein
  // Drittel zu hoch (Beispiel 40 m² teilsaniert: 106 € statt 71 € im Jahr). Die
  // Grundaussage — Split heizt in der Übergangszeit günstiger als Gas — bleibt.
  //
  // Der Faktor ist am KÜHLEN belegt und aufs Heizen ÜBERTRAGEN; die Begründung
  // steht bei effectiveScop. Das ist die bewusst konservative Wahl (Entscheidung
  // des Betreibers, 28.07.2026) statt eines unbelegten Handwerts.
  //
  // OFFEN (bis 10/2026): Der am Heizen belegte Abschlag steht nur im
  // kostenpflichtigen Volltext der Leitquelle. Kommt er, ersetzt er den
  // übertragenen Faktor (Runbook 4.5) — dann bekommt effectiveScop einen eigenen
  // Faktor statt AC_REAL_FACTOR.
  //
  // Recherchestand 07/2026 (zwei unabhängige Läufe, Herstellerdatenblätter):
  //  · Mobile Split: der einzige belegte Labelwert der ganzen Kategorie ist
  //    SCOP 4,0 (Midea PortaSplit; unabhängig bestätigt an Qlima QsplitFlex und
  //    Trotec PAC-S 3510 SH, dieselbe OEM-Plattform). Er ist seit dem 28.07.2026
  //    als `labelScop` hinterlegt; der frühere freie Wert 3,6 ist damit weg.
  //  · Fest installiert: SCOP und SEER sind im Markt fest gekoppelt (SEER 6,1–7,0
  //    → SCOP 4,0–4,2 · SEER 8,5–8,8 → 4,6–4,8 · SEER 9,5–10,5 → 5,1–5,2, weil
  //    die Hersteller exakt auf die nächste Effizienzklasse zielen). Unser
  //    SEER-Label 6,5 gehört damit zu SCOP 4,0–4,2 — die hinterlegten 4,2 sind
  //    also intern konsistent. WICHTIG: nur als PAAR bewegen. Wer den SCOP allein
  //    auf den Mittelklasse-Median 4,6 zieht, beschreibt ein Gerät, das es nicht
  //    gibt.
  //
  // Zum Stand der Leitquelle: Die Studie hinter AC_REAL_FACTOR (Erginer &
  // Aydoğdu, Energy and Buildings 350/2026, Art. 116631, DOI
  // 10.1016/j.enbuild.2025.116631, akkreditiertes Kalorimeter) misst SEER UND
  // SCOP am selben Gerät, berichtet frei aber nur „bis zu 50 %" für beide
  // zusammen. Die Aufteilung je Metrik steht im kostenpflichtigen Volltext.
  // Alle frei zugänglichen Feldzahlen zum Heizen liegen unter 0,85 × Label,
  // tragen aber je einen Confounder (Kaltklima / Passivhaus / Flüstermodus) und
  // stützen deshalb auch keinen anderen Faktor. Deshalb der übertragene statt
  // eines geschätzten Werts — ein Ermessens-Abschlag wäre genau das, was die
  // Systematik verbietet.
  //
  // ACHTUNG BEIM AUFLÖSEN: Derselbe Volltext trägt auch den am KÜHLEN belegten
  // Abschlag. AC_REAL_FACTOR = 0,85 ist heute aus „bis zu 50 %" gewählt, nicht
  // daraus abgelesen — der Volltext prüft also nicht nur den Heiz-, sondern
  // auch den Kühlwert, und der trägt die Effizienz ALLER Gerätetypen.
  // Vorgehen: scripts/klimaanlage-verify.md → 4.5.
  canHeat: boolean;
  /** Typenschild-SCOP (EN 14825). Basis für `scop` — nie direkt verrechnen. */
  labelScop?: number;
  /** EFFEKTIVE Heiz-Jahreseffizienz = effectiveScop(labelScop). Heizstrom = Heizwärme / scop. */
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
  validFrom: string;           // ISO — Stand der Werte selbst (nur hochsetzen, wenn sich ein Wert ändert)
  /**
   * ISO — Tag, an dem ein Wächter-Lauf die Quellen zuletzt wirklich erreicht
   * und die Werte nachgelesen hat. Getrennt von `validFrom`, weil „geprüft und
   * unverändert" das Normalergebnis ist: Es ändert keinen Wert, ist aber genau
   * die Auskunft, die dieses Datum gibt. Wandert bei jedem erreichten Lauf mit,
   * bleibt bei einem gescheiterten stehen (scripts/waechter-gate.md).
   * Sichtbar auf /klimaanlage-stromkosten über lib/stand.ts.
   */
  geprueftIso: string;
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
      // Gerätepreis, keine Montage. 500 € = Mittelfeld, bewusst nicht die
      // Einstiegsklasse: ein zu billiger Monoblock lässt die schlechteste
      // Effizienz im Vergleich am besten dastehen.
      // Belegt (geprüft 27.07.2026): Que Choisir 2026, von test.de referiert
      // (29.05.2026): Ariston Mobis Plus 10 393 €, Bosch Cool 4000 567 €,
      // Black+Decker BXAC9000E 693 €. ACHTUNG bei der Quellenangabe: test.de
      // prüft seit 2021 KEINE Monoblöcke mehr selbst — das sind Zahlen der
      // französischen Partnerorganisation. Marktbreite Spanne 300–700 €,
      // Einstieg unter 300 € (verbraucher.online, 29.06.2026).
      pricePerUnit: 500,
      priceRange: [0.65, 1.5], // → ~325–750 €, deckt beide Belege ab
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
      // Typenschild SCOP 4,0 (Midea PortaSplit — einziger belegter Labelwert der
      // ganzen Kategorie, an drei baugleichen Geräten bestätigt: Qlima QsplitFlex,
      // Trotec PAC-S 3510 SH). Der frühere Wert 3,6 war ein Handwert ohne
      // Marktentsprechung — faktisch ein 10-%-Abschlag auf dieses Label, nur nie
      // als solcher hergeleitet.
      labelScop: 4.0,
      scop: effectiveScop(4.0),   // → 3,4
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
      // Typenschild SCOP 4,2, passend zum SEER-Label 6,5 oben: Bosch Climate
      // 3000i (SEER 7,0) und Daikin Sensira (SEER 6,5) tragen beide SCOP 4,2.
      // Konsistentes Paar — nur gemeinsam mit dem SEER-Label bewegen.
      labelScop: 4.2,
      scop: effectiveScop(4.2),   // → 3,6
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

  stromPrice: DEFAULT_PRICES.electricityPrice, // kanonischer Haushaltspreis (kein eigener Wert → kein Drift)
  gridCo2PerKwh: 0.38,   // kg CO₂/kWh deutscher Strommix (UBA 2023, sinkend) — wie heatpump.ts

  source: "Open-Meteo Wetterarchiv + Climate API (CMIP6, Kühlgradstunden), DWD/UBA (Hitzetage-Trend), EU-Verordnung 626/2011 + EN 14825/14511 (Effizienz-Skalen), Topten.eu + Hersteller-Datenblätter (Labelwerte), Energy and Buildings 2025 + test.de 2025/26 (Realbetrieb), ADAC/daibau/reduco Festpreise 2026 (Anschaffung/Montage), dena Gebäudereport/DIN V 18599 (Heizwärmebedarf je Gebäudestandard, geteilt mit dem Wärmepumpen-Rechner), BDEW (Strom/Gas), UBA (Strommix-CO₂)",
  validFrom: "2026-07-15",
  // Jüngster Tag, für den eine Prüfung der KÜHL-Werte im Repo belegt ist: der
  // Monoblock-Preis wurde am 27.07.2026 gegen Que Choisir (via test.de) neu
  // belegt. Bewusst NICHT der spätere Commit vom 31.07.2026 — der betraf die
  // Heizseite. `validFrom` bleibt beim 15.07., dem Stand der Werte.
  geprueftIso: "2026-07-27",
  // Von den beiden zusammengefuehrten Staenden gewinnt das FRUEHERE Pruefdatum:
  // Der Quartals-Waechter laeuft ohnehin, und das spaetere Datum wuerde die
  // Kuehl-Effizienzen laenger ungeprueft altern lassen.
  reviewBy: "2026-10-15",
};
