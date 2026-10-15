import {describe, expect, it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {WidgetFrame} from '../../components/dashboard/WidgetFrame';

describe('opt-in export subtitle', () => {
  it('keeps existing widget subtitles visible and exportable by default', () => {
    const html = renderToStaticMarkup(<WidgetFrame title="Solarleistung" subtitle="in MW" kind="bar-comparison">Chart</WidgetFrame>);
    expect(html).toContain('<span class="sc-widget-subtitle">in MW</span>');
    expect(html).not.toContain('data-sc-export-only');
    expect(html).not.toContain('data-sc-export-ignore');
  });
  it('replaces only the export subtitle while retaining the live subtitle', () => {
    const html = renderToStaticMarkup(<WidgetFrame title="Solarleistung" subtitle="in MW" exportSubtitle="Deutschland · Stand 09.09.2026 · in MW" kind="bar-comparison">Chart</WidgetFrame>);
    expect(html).toContain('data-sc-export-ignore="">in MW</span>');
    expect(html).toContain('data-sc-export-only="block" style="display:none">Deutschland · Stand 09.09.2026 · in MW</span>');
  });
});
