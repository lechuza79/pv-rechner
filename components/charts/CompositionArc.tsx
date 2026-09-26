import React from 'react';

/**
 * Shared composition arc (r=40, width 10 in a 100×100 box): flat origin at
 * 12 o'clock, rounded endpoint, closed ring at 100 %.
 * Drawn as ONE filled outline (outer arc, forward half-disc, inner arc back):
 * - a full round cap would reach back past the flat origin below ~2 %;
 * - a separate cap shape leaves an anti-aliasing seam against the stroke.
 */
export function CompositionArc({value}: {value: number}) {
  const share = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  if (share === 0) return null;
  if (share === 100) return <circle cx="50" cy="50" r="40" fill="none" stroke="var(--atlas-action)" strokeWidth="10" />;
  const angle = share / 100 * 2 * Math.PI;
  const sin = Math.sin(angle), cos = Math.cos(angle);
  const large = share > 50 ? 1 : 0;
  const at = (r: number) => `${50 + r * sin} ${50 - r * cos}`;
  const d = `M 50 5 A 45 45 0 ${large} 1 ${at(45)} A 5 5 0 0 1 ${at(35)} A 35 35 0 ${large} 0 50 15 Z`;
  return <path d={d} fill="var(--atlas-action)" data-composition-arc="" />;
}
