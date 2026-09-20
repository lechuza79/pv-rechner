import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const download = vi.hoisted(() => vi.fn());
vi.mock('../supabase-server', () => ({ supabase: { storage: { from: () => ({ download }) } } }));
vi.mock('../db-timeout', () => ({ DB_SOFT_READ_TIMEOUT_MS: 3000, withDbTimeout: (p: unknown) => p }));
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.stubEnv('WEATHER_SNAPSHOT_DIR', ''); download.mockReset(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
const good = (value: unknown) => ({ data: { text: async () => JSON.stringify(value) }, error: null });
describe('weather snapshot recovery', () => {
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
