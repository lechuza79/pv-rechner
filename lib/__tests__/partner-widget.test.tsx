import {partnerEmbedCode} from '../partner-embed-code';
import {describe, expect, it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {WidgetBrandHeader} from '../../components/dashboard/WidgetBrandHeader';
import {WidgetFrame} from '../../components/dashboard/WidgetFrame';
import {NIDDA_WIDGET_BRAND, parseWidgetHeader, widgetPartner} from '../widget-brand';
import {parseWidgetAppearanceObject} from '../widget-appearance';

describe('partner embedding', () => {
  it('accepts only trusted partners and header modes', () => {
    expect(widgetPartner('nidda')?.ags).toBe('06440016');
    expect(widgetPartner('__proto__')).toBeUndefined();
    expect(widgetPartner('unknown')).toBeUndefined();
    expect(parseWidgetHeader(undefined)).toBe('full');
    expect(parseWidgetHeader('invalid')).toBeUndefined();
  });
  it('keeps attribution and chart controls independent of each header', () => {
    for (const mode of ['full','title','none'] as const) {
      const html=renderToStaticMarkup(<WidgetFrame title="Zubau pro Jahr" kind="time-series" masthead={<WidgetBrandHeader brand={NIDDA_WIDGET_BRAND} mode={mode}/>} settings={<button>Seit 2014</button>} bodyAside={<span>Quelle und Lizenz</span>}><svg aria-label="Chart"/></WidgetFrame>);
      expect(html).toContain('Zubau pro Jahr');
      expect(html).toContain('Seit 2014');
      expect(html).toContain('Quelle und Lizenz');
      expect(html.includes('<img')).toBe(mode==='full');
      expect(html.includes('Solarenergie wächst vor Ort.')).toBe(mode!=='none');
    }
  });
  it('does not accept branding through untrusted appearance messages', () => {
    expect(parseWidgetAppearanceObject({partner:{brand:{logo:{src:'https://evil.example'}}}, theme:'light'})).not.toHaveProperty('partner');
  });
  it('binds automatic resizing to the correct frame and origin', () => {
    const code=partnerEmbedCode('nidda','regional-annual-growth','none');
    expect(code).toContain('/embed/partner/nidda/regional-annual-growth/none');
    expect(code).toContain('e.source!==f.contentWindow');
    expect(code).toContain('e.origin!==new URL(f.src).origin');
    expect(code).toContain('Number.isFinite(h)');
    expect(code).toContain('allow="clipboard-write; web-share"');
    expect(code).not.toContain('<p style=');
  });
  it('leaves ordinary frames unbranded', () => {
    expect(renderToStaticMarkup(<WidgetFrame title="Zubau" kind="time-series">Chart</WidgetFrame>)).not.toContain('sc-widget-brand-head');
  });
});
