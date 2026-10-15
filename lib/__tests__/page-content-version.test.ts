import { describe, expect, it } from 'vitest';
import { pageContentFingerprint } from '../page-content-version';
describe('semantic page versions', () => {
  it('ignores object key ordering across render processes', () => {
    expect(pageContentFingerprint({day:{gwh:17.1,date:'2026-10-09'},year:2026})).toBe(pageContentFingerprint({year:2026,day:{date:'2026-10-09',gwh:17.1}}));
  });
  it('detects corrected values even when the measurement date stays unchanged', () => {
    expect(pageContentFingerprint({date:'2026-10-09',gwh:17.1})).not.toBe(pageContentFingerprint({date:'2026-10-09',gwh:17.2}));
  });
  it('detects a new reporting day with the same value', () => {
    expect(pageContentFingerprint({date:'2026-10-09',gwh:17.1})).not.toBe(pageContentFingerprint({date:'2026-10-10',gwh:17.1}));
  });
});
