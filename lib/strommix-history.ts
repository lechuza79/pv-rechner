/**
 * Langzeit-Strommix Deutschland: Bruttostromerzeugung nach Energieträgern, 1990–2025.
 *
 * Werte in Terawattstunden (TWh), Bruttostromerzeugung inkl. Pumpspeicher.
 *
 * Quelle / Zitat: Umweltbundesamt (UBA), "Erneuerbare und konventionelle
 *   Stromerzeugung", Datenlizenz Deutschland – Namensnennung 2.0 (DL-DE-BY-2.0,
 *   www.govdata.de/dl-de/by-2-0). Datenbasis: AG Energiebilanzen (AGEB / AGEE-Stat).
 * Gegengeprüft gegen die AGEB-Publikation "Bruttostromerzeugung in Deutschland
 *   nach Energieträgern" (STRERZ, Stand 18.06.2026) — Werte identisch.
 *
 * Granularität: 1990, 1995, 2000, danach lückenlos jährlich ab 2001. Die
 *   Einzeljahre 1991–1994 und 1996–1999 werden in der Quelle nicht auf
 *   Jahresebene nach Energieträger ausgewiesen (existieren dort nicht) — daher
 *   fehlen sie bewusst und werden im Chart nicht interpoliert.
 *
 * WARTUNG: einmal jährlich aktualisieren, wenn AGEB/UBA die neuen Jahreswerte
 *   veröffentlichen (typisch Frühjahr für das Vorjahr). Kein Auto-Update — dies
 *   ist ein bewusster Stichtags-Datenstand, siehe `dataAsOf`.
 */

export const STROMMIX_HISTORY_META = {
  unit: "TWh",
  metric: "Bruttostromerzeugung inkl. Pumpspeicher",
  source: "Umweltbundesamt (DL-DE-BY 2.0), Datenbasis: AG Energiebilanzen",
  sourceUrl:
    "https://www.umweltbundesamt.de/daten/umweltzustand-trends/energie/erneuerbare-konventionelle-stromerzeugung",
  license: "Datenlizenz Deutschland – Namensnennung 2.0",
  licenseUrl: "https://www.govdata.de/dl-de/by-2-0",
  dataAsOf: "2026-06-18",
} as const;

/** Stützjahre der Reihe (chronologisch). */
export const STROMMIX_HISTORY_YEARS: number[] = [
  1990, 1995, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010,
  2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023,
  2024, 2025,
];

export type StrommixSeriesKey =
  | "erneuerbare"
  | "kernenergie"
  | "braunkohle"
  | "steinkohle"
  | "erdgas"
  | "mineraloel";

export interface StrommixSeries {
  key: StrommixSeriesKey;
  /** Anzeige-Label (deutsch). */
  label: string;
  /** CSS-Token für die Serienfarbe (siehe lib/theme.ts Energie-Tokens). */
  colorToken: string;
  /** Werte in TWh, index-gleich zu STROMMIX_HISTORY_YEARS. */
  values: number[];
}

// Reihenfolge = Legenden-/Stapel-Reihenfolge (Erneuerbare oben).
export const STROMMIX_HISTORY_SERIES: StrommixSeries[] = [
  {
    key: "erneuerbare",
    label: "Erneuerbare",
    colorToken: "--color-energy-cat-renewable",
    values: [
      19.7, 25.1, 37.9, 38.9, 46.1, 46.8, 58.0, 63.5, 72.8, 90.0, 95.1, 97.0,
      106.4, 125.6, 145.1, 153.7, 163.7, 190.1, 191.1, 217.7, 225.3, 243.6,
      253.5, 239.7, 255.5, 275.1, 288.1, 291.6,
    ],
  },
  {
    key: "kernenergie",
    label: "Kernenergie",
    colorToken: "--color-energy-nuclear",
    values: [
      152.5, 154.1, 169.6, 171.3, 164.8, 165.1, 167.1, 163.0, 167.4, 140.5,
      148.8, 134.9, 140.6, 108.0, 99.5, 97.3, 97.1, 91.8, 84.6, 76.3, 76.0,
      75.1, 64.4, 69.1, 34.7, 7.2, 0.0, 0.0,
    ],
  },
  {
    key: "braunkohle",
    label: "Braunkohle",
    colorToken: "--color-energy-lignite",
    values: [
      170.9, 142.6, 148.3, 154.8, 158.0, 158.2, 158.0, 154.1, 151.1, 155.1,
      150.6, 145.6, 145.9, 150.1, 160.7, 160.9, 155.8, 154.5, 149.5, 148.4,
      145.6, 114.0, 91.7, 110.1, 116.2, 86.3, 78.8, 74.4,
    ],
  },
  {
    key: "steinkohle",
    label: "Steinkohle",
    colorToken: "--color-energy-coal",
    values: [
      140.8, 147.1, 143.1, 138.4, 134.6, 146.5, 140.8, 134.1, 137.9, 142.0,
      124.6, 107.9, 117.0, 112.4, 116.4, 127.3, 118.6, 117.7, 112.2, 92.9, 82.6,
      57.5, 42.8, 54.6, 63.7, 38.5, 26.9, 29.9,
    ],
  },
  {
    key: "erdgas",
    label: "Erdgas",
    colorToken: "--color-energy-gas",
    values: [
      35.9, 41.1, 49.2, 55.5, 56.3, 62.6, 62.7, 72.2, 74.7, 77.5, 88.5, 80.3,
      88.8, 85.7, 75.9, 67.0, 60.6, 61.5, 80.6, 86.0, 81.6, 89.9, 94.7, 90.3,
      79.1, 76.6, 81.6, 86.3,
    ],
  },
  {
    key: "mineraloel",
    label: "Mineralöl",
    colorToken: "--color-energy-oil",
    values: [
      10.8, 9.1, 5.9, 6.1, 8.7, 10.3, 10.7, 11.9, 10.8, 9.8, 9.5, 9.9, 8.6, 7.0,
      7.5, 7.0, 5.5, 6.1, 5.7, 5.5, 5.1, 4.8, 4.7, 4.6, 5.8, 4.9, 4.3, 4.2,
    ],
  },
];

