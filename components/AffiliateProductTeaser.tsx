import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./AffiliateProductTeaser.module.css";

/** Compact linked product reference with an inline selection disclosure. */
export default function AffiliateProductTeaser({ name, image, description, url, disclosure, onShopClick, allowReferrer = false }: {
  name: string;
  image: string | null;
  description: string;
  url: string;
  disclosure: ReactNode;
  onShopClick?: () => void;
  allowReferrer?: boolean;
}) {
  return <section className={styles.teaser} aria-label="Berechnet mit">
    <div className={styles.meta}><h3>Berechnet mit</h3><span>Anzeige</span></div>
    <a className={styles.product} href={url} onClick={onShopClick} target="_blank" rel={allowReferrer ? "nofollow sponsored noopener" : "nofollow sponsored noopener noreferrer"} referrerPolicy={allowReferrer ? "origin" : undefined} aria-label={`${name} – ${description} – im Shop ansehen`}>
      {image && <span className={styles.thumbnail}><Image src={image} alt="" width={64} height={64} sizes="64px" /></span>}
      <span className={styles.copy}>
        <strong className={styles.name}>{name}</strong>
        <span>{description}</span>
        <span className={styles.disclosure}>{disclosure}</span>
      </span>
    </a>
  </section>;
}
