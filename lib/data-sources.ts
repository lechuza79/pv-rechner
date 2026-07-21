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
  /** BEG heat-pump funding rates (Grundförderung + Boni, cap, income tiers). */
  beg: {
    name: "KfW / BMWE (BEG Heizungsförderung, Merkblatt 458)",
    url: "https://www.kfw.de/458",
  },
  /** Administrative boundaries for the Solar-Atlas map (Bundesländer, Kreise, Gemeinden). */
  bkg: {
    name: "GeoBasis-DE / BKG (Verwaltungsgebiete VG2500 · VG250)",
    license: "dl-de/by-2-0",
    licenseUrl: "https://www.govdata.de/dl-de/by-2-0",
    url: "https://gdz.bkg.bund.de",
    note: "Geometrien vereinfacht",
  },
} as const satisfies Record<string, DataSource>;

/** "Energy-Charts (Fraunhofer ISE), CC BY 4.0" — the credit label as one string.
 * Appends the licence's change notice, if any, e.g. "…, dl-de/by-2-0 (Daten aggregiert)". */
export function sourceLabel(source: DataSource): string {
  const withLicense = source.license ? `${source.name}, ${source.license}` : source.name;
  return source.note ? `${withLicense} (${source.note})` : withLicense;
}
