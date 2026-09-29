import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PvConsumerExample from '../../components/PvConsumerExample';

describe('standalone consumer example', () => {
  it('renders its basis and next step without a calculator result or apply footer', () => {
    const html = renderToString(<PvConsumerExample />);
    expect(html).toContain('Rechengrundlage: 10 kWp');
    expect(html).toContain('3.800 kWh Haushaltsstrom/Jahr');
    expect(html).toContain('Genau ausrechnen');
    expect(html).toContain('Heizkosten im Vergleich');
    expect(html).not.toContain('Berechnung aktualisieren');
    expect(html).not.toContain('pv-ueberblick');
  });
  it('accepts article-specific examples and keeps identifiers unique when embedded twice', () => {
    const html = renderToString(<><PvConsumerExample initialSystem={{kwp:6,verbrauch:2400}} initialConsumers={{wp:'nein',ea:'geplant'}} /><PvConsumerExample /></>);
    expect(html).toContain('Rechengrundlage: 6 kWp');
    expect(html).toContain('Fahrkosten im Vergleich');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
