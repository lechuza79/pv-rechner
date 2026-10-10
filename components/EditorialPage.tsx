import type { ReactNode } from "react";
import styles from "./EditorialPage.module.css";

/** Shared reading column using the site's existing typography tokens. */
export default function EditorialPage({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={styles.page}>
    <div className={`${styles.content} ${wide ? styles.wide : ""}`}>{children}</div>
  </div>;
}
