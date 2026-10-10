import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { aggregateNuclearYear, type PowerSource, type FlowSource } from '../atomstrom-year';
import { FOSSIL_KEYS, RENEWABLE_KEYS, SONSTIGE_KEYS } from '../chart-utils';
import snapshot from '../../data/atomstrom/2025.json';
import { getAnnualVariant } from '../../app/(site)/atomstrom-import/annual-variant';
const start = Date.parse('2025-01-01T00:00:00+01:00') / 1000;
function fixture() {
  const timestamps = Array.from({ length: 4 }, (_, i) => start + i * 900);
  const flows: FlowSource = { unix_seconds: timestamps, countries: ['France', 'Belgium', 'Czech Republic', 'Switzerland', 'Sweden', 'Netherlands'].map(name => ({ name, data: timestamps.map(() => name === 'France' ? 2 : -1) })) };
  const de: PowerSource = { unix_seconds: timestamps, production_types: [...RENEWABLE_KEYS, ...FOSSIL_KEYS, ...SONSTIGE_KEYS].map(name => ({ name, data: timestamps.map(() => name === 'solar' ? 4000 : 0) })) };
  const fr: PowerSource = { unix_seconds: [start, start + 3600], production_types: [{ name: 'Nuclear', data: [1000, 1000] }, { name: 'Solar', data: [1000, 1000] }, { name: 'Load', data: [10000, 10000] }] };
  return { flows, power: { de, fr } };
}
describe('calendar-year nuclear-import aggregation', () => {
  it('applies an hourly mix to all four quarter-hours, excludes load, integrates GW to GWh', () => {
    const { flows, power } = fixture();
    const result = aggregateNuclearYear(2025, flows, power);
    expect(result.nuclearGwh).toBe(1);
    expect(result.coveredHours).toBe(1);
    expect(result.generation.renewable).toBe(4);
  });
  it('does not replace a missing nuclear value with zero or include mismatched generation', () => {
    const { flows, power } = fixture(); power.fr.production_types[0].data[0] = null;
    const result = aggregateNuclearYear(2025, flows, power);
    expect(result.coveredHours).toBe(0); expect(result.nuclearGwh).toBe(0); expect(result.generation.renewable).toBe(0);
  });
  it('distinguishes a real zero import from a missing flow', () => {
    const { flows, power } = fixture(); flows.countries[0].data = [0, null, 0, 0];
    const result = aggregateNuclearYear(2025, flows, power);
    expect(result.coveredHours).toBe(.75); expect(result.nuclearGwh).toBe(0);
  });
  it('does not bridge missing mix hours', () => {
    const { flows, power } = fixture(); power.fr.unix_seconds = [start - 7200, start - 3600];
    expect(aggregateNuclearYear(2025, flows, power).coveredHours).toBe(0);
  });
  it('counts German calendar boundaries and the 23/25-hour clock-change days correctly', () => {
    const { flows, power } = fixture(); const result = aggregateNuclearYear(2025, flows, power);
    expect(result.expectedHours).toBe(8760);
    expect(result.months.find(m => m.month === '2025-03')?.expectedHours).toBe(743);
    expect(result.months.find(m => m.month === '2025-10')?.expectedHours).toBe(745);
    expect(result.months[0].coveredHours).toBe(1);
  });
  it('reconciles the saved snapshot across months, countries, copy and donut', () => {
    expect(snapshot.coveredHours).toBe(8755); expect(snapshot.expectedHours).toBe(8760);
    expect(snapshot.months.reduce((s, m) => s + m.nuclearGwh, 0)).toBeCloseTo(snapshot.nuclearGwh);
    expect(Object.values(snapshot.countries).reduce((s, value) => s + value, 0)).toBeCloseTo(snapshot.nuclearGwh);
    expect(snapshot.months.filter(m => m.coveredHours < m.expectedHours).map(m => m.month)).toEqual(['2025-10', '2025-12']);
    const data = getAnnualVariant(2025);
    expect(data.ytd.segments.reduce((s, m) => s + m.share, 0)).toBeCloseTo(100);
    expect(data.yearAnswer).toContain('18,8 TWh'); expect(data.coverageNote).toContain('5,0 Stunden');
    expect(data.ytd.nuclearGwh).toBe(snapshot.nuclearGwh);
    expect(() => getAnnualVariant(2024)).toThrow();
  });
  it('keeps archive and current page on one template and gates unreviewed years', () => {
    const archive = readFileSync('app/(site)/atomstrom-import/[year]/page.tsx', 'utf8');
    expect(archive).toContain('<AtomstromPage seoVariant year=');
    expect(archive).toContain('notFound()');
    const page = readFileSync('app/(site)/atomstrom-import/AtomstromPage.tsx', 'utf8');
    expect(page).toContain("'/atomstrom-import/2025'");
    expect(page).toContain('getAnnualVariant(year)');
    expect(page).toContain('NuclearYearWidget');
    const widget = readFileSync('components/energy/NuclearYearWidget.tsx', 'utf8');
    expect(widget).toContain('CategoryBarChart'); expect(widget).toContain('ExportableWidgetFrame');
    expect(widget).toContain('Teilmenge: Quelldaten fehlen.');
  });
});
