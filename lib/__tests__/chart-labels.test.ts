import {describe, it, expect} from 'vitest';
import {chartQuantityLabel, chartDataDate} from '../chart-labels';

describe('shared chart headings', () => {
  it.each([
    ['Anlagen', 'Anzahl Anlagen'],
    ['Anlage', 'Anzahl Anlagen'],
    ['Anlagen / 1.000 Einwohner', 'Anzahl Anlagen je 1.000 Einwohner'],
    ['Mio. Anlagen', 'Anzahl Anlagen (in Mio.)'],
    ['Haushalte', 'Anzahl Haushalte'],
    ['MW', 'in MW'], ['kWh je Einwohner', 'in kWh je Einwohner'],
    ['%', 'in %'], ['Anzahl und installierte Leistung', 'Anzahl und installierte Leistung'],
    ['Installierte Leistung nach Technologie', 'Installierte Leistung nach Technologie'],
    ['Anlagenbestand', 'Anlagenbestand'], ['Speicherquote', 'Speicherquote'],
    ['Anzahl Anlagen', 'Anzahl Anlagen'], ['in MW', 'in MW'],
  ])('%s becomes %s', (unit, label) => expect(chartQuantityLabel(unit)).toBe(label));
  it('keeps source precision and never substitutes today for missing data', () => {
    expect(chartDataDate('2026-09-09')).toBe('09.09.2026');
    expect(chartDataDate('2026-09')).toBe('2026-09');
    expect(chartDataDate()).toBe('nicht verfügbar');
  });
});
