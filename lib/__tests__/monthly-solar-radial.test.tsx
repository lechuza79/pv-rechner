import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, it, expect} from 'vitest';
import {MonthlySolarRadial} from '../../components/charts/MonthlySolarRadial';
import {solarAnimationFrame} from '../monthly-solar-animation';
import {MonthlySolarChart} from '../../components/social/MonthlySolarChart';
import {MonitorMonthlySolarChart} from '../../components/gemeinde/MonitorMonthlySolarChart';
import {storyVisualTemplateDef} from '../story-approved-visual';
import type {StoryConcept} from '../story-konzepte';
import type {SolarMonth} from '../story-monthly-solar';

// Template "radial": monitor and story draw the SAME day lines; the monitor
// puts midnight at the bottom, the story at the top — exactly a half turn.
const days = Array.from({length: 30}, (_, d) => {
  const mw = Array.from({length: 24}, (_, h) => Math.max(0, Math.sin(Math.PI * (h - 5) / 14)) * (3 + (d % 5)));
  return {date: `2026-08-${String(d + 1).padStart(2, '0')}`, mw, mwh: mw.reduce((a, b) => a + b, 0)};
});
const data: SolarMonth = {town: 'Testort', month: '2026-08', days, totalMwh: days.reduce((a, d) => a + d.mwh, 0), peakDay: '2026-08-05', peakMw: 7, sourceDate: '2026-09-17', retrievedAt: '2026-09-17', sourceUrl: 'era5-archive:test'};
const dayLines = (html: string) => [...html.matchAll(/<path d="(M[^"]+Z)" fill="none" stroke="url\(/g)].map(m => m[1]);
const numbers = (d: string) => (d.match(/-?\d+\.\d+/g) ?? []).map(Number);

describe('MonthlySolarRadial shared by monitor and story', () => {
  const monitor = renderToStaticMarkup(<MonitorMonthlySolarChart data={data} />);
  const story = renderToStaticMarkup(<MonthlySolarChart data={data} ohneBedienung />);

  it('draws one line per day in both', () => {
    expect(dayLines(monitor)).toHaveLength(30);
    expect(dayLines(story)).toHaveLength(30);
  });

  it('same data, same geometry: the story line is the monitor line turned by half a circle', () => {
    for (let i = 0; i < 30; i += 7) {
      const m = numbers(dayLines(monitor)[i]), s = numbers(dayLines(story)[i]);
      expect(s).toHaveLength(m.length);
      s.forEach((value, k) => expect(Math.abs(value - (560 - m[k]))).toBeLessThan(0.011));
    }
  });

  it('keeps each layout\'s figures: story centre is the month total in GWh, monitor via the unit formatter', () => {
    expect(story).toMatch(/>GWh<\/text>/);
    expect(monitor).toMatch(/>(GWh|MWh)<\/text>/);
    expect(story).toContain('MW</tspan>');
  });

  it('monitor: month selector and day controls stay out of the image, the month is printed', () => {
    expect((monitor.match(/data-sc-export-ignore=""/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(monitor).toMatch(/data-sc-export-only="block"[^>]*>Aug\. 2026</);
  });

  it('story export uses the registry footer only for data from our ERA5 archive', () => {
    const def = storyVisualTemplateDef('radial')!;
    expect(def.widget).toBe('gemeindeSolarMonat');
    expect(def.exportProvenance!({solarMonth: data} as StoryConcept)).toBe(true);
    expect(def.exportProvenance!({solarMonth: {...data, sourceUrl: 'https://archive-api.open-meteo.com/v1/archive'}} as StoryConcept)).toBe(false);
  });
});

describe('place phrase of the monitor radial', () => {
  it('uses the display name with its article: "im Vogelsbergkreis", not "in Landkreis Vogelsbergkreis"', () => {
    // Region packages carry the register name; live on 28.09.2026 the label read
    // "Solarleistung in Landkreis Vogelsbergkreis".
    const html = renderToStaticMarkup(<MonitorMonthlySolarChart data={{...data, town: 'Landkreis Vogelsbergkreis'}} />);
    expect(html).toContain('aria-label="Solarleistung im Vogelsbergkreis,');
    expect(html).not.toContain('Landkreis Vogelsbergkreis');
    expect(renderToStaticMarkup(<MonitorMonthlySolarChart data={data} />)).toContain('aria-label="Solarleistung in Testort,');
  });
});

 it('renders the video curve and counter at an explicit intermediate time without CSS animation',()=>{
  const sample=solarAnimationFrame(data.days.map(day=>day.mwh),950);
  const html=renderToStaticMarkup(<MonthlySolarRadial data={data} layout="monitor" compact={false} displayDate={data.days[1].date} frame={1} playing={false} focused onHover={()=>{}} onChoose={()=>{}} classes={{}} animationSample={sample}/>);
  expect(html).toContain('stroke-dashoffset:0.125');
  expect(html).toContain(sample.value.toLocaleString('de-DE',{maximumFractionDigits:1}));
  expect(html).not.toContain('wertWechsel');
 });
