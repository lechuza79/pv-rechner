import type {ReactNode} from 'react';
import styles from './StatusBadge.module.css';

/** Compact status indicator; pulse is reserved for a currently active state. */
export default function StatusBadge({children, tone = 'neutral', pulse = false}: {children: ReactNode; tone?: 'positive' | 'negative' | 'neutral'; pulse?: boolean}) {
  return <span className={styles.badge} data-tone={tone} data-pulse={pulse}>{children}</span>;
}
