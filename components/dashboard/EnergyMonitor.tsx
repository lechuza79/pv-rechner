"use client";

import {ResponsiveWidgetComposition,useWidgetHeightBudget} from './WidgetComposition';
import WidgetPresentation from './WidgetPresentation';
import {widgetCompositionItem} from '../../lib/widget-appearance';
import {useId} from 'react';
import {WidgetHostProvider} from './WidgetHost';
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

/** Existing onsite widgets use the same constraints as the portable dashboard. */
function MonitorComposition({items,label}:{items:{id:string;content:ReactNode}[];label:string}){
 const heightBudget=useWidgetHeightBudget();
 const instance=useId();
 const available=items.filter(item=>item.content);
 if(!available.length)return null;
 return <ResponsiveWidgetComposition label={label} heightBudget={heightBudget} item={{id:label,kind:'group',direction:'grid',columns:2,children:available.map(item=>widgetCompositionItem(item.id))}}
  render={id=><WidgetHostProvider instanceId={`${instance}-${id}`} query={{}} appearance={{theme:'dark',layout:'allocated',sharing:'on'}}><WidgetPresentation widgetId={id} appearance={{theme:'dark',layout:'allocated',sharing:'on'}}>{available.find(item=>item.id===id)?.content}</WidgetPresentation></WidgetHostProvider>}/>;
}

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
        <MonitorComposition label="Aktuelle Solarleistung und Ausbau" items={[{id:'regional-current-power',content:currentPower},{id:'regional-annual-growth',content:growth}]}/>
      </section>}
      {stock && <section aria-label="Anlagenbestand">
        <h3>Anlagenbestand</h3>
        <MonitorComposition label="Anlagenbestand" items={[{id:'regional-composition',content:stock}]}/>
      </section>}
      {(energy || energyNotice) && <section aria-label="Strom und Wert">
        <h3>Strom und Wert</h3>
        {energy && <MonitorComposition label="Strom und Wert" items={[{id:'regional-electricity-value',content:energy['electricity-value']},{id:'regional-feed-in-value',content:energy['feed-in-value']},{id:'gemeinde-solar-monat',content:energy.radial},{id:'gemeinde-energie-jahr',content:energy['energy-year']}]}/>}
        {energyNotice}
      </section>}
      {map}
    </div>
  );
}
