import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, it, expect} from 'vitest';
import {AnnualEnergyChart} from '../../components/social/AnnualEnergyChart';
import {MonitorAnnualEnergyChart} from '../../components/gemeinde/MonitorAnnualEnergyChart';
import {storyVisualTemplateDef} from '../story-approved-visual';
import type {StoryConcept} from '../story-konzepte';
import type {EnergyYear} from '../story-energy-year';

// Template "energy-year": monitor and story draw the SAME radial (one bar per
// day, solar then wind) and keep their own accepted geometry and figures.
const days = Array.from({length: 365}, (_, i) => ({
  date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10),
  solarMwh: 5 + 30 * Math.sin(Math.PI * i / 365),
  windMwh: i % 7 === 0 ? 12 : 3,
}));
const data: EnergyYear = {town: 'Testort', year: 2025, solarKwp: 5000, windKw: 2000, sourceDate: '2026-09-17', retrievedAt: '2026-09-17', sourceUrl: 'era5-archive:test', days};
const bars = (html: string) => [...html.matchAll(/<path d="(M[^"]+)" stroke="var\(--atlas-(action|text)\)"/g)].map(m => `${m[2]}:${m[1]}`);

describe('EnergyYearRadial shared by monitor and story', () => {
  const monitor = renderToStaticMarkup(<MonitorAnnualEnergyChart data={data} />);
  const story = renderToStaticMarkup(<AnnualEnergyChart data={data} ohneBedienung />);

  it('draws identical day bars for identical data (scale above the 20 MWh floor)', () => {
    expect(bars(monitor).length).toBe(365 * 2);
    expect(bars(monitor)).toEqual(bars(story));
  });

  it('keeps each accepted geometry and figure format', () => {
    expect(monitor).toContain('viewBox="-24 -24 568 568"');
    expect(story).toContain('viewBox="0 0 520 520"');
    // Story prints the year under the total; the monitor leaves that line empty.
    expect(story).toMatch(/>2025<\/text>/);
    expect(monitor).not.toMatch(/>2025<\/text>/);
  });

  it('monitor: selectors stay out of the image, chosen state and legend go in', () => {
    expect(monitor).toMatch(/data-sc-export-ignore=""[^>]*>|class="[^"]*settings[^"]*" data-sc-export-ignore/);
    expect(monitor).toMatch(/data-sc-export-only="block"[^>]*>2025 · Solar \+ Wind</);
    expect(monitor).toContain('data-sc-export-css="opacity:1;visibility:visible;"');
  });

  it('story export uses the registry footer only for data from our ERA5 archive', () => {
    const def = storyVisualTemplateDef('energy-year')!;
    expect(def.widget).toBe('gemeindeEnergieJahr');
    expect(def.exportProvenance!({energyYear: data} as StoryConcept)).toBe(true);
    expect(def.exportProvenance!({energyYear: {...data, sourceUrl: 'https://archive-api.open-meteo.com/v1/archive'}} as StoryConcept)).toBe(false);
  });
});
