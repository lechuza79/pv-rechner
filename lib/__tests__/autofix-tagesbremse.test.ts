import { describe, it, expect } from 'vitest';
import { usedModel } from '../../scripts/autofix-budget';
const day = '2026-09-16';
const step = (conclusion: string | null, status = 'completed', started_at: string | null = day + 'T10:00:00Z') => ({ name: 'Claude analysiert und behebt', conclusion, status, started_at });
describe('actual model execution budget', () => {
  it('green gates, skipped and braked runs consume no model budget', () => {
    expect(usedModel([{steps:[]}, {steps:[step('skipped')]}], day)).toBe(false);
  });
  it('completed, failed and active analysis consume budget', () => {
    for (const s of [step('success'),step('failure'),step(null,'in_progress')]) expect(usedModel([{steps:[s]}],day)).toBe(true);
  });
  it('yesterday and queued steps do not consume today', () => {
    expect(usedModel([{steps:[step('success','completed','2026-09-15T10:00:00Z'),step(null,'queued',null)]}],day)).toBe(false);
  });
});
