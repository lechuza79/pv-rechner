"use client";

import {ortPhrase} from "../../lib/atlas-orte";
import {useEffect, useRef, useState} from "react";
import InfoTooltip from "../InfoTooltip";
import {ExportableWidgetFrame} from "../dashboard/ExportableWidgetFrame";
import {WIDGETS} from "../../lib/widget-registry";
import {dashboardDate} from "../../lib/dashboard/format";
import foundation from "../social/atlas-foundations.module.css";
import "../dashboard/dashboard.css";
import "./district-race.css";

type RaceRow = {id:string;name:string;href:string|null;value:number};
type RaceFrame = {year:number;rows:{id:string;value:number}[]};
declare global {
  interface Window {
    solarDistrictRace?: (options:{stage:HTMLElement;label?:string;clockHost:HTMLElement;rows:RaceRow[];history:RaceFrame[];format:(value:number)=>string;animate:boolean;current:()=>boolean;skip:()=>boolean})=>Promise<void>;
  }
}

/** Shared widget chrome; the race engine owns only its plot and clock. */
/** Wording per level; the district texts are the default. */
export type RaceWording = {title:string;members:string;leaders:string;unit:string};
export const DISTRICT_RACE_WORDING: RaceWording = {title:"Welche Gemeinde hat die meisten Solaranlagen?",members:"Alle Gemeinden im Landkreis",leaders:"Die zehn führenden Gemeinden",unit:"Orte"};

export default function DistrictRaceWidget({name,stand,rows,history,wording=DISTRICT_RACE_WORDING}:{name:string;stand:string;rows:RaceRow[];history:RaceFrame[];wording?:RaceWording}) {
  const [stage,setStage]=useState<HTMLDivElement|null>(null);
  const clock=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    let active=true,started=false;
    function start(){
      if(!active||started||!stage||!clock.current||!window.solarDistrictRace)return;
      started=true;
      void window.solarDistrictRace({stage,label:`${wording.leaders} im Zeitverlauf`,clockHost:clock.current,rows,history,
        format:value=>Math.round(value).toLocaleString("de-DE"),animate:true,current:()=>active,skip:()=>false});
    }
    window.addEventListener("district-race-ready",start);
    start();
    return ()=>{active=false;window.removeEventListener("district-race-ready",start);stage?.replaceChildren();};
  },[rows,history,stage,wording.leaders]);
  return <div className={`${foundation.foundation} sc-dashboard district-race-layout`} data-story-scheme="light">
    <ExportableWidgetFrame animated widget={WIDGETS.regionalRace} place={name} stand={dashboardDate(stand)} filename={`solar-check-race-${name}`} className="district-race-widget" data-story-scheme="light" title={wording.title} kind="time-series"
      headingMeta={<span ref={clock}>{history[0]?.year}</span>}
      context={<>Wir vergleichen <InfoTooltip label={`${rows.length} ${wording.unit} ${ortPhrase({name})}`} ariaLabel={`Verglichene ${wording.unit}`}>{wording.members}, unabhängig von ihrer Einwohnerzahl.</InfoTooltip>. Berücksichtigt werden private und gewerbliche Anlagen einschließlich Freiflächen.</>}
      help={<p>{wording.leaders} im Zeitverlauf. Verglichen werden alle {rows.length} {wording.unit} {ortPhrase({name})}, unabhängig von ihrer Einwohnerzahl. Heutiger Anlagenbestand nach Inbetriebnahmejahr. Registerstand: {dashboardDate(stand)}.</p>}>
      <div className="district-race-artwork" aria-hidden="true">
        <div className="district-race-splashes"/>
        <div className="district-race-panels"/>
      </div>
      <div ref={setStage} data-chart-animation="race" className="district-race-plot"/>
    </ExportableWidgetFrame>
  </div>;
}
