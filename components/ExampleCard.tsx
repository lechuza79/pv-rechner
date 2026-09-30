import type { ReactNode } from "react";
import "./dashboard/Delta.css";
import styles from "./ExampleCard.module.css";

/** Shared illustration/content card used by municipal and editorial examples. */
export default function ExampleCard({ title, titleLabel, motif, children, className = "" }: {
  title: ReactNode; titleLabel?: string; motif: string; children: ReactNode; className?: string;
}) {
  return <article className={`sc-feature-card gemeinde-buerger-card ${styles.card} ${className}`}>
    <h3 className="gemeinde-buerger-title">{title}</h3>
    {/* @ts-expect-error — registered by solar-illustrations.js */}
    <solar-illustration class="v3-example-art sc-feature-visual" motif={motif} label={titleLabel ?? (typeof title === "string" ? title : "Photovoltaikanlage")} circle="" loading="lazy" loading-margin="1200" />
    <div className="v3-example-copy sc-feature-content">{children}</div>
  </article>;
}

/** The municipality amount markup, shared by both example sections. */
export function ExampleAmount({ amount, period }: { amount: string; period: string }) {
  return <span className={`v3-result-amount sc-delta ${styles.amount}`}>
    <span className="v3-result-plus" aria-label="Plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M12 4v16M4 12h16" /></svg></span>
    <span className="v3-delta-value">{amount} <span className="v3-delta-currency">€</span></span>
    <small>{period}</small>
  </span>;
}
export function ExampleSize({ value, unit }: { value: number; unit: string }) {
  return <>{value} <span className={styles.unit}>{unit}</span></>;
}
