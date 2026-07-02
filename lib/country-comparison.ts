// AUTO-generiert aus Ember "Yearly Electricity Data" (CC BY 4.0).
// Länder-Vergleich Stromsektor. Quelle: Ember (ember-energy.org), CC BY 4.0.
// Bevölkerung für Pro-Kopf abgeleitet aus Embers Verbrauch / Verbrauch-pro-Kopf.
// CO₂-Intensität ist PRODUKTIONSbasiert (direkte Emissionen der Erzeugung im
// Land) — daher liegt z.B. Frankreich etwas höher als RTEs verbrauchs-/
// lebenszyklusbasierte eco2mix-Zahl. Rundung: kaufmännisch auf 1 Nachkommastelle.

import type { LineSeries } from "../components/charts/LineChart";

export const COUNTRY_COMPARE_META = {
  source: "Ember – Yearly Electricity Data",
  sourceUrl: "https://ember-energy.org/data/yearly-electricity-data/",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  dataAsOf: "2025",
} as const;

export const YEARS_2000_2024: number[] = [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
export const YEARS_2010_2024: number[] = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

/** Anteil Wind + Solar an der Stromerzeugung (%). Statisch, mehrere Länder. */
export const WINDSOLAR_SHARE_SERIES: LineSeries[] = [
  { key: "Deutschland", label: "Deutschland", flag: "🇩🇪", colorToken: "--color-accent", values: [1.6, 1.8, 2.8, 3.2, 4.4, 4.7, 5.3, 6.9, 7.3, 7.8, 8.1, 11.5, 12.7, 13.2, 15.2, 18.6, 18.3, 22.4, 24.4, 28.5, 32, 28.2, 32.7, 40.3, 43.5] },
  { key: "China", label: "China", flag: "🇨🇳", colorToken: "--color-negative", values: [0, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.4, 0.8, 1.2, 1.6, 2.1, 2.7, 3.2, 3.9, 5, 6.4, 7.6, 8.4, 9.4, 11.5, 13.5, 15.6, 18.2] },
  { key: "USA", label: "USA", flag: "🇺🇸", colorToken: "--color-energy-gas", values: [0.2, 0.2, 0.3, 0.3, 0.4, 0.5, 0.7, 0.8, 1.4, 1.9, 2.3, 3, 3.6, 4.4, 5.1, 5.6, 6.9, 8.2, 8.7, 9.7, 11.6, 13.1, 14.9, 15.5, 17.2] },
  { key: "UK", label: "UK", flag: "🇬🇧", colorToken: "--color-energy-cat-renewable", values: [0.3, 0.3, 0.3, 0.3, 0.5, 0.7, 1.1, 1.3, 1.8, 2.5, 2.7, 4.4, 5.8, 8.5, 10.7, 14.1, 14, 18.1, 20.9, 23.3, 28.4, 25, 28.8, 32.8, 34.5] },
  { key: "Indien", label: "Indien", flag: "🇮🇳", colorToken: "--color-energy-lignite", values: [0.3, 0.4, 0.3, 0.4, 0.8, 0.9, 1.3, 1.5, 1.8, 1.9, 2.1, 2.4, 2.7, 2.9, 3.1, 3, 4, 5.1, 6.2, 6.3, 7.3, 8, 9.2, 10.3, 11] },
  { key: "Frankreich", label: "Frankreich", flag: "🇫🇷", colorToken: "--color-energy-nuclear", values: [0, 0, 0.1, 0.1, 0.1, 0.2, 0.4, 0.7, 1, 1.5, 1.9, 2.6, 3.5, 3.7, 4.2, 5.1, 5.4, 6, 6.9, 8.3, 10.1, 9.5, 12.3, 14.1, 12.5] },
  { key: "Welt", label: "Welt", flag: "🌍", colorToken: "--color-text-muted", values: [0.2, 0.3, 0.3, 0.4, 0.5, 0.6, 0.7, 0.9, 1.2, 1.5, 1.8, 2.3, 2.8, 3.3, 3.8, 4.5, 5.2, 6.2, 7, 7.9, 9.2, 10.3, 11.9, 13.4, 15] },
];

/** CO₂-Intensität der Stromerzeugung, produktionsbasiert (g CO₂/kWh). */
export const CO2_INTENSITY_COMPARE_SERIES: LineSeries[] = [
  { key: "Deutschland", label: "Deutschland", flag: "🇩🇪", colorToken: "--color-accent", values: [573.2, 565.5, 569.6, 570, 554.7, 546.3, 536.2, 551.8, 525.4, 521.6, 516.7, 529.7, 534.2, 538, 521.7, 503.6, 498.3, 469.7, 454.6, 392.5, 355.6, 394.6, 419.7, 363.6, 337.1] },
  { key: "China", label: "China", flag: "🇨🇳", colorToken: "--color-negative", values: [783.5, 762.9, 773.3, 790.9, 778.5, 782.1, 786.7, 785.3, 747.1, 753.2, 740.8, 752.4, 720.3, 717.6, 694, 668, 651.9, 644.3, 637, 619.7, 606.4, 599.2, 586.9, 583.3, 556.3] },
  { key: "USA", label: "USA", flag: "🇺🇸", colorToken: "--color-energy-gas", values: [607.5, 609.9, 600.7, 606.3, 602.4, 604.4, 595.5, 598.5, 591.3, 565, 570.8, 550.5, 532.8, 533.5, 529.5, 505, 483.4, 469.1, 462.6, 439.5, 411.7, 423.8, 410.4, 392.9, 383.8] },
  { key: "UK", label: "UK", flag: "🇬🇧", colorToken: "--color-energy-cat-renewable", values: [522, 529, 520.9, 536.8, 536, 535.3, 559.3, 556.1, 554.4, 504.7, 517.2, 499.6, 537.2, 506.9, 462.9, 397.8, 333.5, 302.2, 285.7, 268.4, 242.5, 267.1, 255, 235.6, 216.5] },
  { key: "Indien", label: "Indien", flag: "🇮🇳", colorToken: "--color-energy-lignite", values: [740, 747.4, 755.8, 758, 723.8, 734, 723, 717.9, 733.1, 744.6, 739.4, 722.2, 743, 739.1, 743.4, 750.9, 752.2, 743.4, 738.1, 723, 709.4, 715.7, 706.1, 713.7, 706.7] },
  { key: "Frankreich", label: "Frankreich", flag: "🇫🇷", colorToken: "--color-energy-nuclear", values: [79.8, 68.6, 75.2, 80.9, 77.2, 85.5, 76.6, 80.1, 76, 75.6, 78.6, 74.6, 77.6, 76.3, 52.2, 59.2, 68.6, 78.3, 59.9, 59.8, 59.1, 59.8, 78.6, 53.3, 40.5] },
  { key: "Welt", label: "Welt", flag: "🌍", colorToken: "--color-text-muted", values: [527.3, 529.3, 532.3, 544.6, 539.5, 543.4, 546.4, 554.7, 547.7, 543.5, 543.9, 550.3, 548.2, 548.4, 544.8, 533.5, 525.4, 522.2, 518.7, 505.9, 492.2, 495, 489.6, 483.2, 471.5] },
];

/** Wind+Solar-Erzeugung pro Kopf (kWh je Einwohner). Statisch, mehrere Länder. */
export const PERCAPITA_SERIES: LineSeries[] = [
  { key: "Dänemark", label: "Dänemark", flag: "🇩🇰", colorToken: "--color-energy-cat-renewable", values: [794, 804, 908, 1031, 1219, 1220, 1121, 1312, 1261, 1218, 1410, 1756, 1855, 2074, 2423, 2590, 2360, 2693, 2565, 2942, 3002, 2963, 3627, 3873, 4080] },
  { key: "Australien", label: "Australien", flag: "🇦🇺", colorToken: "--color-energy-gas", values: [9, 18, 30, 38, 43, 68, 110, 141, 168, 217, 270, 377, 443, 564, 625, 753, 841, 895, 1139, 1483, 1804, 2233, 2581, 2907, 3104] },
  { key: "Niederlande", label: "Niederlande", flag: "🇳🇱", colorToken: "--color-energy-nuclear", values: [52, 52, 60, 82, 116, 128, 168, 211, 259, 277, 242, 308, 306, 356, 383, 506, 568, 737, 819, 964, 1351, 1659, 2135, 2717, 3034] },
  { key: "Deutschland", label: "Deutschland", flag: "🇩🇪", colorToken: "--color-accent", values: [114, 129, 196, 236, 324, 354, 411, 537, 566, 570, 625, 864, 970, 1028, 1155, 1446, 1419, 1737, 1851, 2048, 2172, 1952, 2202, 2417, 2553] },
  { key: "Spanien", label: "Spanien", flag: "🇪🇸", colorToken: "--color-energy-lignite", values: [115, 164, 224, 284, 364, 483, 524, 618, 768, 947, 1099, 1113, 1306, 1466, 1406, 1352, 1339, 1356, 1351, 1492, 1617, 1868, 2060, 2354, 2515] },
  { key: "China", label: "China", flag: "🇨🇳", colorToken: "--color-negative", values: [0, 1, 1, 1, 1, 2, 3, 4, 10, 21, 37, 56, 78, 106, 132, 161, 219, 299, 382, 442, 510, 689, 835, 1034, 1295] },
];

/**
 * Zubau je Land: Erneuerbare (Wind+Solar) vs. Atomkraft, GW/Jahr (Netto-Zubau
 * inkl. Rückbau), 2010–2024. Für den interaktiven Land-für-Land-Vergleich.
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
  { key: "Deutschland", label: "Deutschland", flag: "🇩🇪", colorToken: "--color-accent", windsolar: [8.6, 9.7, 10.4, 5.1, 6.3, 7.3, 6.3, 7.8, 6, 5.8, 6.2, 7.9, 3.6, 17.6, 19], nuclear: [0, 0, -8.4, 0, 0, -1.3, 0, 0, 0, -1.3, -1.4, 0, -3.9, -4.2, 0] },
  { key: "China", label: "China", flag: "🇨🇳", colorToken: "--color-negative", windsolar: [12.6, 18.8, 18.9, 26.2, 30.7, 49.4, 51.7, 68.9, 64.7, 54.6, 121.3, 100.1, 123.1, 292.8, 356.6], nuclear: [1.7, 1.8, 0, 2.1, 5.4, 7.1, 6.5, 2.2, 8.8, 4.1, 1.2, 3.4, 2.3, 1.4, 3.9] },
  { key: "USA", label: "USA", flag: "🇺🇸", colorToken: "--color-energy-gas", windsolar: [6.1, 8.8, 16.4, 5.3, 8.9, 14.1, 20, 14.7, 15.4, 18.4, 29.8, 33.4, 26.7, 33.1, 42.8], nuclear: [0.2, 0.3, 0.5, -2.7, -0.7, 0.1, 0.9, 0.1, -0.2, -1.3, -1.6, -1, -0.9, 1.1, 1.1] },
  { key: "Frankreich", label: "Frankreich", flag: "🇫🇷", colorToken: "--color-energy-nuclear", windsolar: [2.1, 2.8, 2.2, 1.4, 1.7, 2.1, 1.8, 2.1, 2.6, 2.6, 2.4, 4.1, 5.1, 5.5, 6.5], nuclear: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1.7, 0, 0, 0, 0] },
  { key: "Indien", label: "Indien", flag: "🇮🇳", colorToken: "--color-energy-lignite", windsolar: [2.3, 3.5, 1.5, 1.7, 6.2, 4.5, 7.9, 12.4, 11.7, 10, 5.5, 11.8, 15.4, 12.4, 28.9], nuclear: [0.2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0.7, 0.7] },
  { key: "Welt", label: "Welt", flag: "🌍", colorToken: "--color-text-muted", windsolar: [48.6, 70.5, 76.8, 69.6, 88.9, 114.7, 122.7, 141.3, 144.1, 162, 241.6, 235.8, 270.9, 479.1, 572.8], nuclear: [1.7, 4.7, -7.5, -2, 7.9, 5.5, 8.8, -0.4, 6.5, -1.6, -6.2, 3.3, -1.4, -0.4, 8.2] },
];
