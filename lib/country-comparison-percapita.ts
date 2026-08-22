// Wind+Solar-Erzeugung pro Kopf (kWh je Einwohner), 2000–2024.
//
// Steht getrennt von country-comparison.ts, weil sie als einzige Reihe NICHT
// mitwächst: Sie braucht die Einwohnerzahl, und die hat Ember mit der
// Formatumstellung im Juli 2026 aus dem Jahresdatensatz genommen (vorher aus
// Verbrauch ÷ Verbrauch-pro-Kopf ableitbar). Der Generator
// (scripts/ember-laender-sync.ts) fasst diese Datei deshalb nicht an.
//
// Die eigene Jahresachse ist der Punkt: Gegen die längere Achse der übrigen
// Reihen gezeichnet, läge jeder Wert ein Jahr daneben — ein Fehler, den man dem
// Bild nicht ansieht.
//
// Wieder aufnehmen, sobald eine belegte Bevölkerungsquelle da ist (UN World
// Population Prospects oder Weltbank) — dann zuerst als Eintrag in
// lib/data-sources.ts, bevor damit gerechnet wird (Legal-Checkliste, Punkt 1).

import type { LineSeries } from "../components/charts/LineChart";

export const YEARS_PERCAPITA: number[] = [
  2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
  2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024,
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
