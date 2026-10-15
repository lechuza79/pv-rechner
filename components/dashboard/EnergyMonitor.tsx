"use client";

import {ResponsiveWidgetComposition,useWidgetHeightBudget} from './WidgetComposition';
import WidgetPresentation from './WidgetPresentation';
import {widgetCompositionItem} from '../../lib/widget-appearance';
import {Fragment,useId} from 'react';
import {WidgetHostProvider} from './WidgetHost';
import type { ReactNode, Ref } from "react";
import foundation from "../social/atlas-foundations.module.css";
import "../gemeinde/municipal-data.css";
import "./dashboard.css";

export type MonitorWidgetItem = { id: string; widgetId: string; content: ReactNode };

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
  single?: "currentPower" | "growth" | "stock" | keyof MonitorEnergyWidgets;
  className?: string;
  kpis?: ReactNode;
  heroChart?: ReactNode;
  heroAside?: ReactNode;
  heroFooter?: ReactNode;
  currentPower?: ReactNode;
  growth?: ReactNode;
  stock?: ReactNode;
  stockItems?: MonitorWidgetItem[];
  density?: 'compact';
  energy?: MonitorEnergyWidgets;
  energyNotice?: ReactNode;
  map?: ReactNode;
};

/** Each card gets its own contract and instance, including repeated widget types. */
function MonitorComposition({ items, label, compact = false }: {
  items: { id: string; widgetId?: string; content: ReactNode }[];
  label: string;
  compact?: boolean;
}) {
  const heightBudget = useWidgetHeightBudget();
  const instance = useId();
  const appearance = {theme:'dark' as const, sharing:'on' as const, ...(compact ? {} : {layout:'allocated' as const})};
  const available = items.filter(item => item.content);
  if (!available.length) return null;
  return <ResponsiveWidgetComposition
    label={label}
    heightBudget={heightBudget}
    item={{
      id: label, kind: 'group', direction: 'grid', columns: 2,
      children: available.map(item => widgetCompositionItem(item.widgetId ?? item.id, { id: item.id, sizing: compact ? 'content' : undefined })),
    }}
    render={id => {
      const item = available.find(item => item.id === id)!;
      // Municipal detail links predate dashboard instance scopes. The chart's
      // filename already identifies its place and metric; a React mount ID
      // would invalidate newsletter links on every reload.
      return <WidgetHostProvider instanceId={compact ? undefined : `${instance}-${id}`} query={{}} appearance={appearance}>
        <WidgetPresentation density={compact ? 'compact' : undefined} widgetId={item.widgetId ?? id} appearance={appearance}>
          {item.content}
        </WidgetPresentation>
      </WidgetHostProvider>;
    }}
  />;
}

/** The accepted municipality composition, shared by every regional level and embed.
 * Adapters supply widgets and data availability; section geometry lives only here.
 */
export function EnergyMonitor({ single, rootRef, className = "", kpis, heroChart, heroAside, heroFooter, currentPower, growth, stock, stockItems, density, energy, energyNotice, map, scheme = "dark", topics, sectionStyle = "plain" }: Props) {
  if (single) {
    const content = single === "currentPower" ? currentPower : single === "growth" ? growth : single === "stock" ? (stockItems?.length ? stockItems.map(item => <Fragment key={item.id}>{item.content}</Fragment>) : stock) : energy?.[single];
    return <div ref={rootRef} className={`${foundation.foundation} municipal-data sc-dashboard ${className}`} data-story-scheme="dark" data-energy-monitor data-embed-layout-root>{content || <p>Für diesen Ort liegen noch keine Daten vor.</p>}</div>;
  }
  return (
    <div ref={rootRef} className={`${foundation.foundation} municipal-data sc-dashboard ${className}`} data-story-scheme={scheme} data-energy-monitor data-section-style={sectionStyle} data-embed-layout-root>
      {topics?.map(topic => <section key={topic.id} id={topic.id} aria-labelledby={`${topic.id}-title`} className="sc-monitor-topic" data-chart-side={topic.chartSide}>
        <div className="sc-monitor-topic-copy">
        <h2 id={`${topic.id}-title`}>{topic.title}</h2>
        {topic.description && <div className="sc-monitor-topic-description">{topic.description}</div>}
        </div>
        <div className="sc-monitor-topic-widgets" data-layout={topic.layout}>{topic.widgets}</div>
      </section>)}
      {heroChart&&<div className="sc-monitor-hero-composition"><div>{heroChart}</div>{heroAside&&<aside aria-label="Speicher und Grenzflüsse">{heroAside}</aside>}{heroFooter&&<div className="sc-monitor-hero-footer">{heroFooter}</div>}</div>}
      {kpis}
      {(currentPower || growth) && <section aria-label="Aktuelle Solarleistung und Ausbau">
        <MonitorComposition compact={density === 'compact'} label="Aktuelle Solarleistung und Ausbau" items={[{id:'regional-current-power',content:currentPower},{id:'regional-annual-growth',content:growth}]}/>
      </section>}
      {(stock || !!stockItems?.length) && <section aria-label="Anlagenbestand">
        <h3>Anlagenbestand</h3>
        <MonitorComposition compact={density === 'compact'} label="Anlagenbestand" items={stockItems ?? [{id:'regional-composition',content:stock}]}/>
      </section>}
      {(energy || energyNotice) && <section aria-label="Strom und Wert">
        <h3>Strom und Wert</h3>
        {energy && <MonitorComposition compact={density === 'compact'} label="Strom und Wert" items={[{id:'regional-electricity-value',content:energy['electricity-value']},{id:'regional-feed-in-value',content:energy['feed-in-value']},{id:'gemeinde-solar-monat',content:energy.radial},{id:'gemeinde-energie-jahr',content:energy['energy-year']}]}/>}
        {energyNotice}
      </section>}
      {map}
    </div>
  );
}
