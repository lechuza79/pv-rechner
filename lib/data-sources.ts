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
  /** Live electricity mix, generation, cross-border flows. */
  energyCharts: {
    name: "Energy-Charts (Fraunhofer ISE)",
    license: "CC BY 4.0",
    url: "https://energy-charts.info",
  },
  /** Yearly country electricity data (mix, capacity additions, CO₂). */
  ember: {
    name: "Ember",
    license: "CC BY 4.0",
    url: "https://ember-energy.org",
  },
  /** German installation register (PV/battery stock). */
  mastr: {
    name: "Marktstammdatenregister (Bundesnetzagentur)",
    license: "dl-de/by-2-0",
    licenseUrl: "https://www.govdata.de/dl-de/by-2-0",
    url: "https://www.marktstammdatenregister.de",
    note: "Daten aggregiert",
  },
  /** Live weather feed powering the PV simulation. */
  openMeteo: {
    name: "Open-Meteo (DWD, NOAA)",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    url: "https://open-meteo.com",
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

/** "Energy-Charts (Fraunhofer ISE), CC BY 4.0" — the credit label as one string.
 * Appends the licence's change notice, if any, e.g. "…, dl-de/by-2-0 (Daten aggregiert)". */
export function sourceLabel(source: DataSource): string {
  const withLicense = source.license ? `${source.name}, ${source.license}` : source.name;
  return source.note ? `${withLicense} (${source.note})` : withLicense;
}
