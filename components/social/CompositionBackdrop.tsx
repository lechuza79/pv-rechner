import React from 'react';
import {solarCategoryVisual} from '../../lib/solar-category-visual';
import styles from './CompositionBackdrop.module.css';

/** Shared artwork and fade for monitor charts, story previews and exports. */
export function CompositionBackdrop({label, compact = false}: {label: string; compact?: boolean}) {
  const src = solarCategoryVisual(label) ?? '/shared-nav/illustrations/house-neon.webp';
  return <div className={`${styles.backdrop} ${compact ? styles.compact : ''}`} aria-hidden="true">
    <img src={src} alt="" decoding="async" />
  </div>;
}
