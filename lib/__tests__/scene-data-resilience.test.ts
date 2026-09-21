import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ weather: vi.fn(), power: vi.fn() }));
vi.mock('../weather-now-service', () => ({ readWeatherNow: mocks.weather }));
vi.mock('../solar-now-service', () => ({ readSolarNow: mocks.power }));
import { GET } from '../../app/scene-data/route';
const weather = { weather: { time: new Date().toISOString(), cloudCover: 97, weatherCode: 3, temperature: 18, windSpeed: 2, windDirection: 270, precipitationRate: 0 } };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetAllMocks(); });
describe('scene resilience', () => {
  it('reads weather directly in production, without self-fetches or a local override', async () => {
    vi.stubEnv('VERCEL', '1'); vi.stubEnv('SZENE_DATEN_BASIS', 'https://local-only.invalid');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    mocks.weather.mockResolvedValue(weather); mocks.power.mockResolvedValue({ power: 12 });
    const r = await GET(new NextRequest('https://solar-check.io/scene-data?plz=97204'));
    expect((await r.json()).weather.current.cloud_cover).toBe(97);
    expect(fetch).not.toHaveBeenCalled(); expect(mocks.weather).toHaveBeenCalledWith('97204');
    expect(r.headers.get('cache-control')).toContain('s-maxage=300');
  });
  it('does not cache a weather outage and recovers on the next request', async () => {
    vi.stubEnv('VERCEL', '1'); mocks.power.mockResolvedValue({ power: 12 });
    mocks.weather.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce(weather);
    const req = () => new NextRequest('https://solar-check.io/scene-data?plz=97204');
    const failed = await GET(req()); const body = await failed.json();
    expect(failed.headers.get('cache-control')).toBe('no-store');
    expect(body.weather).toBeUndefined(); expect(body.location.plz).toBe('97204');
    expect((await (await GET(req())).json()).weather.current.cloud_cover).toBe(97);
  });
  it('keeps valid weather when solar power fails', async () => {
    vi.stubEnv('VERCEL', '1'); mocks.weather.mockResolvedValue(weather); mocks.power.mockRejectedValue(new Error('timeout'));
    const r = await GET(new NextRequest('https://solar-check.io/scene-data?plz=97204'));
    expect(r.headers.get('cache-control')).toBe('no-store');
    const body = await r.json(); expect(body.weather.current.cloud_cover).toBe(97); expect(body.power).toBeUndefined();
  });
});
