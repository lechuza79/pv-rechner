import { modelHours, modelWeatherAt, type IconD2Shard } from "./icon-d2";
import { weightedSolarNow } from "./solar-now";

const STUNDE = 3600000;
const VIERTEL = 900000;

/**
 * Today's solar output curve at one place, in quarter hours, from the hourly
 * DWD ICON-D2 snapshot.
 *
 * Replaces the prototype's day curve, which called the free forecast API
 * (not allowed here: its free tier is non-commercial).
 *
 * The model gives radiation as the MEAN of each hour. Held for the whole
 * hour, the curve is a staircase of four equal bars; here each mean sits at
 * its hour's middle and the quarters between are interpolated — the shape a
 * day of sunshine has. The live gauge holds the hour value instead, so the
 * two can differ by a few percent at the same moment; the curve is a picture
 * of the day, not a second gauge.
 *
 * Returns null when the snapshot does not cover the whole day: a curve with a
 * hole would draw a flat stretch nobody modelled.
 */
export function solarTagAusModell(
  shard: IconD2Shard,
  plz: string,
  lat: number,
  lon: number,
  [tagStart, tagEnde]: [number, number],
): { time: string; powerPct: number }[] | null {
  // Hours ending at the day's start through one hour past its end: the first
  // and the last entry are the hours just outside the day, needed as the
  // neighbour of the first and last quarter.
  const stunden = modelHours(shard, plz, tagStart, tagEnde + 2 * STUNDE);
  if (!stunden) return null;
  // The mean of the hour ending at `time` belongs to that hour's middle.
  const mitten = stunden.times.map((t) => t - STUNDE / 2);
  const strahlungAm = (at: number): number | null => {
    const i = mitten.findIndex((m, k) => m <= at && at < (mitten[k + 1] ?? -Infinity));
    if (i < 0) return null;
    // The padding hour outside the day may be missing at the snapshot's
    // edge; the known hour then holds. Inside the day a gap stays a gap.
    const letzte = stunden.shortwave.length - 1;
    const a = stunden.shortwave[i] ?? (i === 0 ? stunden.shortwave[1] : null);
    const b = stunden.shortwave[i + 1] ?? (i + 1 === letzte ? a : null);
    if (a === null || b === null) return null;
    return Math.max(0, a + ((b - a) * (at - mitten[i])) / STUNDE);
  };

  const points: { time: string; powerPct: number }[] = [];
  for (let at = tagStart; at < tagEnde; at += VIERTEL) {
    const ghi = strahlungAm(at);
    const model = modelWeatherAt(shard, plz, new Date(at));
    if (ghi === null || !model || model.temperature === null) return null;
    const { powerPct } = weightedSolarNow(
      [{ ags: "point", lat, lon, ghi, temp: model.temperature, cloudHigh: model.cloudCoverHigh ?? 0 }],
      { point: 1 },
      new Date(at),
    );
    points.push({ time: new Date(at).toISOString(), powerPct });
  }
  return points;
}
