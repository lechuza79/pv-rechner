"use client";

import type { ReactNode, Ref } from "react";
import foundation from "../social/atlas-foundations.module.css";
import "../gemeinde/municipal-data.css";
import "./dashboard.css";

export type MonitorEnergyWidgets = Partial<Record<"electricity-value" | "feed-in-value" | "radial" | "energy-year", ReactNode>>;

export type MonitorTopicSection = {
  id: string;
  title: string;
  description?: ReactNode;
  widgets: ReactNode;
  layout?: "pair";
  chartSide?: "left" | "right";
};

type Props = {
  scheme?: "light" | "dark";
  topics?: MonitorTopicSection[];
  sectionStyle?: "plain" | "product";
  rootRef?: Ref<HTMLDivElement>;
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
export function EnergyMonitor({ rootRef, className = "", kpis, currentPower, growth, stock, energy, energyNotice, map, scheme = "dark", topics, sectionStyle = "plain" }: Props) {
  return (
    <div ref={rootRef} className={`${foundation.foundation} municipal-data sc-dashboard ${className}`} data-story-scheme={scheme} data-energy-monitor data-section-style={sectionStyle} data-embed-layout-root>
      {topics?.map(topic => <section key={topic.id} id={topic.id} aria-labelledby={`${topic.id}-title`} className="sc-monitor-topic" data-chart-side={topic.chartSide}>
        <div className="sc-monitor-topic-copy">
        <h2 id={`${topic.id}-title`}>{topic.title}</h2>
        {topic.description && <div className="sc-monitor-topic-description">{topic.description}</div>}
        </div>
        <div className="sc-monitor-topic-widgets" data-layout={topic.layout}>{topic.widgets}</div>
      </section>)}
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
