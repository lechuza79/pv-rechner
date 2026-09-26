import type {ReactNode} from 'react';
import styles from './FormError.module.css';

/** Shared form feedback, announced when validation or submission fails. */
export default function FormError({children}: {children: ReactNode}) {
  return <div className={styles.error} role="alert"><span className={styles.icon} aria-hidden="true">!</span><div><strong>Bitte noch einmal prüfen</strong><p>{children}</p></div></div>;
}
