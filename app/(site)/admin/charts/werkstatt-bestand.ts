import type { WidgetId } from "../../../../lib/widget-registry";

/**
 * What the widget workshop knows about each registry entry beyond its identity.
 *
 * NOT a second register: keyed by the registry's own ids (a missing or extra key
 * is a type error), and every claim about the code is checked against the code
 * by lib/__tests__/widget-werkstatt.test.ts (component files exist, usage sites
 * reference the entry, preview keys exist). Identity — title, kind, sources,
 * share target, embeddability — stays in lib/widget-registry.ts.
 */

export type Ebene = "gemeinde" | "landkreis" | "bundesland" | "de";

export const EBENEN: { id: Ebene; label: string }[] = [
  { id: "gemeinde", label: "Gemeinde" },
  { id: "landkreis", label: "Landkreis" },
  { id: "bundesland", label: "Bundesland" },
  { id: "de", label: "Deutschland" },
];

/**
 * How far the entry uses the shared chrome:
 *  • zentral   — ExportableWidgetFrame + ChartOptionsMenu (one action set, both presentations)
 *  • teilweise — registry footer (WidgetFooter → ChartActionBar) and shared export footer,
 *                but not the shared frame and options menu
 *  • separat   — own chrome, or no widget in the code at all
 */
export type Einbindung = "zentral" | "teilweise" | "separat";

/** Keys of the shared monitor adapters (useRegionalMonitorWidgets / gemeindeMonitorWidgets). */
export type MonitorSchluessel =
  | "currentPower"
  | "growth"
  | "categories"
  | "composition"
  | "electricity-value"
  | "feed-in-value"
  | "radial"
  | "energy-year"
  | "race";

export type Vorschau =
  /** The real monitor widget, from the page's own data readers. */
  | { art: "monitor"; schluessel: MonitorSchluessel }
  /** The real embed route in a frame; `param` carries the chosen area. */
  | { art: "einbettung"; param?: "ags" | "bl" }
  | { art: "keine"; grund: string };

export interface WerkstattEintrag {
  zweck: string;
  /** The file that renders the widget. */
  komponente: string;
  einbindung: Einbindung;
  /**
   * Where the entry is used. `datei` must reference `WIDGETS.<id>`, unless
   * `dynamisch` says the reference is indirect (template catalog, lookup table).
   */
  einsatzorte: { wo: string; datei: string; dynamisch?: true }[];
  ebenen: Ebene[];
  funktionen: string[];
  luecken: string[];
  /** Only with evidence. Technical availability is NOT acceptance. */
  abnahme?: { was: string; beleg: string };
  vorschau: Vorschau;
}

const MONITOR_FUNKTIONEN = ["Teilen (Link kopieren, weiterleiten)", "Bild herunterladen", "Detailansicht als Fenster", "Quelle an der Kante, im Bild mit Lizenz"];
const MONITOR_EINBETTEN = "Einbetten nicht möglich: keine Einbett-Route (im Menü als „noch nicht verfügbar“ ausgewiesen).";
const REGIONAL = ["Landkreisseite, Bundeslandseite, Deutschlandseite (Energiemonitor)"];
const ALTE_FUSSZEILE = "Aktionen über die ältere Fußzeile (WidgetFooter/ChartActionBar), nicht über das gemeinsame Optionsmenü — Aktionsdarstellung in der Werkstatt nicht umschaltbar.";

