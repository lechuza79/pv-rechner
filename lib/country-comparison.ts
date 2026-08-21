// AUTO-generiert aus Ember "Yearly Electricity Data" (CC BY 4.0) —
// erzeugt von scripts/ember-laender-sync.ts, nicht von Hand pflegen.
// Länder-Vergleich Stromsektor. Quelle: Ember (ember-energy.org), CC BY 4.0.
// CO₂-Intensität ist PRODUKTIONSbasiert (direkte Emissionen der Erzeugung im
// Land) — daher liegt z.B. Frankreich etwas höher als RTEs verbrauchs-/
// lebenszyklusbasierte eco2mix-Zahl. Rundung: kaufmännisch auf 1 Nachkommastelle.
//
// Die Pro-Kopf-Reihe steht in country-comparison-percapita.ts: sie braucht die
// Einwohnerzahl, die Ember mit der Formatumstellung (Juli 2026) aus diesem
// Datensatz genommen hat. Sie endet deshalb ein Jahr früher.

import type { LineSeries } from "../components/charts/LineChart";

export const COUNTRY_COMPARE_META = {
  source: "Ember – Yearly Electricity Data",
  sourceUrl: "https://ember-energy.org/data/yearly-electricity-data/",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  /** Letztes Jahr, für das der Datensatz vollständige Werte führt. */
  dataAsOf: "2025",
} as const;

