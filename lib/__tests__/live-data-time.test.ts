import { describe, expect, it } from 'vitest';
import { formatLiveDataTime } from '../live-data-time';

describe('live data timestamp', () => {
  it('uses the Berlin day across UTC midnight', () => {
    expect(formatLiveDataTime('2026-10-05T22:30:00Z', new Date('2026-10-06T07:00:00Z'))).toBe('heute, 00:30 Uhr');
  });
  it('does not describe an older observation as today', () => {
    expect(formatLiveDataTime('2026-10-05T01:00:00Z', new Date('2026-10-06T07:00:00Z'))).toBe('5. Okt. 2026, 03:00 Uhr');
  });
  it('rejects invalid timestamps', () => {
    expect(formatLiveDataTime('invalid', new Date())).toBe('nicht verfügbar');
  });
});
