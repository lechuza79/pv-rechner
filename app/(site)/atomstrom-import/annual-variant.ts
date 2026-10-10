import trade from '../../../data/atomstrom/trade-2025.json';
import snapshot from '../../../data/atomstrom/2025.json';
import { CATEGORY_COLORS } from '../../../lib/chart-utils';
import type { NuclearYearSnapshot } from '../../../lib/atomstrom-year';
import type { StrommixYtd } from '../../../lib/strommix-ytd';
import { nf1 } from './figure';

export { ATOMSTROM_ARCHIVE_YEARS as ARCHIVE_YEARS } from '../../../lib/atomstrom-release';
export function getAnnualVariant(year: number) {
  if (year !== snapshot.year) throw new Error('Unsupported archive year');
  const annual: NuclearYearSnapshot = { ...snapshot, modifiedAt: [snapshot.modifiedAt, trade.modifiedAt].sort().at(-1)! };
  const raw = [
    { key: 'renewable', label: 'Erneuerbare', color: CATEGORY_COLORS.renewable, gwh: annual.generation.renewable },
    { key: 'fossil', label: 'Fossile', color: CATEGORY_COLORS.fossil, gwh: annual.generation.fossil },
    { key: 'other', label: 'Sonstige', color: CATEGORY_COLORS.other, gwh: annual.generation.other },
    { key: 'nuclear', label: 'Kernenergie (importiert)', color: CATEGORY_COLORS.nuclearImport, gwh: annual.nuclearGwh },
  ];
  const totalGwh = raw.reduce((sum, row) => sum + row.gwh, 0);
  const missingHours = annual.expectedHours - annual.coveredHours;
  const coverageNote = missingHours > 0
    ? `Für ${nf1(missingHours)} Stunden fehlen auswertbare Quelldaten. Die Mengen sind deshalb erfasste Teilmengen, keine lückenlose Jahresbilanz.`
    : 'Die Berechnung deckt das vollständige Kalenderjahr ab.';
  const ytd: StrommixYtd = { year, weeks: 52, totalGwh, nuclearGwh: annual.nuclearGwh, nuclearShare: annual.nuclearGwh / totalGwh * 100, segments: raw.map(row => ({ ...row, share: row.gwh / totalGwh * 100 })) };
  const yearAnswer = `${year} wurden rechnerisch rund ${nf1(annual.nuclearGwh / 1000)} TWh Atomstrom nach Deutschland importiert.`;
  const ogParams = new URLSearchParams({ view: 'atomstrom', year: String(year), weeks: '52', share: String(ytd.nuclearShare), twh: String(annual.nuclearGwh / 1000), period: 'Erfasste Teilmenge im Kalenderjahr' });
  return { annual, trade, ytd, yearAnswer, dayAnswer: 'Die Jahresübersicht zeigt die monatlichen Strommengen, die rechnerischen Herkunftsländer und den Atomstrom-Anteil im Vergleich zur deutschen Stromerzeugung.', dayComparison: '', daily: { days: [], totalGwh: null }, coverageNote, ogPath: `/api/og?${ogParams}` };
}
