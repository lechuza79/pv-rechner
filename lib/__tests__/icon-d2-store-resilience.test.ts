import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const download = vi.hoisted(() => vi.fn());
const readFile=vi.hoisted(()=>vi.fn());
vi.mock('node:fs/promises',()=>({readFile}));
vi.mock('../supabase-server', () => ({ supabase: { storage: { from: () => ({ download }) } } }));
vi.mock('../db-timeout', () => ({ DB_SOFT_READ_TIMEOUT_MS: 3000, withDbTimeout: (p: unknown) => p }));
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.stubEnv('WEATHER_SNAPSHOT_DIR', '');vi.stubEnv('WEATHER_PREVIEW_SNAPSHOT_DIR','');readFile.mockReset(); download.mockReset(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
const good = (value: unknown) => ({ data: { text: async () => JSON.stringify(value) }, error: null });
describe('weather snapshot recovery', () => {
  it('uses a local preview shard without downloading or changing the shared store',async()=>{
    vi.stubEnv('WEATHER_PREVIEW_SNAPSHOT_DIR','preview-weather');
    const local={heightWind:3,runInit:new Date().toISOString(),points:{'26209':{}}};
    readFile.mockResolvedValue(JSON.stringify(local));
    const {loadIconD2Shard}=await import('../icon-d2-store');
    expect(await loadIconD2Shard('26','26209')).toEqual(local);
    expect(download).not.toHaveBeenCalled();
  });
  it('preserves weather for other towns when the small preview overlay has no matching shard',async()=>{
    vi.stubEnv('WEATHER_PREVIEW_SNAPSHOT_DIR','preview-weather');
    readFile.mockResolvedValue(JSON.stringify({runInit:new Date().toISOString(),points:{'26209':{}}}));
    download.mockResolvedValue(good({sky:97}));
    const {loadIconD2Shard}=await import('../icon-d2-store');
    expect(await loadIconD2Shard('26','26434')).toEqual({sky:97});
  });
  it('retries a failed first read after 30 seconds, not ten minutes', async () => {
    download.mockResolvedValueOnce({ data: null, error: true }).mockResolvedValueOnce(good({ sky: 97 }));
    const { loadSnapshotFile } = await import('../icon-d2-store');
    expect(await loadSnapshotFile('test')).toBeNull();
    await vi.advanceTimersByTimeAsync(30001);
    expect(await loadSnapshotFile('test')).toEqual({ sky: 97 });
  });
  it('shares concurrent reads and keeps the last good file through a transient outage', async () => {
    download.mockResolvedValueOnce(good({ sky: 97 })).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(good({ sky: 90 }));
    const { loadSnapshotFile } = await import('../icon-d2-store');
    await Promise.all([loadSnapshotFile('test'), loadSnapshotFile('test')]);
    expect(download).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(600001);
    expect(await loadSnapshotFile('test')).toEqual({ sky: 97 });
    await vi.advanceTimersByTimeAsync(30001);
    expect(await loadSnapshotFile('test')).toEqual({ sky: 90 });
  });
});
