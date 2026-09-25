"use client";

import {ortPhrase} from "../../lib/atlas-orte";
import {useEffect, useRef} from "react";
import InfoTooltip from "../InfoTooltip";
import {WidgetFrame} from "../dashboard/WidgetFrame";
import {dashboardDate} from "../../lib/dashboard/format";
import foundation from "../social/atlas-foundations.module.css";
import "../dashboard/dashboard.css";
import "./district-race.css";

type RaceRow = {id:string;name:string;href:string|null;value:number};
type RaceFrame = {year:number;rows:{id:string;value:number}[]};
declare global {
  interface Window {
    solarDistrictRace?: (options:{stage:HTMLElement;clockHost:HTMLElement;rows:RaceRow[];history:RaceFrame[];format:(value:number)=>string;animate:boolean;current:()=>boolean;skip:()=>boolean})=>Promise<void>;
  }
}

/** Shared widget chrome; the race engine owns only its plot and clock. */
export default function DistrictRaceWidget({name,stand,rows,history}:{name:string;stand:string;rows:RaceRow[];history:RaceFrame[]}) {
  const plot=useRef<HTMLDivElement>(null),clock=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    let active=true,started=false;
    const stage=plot.current;
    function start(){
      if(!active||started||!stage||!clock.current||!window.solarDistrictRace)return;
      started=true;
      void window.solarDistrictRace({stage,clockHost:clock.current,rows,history,
        format:value=>Math.round(value).toLocaleString("de-DE"),animate:true,current:()=>active,skip:()=>false});
    }
    window.addEventListener("district-race-ready",start);
    start();
    return ()=>{active=false;window.removeEventListener("district-race-ready",start);stage?.replaceChildren();};
  },[rows,history]);
  return <div className={`${foundation.foundation} sc-dashboard district-race-widget`} data-story-scheme="light">
    <WidgetFrame title="Welche Gemeinde hat die meisten Solaranlagen?" kind="time-series"
      headingMeta={<span ref={clock}>{history[0]?.year}</span>}
      context={<>Wir vergleichen <InfoTooltip label={`${rows.length} Orte ${ortPhrase({name})}`} ariaLabel="Verglichene Orte">Alle Gemeinden im Landkreis, unabhängig von ihrer Einwohnerzahl.</InfoTooltip>. Berücksichtigt werden private und gewerbliche Anlagen einschließlich Freiflächen.</>}
      help={<p>Die zehn führenden Gemeinden im Zeitverlauf. Verglichen werden alle {rows.length} Orte {ortPhrase({name})}, unabhängig von ihrer Einwohnerzahl. Heutiger Anlagenbestand nach Inbetriebnahmejahr. Registerstand: {dashboardDate(stand)}.</p>}>
      <div className="district-race-artwork" aria-hidden="true">
        <div className="district-race-splashes"/>
        <div className="district-race-panels"/>
      </div>
      <div ref={plot} className="district-race-plot"/>
    </WidgetFrame>
  </div>;
}
