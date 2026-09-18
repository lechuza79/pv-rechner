/**
 * Weather stations of the German weather service that publish hourly reports.
 *
 * The list is built from the MOSMIX station catalogue and the directory of
 * report files by `scripts/dwd-stations-build.ts` and committed, so choosing a
 * station never needs a request.
 */
import data from './dwd-stations.json';

export type DwdStation = { id: string; name: string; latitude: number; longitude: number; elevation: number };

export const DWD_STATIONS = data.stations as DwdStation[];
export const DWD_STATIONS_BUILT_AT = data.builtAt;

/**
 * The catalogue writes positions as degrees and minutes, not decimal degrees:
 * Berlin-Tempelhof is listed as "52.28 13.24" and lies at 52°28'N 13°24'E.
 * Read as decimals that is 21 km off — plausible enough that nothing looks wrong.
 * Measured on the catalogue of 18.09.2026: 5,648 of 5,649 entries have fewer
 * than 60 "minutes", which a decimal format could not produce.
 */
export function degreesMinutes(value: number) {
  const sign = value < 0 ? -1 : 1;
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute + 1e-9);
  const minutes = Math.round((absolute - degrees) * 100 * 1e6) / 1e6;
  return sign * (degrees + minutes / 60);
}

/** Great-circle distance in km. */
export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLon = (bLon - aLon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Stations around a point, nearest first, within a radius. */
export function stationsNear(latitude: number, longitude: number, radiusKm: number, stations = DWD_STATIONS) {
  return stations
    .map((station) => ({ station, distanceKm: distanceKm(latitude, longitude, station.latitude, station.longitude) }))
    .filter((entry) => entry.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
