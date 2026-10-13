'use client';
import {useWidgetPresentation} from '../dashboard/WidgetPresentationContext';
import type {ReactNode} from 'react';
import styles from './RadialChartLayout.module.css';

/** Period establishes context; playback moves as one group when the card is narrow. */
export function RadialChartLayout({period,playback,children}:{period:ReactNode;playback:ReactNode;children:ReactNode}) {
 const allocated=useWidgetPresentation().layout==='allocated';
 return <div className={styles.container} data-allocated={allocated||undefined}><div className={styles.layout} data-controls={!!period||!!playback}>
  <div className={styles.period}>{period}</div>
  <div className={styles.plot}>{children}</div>
  <div className={styles.playback}>{playback}</div>
 </div></div>;
}
