"use client";
import {useGenerationMix,usePhysicalFlows,useImportMix,type GenerationDataPoint} from '../../lib/energy';
import {energieQuelle} from '../../lib/energy-ersatzstand';
import {WIDGETS} from '../../lib/widget-registry';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {SegmentedPowerBars} from '../charts/SegmentedPowerBars';
import {DivergingBarChart} from '../charts/DivergingBarChart';
import LiveDataStatus from '../LiveDataStatus';
function time(ts?:string){return ts?new Date(ts).toLocaleString('de-DE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'})+' Uhr':'nicht verfügbar';}
function power(value:unknown){return typeof value==='number'&&Number.isFinite(value)?Math.abs(value)/1000:null;}
export function PumpedStorageWidget({point,stale=false,fallback,retrievedAt,renderedAt,surface="card"}:{point?:GenerationDataPoint;stale?:boolean;fallback?:"smard";retrievedAt?:string;renderedAt:string;surface?:"plain"|"card"}){
 return <ExportableWidgetFrame title="Pumpspeicher" kind="number" surface={surface} widget={{...WIDGETS.pumpedStorage,sources:[energieQuelle({stale,fallback})]}} place="Deutschland" stand={point?.ts??""} filename="pumpspeicher" exportUnit="GW" einbetten={{params:{},height:300}} sourceVisible={surface==="card"} sourcePlacement={surface==="card"?"plot":"frame"} headingMeta={<span className="sc-widget-subtitle sc-widget-update"><LiveDataStatus observedAt={point?.ts} showObservedAt retrievedAt={retrievedAt} renderedAt={renderedAt} refreshPage={false}/></span>} help={<>Datenstand: {time(point?.ts)}{stale?' · letzter gespeicherter Stand':''}. Laden nutzt Strom zum Hochpumpen. Abgabe erzeugt daraus wieder Strom, mit Verlusten. Verschiedene Anlagen können gleichzeitig laden und abgeben. Kein Füllstand; Batteriedaten fehlen in dieser Reihe. „Update“ bezeichnet unseren Abruf, „Stand“ den Messzeitpunkt.</>}>
 <div className={surface==="card"?"sc-widget-inset":undefined}><SegmentedPowerBars rows={[{id:'charge',label:'Laden',value:power(point?.hydro_pumped_storage_consumption)},{id:'discharge',label:'Abgabe',value:power(point?.hydro_pumped_storage)}]}/>
 </div></ExportableWidgetFrame>;
}
export function PumpedStorageEmbed(){
 const {data,retrievedAt}=useGenerationMix('de',24);
 return <PumpedStorageWidget point={data.data.at(-1)} stale={data.stale} fallback={data.fallback} retrievedAt={retrievedAt} renderedAt={retrievedAt??'1970-01-01T00:00:00Z'}/>;
}
export function PhysicalTradeWidget({renderedAt='1970-01-01T00:00:00Z',surface="card"}:{renderedAt?:string;surface?:"plain"|"card"}){
 const {data,isStale,retrievedAt:flowRetrievedAt}=usePhysicalFlows();const flow=data.snapshot;
 const imports=useImportMix();const mix=imports.data.snapshot;
 const displayed=mix??flow;
 return <ExportableWidgetFrame title="Wie viel Strom importiert und exportiert Deutschland?" kind="bar-comparison" surface={surface} widget={WIDGETS.physicalTrade} place="Deutschland" stand={displayed?.ts??""} filename="physischer-stromhandel" exportUnit="GW" einbetten={{params:{},height:640}} sourceVisible={surface==="card"} sourcePlacement={surface==="card"?"plot":"frame"} headingMeta={<span className="sc-widget-subtitle sc-widget-update"><LiveDataStatus observedAt={displayed?.ts} showObservedAt retrievedAt={mix?imports.retrievedAt:flowRetrievedAt} renderedAt={renderedAt} refreshPage={false}/></span>} help={<>Datenstand: {time(displayed?.ts)}{(mix?imports.isStale:isStale)?' · letzter gespeicherter Stand':''}. Die Gesamtleistungen stammen aus physikalischen Grenzflüssen. Die Aufteilung ist geschätzt: Importe anhand des zeitgleichen Erzeugungsmixes der Nachbarländer; Exporte proportional zum gemeinsamen Angebot aus deutscher Erzeugung und Importen. Keine Verfolgung konkreter Stromlieferungen durch das europäische Netz. Alle Werte sind Leistungen in GW. Beide Richtungen und sämtliche Kategorien nutzen dieselbe GW-Skala. „Update“ bezeichnet unseren Abruf, „Stand“ den Messzeitpunkt. Speicherabgabe ist separat. Nicht zuordenbare Mengen bleiben sichtbar.</>}>
 <div className={surface==="card"?"sc-widget-inset":undefined}><DivergingBarChart rows={mix?.tradeRows??[]} totals={{left:displayed?.importGw??null,right:displayed?.exportGw??null}}/>
 {!mix?.tradeRows&&<p className="sc-flow-note">{imports.loading?'Aufteilung wird berechnet …':'Aufteilung gerade nicht verfügbar.'}</p>}
 </div></ExportableWidgetFrame>;
}
