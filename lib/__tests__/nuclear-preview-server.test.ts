import {afterEach, describe, expect, it, vi} from 'vitest';
import {nuclearEnergyPreviewData} from '../nuclear-preview-server';
import {livePreviewJson, usesLivePreviewData} from '../preview-data';
import {computeNuclearImport} from '../nuclear-import';

vi.mock('../preview-data', () => ({usesLivePreviewData: vi.fn(() => true), livePreviewJson: vi.fn()}));
vi.mock('../nuclear-import', () => ({computeNuclearImport: vi.fn()}));
afterEach(() => vi.clearAllMocks());

describe('live nuclear energy observations', () => {
  it('uses short live windows and merges overlapping raw intervals in order', async () => {
    vi.mocked(usesLivePreviewData).mockReturnValue(true);
    vi.mocked(livePreviewJson)
      .mockResolvedValueOnce({data: [{ts: '2026-10-05T00:00:00Z', nuclear_gw: 1}, {ts: '2026-10-04T23:45:00Z', nuclear_gw: 2}]})
      .mockResolvedValueOnce({data: [{ts: '2026-10-05T00:00:00Z', nuclear_gw: 3}, {ts: '2026-10-05T00:15:00Z', nuclear_gw: 4}]});
    const result = await nuclearEnergyPreviewData(new Date('2026-10-10T12:00:00Z'));
    expect(livePreviewJson).toHaveBeenNthCalledWith(1, '/api/energy/nuclear-import?start=2026-10-01&end=2026-10-05');
    expect(livePreviewJson).toHaveBeenNthCalledWith(2, '/api/energy/nuclear-import?start=2026-10-05&end=2026-10-10');
    expect(result?.data.map(row => row.nuclear_gw)).toEqual([2, 3, 4]);
    expect(computeNuclearImport).not.toHaveBeenCalled();
  });
  it('does not silently change sources when live retrieval fails', async () => {
    vi.mocked(livePreviewJson).mockRejectedValue(new Error('offline'));
    expect(await nuclearEnergyPreviewData()).toBeNull();
    expect(computeNuclearImport).not.toHaveBeenCalled();
  });
});
