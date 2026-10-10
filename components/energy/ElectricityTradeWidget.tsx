'use client';
import {formatLiveDataTime} from '../../lib/live-data-time';
import {useEffect,useState} from 'react';
import {tradeDisplay,tradeDate,type TradeResult,type TradePeriod} from '../../lib/electricity-trade';
import {cachedTrade,loadTrade} from '../../lib/electricity-trade-client';
import {formatStoryDate} from '../../lib/story-format';
import {WIDGETS} from '../../lib/widget-registry';
import {WidgetFrame} from '../dashboard/WidgetFrame';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {useWidgetPresentation} from '../dashboard/WidgetPresentationContext';
import {RadialChartLayout} from '../charts/RadialChartLayout';
import ElectricityTradeRadial from '../charts/ElectricityTradeRadial';
import MetricValue from '../MetricValue';
import styles from './ElectricityTradeWidget.module.css';
import titleStyles from '../charts/RaceChart.module.css';
const stamp=(value:string)=>`${formatStoryDate(tradeDate(Date.parse(value)))}, ${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}).format(new Date(value))}`;
export default function ElectricityTradeWidget({presentation='full',initialData,onsite=false,today,variant='auto',period='year',year=today.slice(0,4),month=today.slice(5,7),mode='energy'}:{presentation?:'full'|'compact'|'hero';initialData?:TradeResult|null;onsite?:boolean;today:string;variant?:'auto'|'radial'|'bars'|'totals';period?:TradePeriod;year?:string;month?:string;mode?:'money'|'energy'}){
 const appearance=useWidgetPresentation();
 const [data,setData]=useState<TradeResult|null>(initialData??null),[error,setError]=useState('');
 const requestUrl=`/api/energy/trade?period=${period}${period==='year'||period==='month'?`&year=${year}`:''}${period==='month'?`&month=${month}`:''}`;
 useEffect(()=>{
  if(initialData!==undefined){setData(initialData);return;}
  let cancelled=false;
  setError('');setData(cachedTrade(requestUrl));
  loadTrade(requestUrl).then(result=>{if(!cancelled)setData(result);}).catch(e=>{if(!cancelled)setError(e.message);});
  return()=>{cancelled=true;};
 },[requestUrl,initialData]);
 const chartVariant=variant==='auto'?(period==='seven'?'bars':'radial'):variant;
 const money=mode==='money',imports=data?(money?data.totals.importEuro:data.totals.importMwh):null,exports=data?(money?data.totals.exportEuro:data.totals.exportMwh):null;
 const range=data?`${formatStoryDate(data.start)} – ${formatStoryDate(data.end)}`:'';
 const gaps=data?.days.some(d=>d.expected>0&&(money?d.priced:d.covered)<d.expected);
 const stand=data?.asOf?`${stamp(data.asOf)} Uhr`:'Noch kein Datenstand';
 const periodLabel=period==='year'?year:period==='month'?`${new Intl.DateTimeFormat('de-DE',{month:'long',timeZone:'UTC'}).format(new Date(`${year}-${month}-01T12:00:00Z`))} ${year}`:'Letzte 7 Tage';
 if(presentation!=='full')return <WidgetFrame title="Zukauf und Verkauf" subtitle={periodLabel} kind={chartVariant==='bars'?'time-series':'radial'}><div className={styles.compact} data-widget-loading={!data&&!error} data-summary-layout={presentation==='compact'&&chartVariant==='radial'?'auto':undefined} data-trade-shape={chartVariant} data-allocated={appearance.layout==='allocated'}>{error?<p role="alert">{error}</p>:!data?<p role="status">Daten werden geladen …</p>:<ElectricityTradeRadial preview summaryPlacement={presentation==='compact'?'auto':'center'} variant={chartVariant==='bars'?'bars':'radial'} days={data.days} money={money} importValue={imports} exportValue={exports}/>}</div></WidgetFrame>;
 return <ExportableWidgetFrame className={styles.frame} widget={WIDGETS.electricityTrade} title="Stromimport und Stromexport" titleContent={<span className={titleStyles.titleText}>Stromhandel: <span className={titleStyles.titleSeries}>Zukauf<span className={titleStyles.titleSeriesMark} style={{background:'var(--widget-accent)'}}/></span> und <span className={titleStyles.titleSeries}>Verkauf<span className={titleStyles.titleSeriesMark} style={{background:'var(--trade-export-color)'}}/></span></span>} kind="radial" place="Deutschland" exportUnit={tradeDisplay(imports,money,Math.max(Math.abs(imports??0),Math.abs(exports??0))).unit} exportDescription={`${range}${gaps ? " · Datenlücken" : ""}${data?.partial ? " · Zeitraum unvollständig" : ""}`} stand={data?.asOf??""} filename="stromhandel-deutschland" data-story-scheme={appearance.theme==='hero'?'highlight':appearance.theme??'dark'} sourceVisible={!onsite} subtitle={<>{periodLabel}{data?.retrievedAt&&!(period==='year'&&Number(year)<Number(today.slice(0,4)))&&` · Update: ${formatLiveDataTime(data.retrievedAt,new Date(`${today}T12:00:00Z`))}`}{gaps?' · Datenlücken':''}</>}
 shareParams={{period,year,month,mode,variant}} einbetten={{params:{period,year,month,mode,variant},height:600}}
 help={<><p>{variant==='totals'?'Gesamter Zukauf und Verkauf im gewählten Zeitraum.':'Die Balken zeigen den täglichen Unterschied: mehr verkauft nach außen bzw. oben, mehr zugekauft nach innen bzw. unten. Die große Zahl ist die Differenz für den Zeitraum.'} Fehlende Daten bleiben Lücken. Die Prozentzahl teilt die absolute Differenz durch die Summe aus Zukauf und Verkauf im selben Zeitraum. Bei negativen Gesamtsummen oder einer Summe von null wird kein Anteil angezeigt.</p><p>Grundlage: kommerzielle Handelsmengen von SMARD, keine physikalischen Stromflüsse.</p><p>Günstiger Strom aus dem Ausland kann Importe wirtschaftlich sinnvoll machen. Die Differenz allein zeigt keine Versorgungsabhängigkeit.</p><p>{range}. Datenstand: {stand}.{data?.partial?' Zeitraum noch unvollständig.':''}{gaps?' Datenlücken vorhanden.':''}</p></>}
 exportNote={`${range}. ${money?'Börsenwert: Handelsmenge × zeitgleicher deutscher Day-Ahead-Preis, keine tatsächlich gezahlten Ausgaben/Erlöse.':'Kommerzielle Handelsmengen, keine physikalischen Stromflüsse.'} Saldo = Export − Import. Anteil = absolute Differenz / (Zukauf + Verkauf). ${gaps?'Datenlücken. ':''}${data?.partial?'Zeitraum unvollständig. ':''}Datenstand: ${stand}.`}>
  <div data-widget-loading={!data&&!error} data-export-ready={!!data&&!error} data-trade-widget>
  {variant!=='totals'&&<RadialChartLayout playback={null} period={null}>
   <div className={styles.plotSlot} data-trade-shape={chartVariant} data-allocated={appearance.layout==='allocated'}>{error?<p role="alert">{error}</p>:!data?<p role="status">SMARD-Daten werden geladen …</p>:<ElectricityTradeRadial key={`${period}-${year}-${month}-${mode}`} variant={chartVariant==='totals'?'radial':chartVariant} days={data.days} money={money} importValue={imports} exportValue={exports}/>}</div>
  </RadialChartLayout>}
  {variant==='totals'&&<div className={styles.summary}><div><span>Zukauf gesamt</span><MetricValue {...tradeDisplay(imports,money,Math.max(Math.abs(imports??0),Math.abs(exports??0)))} maximumFractionDigits={2}/></div><div><span>Verkauf gesamt</span><MetricValue {...tradeDisplay(exports,money,Math.max(Math.abs(imports??0),Math.abs(exports??0)))} maximumFractionDigits={2}/></div></div>}
  </div>
 </ExportableWidgetFrame>;
}
