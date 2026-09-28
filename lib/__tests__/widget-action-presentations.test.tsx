import {describe, expect, it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ExportableWidgetFrame} from '../../components/dashboard/ExportableWidgetFrame';
import {WIDGETS} from '../widget-registry';

function render(actions: 'menu' | 'bar' | 'primary') {
  return renderToStaticMarkup(<ExportableWidgetFrame
    actions={actions} animated widget={WIDGETS.regionalRace}
    title="Solar ranking" kind="time-series" place="Wittenberg"
    stand="27.09.2026" filename="race-test"
  ><div>Chart content</div></ExportableWidgetFrame>);
}

describe('Shared widget action presentations', () => {
  it('uses the accepted action row for the legacy bar too, including animation restart', () => {
    const primary = render('primary');
    const bar = render('bar');
    expect(bar).toBe(primary);
    for (const label of ['Animation neu starten', 'Einbetten', 'Herunterladen', 'Teilen']) {
      expect(bar).toContain(label);
    }
    expect(bar).toContain('aria-label="Aktionen für Solar ranking"');
  });

  it('keeps the compact menu without adding a visible footer row', () => {
    const menu = render('menu');
    expect(menu).toContain('aria-label="Optionen für Solar ranking"');
    expect(menu).not.toContain('aria-label="Aktionen für Solar ranking"');
    expect(menu).not.toContain('sc-widget-actions');
  });
});
