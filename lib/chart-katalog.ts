// Was es an Chart- und Widget-Bausteinen SCHON gibt — die Liste, die man liest,
// bevor man ein neues Chart baut.
//
// Anlass (08.08.2026): Für die Strommix-Seite wurde ein rotierendes
// Erneuerbaren-Radial neu gebaut. Es gab es längst als fertiges Widget mit
// Autowechsel, Hover-Pause und 30-Sekunden-Sperre — nur lag es nicht bei den
// Bausteinen, sondern in seiner Einbett-Route (`app/(embed)/embed/erzeugung/`).
// Wer in `components/` sucht, findet solche Widgets nicht. Zwei Regeln folgen
// daraus, beide von lib/__tests__/chart-katalog.test.ts erzwungen:
//
//   1. Die Implementierung eines Widgets liegt in `components/`. Die
//      Einbett-Route ist eine Hülle, die sie nur re-exportiert. Nur so kann
//      dieselbe Komponente auch auf einer eigenen Seite stehen — und nur so
//      findet sie überhaupt jemand.
//   2. Jeder Baustein steht hier mit einem Satz „wofür". Kommt eine Datei dazu,
//      ohne dass sie hier auftaucht, schlägt der Test an.
//
// Sichtbar unter /admin/charts, zusammen mit dem Widget-Register.

export interface KatalogEintrag {
  /** Dateiname ohne Endung, relativ zu components/ bzw. components/charts/. */
  datei: string;
  /** Ein Satz: was zeigt es, wofür nimmt man es. */
  wofuer: string;
  /** „baustein" = Rohform zum Zusammensetzen · „widget" = fertig, einbettbar. */
  art: "baustein" | "widget";
}

export const CHART_KATALOG: KatalogEintrag[] = [
  // ─── Rohformen ────────────────────────────────────────────────────────────
  { datei: "charts/DonutChart", art: "baustein", wofuer: "Ring mit freier Mitte — Anteile eines Ganzen zu einem Zeitpunkt." },
  { datei: "charts/LineChart", art: "baustein", wofuer: "Linien über die Zeit, mehrere Reihen mit gemeinsamer Achse." },
  { datei: "charts/StackedAreaChart", art: "baustein", wofuer: "Gestapelte Flächen für Momentanleistung (24 h / 7 Tage), Tooltip nach Kategorien." },
  { datei: "charts/StackedBarChart", art: "baustein", wofuer: "Gestapelte Balken für Zeitraum-Summen (30 Tage bis Max), tages-/wochen-/monatsweise." },
  { datei: "charts/EventTimeline", art: "baustein", wofuer: "Ereignis-Zeitleiste unter einem Jahres-Chart: tippen, wischen, Pfeiltasten." },
  { datei: "MastrLiveRadial", art: "baustein", wofuer: "24-Stunden-Zifferblatt einer Erzeugungsgröße mit hervorgehobenem Jetzt-Wert." },

  // ─── Fertige Widgets ──────────────────────────────────────────────────────
  { datei: "ErzeugungWidget", art: "widget", wofuer: "Erneuerbaren-Erzeugung als Radial, wechselt auf Wunsch selbst durch die Träger (autoswitchMs)." },
  { datei: "charts/JetztDonut", art: "widget", wofuer: "Strommix-Momentaufnahme aus dem letzten Punkt einer Erzeugungsreihe." },
  { datei: "charts/ZubauWidget", art: "widget", wofuer: "PV-Zubau über die Jahre mit Förder-Meilensteinen (Zeitleiste + Chart)." },
  { datei: "charts/AnlagenbestandWidget", art: "widget", wofuer: "Deutscher Solarbestand nach Anlagentyp: Anteil an der Stückzahl gegen Anteil an der Leistung." },
  { datei: "charts/ZubauTimelineChart", art: "baustein", wofuer: "Der Chart-Teil der Zubau-Story: Balken je Jahr plus zwei Vergütungslinien." },
  { datei: "charts/KostenrennenWidget", art: "widget", wofuer: "Stromkosten-Rennen: kumulierte Ausgaben mehrerer Haushalte (ohne/mit PV) laufen animiert durch 25 Jahre." },
  { datei: "charts/GruengasWidget", art: "widget", wofuer: "Heizkosten-Varianten über 20 Jahre, wahlweise als Balken oder Vollansicht." },
  { datei: "charts/GasPriceStackChart", art: "baustein", wofuer: "Gaspreis-Bestandteile gestapelt über die Zeit." },
  { datei: "charts/HeatCostCompareChart", art: "baustein", wofuer: "Wärmepumpe gegen fossile Referenz über die Laufzeit." },
  { datei: "RegionAnlagentypWidget", art: "widget", wofuer: "Anlagentypen einer Region als Donut (Atlas)." },
  { datei: "RegionSolarLive", art: "widget", wofuer: "Simulierte Solarleistung eines Bundeslands (Wetter × installierte Leistung)." },
  { datei: "MastrHeroSection", art: "widget", wofuer: "Karte plus Kennzahlen für Deutschland/Region — Startseite und Karten-Embed." },
  { datei: "DayProfileChart", art: "baustein", wofuer: "Tagesverlauf von Erzeugung und Verbrauch im Rechner-Ergebnis." },
  { datei: "charts/JetztImNetz", art: "widget", wofuer: "Live-Block der Strommix-Seite: Mix-Ring und Erzeugungs-Radial nebeneinander, mit einordnenden Sätzen." },
  { datei: "SolarTrendCard", art: "widget", wofuer: "Solarmonat gegen Vorjahresmonat, zerlegt in Zubau und Wetter; blätterbar." },
  { datei: "SolarTrendSection", art: "widget", wofuer: "Die Trend-Karte plus crawlbare Zwölf-Monats-Tabelle (Server-gerendert)." },
];

/** Einbett-Routen, deren Widget noch IN der Route liegt statt in components/.
 *  Die Liste ist eine Schuldenliste, keine Erlaubnis — sie darf nur kürzer
 *  werden. Wer eine dieser Routen ohnehin anfasst, zieht sie mit um. */
export const NOCH_IN_DER_ROUTE = [
  // Liegt in app/(site)/einspeiseverguetung-tabelle/ statt in components/ —
  // derselbe Fehlertyp wie beim Erzeugungs-Widget, nur in einer Seiten- statt
  // einer Einbett-Route. Vom Katalog-Test gefunden, nicht von Hand.
  "einspeiseverguetung-verlauf",
  "foerder-check",
  "strommix",
  "zubau-erneuerbare-atom",
  "ee-ampel",
  "strommix-anteil",
  "kennzahl",
];
