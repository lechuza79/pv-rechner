/**
 * WGS84 / ETRS89 longitude-latitude → ETRS89 / UTM zone 32N (EPSG:25832).
 *
 * The official municipal boundaries (BKG VG250) come in EPSG:25832, the register
 * coordinates in degrees. Converting the point is cheaper than reprojecting
 * 11,000 polygons, and it lets distances be measured in metres.
 *
 * Krüger series to fourth order in n (Karney 2011, eq. 7/11) on the GRS80
 * ellipsoid — sub-millimetre inside the zone and still far below a metre in the
 * eastern German states, which lie outside zone 32 but are mapped into it by
 * VG250 all the same. ETRS89 and WGS84 differ by well under a metre, which the
 * register coordinates do not resolve anyway.
 */
const A_AXIS = 6378137;
const F = 1 / 298.257222101;
const K0 = 0.9996;
const LON0 = (9 * Math.PI) / 180;
const FALSE_EASTING = 500000;

const N = F / (2 - F);
const N2 = N * N;
const N3 = N2 * N;
const N4 = N3 * N;
const A_RECT = (A_AXIS / (1 + N)) * (1 + N2 / 4 + N4 / 64);
const ALPHA = [
  N / 2 - (2 / 3) * N2 + (5 / 16) * N3 + (41 / 180) * N4,
  (13 / 48) * N2 - (3 / 5) * N3 + (557 / 1440) * N4,
  (61 / 240) * N3 - (103 / 140) * N4,
  (49561 / 161280) * N4,
];
const E_FACTOR = (2 * Math.sqrt(N)) / (1 + N);

export function wgs84NachUtm32(lat: number, lon: number): { x: number; y: number } {
  const phi = (lat * Math.PI) / 180;
  const dLambda = (lon * Math.PI) / 180 - LON0;
  const sinPhi = Math.sin(phi);
  const t = Math.sinh(Math.atanh(sinPhi) - E_FACTOR * Math.atanh(E_FACTOR * sinPhi));
  const xiP = Math.atan2(t, Math.cos(dLambda));
  const etaP = Math.atanh(Math.sin(dLambda) / Math.sqrt(1 + t * t));
  let xi = xiP;
  let eta = etaP;
  for (let j = 1; j <= 4; j++) {
    const a = ALPHA[j - 1];
    xi += a * Math.sin(2 * j * xiP) * Math.cosh(2 * j * etaP);
    eta += a * Math.cos(2 * j * xiP) * Math.sinh(2 * j * etaP);
  }
  return { x: FALSE_EASTING + K0 * A_RECT * eta, y: K0 * A_RECT * xi };
}
