/**
 * Irradiance on a tilted plane, reimplemented from the Open-Meteo sources so a
 * value read from our own ERA5 archive matches what the hosted API returns as
 * `global_tilted_irradiance`: `Sources/App/Helper/Solar/GlobalTilitedIrradiance.swift`
 * (`Zensun.calculateTiltedIrradiance`), read 18.09.2026.
 *
 * Inputs are the preceding-hour means the archive stores; so is the output. The
 * sun's position is averaged over the hour by integration rather than sampled
 * at one instant, and the model is isotropic sky plus 20 % ground albedo — the
 * provider's choices, deliberately not improved on here, because a better model
 * would no longer be the same number.
 *
 * One deviation, named: the provider takes solar declination and equation of
 * time from the full NREL SPA, sampled every 20 days and interpolated. We use
 * Meeus' low-accuracy formulas (Astronomical Algorithms, ch. 25 and 28), good to
 * about 0.01° of declination and a few seconds of time. The difference this
 * makes is measured against the provider, not assumed (lib/__tests__).
 */
const DEG = Math.PI / 180;

/** Solar declination in degrees and equation of time in hours, for a UTC instant. */
export function sunAt(ms: number) {
  const jd = ms / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const L0 = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * DEG) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M * DEG) +
    0.000289 * Math.sin(3 * M * DEG);
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * DEG);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * DEG);
  const declination = Math.asin(Math.sin(eps * DEG) * Math.sin(lambda * DEG)) / DEG;
  const y = Math.tan((eps * DEG) / 2) ** 2;
  const E =
    y * Math.sin(2 * L0 * DEG) -
    2 * e * Math.sin(M * DEG) +
    4 * e * y * Math.sin(M * DEG) * Math.cos(2 * L0 * DEG) -
    0.5 * y * y * Math.sin(4 * L0 * DEG) -
    1.25 * e * e * Math.sin(2 * M * DEG);
  return { declination, equationOfTimeHours: (E / DEG) * 4 / 60 };
}

/**
 * Global irradiance on a plane, W/m², preceding-hour mean.
 *
 * @param direct horizontal direct radiation, preceding-hour mean
 * @param diffuse horizontal diffuse radiation, preceding-hour mean
 * @param tilt degrees from horizontal (0) to vertical (90)
 * @param azimuth degrees, 0 = south, −90 = east, +90 = west (the provider's convention)
 * @param endMs UTC instant at the END of the hour the means belong to
 */
export function tiltedIrradiance(
  direct: number,
  diffuse: number,
  tilt: number,
  azimuth: number,
  latitude: number,
  longitude: number,
  endMs: number,
  intervalSeconds = 3600,
) {
  if (!Number.isFinite(direct) || !Number.isFinite(diffuse)) return Number.NaN;
  if (direct + diffuse <= 0) return 0;
  // Limit to 87° zenith: direct normal is unstable close to sunrise and sunset.
  const zenithCutOff = 3 * DEG;
  const { declination, equationOfTimeHours } = sunAt(endMs);
  const ut = (((endMs / 1000) % 86400) + 86400) % 86400 / 3600;
  const t1 = (90 - declination) * DEG;
  const p1 = -15 * (ut - 12 + equationOfTimeHours) * DEG;
  const ut0 = ut - intervalSeconds / 3600;
  const p10 = -15 * (ut0 - 12 + equationOfTimeHours) * DEG;
  const t0 = (90 - latitude) * DEG;
  let p0 = longitude * DEG;
  if (p0 < p1 - Math.PI) p0 += 2 * Math.PI;
  if (p0 > p1 + Math.PI) p0 -= 2 * Math.PI;

  const arg = -(Math.cos(t0) * Math.cos(t1)) / (Math.sin(t0) * Math.sin(t1));
  const carg = arg > 1 || arg < -1 ? Math.PI : Math.acos(arg) - zenithCutOff;
  const sunrise = p0 + carg;
  const sunset = p0 - carg;
  if (p10 < sunset || p1 > sunrise) return 0;
  const p1l = Math.min(sunrise, p10);
  const p10l = Math.max(sunset, p1);

  // Hour-mean of cos(zenith), integrated over the sunlit part of the interval.
  const left = Math.sin(t0) * Math.sin(t1) * Math.sin(p1l - p0) + p1l * Math.cos(t0) * Math.cos(t1);
  const right = Math.sin(t0) * Math.sin(t1) * Math.sin(p10l - p0) + p10l * Math.cos(t0) * Math.cos(t1);
  const pDelta = p1l - p10l;
  const safe = pDelta < 0 ? Math.min(-0.001, pDelta) : Math.max(0.001, pDelta);
  const zz = (left - right) / safe;
  const xx = (Math.sin(t1) * -Math.cos(p1l - p0) - Math.sin(t1) * -Math.cos(p10l - p0)) / safe;
  const yyLeft = p1l * Math.sin(t0) * Math.cos(t1) - Math.cos(t0) * Math.sin(t1) * Math.sin(p1l - p0);
  const yyRight = p10l * Math.sin(t0) * Math.cos(t1) - Math.cos(t0) * Math.sin(t1) * Math.sin(p10l - p0);
  const yy = (yyLeft - yyRight) / (p1l - p10l);

  const zenith = Math.acos(zz);
  const sunAzimuth = Math.atan2(xx, yy);
  const panelAzimuth = azimuth * DEG;
  const tiltRad = tilt * DEG;

  const skyView = (1 + Math.cos(tiltRad)) / 2;
  const moduleDiffuse = skyView * diffuse;
  const moduleAlbedo = (direct + diffuse) * 0.2 * (1 - skyView);
  const dni = zz <= 0.0001 ? direct : direct / zz;
  const incidence = Math.max(
    Math.cos(zenith) * Math.cos(tiltRad) + Math.sin(zenith) * Math.sin(tiltRad) * Math.cos(sunAzimuth - Math.PI - panelAzimuth),
    0,
  );
  return dni * incidence + moduleDiffuse + moduleAlbedo;
}
