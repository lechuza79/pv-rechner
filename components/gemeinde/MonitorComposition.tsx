import React, {useId} from 'react';
import {storyCountGrid} from '../../lib/story-count-grid';
import styles from './MonitorComposition.module.css';

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
  const counts = story.countComparison;
  const powerShare = Number(story.values?.[1]?.value ?? 0);
  if (!counts || !Number.isFinite(powerShare)) return null;

  const {cells, perCell} = storyCountGrid(counts.total, counts.selected);
  const gradientId = useId();
  const isBalcony = /balkon|stecker/i.test(counts.label);
  const image = isBalcony ? '/shared-nav/illustrations/balcony-modern-neon.webp' : '/shared-nav/illustrations/house-neon.webp';
  const powerLabel = `${powerShare.toLocaleString('de-DE')} Prozent der Solarleistung`;

  // Use a filled annular sector: tiny shares must not depend on dash rendering.
  const share = Math.max(0, Math.min(100, powerShare));
  const angle = share / 100 * Math.PI * 2 - Math.PI / 2;
  const outerX = 50 + 45 * Math.cos(angle), outerY = 50 + 45 * Math.sin(angle);
  const innerX = 50 + 35 * Math.cos(angle), innerY = 50 + 35 * Math.sin(angle);
  const largeArc = share > 50 ? 1 : 0;
  const sector = `M50 5 A45 45 0 ${largeArc} 1 ${outerX} ${outerY} L${innerX} ${innerY} A35 35 0 ${largeArc} 0 50 15 Z`;
  return <div className={styles.chart}>
    <img className={styles.background} src={image} alt="" aria-hidden="true" />
    <div className={styles.top}>
      <div className={styles.power}>
        <svg viewBox="0 0 100 100" role="img" aria-label={powerLabel}>
          <circle cx="50" cy="50" r="40" fill="none" className={styles.powerTrack} strokeWidth="10" />
          {share === 100 ? <circle cx="50" cy="50" r="40" fill="none" stroke="var(--atlas-action)" strokeWidth="10" /> : share > 0 ? <path d={sector} fill="var(--atlas-action)" /> : null}
        </svg>
        <b>{Math.round(powerShare)}<small> %</small></b>
        <span>der Solarleistung</span>
      </div>
    </div>
    <div className={styles.gridArea}>
      <div className={styles.callout}><strong>{counts.selected.toLocaleString('de-DE')}</strong><span>{counts.label}</span></div>
      <svg className={styles.grid} viewBox={`0 0 256 ${Math.ceil(cells.length / 16) * 10}`} role="img" aria-label={`${counts.selected} von ${counts.total} Anlagen. Ein Rechteck steht für ${perCell} Anlagen.`}>
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={Math.ceil(cells.length / 16) * 10}>
            <stop offset="0%" className={styles.gridBaseTop} />
            <stop offset="100%" className={styles.gridBaseBottom} />
          </linearGradient>
        </defs>
        {cells.map((cell, index) => <g key={index}>
          <rect x={index % 16 * 16} y={Math.floor(index / 16) * 10} width={13 * cell.occupied} height="7" fill={`url(#${gradientId})`} />
          {cell.selected > 0 && <rect x={index % 16 * 16} y={Math.floor(index / 16) * 10} width={13 * cell.selected} height="7" className={styles.gridValue} />}
        </g>)}
      </svg>
      <p className={styles.total}>{counts.total.toLocaleString('de-DE')} Solaranlagen insgesamt</p>
    </div>
  </div>;
}

export default MonitorComposition;
