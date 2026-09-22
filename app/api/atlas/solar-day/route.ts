import { NextRequest, NextResponse } from 'next/server';
import coords from '../../../../public/plz.json';
import { solarDay } from '../../../../lib/solar-day';
import { weightedSolarNow } from '../../../../lib/solar-now';

export async function GET(req: NextRequest) {
  const plz = req.nextUrl.searchParams.get('plz') || '97204';
  const point = (coords as Record<string, number[]>)[plz];
  if (!/^\d{5}$/.test(plz) || !point || point.length !== 2) return NextResponse.json({ error: 'Unknown postcode' }, { status: 400 });
  const [lat, lon] = point;
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude: String(lat), longitude: String(lon), timezone: 'Europe/Berlin', timeformat: 'unixtime', forecast_days: '1', wind_speed_unit: 'ms', minutely_15: 'shortwave_radiation_instant,temperature_2m,cloud_cover_high', current: 'shortwave_radiation,temperature_2m,cloud_cover_high,cloud_cover,rain,showers,weather_code,wind_speed_10m,wind_direction_10m' }).toString();
  try {
    const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Weather unavailable');
    const weather = await response.json();
    const now = new Date();
    const day = solarDay(weather.minutely_15, lat, lon, now);
    const current = weather.current;
    if (![current?.time, current?.shortwave_radiation, current?.temperature_2m, current?.cloud_cover_high].every(value => typeof value === 'number' && Number.isFinite(value)) || Math.abs(now.getTime() - current.time * 1000) > 45 * 60000) throw new Error('Current weather missing or stale');
    const power = { ...weightedSolarNow([{ ags: 'point', lat, lon, ghi: current.shortwave_radiation, temp: current.temperature_2m, cloudHigh: current.cloud_cover_high }], { point: 1 }, new Date(current.time * 1000)), asOf: new Date(current.time * 1000).toISOString(), scope: 'plz', plz };
    return NextResponse.json({ ...day, location: { name: plz === '97204' ? 'Höchberg' : `PLZ ${plz}`, plz, lat, lon }, weather, power, fetchedAt: now.getTime(), source: 'Open-Meteo' }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300' } });
  } catch {
    return NextResponse.json({ error: 'Weather data unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
