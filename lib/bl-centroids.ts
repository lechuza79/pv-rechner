// Repräsentativer Wetter-Standort je Bundesland (ungefährer geografischer
// Mittelpunkt), gekeyt am 2-stelligen AGS. Nur für die simulierte Solarleistung
// im Live-Radial — ein Bundesland hat keine echten Live-Erzeugungsdaten, daher
// ein Punkt als Näherung, klar als „simuliert" beschriftet. Geografische
// Konstanten, kein Rollover-Thema.
export const BL_CENTROID: Record<string, { lat: number; lon: number }> = {
  "01": { lat: 54.2, lon: 9.7 },   // Schleswig-Holstein
  "02": { lat: 53.55, lon: 10.0 }, // Hamburg
  "03": { lat: 52.8, lon: 9.1 },   // Niedersachsen
  "04": { lat: 53.08, lon: 8.8 },  // Bremen
  "05": { lat: 51.5, lon: 7.5 },   // Nordrhein-Westfalen
  "06": { lat: 50.6, lon: 9.0 },   // Hessen
  "07": { lat: 49.9, lon: 7.5 },   // Rheinland-Pfalz
  "08": { lat: 48.6, lon: 9.0 },   // Baden-Württemberg
  "09": { lat: 48.9, lon: 11.4 },  // Bayern
  "10": { lat: 49.4, lon: 7.0 },   // Saarland
  "11": { lat: 52.52, lon: 13.4 }, // Berlin
  "12": { lat: 52.4, lon: 13.0 },  // Brandenburg
  "13": { lat: 53.6, lon: 12.7 },  // Mecklenburg-Vorpommern
  "14": { lat: 51.1, lon: 13.2 },  // Sachsen
  "15": { lat: 51.9, lon: 11.7 },  // Sachsen-Anhalt
  "16": { lat: 50.9, lon: 11.0 },  // Thüringen
};
