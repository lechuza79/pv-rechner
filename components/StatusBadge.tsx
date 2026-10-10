import type {ReactNode} from 'react';
import styles from './StatusBadge.module.css';

/** Compact status indicator; pulse is reserved for a currently active state. */
export default function StatusBadge({children, tone = 'neutral', pulse = false, variant = 'badge', accentDot = false}: {children: ReactNode; tone?: 'positive' | 'negative' | 'neutral'; pulse?: boolean; variant?: 'badge' | 'inline'; accentDot?: boolean}) {
  return <span className={styles.badge} data-variant={variant} data-tone={tone} data-pulse={pulse} data-accent-dot={accentDot}>{children}</span>;
}
