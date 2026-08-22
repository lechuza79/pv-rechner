/**
 * Single source of truth for external data-source attribution.
 *
 * Several datasets we display are licensed under CC BY 4.0 (Energy-Charts,
 * Ember) or comparable open terms that REQUIRE a visible source credit —
 * including inside embedded widgets on third-party sites. Centralising the
 * exact wording here keeps the credit identical everywhere (page footers,
 * embed widgets, chart exports) and prevents drift when a name or licence
 * changes.
 *
 * Rule of thumb: any chart or widget that renders one of these datasets MUST
 * show the matching credit, and it must stay visible regardless of the
 * `branding` flag (branding only gates the "Powered by" line — the data
 * licence credit is not optional).
 */

export interface DataSource {
  /** Human-readable provider name, incl. the operating institute where useful. */
  name: string;
  /**
   * Kurzform für die schmale vertikale Quellenkante am Widget-Rand. Nur nötig,
   * wo die automatische Kurzform (Klammer-Zusätze wie "(Fraunhofer ISE)" raus)
   * etwas wegwirft, das der Quellenvermerk verlangt — beim BKG steckt das
   * Bezugsjahr in genau so einer Klammer. Wenn gesetzt, wird sie unverändert
   * übernommen.
   */
  shortName?: string;
  /** Licence short code, if the source is published under a named licence. */
  license?: string;
  /** Canonical homepage of the source, used for the credit link. */
  url?: string;
  /** Licence homepage, if different from `url` (e.g. a govdata licence text page). */
  licenseUrl?: string;
  /**
   * Short change/aggregation notice some licences require alongside the credit
   * (e.g. dl-de/by-2-0 §3: mark data that was modified/aggregated). Rendered as
   * a trailing " (…)" after the licence in both {@link sourceLabel} and
   * {@link DataSourceNote}.
   */
  note?: string;
}

/**
 * Jahr des letzten Datenbezugs beim BKG — Pflichtbestandteil des vom BKG
 * vorgegebenen Quellenvermerks.
 *
 * Bewusst fest verdrahtet und NICHT `new Date().getFullYear()`: Verlangt ist
 * das Jahr, in dem WIR die Geometrien geholt haben, nicht das laufende Jahr.
 * Ein rollierender Wert würde jeden 1. Januar still eine falsche Angabe
 * behaupten. Stand: VG2500 (Bundesländer, Kreise) und VG250 (Gemeinden)
 * zuletzt im Juli 2026 bezogen (public/geo/*, gebaut mit
 * scripts/build-gemeinde-geo.mjs). Beim nächsten Gebietsstand-Update hier
 * hochsetzen — das ist Teil des Geometrie-Laufs, keine separate Pflege.
 */
const BKG_DATENBEZUG_JAHR = 2026;

