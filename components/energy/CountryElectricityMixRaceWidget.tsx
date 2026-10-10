"use client";
import {useEffect,useRef,useState} from 'react';
import Script from 'next/script';
import data from '../../data/country-electricity-mix-race.json';
import perCapitaData from '../../data/country-electricity-per-capita-race.json';
import {WIDGETS} from '../../lib/widget-registry';
import {ExportableWidgetFrame} from '../dashboard/ExportableWidgetFrame';
import {useWidgetPresentation} from '../dashboard/WidgetPresentationContext';
import {BarRaceHeading,useBarRacePlayback} from '../charts/BarRaceHeading';
import SelectField from '../SelectField';
import racing from '../charts/RaceChart.module.css';
import '../landkreis/district-race.css';

const flags:Record<string,string>={DEU:'de',FRA:'fr',GBR:'gb',USA:'us',CHN:'cn',IND:'in',JPN:'jp',KOR:'kr',BRA:'br',CAN:'ca'};
const prepare=(source:typeof data)=>({
 history:source.history,last:source.history.at(-1)!,
 maximum:Math.max(...source.history.flatMap(frame=>frame.rows.map(row=>row.segments.reduce((a,b)=>a+b,0)))),
 rows:source.countries.map(country=>({...country,flagSrc:`/flags/${flags[country.id]}.svg`,value:source.history.at(-1)!.rows.find(row=>row.id===country.id)!.value})),
});
const datasets={share:prepare(data),'per-capita':prepare(perCapitaData)};
const formatShare=(value:number)=>value.toLocaleString('de-DE',{maximumFractionDigits:1});
const formatPerCapita=(value:number)=>value.toLocaleString('de-DE',{maximumFractionDigits:0});

/** The municipal racing engine owns the clock, ranking and row transitions. */
export default function CountryElectricityMixRaceWidget({onsite=true,metric:initialMetric='share'}:{onsite?:boolean;metric?:'share'|'per-capita'}) {
 const [metric,setMetric]=useState(initialMetric);
 const perCapita=metric==='per-capita';
 const {history,last,rows,maximum}=datasets[metric];
 const format=perCapita?formatPerCapita:formatShare;
 const prefix='Strommix';
 const presentation=useWidgetPresentation();
 const autoplay=presentation.autoplay??true;
 const stage=useRef<HTMLDivElement>(null),clock=useRef<HTMLSpanElement>(null);
 const [ready,setReady]=useState(false);
 const playback=useBarRacePlayback(stage,autoplay);
 useEffect(()=>{
  const node=stage.current;
  if(!ready||!node||!clock.current||!window.solarDistrictRace)return;
  let active=true;
  playback.reset();
  void window.solarDistrictRace({stage:node,clockHost:clock.current,rows,history,
   label:perCapita?'Stromerzeugung je Einwohner in zehn Ländern, sortiert nach erneuerbarer Erzeugung':'Strommix in zehn ausgewählten Ländern, sortiert nach Erneuerbaren-Anteil',format,stacked:true,stackMaximum:perCapita?maximum:100,unit:()=>perCapita?'kWh':'%',
   animate:autoplay,current:()=>active,skip:()=>false,onProgress:playback.onProgress});
  return()=>{active=false;node.replaceChildren();};
 },[ready,autoplay,metric,history,rows,maximum,perCapita,format,playback.reset,playback.onProgress]);
 return <>
  <Script src="/gemeinde/landkreis-rennen.js" onReady={()=>setReady(true)}/>
  <ExportableWidgetFrame widget={perCapita?WIDGETS.countryElectricityPerCapitaRace:WIDGETS.countryElectricityMixRace} place="" stand={String(last.year)} filename={perCapita?"strommix-laender-pro-kopf":"strommix-laender-racing"}
   title={`${prefix}: Erneuerbare, Atomkraft und Sonstige`} kind="time-series" data-story-scheme={presentation.theme==='hero'?'highlight':presentation.theme??'dark'} className={`${racing.racingFrame} country-mix-race-widget`}
   titleContent={<span className={racing.titleText}>{prefix}: <span className={racing.titleSeries}>Erneuerbare<span className={racing.titleSeriesMark} style={{background:'var(--widget-accent)'}}/></span>, <span className={racing.titleSeries}>Atomkraft<span className={racing.titleSeriesMark} style={{background:'var(--widget-ink)'}}/></span> und <span className={racing.titleSeries}>Sonstige<span className={racing.titleSeriesMark} style={{background:'var(--race-other-color)'}}/></span></span>}
   exportDescription={perCapita ? "Stromerzeugung je Einwohner" : "Anteil an der Stromerzeugung"} exportUnit={perCapita ? "kWh je Einwohner" : "%"} subtitle={<SelectField ariaLabel="Darstellung" size="sm" ton="wert" maxWidth={260} value={metric} onChange={event=>setMetric(event.target.value as 'share'|'per-capita')}><option value="share">Anteil an der Stromerzeugung</option><option value="per-capita">Stromerzeugung je Einwohner</option></SelectField>}
   headingMeta={<BarRaceHeading clock={clock} year={history[0].year} playback={playback}/>}
   help={<p>{perCapita?"Stromerzeugung im jeweiligen Jahr geteilt durch die Einwohnerzahl desselben Jahres. Alle Länder und Jahre nutzen dieselbe Skala. Erzeugung, nicht Verbrauch; Stromhandel ist nicht eingerechnet.":"Jeder Balken entspricht 100 % der Stromerzeugung im Land."} Erneuerbare umfassen Wind, Solar, Wasserkraft, Bioenergie und sonstige erneuerbare Energien. Zahlen rechts: Erneuerbare / Atomkraft. Sortiert nach {perCapita?"erneuerbarer Erzeugung je Einwohner":"Erneuerbaren-Anteil"} innerhalb dieser festen Länderauswahl, kein weltweites Top-10-Ranking. Die Bewegung verbindet Jahreswerte. Quellen: Ember{perCapita?" und Weltbank":""}, CC BY 4.0.</p>}
   sourceVisible={!onsite} exportNote={`${perCapita?"Inländische Stromerzeugung in kWh je Einwohner und Jahr; jährliche Einwohnerzahlen der Weltbank.":"Anteile an der inländischen Stromerzeugung."} Feste Auswahl von zehn Ländern, keine weltweite Top 10. Zahlen: Erneuerbare / Atomkraft.`}
   restartAction={false}>
   <div ref={stage} className="district-race-plot" data-chart-animation="race" data-highlight="DEU"/>

  </ExportableWidgetFrame>
 </>;
}
