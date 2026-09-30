import type { ReactNode } from "react";
import styles from "./EditorialPage.module.css";

/** Shared reading column using the site's existing typography tokens. */
export default function EditorialPage({ children }: { children: ReactNode }) {
  return <div className={styles.page}>
    <div className={styles.content}>{children}</div>
  </div>;
}
