"use client";
import React, {useEffect, useId, useRef, useState} from 'react';
import {storyCountGrid} from '../../lib/story-count-grid';
import {CompositionBackdrop} from '../social/CompositionBackdrop';
import {CompositionArc} from './CompositionArc';
import monitorStyles from './CompositionChart.monitor.module.css';
import storyStyles from './CompositionChart.story.module.css';

/**
 * The one composition visual (template "anlagenraster"): count grid plus the
 * share of solar capacity. Monitor, story reader, editorial preview and the
 * exported image all draw it here.
 *
 * Two accepted geometries are kept as explicit layouts, never merged into one
 * stylesheet: `monitor` (dashboard widget, responsive grid columns, ring value
 * as HTML beside the ring) and `story` (story card, fixed 16 columns, ring
 * value inside the SVG; `compact` for teasers). Data, grid and arc are shared.
 */
export type CompositionLayout = 'monitor' | 'story';

export function CompositionChart({counts, powerShare, layout, compact = false}: {
  counts: {total: number; selected: number; label: string};
  powerShare: number;
  layout: CompositionLayout;
  compact?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [monitorColumns, setMonitorColumns] = useState(16);
  useEffect(() => {
    if (layout !== 'monitor' || !host.current) return;
    const observer = new ResizeObserver(([entry]) => setMonitorColumns(entry.contentRect.width < 360 ? 10 : entry.contentRect.width < 520 ? 12 : 16));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [layout]);
  const gradientId = useId();
  const styles = layout === 'monitor' ? monitorStyles : storyStyles;
  const columns = layout === 'monitor' ? monitorColumns : 16;
  const {cells, perCell} = storyCountGrid(counts.total, counts.selected);
  const rows = Math.ceil(cells.length / columns);
  const powerLabel = `${powerShare.toLocaleString('de-DE')} Prozent der Solarleistung`;
  const rootClass = `${styles.chart} ${layout === 'story' && compact ? styles.compact : ''}`;

  return <div ref={host} className={rootClass} data-visual="anlagenraster" data-visual-layout={layout}>
    <CompositionBackdrop label={counts.label} compact={layout === 'story' && compact} />
    <div className={styles.top}>
      <div className={styles.power}>
        <svg viewBox="0 0 100 100" role="img" aria-label={powerLabel}>
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--atlas-border)" strokeWidth="10" />
          <CompositionArc value={powerShare} />
          {layout === 'story' && <>
            <text className={styles.shareValue} x="50" y="48" textAnchor="middle" dominantBaseline="middle">{Math.round(powerShare)}</text>
            <text className={styles.shareUnit} x="50" y="65" textAnchor="middle" dominantBaseline="middle">%</text>
          </>}
        </svg>
        {layout === 'monitor' && <b>{Math.round(powerShare)}<small> %</small></b>}
        <span>der Solarleistung</span>
      </div>
    </div>
    <div className={styles.gridArea}>
      <div className={styles.callout}><strong>{counts.selected.toLocaleString('de-DE')}</strong><span>{counts.label}</span></div>
      <svg className={styles.grid} viewBox={`0 0 ${columns * 16} ${rows * 10}`} role="img" aria-label={`${counts.selected} von ${counts.total} Anlagen. Ein Rechteck steht für ${perCell} Anlagen.`}>
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={rows * 10}>
            <stop offset="0%" stopColor="var(--atlas-secondary)" stopOpacity=".38" />
            <stop offset="100%" stopColor="var(--atlas-secondary)" stopOpacity=".18" />
          </linearGradient>
        </defs>
        {cells.map((cell, index) => <g key={index}>
          <rect x={index % columns * 16} y={Math.floor(index / columns) * 10} width={13 * cell.occupied} height="7" fill={`url(#${gradientId})`} />
          {cell.selected > 0 && <rect x={index % columns * 16} y={Math.floor(index / columns) * 10} width={13 * cell.selected} height="7" fill="var(--atlas-action)" />}
        </g>)}
      </svg>
      {layout === 'monitor'
        ? <p className={styles.total}><strong>{counts.total.toLocaleString('de-DE')}</strong><br/>Solaranlagen insgesamt</p>
        : <p className={styles.total}>{counts.total.toLocaleString('de-DE')} Solaranlagen insgesamt</p>}
    </div>
  </div>;
}

/** Monitor input: counts from the story, capacity share from its second value. Null = nothing to draw. */
export function compositionFromStory(story: {countComparison?: {total: number; selected: number; label: string}; values?: Array<{label?: string; value: number; unit?: string}>}) {
  const counts = story.countComparison;
  const powerShare = Number(story.values?.[1]?.value ?? 0);
  return counts && Number.isFinite(powerShare) ? {counts, powerShare} : null;
}

/** Monitor host: renders nothing when the story carries no comparison. */
export function MonitorCompositionChart({story}: {story: Parameters<typeof compositionFromStory>[0]}) {
  const input = compositionFromStory(story);
  return input ? <CompositionChart {...input} layout="monitor" /> : null;
}
