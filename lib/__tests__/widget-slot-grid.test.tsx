import {describe, expect, it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {WidgetSlotGrid} from '../../components/dashboard/WidgetSlotGrid';

// SSR has no browser globals: the engine must initialize only after mounting.
describe('WidgetSlotGrid initial geometry', () => {
  it('reserves the declared row allocation and keeps React-owned content', () => {
    const html = renderToStaticMarkup(<WidgetSlotGrid columns={2} slots={[
      {id: 'a', x: 0, y: 0, w: 1, h: 5, children: <button>Chart options</button>},
      {id: 'b', x: 1, y: 0, w: 1, h: 10, children: <div>Second chart</div>},
    ]}/>);
    expect(html).toContain('--slot-initial-height:720px');
    expect(html).toContain('--slot-h:360px');
    expect(html).toContain('--slot-w:50%');
    expect(html).toContain('<button>Chart options</button>');
    expect(html).not.toContain('data-ready');
  });

  it('uses the narrowest arrangement before measuring a container and permits nesting', () => {
    const html = renderToStaticMarkup(<WidgetSlotGrid slots={[
      {id: 'nested', x: 0, y: 0, w: 2, h: 5, children: <WidgetSlotGrid slots={[
        {id: 'child', x: 0, y: 0, w: 1, h: 2, children: <div>Nested chart</div>},
      ]} columns={1}/>},
    ]} plans={[
      {minWidth: 800, columns: 2, slots: [{id: 'nested', x: 0, y: 0, w: 2, h: 5}]},
      {minWidth: 0, columns: 1, slots: [{id: 'nested', x: 0, y: 0, w: 1, h: 8}]},
    ]}/>);
    expect(html).toContain('--slot-initial-height:576px');
    expect(html.match(/data-slot-columns="1"/g)).toHaveLength(2);
    expect(html).toContain('Nested chart');
  });
});
