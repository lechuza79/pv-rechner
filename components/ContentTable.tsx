"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { IconArrowLeft, IconArrowRight } from "./Icons";
import { pad, space } from "../lib/theme";
import styles from "./ContentTable.module.css";

/** Shared lookup table: row labels stay in view while numeric columns scroll. */
export default function ContentTable({ caption, minWidth = 0, id, compact = false, matrix = false, showCaption = true, rowLabelWidth = 60, columnWidth = 72, columnLabel = "Jahresspalte", align = "right", children }: {
  caption: string;
  minWidth?: number;
  compact?: boolean;
  id?: string;
  matrix?: boolean;
  rowLabelWidth?: number;
  columnWidth?: number;
  columnLabel?: string;
  align?: "left" | "center" | "right";
  showCaption?: boolean;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ back: false, next: false });
  const updateEdges = () => {
    const node = scrollRef.current;
    if (node) setEdges({ back: node.scrollLeft > 1, next: node.scrollLeft + node.clientWidth < node.scrollWidth - 1 });
  };
  useEffect(() => {
    const node = scrollRef.current;
    if (!matrix || !node) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    updateEdges();
    return () => observer.disconnect();
  }, [matrix]);
  const step = (direction: number) => {
    const node = scrollRef.current;
    const column = node?.querySelector("thead th:nth-child(2)");
    if (!node || !column) return;
    const width = column.getBoundingClientRect().width;
    const index = direction > 0 ? Math.floor((node.scrollLeft + 1) / width) + 1 : Math.ceil((node.scrollLeft - 1) / width) - 1;
    node.scrollTo({ left: Math.max(0, index * width), behavior: "smooth" });
  };
  return <div className={`${styles.frame} ${compact ? styles.compact : ""} ${matrix ? styles.matrix : ""}`} style={{
    "--table-align": align,
    "--table-row-label-width": `${rowLabelWidth}px`,
    "--table-column-width": `${columnWidth}px`,
    "--table-min-width": `${minWidth}px`,
    "--table-cell-padding": pad("md", "lg"),
    "--table-gap": `${space.md}px`,
  } as CSSProperties}>
    <div className={styles.heading}>
      {showCaption && <div className={styles.caption}>{caption}</div>}
      {matrix && <div className={styles.controls} aria-label="Tabellenspalten durchblättern">
        <button type="button" aria-label={`Eine ${columnLabel} zurück`} aria-controls={id} disabled={!edges.back} onClick={() => step(-1)}><IconArrowLeft /></button>
        <button type="button" aria-label={`Eine ${columnLabel} weiter`} aria-controls={id} disabled={!edges.next} onClick={() => step(1)}><IconArrowRight /></button>
      </div>}
    </div>
    <div id={id} className={styles.scroll} role="region" aria-label={caption} tabIndex={0} ref={scrollRef} onScroll={updateEdges}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>{caption}</caption>
        {children}
      </table>
    </div>
  </div>;
}
