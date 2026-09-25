import React from 'react';
import {describe, it, expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {CompositionArc} from '../../components/charts/CompositionArc';
import {MonitorComposition} from '../../components/gemeinde/MonitorComposition';
import {InstallationCountChart} from '../../components/social/InstallationCountChart';

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
    const monitor = renderToStaticMarkup(<MonitorComposition story={{countComparison: counts, values: [{label: 'Anlagen', value: 3}, {label: 'Leistung', value: 1}]}} />);
    const story = renderToStaticMarkup(<InstallationCountChart counts={counts} powerShare={1} />);
    for (const markup of [monitor, story]) {
      expect(markup).toContain('M 50 5 A 45 45');
      expect(markup).not.toContain('stroke-dasharray');
      expect(capReach(markup)).toBeGreaterThanOrEqual(50 - 1e-9);
    }
  });
});
