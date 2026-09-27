import { weightedSolarNow } from './solar-now';

type Series = { time: number[]; shortwave_radiation_instant: number[]; temperature_2m: number[]; cloud_cover_high: number[] };
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' });
export function solarDay(series: Series, lat: number, lon: number, now: Date) {
  const fields = [series?.time, series?.shortwave_radiation_instant, series?.temperature_2m, series?.cloud_cover_high];
  if (fields.some(field => !Array.isArray(field)) || fields.some(field => field.length !== series.time.length)) throw new Error('Incomplete weather series');
  const today = dayFormat.format(now);
  const points = series.time.flatMap((time, i) => {
    const date = new Date(time * 1000);
    if (!Number.isFinite(time) || dayFormat.format(date) !== today) return [];
    const [ghi, temp, cloudHigh] = fields.slice(1).map(field => field[i]);
    if (![ghi, temp, cloudHigh].every(value => typeof value === 'number' && Number.isFinite(value)) || ghi < 0 || cloudHigh < 0 || cloudHigh > 100) throw new Error('Invalid weather value');
    return [{ time: date.toISOString(), powerPct: weightedSolarNow([{ ags: 'point', lat, lon, ghi, temp, cloudHigh }], { point: 1 }, date).powerPct }];
  });
  if (points.length < 92 || points.some((point, i) => i > 0 && Date.parse(point.time) - Date.parse(points[i - 1].time) !== 900000)) throw new Error('Incomplete local day');
  return { date: today, timezone: 'Europe/Berlin', points };
}
