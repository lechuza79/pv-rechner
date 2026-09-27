import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {MastrLiveRadial} from '../../components/MastrLiveRadial';
const points=[{ts:'2026-09-26T10:00:00Z',mw:10},{ts:'2026-09-26T20:00:00Z',mw:0}];
describe('Live radial zero reading',()=>{
  it('marks the night reading and labels its Berlin time while retaining the daytime curve',()=>{
    const html=renderToStaticMarkup(<MastrLiveRadial energietraeger="solar" installedKwp={20000} injected={points} highlightTs={points[1].ts} unit="MW" bare secondaryBars/>);
    expect(html).toContain('data-zero-reading-marker');
    expect(html).toContain('22:00 Uhr');
    expect(html).toMatch(/datetime="2026-09-26T20:00:00Z"/i);
    expect(html).toContain('24-Stunden-Verlauf');
  });
  it('does not draw a zero marker for a positive reading',()=>{
    const html=renderToStaticMarkup(<MastrLiveRadial energietraeger="solar" installedKwp={20000} injected={points} highlightTs={points[0].ts} bare/>);
    expect(html).not.toContain('data-zero-reading-marker');
    expect(html).toContain('12:00 Uhr');
  });
});