export const WERKSTATT_BESTAND: Record<WidgetId, WerkstattEintrag> = {
  regionalCurrentPower: {
    zweck: "Simulierte Solarleistung des heutigen Tages als 24-Stunden-Zifferblatt.",
    komponente: "components/charts/CurrentPowerWidget.tsx",
    einbindung: "zentral",
    einsatzorte: [
      { wo: "Gemeindeseite (Energiemonitor)", datei: "components/gemeinde/GemeindeMonitor.tsx" },
      { wo: REGIONAL[0], datei: "components/landkreis/LandkreisMonitor.tsx" },
    ],
    ebenen: ["gemeinde", "landkreis", "bundesland", "de"],
    funktionen: MONITOR_FUNKTIONEN,
    luecken: [
      MONITOR_EINBETTEN,
      "Kein Zeitraum wählbar: zeigt immer den heutigen Tag.",
      "Bundesland/Deutschland: Tageskurve fehlt, solange der stündliche Wetterlauf für ein Land nicht vollständig ist (am 27.09.2026 für Schleswig-Holstein, Rheinland-Pfalz und Deutschland).",
      "Bild-Download verweigert, solange keine Kurve geladen ist.",
    ],
    vorschau: { art: "monitor", schluessel: "currentPower" },
  },
  regionalAnnualGrowth: {
    zweck: "Neue Solaranlagen je Inbetriebnahmejahr.",
    komponente: "components/charts/AnnualGrowthWidget.tsx",
    einbindung: "zentral",
    einsatzorte: [{ wo: "Gemeindeseite und " + REGIONAL[0], datei: "components/charts/AnnualGrowthWidget.tsx" }],
    ebenen: ["gemeinde", "landkreis", "bundesland", "de"],
    funktionen: [...MONITOR_FUNKTIONEN, "Zeitraum: seit 2014, letzte 10 oder 5 Jahre"],
    luecken: [MONITOR_EINBETTEN, "Das laufende Jahr ist unvollständig und wird nur im Hilfetext benannt."],
    vorschau: { art: "monitor", schluessel: "growth" },
  },
  regionalComposition: {
    zweck: "Installierte Solarleistung nach Anlagentyp als Ring mit Detailkarten.",
    komponente: "components/charts/ShareDonut.tsx",
    einbindung: "zentral",
    einsatzorte: [
      { wo: REGIONAL[0], datei: "components/landkreis/LandkreisMonitor.tsx" },
      { wo: "Gemeindeseite (Energiemonitor, Vorlage „anteilsdonut“)", datei: "components/gemeinde/GemeindeMonitor.tsx", dynamisch: true },
    ],
    ebenen: ["gemeinde", "landkreis", "bundesland", "de"],
    funktionen: MONITOR_FUNKTIONEN,
    luecken: [MONITOR_EINBETTEN, "Monatsauswahl nur auf der Gemeindeseite; regional immer der heutige Registerstand."],
    vorschau: { art: "monitor", schluessel: "categories" },
  },
  gemeindeAnlagenraster: {
    zweck: "Anteil einer Anlagenart an der Anzahl (Raster) und an der Solarleistung (Bogen).",
    komponente: "components/charts/CompositionChart.tsx",
    einbindung: "zentral",
    einsatzorte: [
      { wo: REGIONAL[0], datei: "components/landkreis/LandkreisMonitor.tsx" },
      { wo: "Gemeindeseite (Energiemonitor, Vorlage „anlagenraster“)", datei: "components/gemeinde/GemeindeMonitor.tsx", dynamisch: true },
      { wo: "Geschichten mit Bild-Download", datei: "components/gemeinde/GemeindeInsights.tsx", dynamisch: true },
    ],
    ebenen: ["gemeinde", "landkreis", "bundesland", "de"],
    funktionen: MONITOR_FUNKTIONEN,
    luecken: [MONITOR_EINBETTEN, "Drei Karten je Gebiet (Gebäude, Balkon, Freifläche); alle tragen dieselbe Kennung im Register."],
    abnahme: { was: "Monitor, Geschichte und Bild pixelgleich zum Ausgangsstand", beleg: "docs/zentrale-visuals-konzept.md, Abschnitt 4b (25.09.2026)" },
    vorschau: { art: "monitor", schluessel: "composition" },
  },
  regionalElectricityValue: {
    zweck: "Wert des Solarstroms eines Monats (Modellrechnung).",
    komponente: "components/landkreis/DistrictEnergyWidgets.tsx",
    einbindung: "zentral",
    einsatzorte: [
      { wo: REGIONAL[0], datei: "components/landkreis/DistrictEnergyWidgets.tsx" },
      { wo: "Gemeindeseite (Energiemonitor)", datei: "components/gemeinde/GemeindeMonitor.tsx", dynamisch: true },
    ],
    ebenen: ["gemeinde", "landkreis", "bundesland", "de"],
    funktionen: [...MONITOR_FUNKTIONEN, "Monat wählbar (nur vollständig berechenbare Monate)"],
    luecken: [MONITOR_EINBETTEN, "Fehlt ganz, solange nicht alle Teilgebiete auf gemeinsamer Grundlage berechenbar sind."],
    vorschau: { art: "monitor", schluessel: "electricity-value" },
  },
  regionalFeedInValue: {
    zweck: "Einspeisevergütung eines Monats (Modellrechnung).",
    komponente: "components/landkreis/DistrictEnergyWidgets.tsx",
    einbindung: "zentral",
    einsatzorte: [
      { wo: REGIONAL[0], datei: "components/landkreis/DistrictEnergyWidgets.tsx" },
      { wo: "Gemeindeseite (Energiemonitor und Kopfkachel)", datei: "components/gemeinde/GemeindeMonitor.tsx", dynamisch: true },
    ],
    ebenen: ["gemeinde", "landkreis", "bundesland", "de"],
    funktionen: [...MONITOR_FUNKTIONEN, "Monat wählbar (nur vollständig berechenbare Monate)"],
    luecken: [MONITOR_EINBETTEN, "Fehlt ganz, solange nicht alle Teilgebiete auf gemeinsamer Grundlage berechenbar sind."],
    vorschau: { art: "monitor", schluessel: "feed-in-value" },
  },
  gemeindeSolarMonat: {
    zweck: "Solarerzeugung jedes Tages eines Monats über 24 Stunden, animiert.",
    komponente: "components/charts/MonthlySolarRadial.tsx",
    einbindung: "zentral",
    einsatzorte: [
      { wo: REGIONAL[0], datei: "components/landkreis/DistrictEnergyWidgets.tsx" },
      { wo: "Gemeindeseite (Energiemonitor, Kopfkachel)", datei: "components/gemeinde/GemeindeMonitor.tsx", dynamisch: true },
      { wo: "Geschichten mit Bild-Download", datei: "components/gemeinde/GemeindeInsights.tsx", dynamisch: true },
    ],
    ebenen: ["gemeinde", "landkreis", "bundesland", "de"],
    funktionen: [...MONITOR_FUNKTIONEN, "Monat und Tag wählbar, Wiedergabe", "Neustart der Animation", "Bild: aktueller Stand oder Endstand", "Video (MP4)"],
    luecken: [MONITOR_EINBETTEN, "Video auf dem iPhone nicht geprüft."],
    abnahme: { was: "Kopfkachel pixelgleich zum Ausgangsstand (1440 und 375 px)", beleg: "docs/zentrale-visuals-konzept.md, Abschnitt 4e (26.09.2026)" },
    vorschau: { art: "monitor", schluessel: "radial" },
  },
  gemeindeEnergieJahr: {
    zweck: "Modellierte Solar- (und Wind-)Erzeugung jedes Tages eines Jahres.",
    komponente: "components/charts/EnergyYearRadial.tsx",
    einbindung: "zentral",
    einsatzorte: [
      { wo: REGIONAL[0], datei: "components/landkreis/DistrictEnergyWidgets.tsx" },
      { wo: "Gemeindeseite (Energiemonitor)", datei: "components/gemeinde/GemeindeMonitor.tsx", dynamisch: true },
      { wo: "Geschichten mit Bild-Download", datei: "components/gemeinde/GemeindeInsights.tsx", dynamisch: true },
    ],
    ebenen: ["gemeinde", "landkreis", "bundesland", "de"],
    funktionen: [...MONITOR_FUNKTIONEN, "Jahr und Energieträger wählbar"],
    luecken: [MONITOR_EINBETTEN, "Teilen-Text nennt Wind auch bei Orten ohne Windkraft."],
    vorschau: { art: "monitor", schluessel: "energy-year" },
  },
  regionalRace: {
    zweck: "Rennen der Teilgebiete nach Anzahl Solaranlagen seit 2000.",
    komponente: "components/landkreis/DistrictRaceWidget.tsx",
    einbindung: "zentral",
    einsatzorte: [{ wo: "Landkreis-, Bundesland-, Deutschlandseite (Ranking)", datei: "components/landkreis/DistrictRaceWidget.tsx" }],
    ebenen: ["landkreis", "bundesland", "de"],
    funktionen: [...MONITOR_FUNKTIONEN, "Neustart der Animation", "Bild: aktueller Stand oder Endstand", "Video (MP4)", "Sichtbare Aktionsfußleiste (einziger Verbraucher)"],
    luecken: [MONITOR_EINBETTEN, "Nicht für Gemeinden: dort gibt es kein Rennen, sondern das Siegertreppchen der Rangliste.", "Nur mit mindestens zwei Teilgebieten (Berlin, Hamburg nicht)."],
    abnahme: { was: "Aktionsfußleiste des Rennens", beleg: "docs/zentrale-visuals-konzept.md, Release closeout (28.09.2026)" },
    vorschau: { art: "monitor", schluessel: "race" },
  },
  // ── Einbett-Widgets mit der älteren Fußzeile ─────────────────────────────────
  gemeindeSolar: {
    zweck: "Kennzahlen der Solaranlagen einer Gemeinde.",
    komponente: "app/(embed)/embed/gemeinde-solar/client.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Einbett-Route und Widget-Galerie", datei: "app/(embed)/embed/gemeinde-solar/client.tsx" }],
    ebenen: ["gemeinde"],
    funktionen: ["Einbetten", "Teilen", "Bild herunterladen"],
    luecken: [ALTE_FUSSZEILE, "Implementierung liegt in der Einbett-Route, nicht in components/."],
    vorschau: { art: "einbettung", param: "ags" },
  },
  gemeindeErneuerbare: {
    zweck: "Erneuerbare Leistung einer Gemeinde nach Technologie.",
    komponente: "components/atlas/GemeindeErneuerbareWidget.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Einbett-Route und Widget-Galerie", datei: "components/atlas/GemeindeErneuerbareWidget.tsx" }],
    ebenen: ["gemeinde"],
    funktionen: ["Einbetten", "Teilen", "Bild herunterladen"],
    luecken: [ALTE_FUSSZEILE],
    vorschau: { art: "einbettung", param: "ags" },
  },
  gemeindeSolarleistung: {
    zweck: "Simulierte Solarleistung einer Gemeinde; nur noch über die Einbett-Route verwendet.",
    komponente: "components/atlas/GemeindeSolarLive.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Einbett-Route und Widget-Galerie", datei: "components/atlas/GemeindeSolarLive.tsx" }],
    ebenen: ["gemeinde"],
    funktionen: ["Einbetten", "Teilen"],
    luecken: [ALTE_FUSSZEILE, "Zeigt dieselbe Größe wie „Solarleistung heute“ im Monitor mit eigener Zeichnung."],
    vorschau: { art: "einbettung", param: "ags" },
  },
  gemeindeMeldung: {
    zweck: "Gerechnete Meldung (Ortsgeschichte) einer Gemeinde als Karte.",
    komponente: "components/social/OrtsStoryAnsicht.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Ortsgeschichten (Redaktion und Gemeindeseite)", datei: "components/social/OrtsStoryAnsicht.tsx" }],
    ebenen: ["gemeinde"],
    funktionen: ["Bild herunterladen"],
    luecken: ["Gehört zu Redaktion und Datenstories und ist hier bewusst nicht angebunden.", "Keine Einbett-Route."],
    vorschau: { art: "keine", grund: "Gehört zu Redaktion und Datenstories (außerhalb dieses Auftrags); keine Einbett-Route." },
  },
  regionAnlagentyp: {
    zweck: "Solarleistung eines Bundeslands nach Anlagentyp (ältere Fassung).",
    komponente: "components/RegionAnlagentypWidget.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Förderseite je Bundesland, Einbett-Route", datei: "components/RegionAnlagentypWidget.tsx" }],
    ebenen: ["bundesland"],
    funktionen: ["Einbetten", "Teilen", "Bild herunterladen"],
    luecken: [ALTE_FUSSZEILE, "Überschneidet sich mit „Solarleistung nach Anlagentyp“ im Monitor (eigene Zeichnung)."],
    vorschau: { art: "einbettung", param: "bl" },
  },
  regionSolarleistung: {
    zweck: "Simulierte Solarleistung eines Bundeslands (ältere Fassung).",
    komponente: "components/RegionSolarLive.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Förderseite je Bundesland, Einbett-Route", datei: "components/RegionSolarLive.tsx" }],
    ebenen: ["bundesland"],
    funktionen: ["Einbetten", "Teilen"],
    luecken: [ALTE_FUSSZEILE, "Überschneidet sich mit „Solarleistung heute“ im Monitor (eigene Zeichnung)."],
    vorschau: { art: "einbettung", param: "bl" },
  },
  strommix: {
    zweck: "Strommix Deutschland über wählbare Zeiträume.",
    komponente: "app/(embed)/embed/strommix/client.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Einbett-Route; eingebettet in Widget-Galerie und Atomstrom-Seite", datei: "app/(embed)/embed/strommix/client.tsx" }, { wo: "Komponenten-Galerie", datei: "app/(site)/admin/komponenten/KomponentenSchau.tsx" }],
    ebenen: ["de"],
    funktionen: ["Zeitraum (24 h bis Max)", "Einbetten", "Teilen", "Bild herunterladen"],
    luecken: [ALTE_FUSSZEILE, "Implementierung liegt in der Einbett-Route."],
    vorschau: { art: "einbettung" },
  },
  strommixAnteil: {
    zweck: "Anteil der Kernenergie im deutschen Strommix inkl. Import.",
    komponente: "app/(embed)/embed/strommix-anteil/client.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Einbett-Route; eingebettet in Widget-Galerie und Atomstrom-Seite", datei: "app/(embed)/embed/strommix-anteil/client.tsx" }],
    ebenen: ["de"],
    funktionen: ["Einbetten", "Teilen", "Bild herunterladen"],
    luecken: [ALTE_FUSSZEILE, "Implementierung liegt in der Einbett-Route."],
    vorschau: { art: "einbettung" },
  },
  zubauErneuerbareAtom: {
    zweck: "Zubau Erneuerbare gegen Atomkraft im Ländervergleich.",
    komponente: "app/(embed)/embed/zubau-erneuerbare-atom/client.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Einbett-Route; eingebettet in Widget-Galerie, Atomstrom-Seite und Ländervergleich", datei: "app/(embed)/embed/zubau-erneuerbare-atom/client.tsx" }],
    ebenen: ["de"],
    funktionen: ["Land wählbar, Deutschland zum Vergleich", "Einbetten", "Teilen", "Bild herunterladen"],
    luecken: [ALTE_FUSSZEILE, "Implementierung liegt in der Einbett-Route."],
    vorschau: { art: "einbettung" },
  },
  einspeiseVerlauf: {
    zweck: "Einspeisevergütung kleiner Dachanlagen seit 2000 mit Meilensteinen.",
    komponente: "app/(site)/einspeiseverguetung-tabelle/VerlaufMitMeilensteinen.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Ratgeber Einspeisevergütung, Einbett-Route", datei: "app/(site)/einspeiseverguetung-tabelle/VerlaufMitMeilensteinen.tsx" }],
    ebenen: ["de"],
    funktionen: ["Einbetten", "Teilen", "Bild herunterladen"],
    luecken: [ALTE_FUSSZEILE, "Implementierung liegt in einer Seitenroute."],
    vorschau: { art: "einbettung" },
  },
  pvZubau: {
    zweck: "PV-Zubau in Deutschland mit Förder-Meilensteinen.",
    komponente: "components/charts/ZubauWidget.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Zubau-Seite, Ratgeber Einspeisevergütung, Einbett-Route", datei: "components/charts/ZubauWidget.tsx" }],
    ebenen: ["de"],
    funktionen: ["Zeitleiste", "Einbetten", "Teilen", "Bild herunterladen"],
    luecken: [ALTE_FUSSZEILE],
    vorschau: { art: "einbettung" },
  },
  erzeugung: {
    zweck: "Erneuerbare Erzeugung als Radial mit Autowechsel.",
    komponente: "components/ErzeugungWidget.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Einbett-Routen (groß und klein), Live-Block „Jetzt im Netz“", datei: "components/ErzeugungWidget.tsx" }],
    ebenen: ["de"],
    funktionen: ["Energieträger wählbar", "Einbetten", "Teilen", "Bild herunterladen"],
    luecken: [ALTE_FUSSZEILE],
    vorschau: { art: "einbettung" },
  },
  eeAmpel: {
    zweck: "Wie grün der deutsche Strom gerade ist.",
    komponente: "app/(embed)/embed/ee-ampel/client.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Einbett-Route; eingebettet in der Widget-Galerie", datei: "app/(embed)/embed/ee-ampel/client.tsx" }],
    ebenen: ["de"],
    funktionen: ["Einbetten", "Teilen"],
    luecken: [ALTE_FUSSZEILE, "Kein Bild-Download (kein Chart-SVG)."],
    vorschau: { art: "einbettung" },
  },
  karte: {
    zweck: "Karte der PV-Anlagen in Deutschland mit Kennzahlen.",
    komponente: "app/(embed)/embed/karte/client.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Einbett-Route; eingebettet in der Widget-Galerie", datei: "app/(embed)/embed/karte/client.tsx" }],
    ebenen: ["de"],
    funktionen: ["Einbetten", "Teilen"],
    luecken: [ALTE_FUSSZEILE, "Kein Bild-Download (Karte)."],
    vorschau: { art: "einbettung" },
  },
  anlagenbestand: {
    zweck: "Deutscher Solarbestand nach Anlagentyp: Stückzahl gegen Leistung.",
    komponente: "components/charts/AnlagenbestandWidget.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Bestandsseite, Einbett-Route", datei: "components/charts/AnlagenbestandWidget.tsx" }],
    ebenen: ["de"],
    funktionen: ["Einbetten", "Teilen", "Bild herunterladen"],
    luecken: [ALTE_FUSSZEILE],
    vorschau: { art: "einbettung" },
  },
  kennzahl: {
    zweck: "Einzelne Solar-Kennzahl für Deutschland.",
    komponente: "app/(embed)/embed/kennzahl/client.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Einbett-Route; eingebettet in der Widget-Galerie", datei: "app/(embed)/embed/kennzahl/client.tsx" }],
    ebenen: ["de"],
    funktionen: ["Einbetten", "Teilen"],
    luecken: [ALTE_FUSSZEILE, "Kein Bild-Download."],
    vorschau: { art: "einbettung" },
  },
  kostenrennen: {
    zweck: "Stromkosten mit und ohne Solaranlage über 25 Jahre, animiert.",
    komponente: "components/charts/KostenrennenWidget.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Ratgeber Speicher (auch als Kurzfassung), Einbett-Route", datei: "components/charts/KostenrennenWidget.tsx" }],
    ebenen: ["de"],
    funktionen: ["Animation", "Video", "Einbetten", "Teilen", "Bild herunterladen"],
    luecken: [ALTE_FUSSZEILE, "Eigener Race-Chart-Baustein, nicht das regionale Rennen."],
    vorschau: { art: "einbettung" },
  },
  heizkostenrennen: {
    zweck: "Heizkosten Gasheizung gegen Wärmepumpe über 20 Jahre, animiert.",
    komponente: "components/charts/HeizkostenrennenWidget.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Ratgeber Gasheizung oder Wärmepumpe, Einbett-Route", datei: "components/charts/HeizkostenrennenWidget.tsx" }],
    ebenen: ["de"],
    funktionen: ["Animation", "Video", "Einbetten", "Teilen", "Bild herunterladen"],
    luecken: [ALTE_FUSSZEILE],
    vorschau: { art: "einbettung" },
  },
  gruengasHeizkosten: {
    zweck: "Heizkosten-Varianten über 20 Jahre.",
    komponente: "components/charts/GruengasWidget.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Ratgeber Gasheizung oder Wärmepumpe, Einbett-Route", datei: "components/charts/GruengasWidget.tsx" }],
    ebenen: ["de"],
    funktionen: ["Gebäudestand wählbar", "Einbetten", "Teilen", "Bild herunterladen"],
    luecken: [ALTE_FUSSZEILE],
    vorschau: { art: "einbettung" },
  },
  foerderCheck: {
    zweck: "Förder-Check Wärmepumpe (Werkzeug).",
    komponente: "app/(embed)/embed/foerder-check/client.tsx",
    einbindung: "teilweise",
    einsatzorte: [{ wo: "Einbett-Route; eingebettet in Widget-Galerie und Ratgeber Wärmepumpen-Förderung", datei: "app/(embed)/embed/foerder-check/client.tsx" }],
    ebenen: ["de"],
    funktionen: ["Eingaben", "Einbetten", "Teilen"],
    luecken: [ALTE_FUSSZEILE, "Kein Bild-Download (Werkzeug)."],
    vorschau: { art: "einbettung" },
  },
  simulation: {
    zweck: "Live-PV-Simulation für einen Standort (Werkzeug).",
    komponente: "components/SimulationPanel.tsx",
    einbindung: "teilweise",
    einsatzorte: [
      { wo: "Einbett-Route; eingebettet in der Widget-Galerie", datei: "app/(embed)/embed/simulation/client.tsx" },
      { wo: "Simulationsseite", datei: "components/SimulationPanel.tsx" },
    ],
    ebenen: ["de"],
    funktionen: ["Standort und Anlage wählbar", "Einbetten", "Teilen", "Bild herunterladen"],
    luecken: [ALTE_FUSSZEILE],
    vorschau: { art: "einbettung" },
  },
  solarTrend: {
    zweck: "Solarmonat gegen Vorjahresmonat, zerlegt in Zubau und Wetter.",
    komponente: "components/SolarTrendSection.tsx",
    einbindung: "separat",
    einsatzorte: [{ wo: "Zubau-Seite", datei: "components/SolarTrendSection.tsx" }],
    ebenen: ["de"],
    funktionen: ["Monat blätterbar", "Zwölf-Monats-Tabelle"],
    luecken: ["Weder Optionsmenü noch Aktionsfußleiste; der Registereintrag trägt nur Titel und Quelle.", "Kein Bild-Download, keine Einbett-Route."],
    vorschau: { art: "keine", grund: "Keine Einbett-Route; die Karte wird serverseitig mit den Daten der Zubau-Seite gebaut. Ansehen auf /photovoltaik-zubau-deutschland." },
  },
  rechner: {
    zweck: "Ergebnis-Chart des PV-Rechners (Amortisation).",
    komponente: "app/(site)/photovoltaik-rechner/rechner.tsx",
    einbindung: "separat",
    einsatzorte: [],
    ebenen: ["de"],
    funktionen: ["Teilen und Bild über die Rechnerseite"],
    luecken: ["Registereintrag wird im Code nirgends verwendet (nur im Registertest).", "Kein Widget, keine Einbett-Route."],
    vorschau: { art: "keine", grund: "Ergebnis eines Rechners: entsteht erst aus Nutzereingaben auf /photovoltaik-rechner." },
  },
};

/** Default example area per level: the registry's example places (Höchberg, Landkreis Würzburg, Bayern). */
export const BEISPIEL_GEBIET: Record<Ebene, string> = {
  gemeinde: "09679147",
  landkreis: "09679",
  bundesland: "09",
  de: "de",
};

export const EINBINDUNG_TEXT: Record<Einbindung, string> = {
  zentral: "Zentral eingebunden",
  teilweise: "Teilweise vereinheitlicht",
  separat: "Separate Umsetzung",
};
