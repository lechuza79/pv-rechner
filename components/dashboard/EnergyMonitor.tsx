"use client";

import type { ReactNode, Ref } from "react";
import foundation from "../social/atlas-foundations.module.css";
import "../gemeinde/municipal-data.css";
import "./dashboard.css";

export type MonitorEnergyWidgets = Partial<Record<"electricity-value" | "feed-in-value" | "radial" | "energy-year", ReactNode>>;

type Props = {
  rootRef?: Ref<HTMLDivElement>;
  single?: "currentPower" | "growth" | "stock" | keyof MonitorEnergyWidgets;
  className?: string;
  kpis?: ReactNode;
  currentPower?: ReactNode;
  growth?: ReactNode;
  stock?: ReactNode;
  energy?: MonitorEnergyWidgets;
  energyNotice?: ReactNode;
  map?: ReactNode;
};

/** The accepted municipality composition, shared by every regional level and embed.
 * Adapters supply widgets and data availability; section geometry lives only here.
 */
export function EnergyMonitor({ single, rootRef, className = "", kpis, currentPower, growth, stock, energy, energyNotice, map }: Props) {
  if (single) {
    const content = single === "currentPower" ? currentPower : single === "growth" ? growth : single === "stock" ? stock : energy?.[single];
    return <div ref={rootRef} className={`${foundation.foundation} municipal-data sc-dashboard ${className}`} data-story-scheme="dark" data-energy-monitor data-embed-layout-root>{content || <p>Für diesen Ort liegen noch keine Daten vor.</p>}</div>;
  }
  return (
    <div ref={rootRef} className={`${foundation.foundation} municipal-data sc-dashboard ${className}`} data-story-scheme="dark" data-energy-monitor data-embed-layout-root>
      {kpis}
      {(currentPower || growth) && <section aria-label="Aktuelle Solarleistung und Ausbau">
        <div className="sc-widget-grid">{currentPower}{growth}</div>
      </section>}
      {stock && <section aria-label="Anlagenbestand">
        <h3>Anlagenbestand</h3>
        <div className="sc-widget-grid">{stock}</div>
      </section>}
      {(energy || energyNotice) && <section aria-label="Strom und Wert">
        <h3>Strom und Wert</h3>
        {energy && <div className="sc-widget-grid">{energy["electricity-value"]}{energy["feed-in-value"]}{energy.radial}{energy["energy-year"]}</div>}
        {energyNotice}
      </section>}
      {map}
    </div>
  );
}
