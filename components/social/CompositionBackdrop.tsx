import React from 'react';
import styles from './CompositionBackdrop.module.css';

/** Shared artwork and fade for monitor charts, story previews and exports. */
export function CompositionBackdrop({label, compact = false}: {label: string; compact?: boolean}) {
  const balcony = /balkon|stecker/i.test(label);
  const src = balcony
    ? '/shared-nav/illustrations/balcony-modern-neon.webp'
    : '/shared-nav/illustrations/house-neon.webp';
  return <div className={`${styles.backdrop} ${compact ? styles.compact : ''}`} aria-hidden="true">
    <img src={src} alt="" decoding="async" />
  </div>;
}
