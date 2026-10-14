"use client";
import EnergyDataNotice from "./EnergyDataNotice";
import {energieQuelle,quellenHinweis,type QuellenStand} from '../../lib/energy-ersatzstand';
import {useMemo,useState} from 'react';
import {useWidgetHost} from '../dashboard/WidgetHost';
import {radarDateRange,radarObservation,radarObservationPoints} from '../../lib/strommix-radar-source';
import {useGenerationMix,type GenerationDataPoint} from '../../lib/energy';
import {strommixRadar} from '../../lib/strommix-radar';
import {WIDGETS} from '../../lib/widget-registry';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {useWidgetPresentation} from '../dashboard/WidgetPresentationContext';
import {RadarChart} from '../charts/RadarChart';
import {ChartTimePlayback} from '../charts/ChartTimePlayback';
import LiveDataStatus from '../LiveDataStatus';
import {LoadingDots} from '../LoadingDots';

export function useRadarFrames(points:GenerationDataPoint[],timestamp:string|null){
 const frames=useMemo(()=>{
  const latest=Date.parse(points.at(-1)?.ts??'');
  return points.filter(point=>Date.parse(point.ts)>latest-24*60*60*1000).map(point=>({ts:point.ts,rows:strommixRadar([point])})).filter(frame=>frame.rows.length>0);
 },[points]);
 const times=useMemo(()=>frames.map(frame=>frame.ts),[frames]);
 const frame=frames.find(frame=>frame.ts===timestamp)??frames.at(-1);
 const max=Math.max(5,Math.ceil(Math.max(0,...frames.flatMap(frame=>frame.rows.map(row=>row.value)))*1.15/5)*5);
 return {times,frame,max};
}
/** The same chart, export and embed contract for the editorial hero and standalone widget. */
export function StrommixRadarWidget({points,timestamp,onChange,hero=false,hideLabels=false,loading=false,retrievedAt,renderedAt,sourceVisible=false,provenance={},autoPlay=hero,observation,surface="plain"}:{surface?:"card"|"plain";autoPlay?:boolean;observation?:string;provenance?:QuellenStand;points:GenerationDataPoint[];timestamp:string|null;onChange:(value:string|null)=>void;hero?:boolean;hideLabels?:boolean;loading?:boolean;retrievedAt?:string;renderedAt:string;sourceVisible?:boolean}){
 const {theme}=useWidgetPresentation();
 const {times,frame,max}=useRadarFrames(points,timestamp);
 const stand=frame?.ts??'';
 const source=energieQuelle(provenance);
 const notice=quellenHinweis(provenance,stand);
 const help=<>
  <p>Die Anteile zeigen die öffentliche Nettostromerzeugung in Deutschland. Speicherabgabe und Importe sind nicht enthalten.</p>
  <p>Wind an Land und auf See sowie Braun- und Steinkohle sind jeweils zusammengefasst. Die Skala bleibt über die letzten 24 Stunden gleich; der äußere Ring entspricht nicht 100 %.</p>
  <p>Der Verlauf nutzt die verfügbaren Viertelstundenwerte. Fehlende Messpunkte werden nicht ergänzt. Speicher und Stromhandel zeigen unabhängig davon ihren neuesten Stand.</p>
  <p>Datenstand: {stand?new Date(stand).toLocaleString('de-DE',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'})+' Uhr':'nicht verfügbar'}. Quelle: {source.name}.</p>
 </>;
 return <ExportableWidgetFrame className="sc-strommix-radar-frame" data-story-scheme={theme==='hero'?'highlight':theme} widget={{...WIDGETS.strommixRadar,sources:[source]}} place="" stand={stand} filename="strommix-radar" showHeading={!hero} showMenuWithoutHeading={hero} title="Stromerzeugung nach Energieträger" kind="radial" surface={surface} help={help} sourceVisible={sourceVisible} sharePath={observation?'/embed/strommix-radar':undefined} shareParams={observation?{at:observation}:points.at(-1)?.ts?{stand:points.at(-1)!.ts}:{}} einbetten={{params:{...(observation?{at:observation}:{}),...(hero?{presentation:'hero'}:{})},height:720}} exportUnit="%" exportDescription="Öffentliche Nettostromerzeugung ohne Speicherabgabe und Importe" headingMeta={<span className="sc-widget-subtitle sc-widget-update"><LiveDataStatus observedAt={stand} showObservedAt retrievedAt={retrievedAt} renderedAt={renderedAt} refreshPage={false}/></span>}>
  {notice&&<EnergyDataNotice details={notice}/>}
  {frame?<RadarChart artwork="/illustrations/energy/radar-carriers-v1.png" rows={frame.rows} max={max} label="Erzeugungsmix ohne Speicherabgabe und Importe"/>:<p role="status">{loading?<LoadingDots/>:'Daten gerade nicht erreichbar.'}</p>}
  <ChartTimePlayback timestamps={times} value={timestamp} onChange={onChange} autoPlay={autoPlay} hideLabels={hideLabels}/>
 </ExportableWidgetFrame>;
}
export function StrommixRadarEmbed({query={}}:{query?:Record<string,string>}){
 const host=useWidgetHost();
 const appearance=useWidgetPresentation();
 const config=host?.query??query;
 const observation=radarObservation(config);
 const range=radarDateRange(config);
 const {data,loading,retrievedAt}=useGenerationMix('de',24,range);
 const [timestamp,setTimestamp]=useState<string|null>(null);
 const points=useMemo(()=>radarObservationPoints(data.data,observation),[data.data,observation]);
 const hero=config.presentation==='hero';
 return <StrommixRadarWidget surface="card" points={points} provenance={data} timestamp={timestamp} onChange={setTimestamp} hero={hero} autoPlay={appearance.autoplay??(hero&&!observation)} observation={observation} loading={loading} retrievedAt={retrievedAt} renderedAt={retrievedAt??'1970-01-01T00:00:00Z'} sourceVisible/>;
}