export const DATA_SOURCES = {
  /**
   * Live electricity mix, generation, cross-border flows.
   *
   * CC BY 4.0 am 22.08.2026 an der Primärquelle geprüft (Council 3/3, zwei
   * Legal-Judges) — die Angabe stand vorher unbelegt im Register und war
   * nur über Drittverzeichnisse (apis.io, api-evangelist) gestützt. Fraunhofer
   * sagt es dreifach selbst: in der Spezifikation unter "Data License"
   * ("Unless stated otherwise, the data provided by the Energy-Charts API is
   * licensed under the CC BY 4.0 license"), in `llms.txt`, und — am stärksten —
   * als Feld `license` in JEDER v2-Antwort. Volltexte und die abgerufenen
   * Lizenzfelder liegen in docs/quellen/energy-charts-lizenz/.
   *
   * Die Gegenstimme kennen und nicht neu aufmachen: Das Feld `info.license`
   * der Spezifikation verweist formal auf publishing-notes.html, und das ist
   * das Fraunhofer-Impressum mit "Alle Rechte vorbehalten … kommerzielle
   * Nutzung … nicht gestattet". Dieselbe Boilerplate steht wortgleich auf
   * ise.fraunhofer.de; sie regelt nach ihrem eigenen Wortlaut "diese Webseite"
   * und "Download oder Ausdruck dieser Veröffentlichungen" (Belegexemplare,
   * Bildmotive) — nicht die API auf einem anderen Host. Die speziellere,
   * mit jeder Lieferung mitgeschickte Erklärung geht vor.
   *
   * ACHTUNG bei Börsenpreisen: Für /price gilt das NICHT pauschal — siehe
   * `fetchSpotPrices` in lib/energy-api.ts.
   */
  energyCharts: {
    name: "Energy-Charts (Fraunhofer ISE)",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    url: "https://energy-charts.info",
    // CC BY 4.0 Sec. 3(a)(1)(B) verlangt den Hinweis, DASS wir verändert haben.
    // Wir mitteln Viertelstunden zu Tages- und Wochenwerten und leiten daraus
    // Größen ab, die so nirgends geliefert werden (lib/nuclear-import.ts sagt
    // selbst: "derived, not metered").
    note: "aggregiert",
  },
  /**
   * Yearly country electricity data (mix, capacity additions, CO₂).
   *
   * CC BY 4.0 am 22.08.2026 an der Primärquelle geprüft (ember-energy.org/creative-commons):
   * "Ember content is released under a Creative Commons Attribution Licence
   * (CC-BY-4.0)". Das Logo ist ausdrücklich NICHT mitlizenziert — wir benutzen
   * es nicht und sollten das so lassen.
   */
  ember: {
    name: "Ember",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    url: "https://ember-energy.org",
    // Die Länderreihen werden bei jedem Sync neu gerechnet (scripts/ember-laender-sync.ts).
    note: "aggregiert",
  },
  /** German installation register (PV/battery stock). */
  mastr: {
    name: "Marktstammdatenregister (Bundesnetzagentur)",
    license: "dl-de/by-2-0",
    licenseUrl: "https://www.govdata.de/dl-de/by-2-0",
    url: "https://www.marktstammdatenregister.de",
    note: "aggregiert",
  },
  /** Live weather feed powering the PV simulation. */
  openMeteo: {
    // Ohne die Vorlieferanten (DWD, NOAA): Die Lizenz verlangt Open-Meteo als
    // Rechteinhaber, nicht die Wetterdienste dahinter — und der Quellenvermerk
    // steht in der schmalen senkrechten Kante, wo jedes Wort Höhe kostet.
    name: "Open-Meteo",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    url: "https://open-meteo.com",
    // Sec. 3(a)(1)(B) wie bei den anderen CC-BY-Quellen: Aus Tages-Min/Max
    // rechnet cdhFromDailyMinMax() einen synthetischen Tagesgang und daraus die
    // Kühlgradstunden — das ist eine Ableitung, keine Weitergabe.
    note: "abgeleitet",
  },
  /** Location-based PV yield model. */
  pvgis: {
    name: "PVGIS (Europäische Kommission)",
    url: "https://joint-research-centre.ec.europa.eu/pvgis-online-tool_en",
  },
  /**
   * Household + industry electricity prices (EU harmonised series).
   *
   * NICHT CC BY 4.0: Die CC-Lizenz auf eurostat.ec.europa.eu deckt den
   * redaktionellen Inhalt der Website. Für die Statistikdaten selbst — und die
   * sind es, die wir zeigen — gilt die Weiterverwendungspolitik der Kommission
   * nach Beschluss 2011/833/EU: "Reuse … for commercial or non-commercial
   * purposes is authorised provided the source is acknowledged"
   * (ec.europa.eu/eurostat/web/main/help/copyright-notice, geprüft 07/2026).
   */
  eurostat: {
    name: "Eurostat",
    license: "Beschluss 2011/833/EU",
    licenseUrl: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32011D0833",
    url: "https://ec.europa.eu/eurostat/databrowser/product/view/nrg_pc_204",
    note: "Weiterverwendung mit Quellenangabe gestattet",
  },
  /** Historical EEG feed-in tariff series (statutory rates, 2000–today). */
  eegVerguetung: {
    name: "Bundesnetzagentur & Solarenergie-Förderverein (SFV)",
    url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/ErneuerbareEnergien/EEG_Foerderung/start.html",
    note: "gesetzliche EEG-Vergütungssätze",
  },
  /**
   * Marktwert Solar — the generation-weighted exchange price for solar, the
   * reference value for the direct-marketing case of the EEG 2027 draft. The
   * transmission system operators publish it monthly and annually; the overview
   * itself sits behind a login, so the figures we carry are additionally
   * recomputed from the two public series that define them (see energyCharts
   * and lib/marktwert-config.ts).
   */
  marktwertSolar: {
    name: "Übertragungsnetzbetreiber (netztransparenz.de)",
    url: "https://www.netztransparenz.de/de-de/Erneuerbare-Energien-und-Umlagen/EEG/Transparenzanforderungen/Markt-und-Flexibilitaetspraemie/Marktwerte",
    note: "Monats- und Jahresmarktwerte Solar",
  },
  /** BEG heat-pump funding rates (Grundförderung + Boni, cap, income tiers). */
  beg: {
    name: "KfW / BMWE (BEG Heizungsförderung, Merkblatt 458)",
    url: "https://www.kfw.de/458",
  },
  /** GModG gas-price scenarios (Bio-Treppe, Biomethan/Netzentgelt/CO₂ paths). */
  iw: {
    name: "Institut der deutschen Wirtschaft (IW-Report 36/2026)",
    url: "https://www.iwkoeln.de/studien/ralph-henger-malte-kueper-laurens-wuensch-wie-hoch-sind-die-mehrkostenrisiken-durch-das-gebaeudemodernisierungsgesetz.html",
    note: "Preisszenarien Gebäudemodernisierungsgesetz",
  },
  /**
   * Administrative boundaries for the Solar-Atlas map (Bundesländer, Kreise, Gemeinden).
   *
   * Der Quellenvermerk ist hier nicht frei formulierbar: Das BKG gibt ihn auf
   * der VG250-Produktseite wörtlich vor —
   * "© BKG (Jahr des letzten Datenbezugs) dl-de/by-2-0, Datenquellen:
   * https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf",
   * bei veränderten Daten zusätzlich "(Daten verändert)"
   * (gdz.bkg.bund.de/index.php/default/hinweise-zu-nutzungsbedingungen-und-quellenvermerken/,
   * geprüft 07/2026). "© GeoBasis-DE / BKG" ist laut derselben Seite die Form
   * für die Behörden-Bereitstellung (V GeoBund/ZSGT), NICHT für die frei
   * lizenzierten Downloads — für die heißt es schlicht "© BKG".
   * Wir vereinfachen die Geometrien beim Bauen der Kartendateien
   * (scripts/build-gemeinde-geo.mjs, mapshaper -simplify), also greift der
   * Veränderungshinweis.
   */
  bkg: {
    name: `© BKG (${BKG_DATENBEZUG_JAHR})`,
    // Ohne Kurzform würde die Kanten-Beschriftung das Bezugsjahr wegwerfen —
    // sie entfernt sonst jeden Klammer-Zusatz aus dem Namen.
    shortName: `© BKG (${BKG_DATENBEZUG_JAHR})`,
    license: "dl-de/by-2-0",
    licenseUrl: "https://www.govdata.de/dl-de/by-2-0",
    url: "https://www.bkg.bund.de",
    note: "Daten verändert, Geometrien vereinfacht, Datenquellen: https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf",
  },
  /**
   * Municipality population + territorial status (Gemeindeverzeichnis GV100AD).
   *
   * NICHT dl-de/by-2-0: Das Destatis-Impressum trennt zwei Regime. Die
   * Datenlizenz Deutschland gilt ausschließlich für die Datenbank
   * GENESIS-Online. Für "die Standard-Veröffentlichungen … sowie für die
   * Inhalte auf unserer Website www.destatis.de einschließlich Grafiken sowie
   * der zum Download bereitgestellten Produkte" gilt dagegen:
   * "Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellennachweis
   * gestattet" (destatis.de/DE/Service/Impressum, geprüft 07/2026) — eine
   * Bearbeitung ist dort gerade nicht mitgenannt. Unsere Einwohnerzahlen
   * stammen aus dem Download-Produkt GV100AD (scripts/destatis-gemeinden.ts),
   * fallen also unter das zweite Regime; die Produktseite weist keine
   * abweichende Angabe aus.
   */
  destatis: {
    name: "Statistisches Bundesamt (Destatis)",
    url: "https://www.destatis.de",
    note: "Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellennachweis gestattet",
  },
  /**
   * Long-run gross electricity generation + CO₂ intensity (1990–today).
   *
   * NICHT dl-de/by-2-0: Diesen Namen führt das UBA nirgends. Für Daten gilt
   * § 12a EGovG — "Die bereitgestellten Daten und Metadaten dürfen für die
   * kommerzielle und nicht kommerzielle Nutzung insbesondere vervielfältigt …
   * verändert, bearbeitet … werden", Bedingung: "dass das Umweltbundesamt im
   * Quellenvermerk enthalten ist" (umweltbundesamt.de/datenschutz-haftung-urheberrecht,
   * geprüft 07/2026). Das ist inhaltsgleich mit dl-de/by-2-0, heißt aber anders.
   * Die dortige CC BY-NC-ND 4.0 betrifft die Grafiken und Texte der Website,
   * nicht die Daten — sie zu übernehmen wäre für uns gerade verboten.
   */
  uba: {
    name: "Umweltbundesamt",
    license: "§ 12a EGovG",
    licenseUrl: "https://www.umweltbundesamt.de/datenschutz-haftung-urheberrecht",
    url: "https://www.umweltbundesamt.de/daten/umweltzustand-trends/energie/erneuerbare-konventionelle-stromerzeugung",
    note: "Datenbasis: AG Energiebilanzen",
  },
} as const satisfies Record<string, DataSource>;

