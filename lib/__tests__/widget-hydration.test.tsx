import {describe, expect, it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {WidgetDataProvider, useWidgetResource} from '../../components/dashboard/WidgetData';

describe('widget hydration observation', () => {
  it('keeps the supplied server observation when the shared endpoint is newer', () => {
    function Chart() {
      const {data} = useWidgetResource('/api/example', 0, 300000, {data: 53, fetchedAt: 1000});
      return <strong>{data}</strong>;
    }
    const html = renderToStaticMarkup(<WidgetDataProvider snapshots={{'/api/example': {data: 50, fetchedAt: 2000}}}><Chart/></WidgetDataProvider>);
    expect(html).toContain('<strong>53</strong>');
    expect(html).not.toContain('<strong>50</strong>');
  });
});
