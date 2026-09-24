// AUTO-generiert aus den DWD-Monatsrastern der Globalstrahlung (CC BY 4.0) —
// erzeugt von scripts/dwd-strahlung-sync.ts, nicht von Hand pflegen.
//
// Gebietsmittel Deutschland je Monat, kWh/m² auf die horizontale Ebene:
// ungewichtetes Mittel aller 359.586 belegten 1-km-Zellen des Rasters
// (unsere Ableitung — der DWD liefert das Raster, nicht den Mittelwert). Die
// Jahressumme ist die Summe der zwölf Monatsmittel.
// Quelle: DWD Climate Data Center (CDC), Rasterdaten der Monatssumme für die
// Globalstrahlung auf die horizontale Ebene für Deutschland basierend auf
// Boden- und Satellitenmessungen, Version V003. Unsicherheit der Rasterwerte
// laut DWD ±6 %; Satelliten-Eingangsdaten ab 2015 aus CM SAF, ab 2018 neue
// Version — die Reihe ist laut Datensatzbeschreibung durchgängig mit einer
// Methode erstellt.
//
// Wofür: das echte Wetter im Amortisations-Rennen (lib/kostenrennen.ts) —
// jeder Monat der letzten 25 Jahre so, wie er war: ein trüber Mai, ein
// Rekord-April, ein kurzer Winter. Nur RELATIV zu verwenden (Monat ÷ Mittel
// eines Zeitraums): Welche Strahlung unserem Referenzertrag von 1.050 kWh/kWp
// entspricht, ist damit NICHT belegt.

export const STRAHLUNG_META = {
  quelle: "DWD Climate Data Center (CDC), Monatsraster Globalstrahlung V003",
  einheit: "kWh/m²",
  erzeugt: "2026-09-05",
  ersteJahr: 1991,
  letztesJahr: 2025,
} as const;

