"use client";
import React, {useId,useRef,useState,useEffect} from 'react';
import {storyCountGrid} from '../../lib/story-count-grid';
import styles from './MonitorComposition.module.css';
import {CompositionBackdrop} from '../social/CompositionBackdrop';
import {CompositionArc} from '../charts/CompositionArc';

type CompositionStory = {
  countComparison?: {total: number; selected: number; label: string};
  values?: Array<{label: string; value: number; unit?: string}>;
};

/**
 * Local municipality composition visual.
 *
 * The grid and ring deliberately keep the approved story geometry. The
 * supporting illustration is purely atmospheric and never carries data.
 */
export function MonitorComposition({story}: {story: CompositionStory}) {
  const host=useRef<HTMLDivElement>(null);
  const [columns,setColumns]=useState(16);
  useEffect(()=>{if(!host.current)return;const observer=new ResizeObserver(([entry])=>setColumns(entry.contentRect.width<360?10:entry.contentRect.width<520?12:16));observer.observe(host.current);return()=>observer.disconnect();},[]);
  const gradientId = useId();
  const counts = story.countComparison;
  const powerShare = Number(story.values?.[1]?.value ?? 0);
  if (!counts || !Number.isFinite(powerShare)) return null;

  const {cells, perCell} = storyCountGrid(counts.total, counts.selected);
  const powerLabel = `${powerShare.toLocaleString('de-DE')} Prozent der Solarleistung`;

  return <div ref={host} className={styles.chart}>
    <CompositionBackdrop label={counts.label} />
    <div className={styles.top}>
      <div className={styles.power}>
        <svg viewBox="0 0 100 100" role="img" aria-label={powerLabel}>
          <circle cx="50" cy="50" r="40" fill="none" className={styles.powerTrack} strokeWidth="10" />
          <CompositionArc value={powerShare} />
        </svg>
        <b>{Math.round(powerShare)}<small> %</small></b>
        <span>der Solarleistung</span>
      </div>
    </div>
    <div className={styles.gridArea}>
      <div className={styles.callout}><strong>{counts.selected.toLocaleString('de-DE')}</strong><span>{counts.label}</span></div>
      <svg className={styles.grid} viewBox={`0 0 ${columns * 16} ${Math.ceil(cells.length / columns) * 10}`} role="img" aria-label={`${counts.selected} von ${counts.total} Anlagen. Ein Rechteck steht für ${perCell} Anlagen.`}>
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={Math.ceil(cells.length / columns) * 10}>
            <stop offset="0%" className={styles.gridBaseTop} />
            <stop offset="100%" className={styles.gridBaseBottom} />
          </linearGradient>
        </defs>
        {cells.map((cell, index) => <g key={index}>
          <rect x={index % columns * 16} y={Math.floor(index / columns) * 10} width={13 * cell.occupied} height="7" fill={`url(#${gradientId})`} />
          {cell.selected > 0 && <rect x={index % columns * 16} y={Math.floor(index / columns) * 10} width={13 * cell.selected} height="7" className={styles.gridValue} />}
        </g>)}
      </svg>
      <p className={styles.total}><strong>{counts.total.toLocaleString('de-DE')}</strong><br/>Solaranlagen insgesamt</p>
    </div>
  </div>;
}

export default MonitorComposition;
