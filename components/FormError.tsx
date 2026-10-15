import type {ReactNode} from 'react';
import styles from './FormError.module.css';

/** Shared form feedback, announced when validation or submission fails. */
export default function FormError({children, title = "Bitte noch einmal prüfen", tone = "error"}: {children: ReactNode; title?: string; tone?: "error" | "neutral" | "awareness"}) {
  return <div className={styles.error} data-tone={tone} role={tone === "error" ? "alert" : "note"}><svg className={styles.icon} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" /><path d="M10 5.5v5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="10" cy="14" r="1" fill="currentColor" /></svg><div>{title && <strong>{title}</strong>}<div className={styles.body}>{children}</div></div></div>;
}
