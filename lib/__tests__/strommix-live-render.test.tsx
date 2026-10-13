import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import JetztImNetz from '../../app/(site)/strommix-deutschland/StrommixOverview';

vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('../../components/ErzeugungWidget', () => ({ default: () => null }));
afterEach(() => vi.useRealTimers());
const initialData = {
  retrievedAt:'2026-10-10T10:25:00Z', country: 'de', source: 'Energy-Charts', license: 'CC BY 4.0', resolution: '15min',
  data: [
    { ts: '2026-10-10T10:00:00Z', solar: 1000, wind_onshore: 1000, fossil_gas: 2000 },
    { ts: '2026-10-10T10:15:00Z', solar: 3000, wind_onshore: 600, fossil_gas: 400 },
  ],
};
describe('Strommix initial HTML', () => {
  it('includes the current figures and actual observation time before effects or browser fetches', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-10T10:30:00Z'));
    const html = renderToStaticMarkup(<JetztImNetz initialData={initialData} renderedAt="2026-10-10T10:30:00Z" />);
    expect(html).toContain('90');
    expect(html).toContain('Solar');
    expect(html).toContain('dateTime="2026-10-10T10:25:00Z"');
    expect(html).toContain('öffentlichen Nettostromerzeugung');
    expect(html).not.toContain('typisch für die Mittagsstunden');
  });
  it('does not describe an old stored observation as happening now', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-11T10:30:00Z'));
    const html = renderToStaticMarkup(<JetztImNetz initialData={initialData} renderedAt="2026-10-10T10:30:00Z" />);
    expect(html).toContain('Im zuletzt gemeldeten Strommix deckten');
    expect(html).not.toContain('Gerade decken');
    expect(html).toContain('Update:');
    expect(html).not.toContain('Datenstand:');
  });
});
