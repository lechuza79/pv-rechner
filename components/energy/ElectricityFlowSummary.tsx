'use client';
import {usePhysicalFlows,useImportMix,type GenerationDataPoint} from '../../lib/energy';
import {SegmentedPowerBars} from '../charts/SegmentedPowerBars';
import {DivergingBarChart} from '../charts/DivergingBarChart';
import stage from '../EnergyEditorialStage.module.css';
import LiveDataStatus from '../LiveDataStatus';
import {WidgetFrame} from '../dashboard/WidgetFrame';
function time(ts?:string){return ts?new Date(ts).toLocaleString('de-DE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'})+' Uhr':'nicht verfügbar';}
function power(value:unknown){return typeof value==='number'&&Number.isFinite(value)?Math.abs(value)/1000:null;}
/** Same units for both directions; missing data remains missing, never zero. */
export function ElectricityFlowSummary({editorial=false,point,stale=false,retrievedAt,renderedAt}:{editorial?:boolean;point?:GenerationDataPoint;stale?:boolean;retrievedAt?:string;renderedAt:string}){
 const {data,isStale,retrievedAt:flowRetrievedAt}=usePhysicalFlows();const flow=data.snapshot;
 const imports=useImportMix();const mix=imports.data.snapshot;
 const displayed=mix??flow;

 const storage=<WidgetFrame title="Pumpspeicher" kind="number" surface="plain" headingMeta={<span className="sc-widget-subtitle sc-widget-update"><LiveDataStatus observedAt={point?.ts} showObservedAt retrievedAt={retrievedAt} renderedAt={renderedAt} refreshPage={false}/></span>} help={<>Datenstand: {time(point?.ts)}{stale?' · letzter gespeicherter Stand':''}. Laden nutzt Strom zum Hochpumpen. Abgabe erzeugt daraus wieder Strom, mit Verlusten. Verschiedene Anlagen können gleichzeitig laden und abgeben. Kein Füllstand; Batteriedaten fehlen in dieser Reihe. „Update“ bezeichnet unseren Abruf, „Stand“ den Messzeitpunkt.</>}>
 <SegmentedPowerBars rows={[{id:'charge',label:'Laden',value:power(point?.hydro_pumped_storage_consumption)},{id:'discharge',label:'Abgabe',value:power(point?.hydro_pumped_storage)}]}/>
 </WidgetFrame>;
 const trade=<WidgetFrame title="Wie viel Strom importiert und exportiert Deutschland?" kind="bar-comparison" surface="plain" headingMeta={<span className="sc-widget-subtitle sc-widget-update"><LiveDataStatus observedAt={displayed?.ts} showObservedAt retrievedAt={mix?imports.retrievedAt:flowRetrievedAt} renderedAt={renderedAt} refreshPage={false}/></span>} help={<>Datenstand: {time(displayed?.ts)}{(mix?imports.isStale:isStale)?' · letzter gespeicherter Stand':''}. Die Gesamtleistungen stammen aus physikalischen Grenzflüssen. Die Aufteilung ist geschätzt: Importe anhand des zeitgleichen Erzeugungsmixes der Nachbarländer; Exporte proportional zum gemeinsamen Angebot aus deutscher Erzeugung und Importen. Keine Verfolgung konkreter Stromlieferungen durch das europäische Netz. Alle Werte sind Leistungen in GW. Beide Richtungen und sämtliche Kategorien nutzen dieselbe GW-Skala. „Update“ bezeichnet unseren Abruf, „Stand“ den Messzeitpunkt. Speicherabgabe ist separat. Nicht zuordenbare Mengen bleiben sichtbar.</>}>
 <DivergingBarChart rows={mix?.tradeRows??[]} totals={{left:displayed?.importGw??null,right:displayed?.exportGw??null}}/>
 {!mix?.tradeRows&&<p className="sc-flow-note">{imports.loading?'Aufteilung wird berechnet …':'Aufteilung gerade nicht verfügbar.'}</p>}
 </WidgetFrame>;
 if(!editorial)return <>{storage}{trade}</>;
 return <>
 <section className={stage.flowTopic} aria-label="Pumpspeicher in Deutschland">{storage}<p>Pumpspeicherkraftwerke speichern Energie, indem sie Wasser in ein höher gelegenes Becken pumpen. Fließt es zurück, treiben Turbinen Generatoren an. So können sie Strom zeitversetzt bereitstellen. Die Grafik zeigt die aktuelle Leistung beim Laden und bei der Abgabe in Gigawatt – nicht den Füllstand der Speicher. Verschiedene Anlagen können gleichzeitig laden und Strom abgeben.</p></section>
 <section className={stage.flowTopic} aria-label="Stromimporte und Stromexporte">{trade}<p>Deutschland tauscht über das europäische Verbundnetz Strom mit seinen Nachbarländern aus. Importe und Exporte können gleichzeitig stattfinden, etwa an unterschiedlichen Grenzen. Die Gesamtbalken zeigen die physikalischen Stromflüsse; ihre Aufteilung nach Energieträgern wird aus dem jeweiligen Strommix geschätzt. Sämtliche Balken nutzen dieselbe Skala, damit Kategorien und Gesamtleistung direkt vergleichbar bleiben.</p></section>
 </>;
}