// Namen ohne Jahreszahl: Sonst benennt jeder Datenlauf die Konstanten um und
// jede aufrufende Datei muss angefasst werden — ein Update, das Arbeit macht,
// unterbleibt irgendwann.
export const YEARS_ANTEIL: number[] = [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
export const YEARS_ZUBAU: number[] = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

/** Anteil Wind + Solar an der Stromerzeugung (%). Statisch, mehrere Länder. */
export const WINDSOLAR_SHARE_SERIES: LineSeries[] = [
  { key: "Deutschland", label: "Deutschland", flag: "🇩🇪", colorToken: "--color-accent", values: [1.6, 1.8, 2.8, 3.2, 4.4, 4.7, 5.3, 6.9, 7.3, 7.8, 8.1, 11.5, 12.7, 13.2, 15.2, 18.6, 18.3, 22.4, 24.4, 28.5, 32, 28.2, 32.7, 40.3, 43.5, 45.1] },
  { key: "China", label: "China", flag: "🇨🇳", colorToken: "--color-negative", values: [0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.4, 0.8, 1.2, 1.6, 2.1, 2.7, 3.2, 3.9, 5, 6.4, 7.6, 8.4, 9.4, 11.5, 13.4, 15.5, 18.2, 21.8] },
  { key: "USA", label: "USA", flag: "🇺🇸", colorToken: "--color-energy-gas", values: [0.2, 0.2, 0.3, 0.3, 0.4, 0.5, 0.7, 0.8, 1.4, 1.9, 2.3, 3, 3.6, 4.4, 5.1, 5.6, 6.9, 8.2, 8.7, 9.7, 11.6, 13.1, 14.9, 15.5, 17.2, 18.9] },
  { key: "UK", label: "UK", flag: "🇬🇧", colorToken: "--color-energy-cat-renewable", values: [0.2, 0.2, 0.3, 0.3, 0.5, 0.7, 1.1, 1.3, 1.8, 2.5, 2.7, 4.4, 5.8, 8.5, 10.6, 14.1, 14, 18.1, 20.8, 23.3, 28.4, 25, 28.8, 32.8, 34.5, 36] },
  { key: "Indien", label: "Indien", flag: "🇮🇳", colorToken: "--color-energy-lignite", values: [0.3, 0.4, 0.3, 0.4, 0.8, 0.9, 1.3, 1.5, 1.7, 1.9, 2.1, 2.4, 2.7, 2.9, 3, 3, 4, 5.1, 6.2, 6.3, 7.2, 8, 9.2, 10.3, 11, 14.4] },
  { key: "Frankreich", label: "Frankreich", flag: "🇫🇷", colorToken: "--color-energy-nuclear", values: [0, 0, 0.1, 0.1, 0.1, 0.2, 0.4, 0.7, 1, 1.5, 1.9, 2.6, 3.5, 3.7, 4.2, 5.1, 5.4, 6, 6.9, 8.3, 10.1, 9.5, 12.3, 14.1, 12.5, 13.8] },
  { key: "Welt", label: "Welt", flag: "🌍", colorToken: "--color-text-muted", values: [0.2, 0.3, 0.3, 0.4, 0.5, 0.6, 0.7, 0.9, 1.2, 1.5, 1.8, 2.3, 2.8, 3.3, 3.8, 4.5, 5.2, 6.2, 7, 7.9, 9.2, 10.3, 11.9, 13.4, 15, 17.3] },
];

/** CO₂-Intensität der Stromerzeugung, produktionsbasiert (g CO₂/kWh). */
export const CO2_INTENSITY_COMPARE_SERIES: LineSeries[] = [
  { key: "Deutschland", label: "Deutschland", flag: "🇩🇪", colorToken: "--color-accent", values: [573.2, 565.5, 569.6, 570, 554.7, 546.3, 536.2, 551.8, 525.4, 521.6, 516.7, 529.7, 534.1, 538, 521.7, 503.6, 498.3, 469.7, 454.5, 392.5, 355.6, 394.7, 419.7, 363.6, 337.1, 330] },
  { key: "China", label: "China", flag: "🇨🇳", colorToken: "--color-negative", values: [783.5, 762.9, 773.3, 790.9, 778.5, 782.1, 786.7, 785.3, 747.1, 753.2, 740.8, 752.4, 720.3, 717.6, 694, 667.9, 651.9, 644.3, 637, 619.7, 606.4, 599.2, 586.9, 583.2, 556.3, 526.2] },
  { key: "USA", label: "USA", flag: "🇺🇸", colorToken: "--color-energy-gas", values: [607.5, 609.9, 600.7, 606.3, 602.4, 604.4, 595.5, 598.5, 591.3, 565, 570.8, 550.5, 532.8, 533.5, 529.5, 504.9, 483.4, 469.1, 462.6, 439.4, 411.7, 423.8, 410.4, 392.9, 383.8, 384.4] },
  { key: "UK", label: "UK", flag: "🇬🇧", colorToken: "--color-energy-cat-renewable", values: [522, 529, 520.9, 536.8, 536, 535.2, 559.3, 556.1, 554.4, 504.7, 517.2, 499.6, 537.2, 506.9, 462.9, 397.8, 333.4, 302.2, 285.7, 268.4, 242.6, 267.1, 255, 235.6, 216.5, 217.3] },
  { key: "Indien", label: "Indien", flag: "🇮🇳", colorToken: "--color-energy-lignite", values: [740, 747.4, 755.8, 758, 723.8, 734, 723, 717.9, 733.1, 744.5, 739.4, 722.2, 743, 739.1, 743.4, 750.8, 752.2, 743.4, 738.1, 723, 709.4, 715.7, 706.1, 713.7, 706.7, 670.5] },
  { key: "Frankreich", label: "Frankreich", flag: "🇫🇷", colorToken: "--color-energy-nuclear", values: [79.8, 68.6, 75.2, 80.9, 77.2, 85.5, 76.6, 80.1, 76, 75.6, 78.6, 74.6, 77.6, 76.3, 52.2, 59.2, 68.6, 78.3, 59.9, 59.8, 59.1, 59.8, 78.6, 53.3, 40.5, 41.5] },
  { key: "Welt", label: "Welt", flag: "🌍", colorToken: "--color-text-muted", values: [527.3, 529.3, 532.3, 544.6, 539.5, 543.4, 546.4, 554.7, 547.7, 543.5, 543.9, 550.3, 548.2, 548.4, 544.8, 533.5, 525.4, 522.2, 518.6, 505.9, 492.2, 495, 489.6, 483.3, 471.5, 458.5] },
];

/**
 * Zubau je Land: Erneuerbare (Wind+Solar) vs. Atomkraft, GW/Jahr (Netto-Zubau
 * inkl. Rückbau), 2010–2025. Für den interaktiven Land-für-Land-Vergleich.
 */
export interface ZubauCountry {
  key: string;
  label: string;
  flag: string;
  colorToken: string;
  windsolar: number[];
  nuclear: number[];
}
export const ZUBAU_BY_COUNTRY: ZubauCountry[] = [
  { key: "Deutschland", label: "Deutschland", flag: "🇩🇪", colorToken: "--color-accent", windsolar: [8.6, 9.7, 10.4, 5.1, 6.3, 7.3, 6.3, 7.8, 6, 5.8, 6.2, 7.9, 3.6, 17.6, 19, 20.1], nuclear: [0, 0, -8.4, 0, 0, -1.3, 0, 0, 0, -1.3, -1.4, 0, -3.9, -4.2, 0, 0] },
  { key: "China", label: "China", flag: "🇨🇳", colorToken: "--color-negative", windsolar: [12.6, 18.8, 18.9, 26.2, 30.7, 49.4, 51.7, 68.9, 64.7, 54.6, 121.3, 100.1, 123, 292.8, 356.6, 434.4], nuclear: [1.7, 1.8, 0, 2.1, 5.4, 7.1, 6.5, 2.2, 8.8, 4.1, 1.1, 3.4, 2.3, 1.4, 3.9, 1.6] },
  { key: "USA", label: "USA", flag: "🇺🇸", colorToken: "--color-energy-gas", windsolar: [6.1, 8.8, 16.4, 5.3, 8.9, 14.1, 20, 14.7, 15.4, 18.4, 29.8, 33.4, 26.7, 33.1, 42.8, 40.2], nuclear: [0.2, 0.3, 0.5, -2.7, -0.7, 0.1, 0.9, 0.1, -0.2, -1.3, -1.6, -1, -0.9, 1, 1.1, 0.1] },
  { key: "Frankreich", label: "Frankreich", flag: "🇫🇷", colorToken: "--color-energy-nuclear", windsolar: [2.1, 2.8, 2.2, 1.4, 1.7, 2.1, 1.8, 2.1, 2.6, 2.6, 2.4, 4.1, 5.1, 5.5, 6.5, 7.2], nuclear: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1.7, 0, 0, 0, 0, 0] },
  { key: "Indien", label: "Indien", flag: "🇮🇳", colorToken: "--color-energy-lignite", windsolar: [2.3, 3.5, 1.5, 1.7, 6.2, 4.5, 7.9, 12.4, 11.7, 10, 5.5, 11.8, 15.4, 12.4, 28.8, 43.4], nuclear: [0.2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0.7, 0.7, 0.6] },
  { key: "Welt", label: "Welt", flag: "🌍", colorToken: "--color-text-muted", windsolar: [48.6, 70.5, 76.8, 69.6, 88.9, 114.7, 122.7, 141.3, 144.1, 162, 241.6, 235.8, 270.9, 479.1, 572.8, 669.8], nuclear: [1.7, 4.7, -7.5, -2, 7.9, 5.5, 8.8, -0.4, 6.5, -1.6, -6.2, 3.3, -1.4, -0.4, 8.2, -0.4] },
];

export { PERCAPITA_SERIES, YEARS_PERCAPITA } from "./country-comparison-percapita";
