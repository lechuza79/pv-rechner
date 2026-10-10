import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../energy-api', () => ({ fetchCrossBorderFlows: vi.fn(), fetchPublicPower: vi.fn() }));
import { fetchCrossBorderFlows, fetchPublicPower } from '../energy-api';
import { computeNuclearImport } from '../nuclear-import';

const times = Array.from({ length: 32 }, (_, i) => new Date(Date.UTC(2026, 9, 1) + i * 900000).toISOString());
beforeEach(() => {
  vi.mocked(fetchCrossBorderFlows).mockResolvedValue(times.map((ts, i) => ({ source: 'test', metric: 'cbpf', country: 'de', ts, data: { france: i % 2 ? 2 : 1 } })));
  vi.mocked(fetchPublicPower).mockResolvedValue(times.map(ts => ({ source: 'test', metric: 'public_power', country: 'fr', ts, data: { nuclear: 100 } })));
});
describe('raw observations for calendar-day energy integration', () => {
  it('preserves interval timestamps and values when explicitly requested', async () => {
    const raw = await computeNuclearImport(times[0], times.at(-1)!, 216, { preserveResolution: true });
    expect(raw.data.map(p => p.ts)).toEqual(times);
    expect(raw.data.map(p => p.nuclear_gw)).toEqual(times.map((_, i) => i % 2 ? 2 : 1));
    expect(raw.avg_gw).toBe(1.5);
  });
  it('preserves the default reduced payload for existing consumers', async () => {
    const result = await computeNuclearImport(times[0], times.at(-1)!, 216);
    expect(result.data).toHaveLength(8);
    expect(result.avg_gw).toBe(1.5);
  });
});
