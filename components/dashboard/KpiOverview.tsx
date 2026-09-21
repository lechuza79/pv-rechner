"use client";

import {useState,type ReactNode} from 'react';
import {WidgetSetting} from './WidgetSetting';
import InfoTooltip from '../InfoTooltip';
import {dashboardDate} from '../../lib/dashboard/format';
import {kpiWindow, type KpiDefinition} from '../../lib/dashboard/model';

const number = (value: number, digits = 0) => value.toLocaleString('de-DE', {maximumFractionDigits: digits});
const signed = (value: number, digits = 0) => `${value > 0 ? '+' : ''}${number(value, digits)}`;
function Kpi({definition, months}: {definition: KpiDefinition; months: number}) {
  const {bars,value,comparison:result}=kpiWindow(definition,months);
  const [expanded, setExpanded] = useState(false);
  const max = Math.max(Number.EPSILON,...bars.map(row=>Math.abs(row.value)));
  const hasNegative=bars.some(row=>row.value<0);
  const baseline = hasNegative?29:42;
  const chartHeight = hasNegative?20:36;
  const countUnit=!definition.unit||definition.unit==='Stk.';
  let text = 'Kein vergleichbarer Datenstand vorhanden';
  let alternative = '';
  let positive = false;
  if (result.status === 'incompatible') text = 'Vergleichsbasis hat sich geändert';
  if (result.status === 'not-applicable') text = 'Jahreszubau: Vergleich mit Vorjahr wählen';
  if (result.status === 'available') {
    const absolute = `${signed(result.delta,countUnit ? 0 : Math.max(2,definition.digits??0))}${definition.unit ? ' '+definition.unit : ''}`;
    const percent = result.percent === null ? 'Prozentvergleich nicht möglich' : `${signed(result.percent,1)} %`;
    text = countUnit ? absolute : percent;
    alternative = countUnit ? percent : absolute;
    positive = result.delta > 0;

  }
  const label = definition.kind==='period-total' ? 'Neue Anlagen dieses Jahr' : definition.label;
  return <div className="sc-kpi">
    <span className="sc-kpi-label">{label}</span>
    <div className="sc-kpi-main">
      <div className="sc-kpi-value"><strong>{number(value, definition.digits)}{definition.unit && <small>{definition.unit}</small>}</strong></div>
    <div className="sc-kpi-plot">
      {bars.length > 0 && <svg className="sc-kpi-trend" viewBox="0 0 160 58" preserveAspectRatio="xMinYMid meet" role="img" aria-label={`${label}: monatliche Veränderungen, ${bars.map(row=>`${dashboardDate(row.end)}: ${number(row.value,countUnit?0:Math.max(2,definition.digits??0))} ${definition.unit??'Stk.'}`).join(', ')}`}>
        {bars.map(row=><rect key={row.end} x={bars.indexOf(row)*160/bars.length+1} y={row.value >= 0 ? baseline-row.value/max*chartHeight : baseline} width={Math.max(3,160/bars.length-4)} height={Math.abs(row.value)/max*chartHeight} rx="2"><title>{dashboardDate(row.end)}: {number(row.value,countUnit?0:Math.max(2,definition.digits??0))} {definition.unit??'Stk.'}</title></rect>)}
        <line className="sc-kpi-zero" x1="0" y1={baseline} x2="160" y2={baseline}/>
        <text x="0" y="56">0</text>
      </svg>}

    </div>
    </div>
    {result.status==='available' ? <button type="button" className="sc-kpi-comparison sc-kpi-delta" data-positive={positive} aria-expanded={expanded} aria-label={`${text}; ${alternative}. Vergleich ${definition.kind === 'period-total' ? 'gleicher Zeitraum im Vorjahr' : `${months} Monate zuvor`}`} onClick={()=>setExpanded(!expanded)} onBlur={()=>setExpanded(false)}>
      <span>{text}</span><span className="sc-kpi-delta-alternative" data-open={expanded}>{alternative}</span>
    </button> : <span className="sc-kpi-comparison" data-status={result.status}>{text}</span>}


  </div>;
}
export function KpiOverview({groups,help}: {help?:ReactNode;groups: {title: string; items: KpiDefinition[]}[]}) {
  const [months,setMonths]=useState(12);
  return <section className="sc-kpi-overview" aria-label="Basis-Kennzahlen">
<header className="sc-widget-head sc-kpi-head"><h3>Basis-Kennzahlen</h3><div className="sc-widget-tools"><WidgetSetting label="Zeitraum der Kennzahlen" hideLabel value={String(months)} onChange={value=>setMonths(Number(value))} options={[{value:'12',label:'Letzte 12 Monate'},{value:'6',label:'Letzte 6 Monate'},{value:'1',label:'Letzter Monat'}]}/><InfoTooltip ariaLabel="Kennzahlen: Erklärung" size={16}><p>Die Balken zeigen bei Beständen die Monatsendwerte im gewählten Zeitraum. Das Plus oder Minus zeigt, wie sich der Bestand seit Beginn dieses Zeitraums verändert hat.</p><p>„Neue Anlagen dieses Jahr“ zählt die monatlichen Inbetriebnahmen von Januar bis zum letzten abgeschlossenen Monat und vergleicht genau diese Monate mit dem Vorjahr.</p>{help}</InfoTooltip></div></header>
    <div className="sc-kpi-groups" aria-live="polite">{groups.map(group => <section className="sc-kpi-group" key={group.title}><h3>{group.title}</h3><div className="sc-kpi-grid">{group.items.map(item => <Kpi key={item.id} definition={item} months={months}/>)}</div></section>)}</div>
  </section>;
}
