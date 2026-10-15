import {afterEach, describe, expect, it, vi} from 'vitest';
import {nuclearEnergyPreviewData} from '../nuclear-preview-server';
import {livePreviewJson, usesLivePreviewData} from '../preview-data';
import {readNuclearImport} from '../nuclear-import-data';

vi.mock('../preview-data', () => ({usesLivePreviewData: vi.fn(() => true), livePreviewJson: vi.fn()}));
vi.mock('../nuclear-import-data', () => ({readNuclearImport: vi.fn()}));
afterEach(() => vi.resetAllMocks());

describe('live nuclear energy observations', () => {
  it('uses short live windows and merges overlapping raw intervals in order', async () => {
    vi.mocked(usesLivePreviewData).mockReturnValue(true);
    vi.mocked(livePreviewJson)
      .mockResolvedValueOnce({data: [{ts: '2026-10-05T00:00:00Z', nuclear_gw: 1}, {ts: '2026-10-04T23:45:00Z', nuclear_gw: 2}]})
      .mockResolvedValueOnce({data: [{ts: '2026-10-05T00:00:00Z', nuclear_gw: 3}, {ts: '2026-10-05T00:15:00Z', nuclear_gw: 4}]});
    const result = await nuclearEnergyPreviewData(new Date('2026-10-10T12:00:00Z'));
    expect(livePreviewJson).toHaveBeenNthCalledWith(1, '/api/energy/nuclear-import?start=2026-10-01&end=2026-10-03');
    expect(livePreviewJson).toHaveBeenNthCalledWith(2, '/api/energy/nuclear-import?hours=168');
    expect(result?.data.map(row => row.nuclear_gw)).toEqual([2, 3, 4]);
    expect(readNuclearImport).not.toHaveBeenCalled();
  });
  it('does not silently change sources when live retrieval fails', async () => {
    vi.mocked(usesLivePreviewData).mockReturnValue(true);
    vi.mocked(livePreviewJson).mockRejectedValue(new Error('offline'));
    expect(await nuclearEnergyPreviewData()).toBeNull();
    expect(readNuclearImport).not.toHaveBeenCalled();
  });
  it('keeps the available week when older observations fail', async () => {
    vi.mocked(usesLivePreviewData).mockReturnValue(true);
    const week = {data: [{ts: '2026-10-09T12:15:00Z', nuclear_gw: 2}], stale: true};
    vi.mocked(livePreviewJson).mockRejectedValueOnce(new Error('older range unavailable')).mockResolvedValueOnce(week);
    expect(await nuclearEnergyPreviewData(new Date('2026-10-10T12:00:00Z'))).toEqual(week);
  });
  it('uses the same recoverable service in production without a self HTTP request', async () => {
    vi.mocked(usesLivePreviewData).mockReturnValue(false);
    const week = {data: [{ts: '2026-10-09T12:15:00Z', nuclear_gw: 2}], avg_gw: 2, avg_share_pct: 4, source: 'Energy-Charts', license: 'CC BY 4.0', stale: true, fetchedAt: '2026-10-09T12:30:00Z'};
    vi.mocked(readNuclearImport).mockRejectedValueOnce(new Error('older range unavailable')).mockResolvedValueOnce({payload: week, maxAge: 60});
    expect(await nuclearEnergyPreviewData(new Date('2026-10-10T12:00:00Z'))).toEqual(week);
    expect(readNuclearImport).toHaveBeenLastCalledWith(new URLSearchParams('hours=168'), new Date('2026-10-10T12:00:00Z'));
    expect(livePreviewJson).not.toHaveBeenCalled();
  });

});
