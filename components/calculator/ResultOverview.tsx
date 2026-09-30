"use client";
import type { ReactNode, RefObject } from "react";
import { IconPlus, IconSettings } from "../Icons";
import { iconSizes, tokens } from "../../lib/theme";

/** Shared result composition extracted from the accepted balcony result. */
export default function ResultOverview({ id, saving, years, scenarioLabel, onScenario, onDetails, onSettings, progress, anchor, heroRef, introduction, control, children, chart, stats }: {
  id: string; saving: number; years: number; scenarioLabel: string;
  onScenario: () => void; onDetails: () => void; onSettings: () => void;
  progress: number; anchor: RefObject<HTMLDivElement | null>; heroRef?: RefObject<HTMLDivElement | null>;
  introduction?: ReactNode; control?: ReactNode; children: ReactNode; chart: ReactNode; stats: ReactNode;
}) {
  return <section id={id} className="wp-overview" aria-label="Dein Ergebnis">
    <div className="wp-overview-top"><div className="wp-result-column"><div ref={heroRef} className="wp-result-hero">
      {introduction}
      <div className="wp-overview-head"><div className="wp-result-label">
        <span className="wp-result-label-copy"><strong>{saving >= 0 ? "Einsparungen" : "Mehrkosten"} über {years} Jahre</strong> mit <button type="button" className="wp-assumptions-trigger" onClick={onScenario}>{scenarioLabel}</button></span>
        <div className="wp-result-tools"><button type="button" className="wp-result-details-link" onClick={onDetails}>Details</button><button type="button" className="wp-settings-trigger" aria-label="Rechnung einstellen" onClick={onSettings}><IconSettings size={iconSizes.xl} /></button></div>
      </div></div>
      <div className="wp-profit-comparison"><span className="wp-profit-illustration" aria-hidden="true"><img src="/illustrations/funding-check-neon.svg" alt="" width={1024} height={1024} /></span><div className="wp-profit-content"><div className="wp-profit-row">
        <div className="wp-profit-amount"><div ref={anchor} className="wp-result-value">{saving > 0 && <span className="wp-result-plus" style={{ color: tokens["--color-positive"] }} aria-label="Plus"><IconPlus size={iconSizes.md} /></span>}<span className="wp-result-count"><span className="wp-result-count-space" aria-hidden="true">{Math.abs(saving).toLocaleString("de-DE")}</span><span className="wp-result-count-live">{Math.round(Math.abs(saving) * progress).toLocaleString("de-DE")}</span></span> <span className="wp-result-currency">€</span></div><div className="wp-reference-inline"><span>vs. ausschließlich Netzstrom</span></div></div>{control}
      </div></div></div>{children}
    </div></div><div className="wp-result-chart">{chart}</div></div>
    <div className="wp-result-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>{stats}</div>
  </section>;
}
