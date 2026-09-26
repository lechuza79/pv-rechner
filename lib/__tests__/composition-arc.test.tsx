import React from 'react';
import {describe, it, expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {CompositionArc} from '../../components/charts/CompositionArc';
import {CompositionChart, MonitorCompositionChart} from '../../components/charts/CompositionChart';

const nums = (d: string) => (d.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []).map(Number);

/** Leftmost x the rounded end can reach (cap edge points and forward bulge); -Infinity for a full cap. */
function capReach(markup: string): number {
  const m = markup.match(/<path d="(M [^"]+Z)"[^>]*data-composition-arc/);
  if (!m) throw new Error('no composition arc path');
  if (/<circle[^>]*r="5"/.test(markup)) return -Infinity;
  const d = m[1];
  // One outline: outer arc, exactly one forward half-disc, inner arc back.
  if ((d.match(/A 5 5 /g) ?? []).length !== 1 || !/A 5 5 0 0 1 /.test(d)) return -Infinity;
  const n = nums(d);
  // M 50 5 | A 45 45 0 f 1 x1 y1 | A 5 5 0 0 1 x2 y2 | ...
  const [x1, y1, x2, y2] = [n[7], n[8], n[14], n[15]];
  const bulgeX = (x1 + x2) / 2 + (y2 - y1) / 2;
  return Math.min(x1, x2, bulgeX);
}

describe('CompositionArc', () => {
  it('renders nothing at 0 and a closed ring at 100', () => {
    expect(renderToStaticMarkup(<svg><CompositionArc value={0} /></svg>)).toBe('<svg></svg>');
    const full = renderToStaticMarkup(<svg><CompositionArc value={100} /></svg>);
    expect(full).toContain('<circle');
    expect(full).not.toContain('<path');
  });

  it('keeps the flat origin for tiny shares: the rounded end never reaches back past 12 o\'clock', () => {
    for (const share of [0.05, 0.3, 0.8, 1, 1.5, 2, 3, 5, 12]) {
      const markup = renderToStaticMarkup(<svg><CompositionArc value={share} /></svg>);
      expect(markup).toContain('M 50 5 A 45 45');
      expect(capReach(markup)).toBeGreaterThanOrEqual(50 - 1e-9);
    }
  });

  it('negative control: a full cap circle (former drawing) does cross the origin at 1 %', () => {
    const angle = 0.01 * 2 * Math.PI;
    expect(50 + 40 * Math.sin(angle) - 5).toBeLessThan(50);
  });

  it('is the one drawing used by the monitor and the story chart', () => {
    const counts = {total: 120, selected: 3, label: 'Freiflächenanlagen'};
    const monitor = renderToStaticMarkup(<MonitorCompositionChart story={{countComparison: counts, values: [{value: 3}, {value: 1}]}} />);
    const story = renderToStaticMarkup(<CompositionChart counts={counts} powerShare={1} layout="story" />);
    for (const markup of [monitor, story]) {
      expect(markup).toContain('M 50 5 A 45 45');
      expect(markup).not.toContain('stroke-dasharray');
      expect(capReach(markup)).toBeGreaterThanOrEqual(50 - 1e-9);
    }
  });

});

describe('CompositionChart layouts', () => {
  const counts = {total: 349, selected: 2, label: 'Freiflächenanlagen'};
  const grid = (m: string) => [...m.matchAll(/<rect x="(\d+)" y="(\d+)" width="([\d.]+)"/g)].map(r => r.slice(1).join(','));
  const monitor = renderToStaticMarkup(<CompositionChart counts={counts} powerShare={68.6} layout="monitor" />);
  const story = renderToStaticMarkup(<CompositionChart counts={counts} powerShare={68.6} layout="story" />);
  const teaser = renderToStaticMarkup(<CompositionChart counts={counts} powerShare={68.6} layout="story" compact />);

  it('keeps each accepted geometry as an explicit layout with its own stylesheet', () => {
    const cls = (m: string) => m.match(/class="([^"]+)"/)![1];
    expect(monitor).toContain('data-visual-layout="monitor"');
    expect(story).toContain('data-visual-layout="story"');
    expect(cls(monitor)).not.toBe(cls(story));
    // Monitor: value as HTML beside the ring, total on two lines. Story: value inside the SVG.
    expect(monitor).toMatch(/<b>69<small> %<\/small><\/b>/);
    expect(monitor).not.toContain('<text');
    expect(story).toMatch(/<text[^>]*>69<\/text>/);
    expect(story).toContain('349 Solaranlagen insgesamt');
    expect(teaser).toMatch(/class="[^"]*compact/);
  });

  it('draws identical data: same cells and same arc for monitor and story (16 columns before resize)', () => {
    expect(grid(monitor)).toEqual(grid(story));
    const arc = (m: string) => m.match(/<path d="([^"]+)"[^>]*data-composition-arc/)![1];
    expect(arc(monitor)).toBe(arc(story));
    expect(monitor).toContain('Ein Rechteck steht für');
  });

  it('renders nothing on the monitor without a comparison', () => {
    expect(renderToStaticMarkup(<MonitorCompositionChart story={{values: [{value: 1}, {value: 2}]}} />)).toBe('');
  });
});
