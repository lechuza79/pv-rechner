import {afterEach, describe, it, expect, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {chartMetadataLabel, chartDataDate} from '../chart-labels';
import {ChartExportMetadata} from '../../components/charts/ChartExportMetadata';
vi.mock('modern-screenshot', () => ({domToBlob:vi.fn()}));
import {buildExportSvg} from '../chart-export';

afterEach(() => vi.unstubAllGlobals());
describe('shared export context', () => {
  it('keeps scope, actual vintage and descriptive quantity together', () => {
    expect(chartMetadataLabel({scope:'Kreis Borken', dataAsOf:'2026-09-09', unit:'MW'}))
      .toBe('Kreis Borken · Stand 09.09.2026 · in MW');
    expect(chartMetadataLabel({scope:'Kreis Borken', dataAsOf:'2026-09-09', unit:'Anlagen', period:'2020–2025'}))
      .toBe('Kreis Borken · Stand 09.09.2026 · Anzahl Anlagen · 2020–2025');
  });
  it('does not confuse the displayed year or retrieval date with the data vintage', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2030-01-01T12:00:00Z'));
    expect(chartMetadataLabel({period:'2025'})).toBe('Stand nicht verfügbar · 2025');
    vi.useRealTimers();
  });
  it('preserves date precision and explicitly zoned observation time', () => {
    expect(chartDataDate('2025')).toBe('2025');
    expect(chartDataDate('2026-09')).toBe('2026-09');
    expect(chartDataDate('2026-10-07T08:00:00Z')).toBe('07.10.2026, 10:00 Uhr');
    expect(chartDataDate('2026-10-07T10:00')).toBe('07.10.2026, 10:00 Uhr');
  });
  it('renders the common metadata only in exports, with one typographic level', () => {
    const html=renderToStaticMarkup(<ChartExportMetadata scope="Nidda" dataAsOf="2026-09-09" unit="Anlagen"/>);
    expect(html).toContain('data-sc-export-only="block"');
    expect(html).toContain('display:none');
    expect(html).toContain('font-weight:400');
    expect(html).toContain('Nidda · Stand 09.09.2026 · Anzahl Anlagen');
  });
  it('includes date and quantity in the composed chart as well', () => {
    vi.stubGlobal('HTMLElement', class {});
    vi.stubGlobal('XMLSerializer', class {serializeToString(){return '<svg viewBox="0 0 500 200"></svg>';}});
    const node={querySelectorAll:()=>[], getAttribute:()=> '0 0 500 200', cloneNode:()=>node} as unknown as SVGSVGElement;
    const svg=buildExportSvg(node,500,200,{title:'Zubau',scope:'Deutschland',dataAsOf:'2026-09-09',unit:'Anlagen',heading:'2020–2025',subtitle:'2020–2025'});
    expect(svg).toContain('Stand 09.09.2026');
    expect(svg).toContain('Anzahl Anlagen');
    expect(svg.match(/2020–2025/g)).toHaveLength(1);
    expect(svg).not.toContain('font-weight="700" fill="undefined"');
  });
});
