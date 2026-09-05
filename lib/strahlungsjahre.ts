// AUTO-generiert aus den DWD-Jahresrastern der Globalstrahlung (CC BY 4.0) —
// erzeugt von scripts/dwd-strahlung-sync.ts, nicht von Hand pflegen.
//
// Gebietsmittel Deutschland je Kalenderjahr, kWh/m² auf die horizontale Ebene:
// ungewichtetes Mittel aller 359.586 belegten 1-km-Zellen des Rasters
// (unsere Ableitung — der DWD liefert das Raster, nicht den Mittelwert).
// Quelle: DWD Climate Data Center (CDC), Rasterdaten der Jahressumme für die
// Globalstrahlung auf die horizontale Ebene für Deutschland basierend auf
// Boden- und Satellitenmessungen, Version V003. Unsicherheit der Rasterwerte
// laut DWD ±6 %; Satelliten-Eingangsdaten ab 2015 aus CM SAF, ab 2018 neue
// Version — die Reihe ist laut Datensatzbeschreibung durchgängig mit einer
// Methode erstellt.
//
// Wofür: das „Wetterjahr" im Stromkosten-Rennen (lib/kostenrennen-varianten.ts)
// — wie stark ein gutes Solarjahr über einem schlechten liegt. Nur RELATIV zu
// verwenden (Jahr ÷ Mittel eines Zeitraums): Welche Strahlung unserem
// Referenzertrag von 1.050 kWh/kWp entspricht, ist damit NICHT belegt.

export const STRAHLUNG_META = {
  quelle: "DWD Climate Data Center (CDC), Jahresraster Globalstrahlung V003",
  einheit: "kWh/m²",
  erzeugt: "2026-09-05",
  ersteJahr: 1991,
  letztesJahr: 2025,
} as const;

export const STRAHLUNG_JAHRE: { jahr: number; kwhM2: number }[] = [
  { jahr: 1991, kwhM2: 1059.5 },
  { jahr: 1992, kwhM2: 1067.9 },
  { jahr: 1993, kwhM2: 1043.6 },
  { jahr: 1994, kwhM2: 1061.1 },
  { jahr: 1995, kwhM2: 1053.4 },
  { jahr: 1996, kwhM2: 1023.6 },
  { jahr: 1997, kwhM2: 1099.4 },
  { jahr: 1998, kwhM2: 995.9 },
  { jahr: 1999, kwhM2: 1088.4 },
  { jahr: 2000, kwhM2: 1047.6 },
  { jahr: 2001, kwhM2: 1041.7 },
  { jahr: 2002, kwhM2: 1033.2 },
  { jahr: 2003, kwhM2: 1196.9 },
  { jahr: 2004, kwhM2: 1063.7 },
  { jahr: 2005, kwhM2: 1102.3 },
  { jahr: 2006, kwhM2: 1110.3 },
  { jahr: 2007, kwhM2: 1087.1 },
  { jahr: 2008, kwhM2: 1082.3 },
  { jahr: 2009, kwhM2: 1102.4 },
  { jahr: 2010, kwhM2: 1066 },
  { jahr: 2011, kwhM2: 1134 },
  { jahr: 2012, kwhM2: 1096.5 },
  { jahr: 2013, kwhM2: 1046.4 },
  { jahr: 2014, kwhM2: 1075.2 },
  { jahr: 2015, kwhM2: 1111.4 },
  { jahr: 2016, kwhM2: 1079.2 },
  { jahr: 2017, kwhM2: 1077.7 },
  { jahr: 2018, kwhM2: 1206.9 },
  { jahr: 2019, kwhM2: 1146.3 },
  { jahr: 2020, kwhM2: 1171.3 },
  { jahr: 2021, kwhM2: 1094.6 },
  { jahr: 2022, kwhM2: 1227.4 },
  { jahr: 2023, kwhM2: 1144 },
  { jahr: 2024, kwhM2: 1112.5 },
  { jahr: 2025, kwhM2: 1187.2 },
];

/** Gebietsmittel eines Jahres oder undefined, wenn es nicht in der Reihe steht. */
export function strahlungImJahr(jahr: number): number | undefined {
  return STRAHLUNG_JAHRE.find((r) => r.jahr === jahr)?.kwhM2;
}