/** Je Kalenderjahr: Jahressumme und die zwölf Monatswerte (Januar … Dezember). */
export const STRAHLUNG_JAHRE: { jahr: number; kwhM2: number; monate: number[] }[] = [
  { jahr: 1991, kwhM2: 1059.6, monate: [24.6, 47, 74.9, 119.8, 133.7, 136.7, 178.1, 142.3, 99.2, 61.9, 23.7, 17.7] },
  { jahr: 1992, kwhM2: 1067.8, monate: [21, 36.2, 67.7, 109.3, 181.2, 167.5, 160.6, 137.7, 97.5, 48.9, 23, 17.2] },
  { jahr: 1993, kwhM2: 1043.5, monate: [24.8, 37.4, 89, 125.2, 163.3, 155.6, 140.8, 141.5, 81.4, 48, 22.9, 13.6] },
  { jahr: 1994, kwhM2: 1060.8, monate: [19.4, 40.5, 66.4, 108.6, 147.3, 164.3, 191.3, 137.7, 79.8, 64.3, 23.8, 17.4] },
  { jahr: 1995, kwhM2: 1053.2, monate: [23.5, 34.7, 79.8, 102.2, 153.7, 143.2, 183.7, 151.6, 79.5, 58.8, 26.6, 15.9] },
  { jahr: 1996, kwhM2: 1023.6, monate: [24.3, 42.6, 80.8, 128.9, 121.4, 158.4, 155.6, 134.6, 83.5, 51.9, 21.9, 19.7] },
  { jahr: 1997, kwhM2: 1099.3, monate: [23.8, 39.8, 74.4, 120.8, 160.9, 164, 153.2, 152.4, 110.7, 58.1, 26.3, 14.9] },
  { jahr: 1998, kwhM2: 995.8, monate: [24.6, 42.8, 76, 98.3, 162.7, 154.9, 136.4, 140.1, 76.9, 39.4, 24.7, 19] },
  { jahr: 1999, kwhM2: 1088.4, monate: [23.9, 36.2, 72.6, 115.8, 161.4, 161.7, 173, 135.4, 107.2, 58.5, 26.3, 16.4] },
  { jahr: 2000, kwhM2: 1047.7, monate: [22.6, 39.6, 62.2, 122.6, 167.2, 178.4, 125.4, 146.3, 86.9, 48.7, 28.5, 19.3] },
  { jahr: 2001, kwhM2: 1041.6, monate: [24.8, 41, 61.5, 103, 177, 153.6, 171.1, 141.1, 67.2, 57.8, 25.8, 17.7] },
  { jahr: 2002, kwhM2: 1033.1, monate: [25.5, 37.8, 83.4, 114.7, 142.8, 167.1, 141.1, 133.3, 98.5, 50.4, 22.4, 16.1] },
  { jahr: 2003, kwhM2: 1197, monate: [21.4, 53.5, 94.1, 134.7, 156.4, 189.5, 169.1, 162.1, 110.2, 57.9, 28.2, 19.9] },
  { jahr: 2004, kwhM2: 1063.8, monate: [21.3, 40.1, 83, 124.8, 144.6, 154.4, 154.5, 138.9, 103.9, 58, 23.1, 17.2] },
  { jahr: 2005, kwhM2: 1102.3, monate: [24.3, 39.9, 85.7, 122.8, 155.4, 176.9, 152.6, 127.5, 105.7, 67.4, 27.2, 16.9] },
  { jahr: 2006, kwhM2: 1110.4, monate: [28.2, 34.7, 75.1, 106, 152.1, 181.3, 203.3, 113.6, 110.7, 58.7, 27.3, 19.4] },
  { jahr: 2007, kwhM2: 1087.1, monate: [20.5, 34.9, 86.2, 159.5, 157.4, 156.4, 150.3, 134.5, 87.2, 59.2, 23.4, 17.6] },
  { jahr: 2008, kwhM2: 1082.3, monate: [22.4, 48.3, 74.5, 105.9, 180.1, 175.9, 160.3, 132.1, 87.6, 53.5, 24.7, 17] },
  { jahr: 2009, kwhM2: 1102.5, monate: [26.8, 33.4, 66.5, 144, 164.7, 157.2, 161.6, 155.1, 100.4, 51.2, 24.6, 17] },
  { jahr: 2010, kwhM2: 1065.9, monate: [21.2, 37.6, 82.6, 137.3, 115.7, 179.3, 184.5, 116.8, 90.5, 60.6, 21.9, 17.9] },
  { jahr: 2011, kwhM2: 1134, monate: [22.3, 39.3, 94.5, 143.3, 180.1, 160.8, 137.7, 137.1, 104, 67, 33.5, 14.4] },
  { jahr: 2012, kwhM2: 1096.4, monate: [22.4, 45.2, 90.3, 112.8, 171.3, 147.1, 155.1, 151.8, 100.6, 57.9, 24.4, 17.5] },
  { jahr: 2013, kwhM2: 1046.6, monate: [19.2, 31.4, 81.5, 109.3, 125.3, 160.6, 191, 146.6, 84.6, 54.9, 23.1, 19.1] },
  { jahr: 2014, kwhM2: 1075.1, monate: [21.9, 43.3, 93.7, 119.5, 144.3, 174.3, 164.1, 130.6, 88.5, 55.5, 26.6, 12.8] },
  { jahr: 2015, kwhM2: 1111.4, monate: [19.3, 42.3, 80.9, 138.3, 150.6, 162.6, 173.6, 150.3, 91.3, 53.7, 28.4, 20.1] },
  { jahr: 2016, kwhM2: 1079.2, monate: [22.2, 36.1, 72.2, 117.5, 160.4, 159.5, 161.4, 146.9, 112, 45.3, 26.3, 19.4] },
  { jahr: 2017, kwhM2: 1077.8, monate: [27.1, 37.4, 86.9, 115.8, 163.5, 175.9, 155.6, 138.9, 87.1, 53.3, 21.8, 14.5] },
  { jahr: 2018, kwhM2: 1207, monate: [19.3, 49, 75, 137.2, 186.1, 168.4, 197.5, 154.7, 109.4, 67.3, 29.2, 13.9] },
  { jahr: 2019, kwhM2: 1146.4, monate: [21.1, 51.9, 75.2, 137.8, 146, 199.7, 169.8, 146.6, 98.3, 55.7, 24.3, 20] },
  { jahr: 2020, kwhM2: 1171.5, monate: [23.6, 37.3, 94.7, 162.5, 170.5, 163.2, 170.6, 145.2, 109.2, 47.7, 31.1, 15.9] },
  { jahr: 2021, kwhM2: 1094.5, monate: [19.9, 49.3, 87.5, 127.5, 142.7, 181.7, 154.6, 124.9, 103.8, 62.7, 23.2, 16.7] },
  { jahr: 2022, kwhM2: 1227.6, monate: [20.4, 42, 111.3, 128, 175.7, 191.3, 184.1, 163.5, 97.4, 65.9, 31, 17] },
  { jahr: 2023, kwhM2: 1144.1, monate: [19, 43.2, 72.5, 112.4, 173.9, 199.1, 167.4, 134.2, 124.5, 56.8, 24.9, 16.2] },
  { jahr: 2024, kwhM2: 1112.6, monate: [26.2, 36.2, 79.6, 117, 160.9, 165, 172.1, 159.3, 100.8, 55.2, 24.2, 16.1] },
  { jahr: 2025, kwhM2: 1187.1, monate: [25.1, 44.1, 101.3, 145, 176.9, 186.8, 152.3, 157.8, 96.8, 50.3, 29.9, 20.8] },
];

/** Gebietsmittel eines Jahres oder undefined, wenn es nicht in der Reihe steht. */
export function strahlungImJahr(jahr: number): number | undefined {
  return STRAHLUNG_JAHRE.find((r) => r.jahr === jahr)?.kwhM2;
}
