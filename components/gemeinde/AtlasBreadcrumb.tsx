"use client";

import { useEffect, useRef } from "react";
import { IconMore, IconArrowRight } from "../Icons";
import styles from "./AtlasBreadcrumb.module.css";

/** Shared breadcrumb from the approved municipality hero. */
export default function AtlasBreadcrumb({ parents, name, framed = false }: { parents: { name: string; href: string }[]; name: string; framed?: boolean }) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismissOutside = (event: Event) => {
      const menu = disclosure.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
    };
    const dismissEscape = (event: KeyboardEvent) => {
      const menu = disclosure.current;
      if (event.key !== "Escape" || !menu?.open) return;
      menu.open = false;
      menu.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    document.addEventListener("keydown", dismissEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
      document.removeEventListener("keydown", dismissEscape);
    };
  }, []);
  return <nav aria-label="Brotkrümel" className={`atlas-breadcrumb ${styles.breadcrumb} ${framed ? styles.framed : ""}`}>
    {parents.map((parent, index) => <span key={parent.href} className={index > 0 ? styles.desktopParent : styles.parent}>
      <a href={parent.href}>{parent.name}</a>
      <svg className="sc-live-icon" aria-hidden="true" focusable="false" height="16" viewBox="0 0 28 14" fill="none">
        <path d="M1 7h25m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>)}
    {parents.length > 1 && <>
      <details ref={disclosure} className={styles.collapsedParents} suppressHydrationWarning>
        <summary aria-label="Übergeordnete Seiten anzeigen"><span className={styles.moreIcon} aria-hidden="true"><IconMore /></span></summary>
        <div className={`sc-account-panel ${styles.expandedParents}`}>
          {parents.slice(1).map(parent => <a key={parent.href} href={parent.href}><span>{parent.name}</span><span aria-hidden="true"><IconArrowRight /></span></a>)}
        </div>
      </details>
      <svg className={styles.mobileSeparator} aria-hidden="true" focusable="false" height="16" viewBox="0 0 28 14" fill="none">
        <path d="M1 7h25m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>}
    <span className={styles.current} aria-current="page">{name}</span>
  </nav>;
}
