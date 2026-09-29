import Image from "next/image";
import Link from "next/link";
import { IconArrowRight } from "./Icons";
import { iconSizes } from "../lib/theme";
import styles from "./article-teasers.module.css";

export interface ArticleTeaserItem {
  href: string;
  title: string;
  teaser: string;
  cta?: string;
  image?: { src: string; alt: string; width: number; height: number };
}

/** Editorial cards shared by reading recommendations and the guide index. */
export default function ArticleTeasers({ title, items, currentPath, layout = "grid" }: {
  title?: string;
  items: ArticleTeaserItem[];
  currentPath?: string;
  layout?: "grid" | "list";
}) {
  const visible = items.filter((item) => item.href !== currentPath);
  if (!visible.length) return null;
  const Heading = title ? "h3" : "h2";
  return (
    <div className={styles.root}>
      {title && <h2 className={styles.heading}>{title}</h2>}
      <ul className={`${styles.items} ${layout === "list" ? styles.list : ""}`}>
        {visible.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={styles.card}>
              {item.image && <Image {...item.image} className={styles.image} sizes="(max-width: 640px) 100vw, 50vw" />}
              <div className={styles.copy}>
                <Heading className={styles.title}>{item.title}</Heading>
                <p className={styles.teaser}>{item.teaser}</p>
                <span className={styles.cta}>{item.cta ?? "Mehr erfahren"} <IconArrowRight size={iconSizes.xl} /></span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