// ---------------------------------------------------------------------------
// CO₂-Intensität des deutschen Strommix (g CO₂/kWh), 1990–2024.
// Direkter CO₂-Emissionsfaktor des Strommix (ohne Vorketten).
// Quelle: Umweltbundesamt, "Entwicklung der spezifischen Treibhausgas-
//   Emissionen des deutschen Strommix 1990–2024" (CLIMATE CHANGE 13/2025),
//   Tabelle 2. Werte 2023/2024 sind UBA-Schätzungen aus derselben Publikation.
//   DL-DE-BY 2.0, Datenbasis AGEB/AGEE-Stat/Destatis.
// ---------------------------------------------------------------------------

export const CO2_INTENSITY_META = {
  unit: "g CO₂/kWh",
  metric: "Direkter CO₂-Emissionsfaktor des Strommix",
  source: "Umweltbundesamt (DL-DE-BY 2.0), CLIMATE CHANGE 13/2025",
  sourceUrl:
    "https://www.umweltbundesamt.de/publikationen/entwicklung-der-spezifischen-treibhausgas-11",
  license: "Datenlizenz Deutschland – Namensnennung 2.0",
  licenseUrl: "https://www.govdata.de/dl-de/by-2-0",
  dataAsOf: "2025-04",
} as const;

export const CO2_INTENSITY_YEARS: number[] = [
  1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002,
  2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
  2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024,
];

/** g CO₂/kWh, index-gleich zu CO2_INTENSITY_YEARS. */
export const CO2_INTENSITY_VALUES: number[] = [
  764, 764, 730, 726, 722, 714, 687, 671, 673, 649, 646, 661, 656, 639, 619,
  614, 608, 627, 583, 571, 559, 570, 572, 573, 559, 530, 524, 490, 474, 409,
  365, 406, 433, 386, 363,
];

/**
 * Absolute CO₂-Emissionen der Stromerzeugung in Mio. t, index-gleich zu
 * CO2_INTENSITY_YEARS (1990–2024). Werte 2023/2024 sind UBA-Schätzungen.
 * Quelle: siehe CO2_INTENSITY_META (CLIMATE CHANGE 13/2025, Tabelle 2, Spalte
 * "Kohlendioxidemissionen der Stromerzeugung").
 */
export const CO2_ABSOLUTE_VALUES: number[] = [
  366, 361, 345, 335, 335, 336, 337, 326, 330, 319, 328, 337, 339, 341, 334,
  334, 341, 352, 328, 301, 314, 310, 320, 326, 312, 305, 304, 286, 272, 222,
  187, 215, 223, 175, 160,
];

// ---------------------------------------------------------------------------
// Strompreise Deutschland (ct/kWh), 2007–2025. Jahresmittel aus den beiden
// Halbjahreswerten. Haushalt = mittlere Verbrauchsklasse 2500–4999 kWh, inkl.
// aller Steuern/Abgaben. Industrie = Klasse 2–20 GWh, ohne MwSt. (erstattbar).
// Erst ab 2007, weil vor der Marktliberalisierung keine vergleichbare Reihe
// existiert. Quelle: Eurostat (nrg_pc_204 / nrg_pc_205), CC BY 4.0.
// ---------------------------------------------------------------------------

export const PRICE_META = {
  unit: "ct/kWh",
  metric: "Strompreis (Jahresmittel)",
  source: "Eurostat (nrg_pc_204 / nrg_pc_205)",
  sourceUrl: "https://ec.europa.eu/eurostat/databrowser/product/view/nrg_pc_204",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  dataAsOf: "2025",
} as const;

export const PRICE_YEARS: number[] = [
  2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019,
  2020, 2021, 2022, 2023, 2024, 2025,
];

/** Haushaltsstrompreis inkl. Steuern, ct/kWh. */
export const PRICE_HOUSEHOLD: number[] = [
  20.65, 21.71, 22.88, 24.06, 25.3, 26.36, 29.2, 29.77, 29.48, 29.73, 30.48,
  29.94, 29.83, 30.25, 32.14, 33.18, 40.73, 39.47, 38.52,
];

/** Industriestrompreis ohne MwSt., ct/kWh. */
export const PRICE_INDUSTRY: number[] = [
  8.7, 9.58, 10.04, 10.26, 11.3, 11.57, 12.75, 13.51, 13.08, 12.74, 12.69,
  12.32, 13.36, 15.21, 15.72, 19.38, 20.36, 20.46, 19.27,
];