/**
 * "Energy-Charts (Fraunhofer ISE), CC BY 4.0" — der Quellenvermerk als ein String.
 * Der Änderungshinweis hängt mit Komma hinten dran, z. B.
 * "Marktstammdatenregister (Bundesnetzagentur), dl-de/by-2-0, aggregiert".
 *
 * Bewusst Komma statt Klammer: Der Vermerk steht seit 08/2026 senkrecht an der
 * Kante der Widget-Karte und im heruntergeladenen Bild — dort ist er eine
 * einzige Zeile, und geschachtelte Klammern lesen sich darin wie ein Nachtrag
 * statt wie ein gleichrangiger Pflichtbestandteil. Drei Teile müssen die
 * Kürzung überleben, weil die Lizenzen sie verlangen: WER die Daten
 * bereitstellt, unter WELCHER Lizenz, und DASS wir sie verändert haben.
 */
export function sourceLabel(source: DataSource, { kurz = false } = {}): string {
  // `kurz` tauscht NUR den Namen gegen die Kurzform — Lizenz und
  // Änderungshinweis bleiben, weil beide Lizenzbestandteile sind.
  //
  // Die Quellenkante baute ihre Kurzform bis 22.08.2026 selbst zusammen
  // (`shortName` + Lizenz) und ließ dabei den Änderungshinweis weg, direkt
  // unter einem Kommentar, der das Gegenteil versprach. Getroffen hat es das
  // BKG — als einzige Quelle mit Kurzform trägt es „Daten verändert", und
  // genau das verlangt dl-de/by-2-0. Der Fehler wäre bei jeder neuen Quelle
  // mit Kurzform wiedergekommen.
  const name = (kurz && source.shortName) || source.name;
  const withLicense = source.license ? `${name}, ${source.license}` : name;
  return source.note ? `${withLicense}, ${source.note}` : withLicense;
}
