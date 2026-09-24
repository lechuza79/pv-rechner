import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, it, expect} from 'vitest';
import GemeindeFoerderung from '../../components/gemeinde/GemeindeFoerderung';
import {FUNDING_PROGRAMS} from '../funding-programs';

describe('municipal funding archive', () => {
  it('renders available support first and exhausted support in a closed, server-rendered archive', () => {
    const active = FUNDING_PROGRAMS['meinersen-solar'];
    const exhausted = FUNDING_PROGRAMS['gifhorn-kreis-balkonkraftwerke'];
    const html = renderToStaticMarkup(<GemeindeFoerderung ort="Meinersen" programme={[
      {programm: exhausted, standLabel: 'Test', zaehlt: false},
      {programm: active, standLabel: 'Test', zaehlt: true},
    ]}/>);
    const archive = html.indexOf('<details');
    expect(archive).toBeGreaterThan(html.indexOf(active.name));
    expect(html.indexOf(exhausted.name)).toBeGreaterThan(archive);
    expect(html).not.toMatch(/<details[^>]*\bopen/);
    expect(html).toContain('ausgeschöpft');
    expect(html).toContain('>aktiv</span>');
    expect(html).toContain('Gemeinde Meinersen ↗');
    expect(html).toContain('Landkreis Gifhorn ↗');
    expect(html).toContain(active.url);
  });
});
