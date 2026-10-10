import {describe, it, expect} from 'vitest';
import {chartQuantityLabel, chartDataDate, chartMetadataLabel} from '../chart-labels';

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

it('export metadata distinguishes data vintage, displayed period and quantity', () => {
  expect(chartMetadataLabel({scope:'Meinersen',dataAsOf:'2026-10-01',unit:'MWp',period:'2025'}))
    .toBe('Meinersen · Stand 01.10.2026 · in MWp · 2025');
  expect(chartMetadataLabel({scope:'Meinersen',unit:'Tsd. €'}))
    .toBe('Meinersen · Stand nicht verfügbar · in Tsd. €');
});
