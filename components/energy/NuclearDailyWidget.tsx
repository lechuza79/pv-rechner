'use client';
import {formatLiveDataTime} from '../../lib/live-data-time';
import type {NuclearImportResponse} from '../../lib/nuclear-import';
import {nuclearDaily,nuclearDailyEnergy} from '../../lib/nuclear-daily';
import {formatStoryDate,formatStoryRelativeDate} from '../../lib/story-format';
import {CategoryBarChart,type CategoryBar} from '../charts/CategoryBarChart';
import MetricValue from '../MetricValue';
import SparklineMetric from '../charts/SparklineMetric';
import {WidgetArtwork} from '../dashboard/WidgetArtwork';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {useWidgetPresentation} from '../dashboard/WidgetPresentationContext';
import {WIDGETS} from '../../lib/widget-registry';
import styles from './NuclearDailyWidget.module.css';

export type NuclearDailyWidgetProps = {
 data:NuclearImportResponse|null;
 variant?:'teaser'|'full';
 /** Actual successful retrieval time, never the page render time. */
 updatedAt?:string;
} & ({metric?:'power';asOf?:string;intervalMinutes?:number}|{metric:'energy';asOf:string;intervalMinutes?:number});
const localDate=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'});
const localTime=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit'});
function timestampLabel(value:string|undefined) {
 if(!value||!Number.isFinite(Date.parse(value)))return null;
 const date=new Date(value);
 return `${formatStoryDate(localDate.format(date))}, ${localTime.format(date)} Uhr`;
}

/** Hero and detail instances share calculation, typography, bars and provenance. */
export default function NuclearDailyWidget({data,variant='teaser',metric='power',asOf,intervalMinutes=15,updatedAt}:NuclearDailyWidgetProps) {
 const appearance=useWidgetPresentation();
 const energy=metric==='energy';
 const days=nuclearDaily(data?.data??[]);
 const latest=days.at(-1);
 const energyResult=energy?nuclearDailyEnergy(data?.data??[],asOf!,intervalMinutes):null;
 const samples=(data?.data??[]).filter(p=>Number.isFinite(Date.parse(p.ts))&&Number.isFinite(p.nuclear_gw)&&p.nuclear_gw>=0);
 const lastSample=samples.reduce<string|undefined>((last,p)=>!last||Date.parse(p.ts)>Date.parse(last)?p.ts:last,undefined);
 const dataTime=timestampLabel(lastSample);
 const referenceDate=new Date(asOf??Date.now());
 const updateLabel=updatedAt?formatLiveDataTime(updatedAt,referenceDate):null;
 const retrieved=timestampLabel(updatedAt);
 const latestEnergy=energyResult?.days.at(-1);
 const value=energy?latestEnergy?.gwh??null:latest?.gw??null;
 const unit=energy?'GWh':'GW';
 const period=energyResult?.days.length?`${formatStoryDate(energyResult.days[0].date)} – ${formatStoryDate(energyResult.days[6].date)}`:latest?formatStoryDate(latest.date):'';
 const description=energy?(latestEnergy?`${formatStoryRelativeDate(latestEnergy.date,localDate.format(referenceDate))}${latestEnergy.partial?' · Teilmenge':''}`:'Keine Daten'):(latest?.partial?'Tagesmittel · unvollständig':'Tagesmittel');
 const rows:CategoryBar[]=energy?energyResult!.days.map(d=>({id:d.date,label:formatStoryDate(d.date),axisLabel:d.date.slice(8)+'.',value:d.gwh===null?0:Number(d.gwh.toFixed(3)),missing:d.gwh===null,partial:d.partial,partialLabel:d.gwh===null?'Keine Daten':`Erfasste Teilmenge · ${Math.round(d.coverage*100)} % des Tages abgedeckt`,highlighted:d===energyResult!.days.at(-1)})):days.map(d=>({id:d.date,label:formatStoryDate(d.date),axisLabel:d.date.slice(8)+'.',value:d.gw===null?0:Number(d.gw.toFixed(3)),missing:d.gw===null,partial:d.partial,partialLabel:d.gw===null?'Keine Daten':`Unvollständig · ${Math.round(d.coverage*100)} % des Tages abgedeckt`,highlighted:d===latest}));
 const help=`${energy?'Tagesenergie in GWh. Die große Zahl gehört zum letzten gelben Balken.':'Tagesmittel in GW. Die große Zahl zeigt den letzten Tag.'} Rechnerische Zuordnung aus Stromimporten und dem Atomanteil der Nachbarländer. Datenlücken stehen am Balken; keine Hochrechnung. Datenstand bezeichnet den letzten Messpunkt; Update den erfolgreichen Abruf.${dataTime?` Datenstand: ${dataTime}.`:""}${retrieved?` Abgerufen: ${retrieved}.`:''}`;
 return <ExportableWidgetFrame data-story-scheme={appearance.theme==='hero'?'highlight':appearance.theme??'dark'} widget={WIDGETS.nuclearDaily} place="Deutschland" exportUnit={unit} exportDescription={period} stand={dataTime??''} filename="solar-check-atomstrom-tage" exportNote={null} einbetten={{params:{variant,metric},height:300}} shareParams={{variant,metric}} title="Atomstrom-Import" subtitle={<span className={styles.metadata}>{updateLabel&&<span>Update: {updateLabel}</span>}</span>} className={styles.frame} artwork={<WidgetArtwork composition="edge" src="/illustrations/energy/mix-nuclear.webp"/>} kind="bar-comparison" help={help}>
  {!rows.some(row=>!row.missing)?<p role="status">Daten gerade nicht verfügbar.</p>:<div className={styles.chart} data-variant={variant}>
   {variant==='teaser'?<SparklineMetric rows={rows} value={value} unit={unit} label={`Rechnerischer Atomstrom-Import: ${energy?'Tagesenergie':'Tagesmittel'}, ${period}`} valueLabel={energy?description:undefined} maximumFractionDigits={energy?1:2}/>:<div className={styles.summary}>
    <CategoryBarChart unit={unit} label={`Rechnerischer Atomstrom-Import: ${energy?'Tagesenergie':'Tagesmittel'}, ${period}`} rows={rows}/>
    <div className={styles.value}>{value===null?<span className={styles.unavailable}>– <small>{unit}</small></span>:<MetricValue value={value} unit={unit} maximumFractionDigits={energy?1:2}/>}{energy&&<small>{description}</small>}</div>
   </div>}
   {variant==='full'&&<p className={styles.note}>Energy-Charts / Fraunhofer ISE · CC BY 4.0. Rechnerische Zuordnung, keine gemessene Herkunft des Stroms.</p>}
  </div>}
 </ExportableWidgetFrame>;
}
