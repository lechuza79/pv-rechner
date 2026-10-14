"use client";

import {raceSegments,defaultRaceSettings,racePeriod,type RaceSettings} from "../../lib/race-settings";
import {formatRaceValue,raceValueUnit} from "../../lib/race-value-format";
import {ortPhrase} from "../../lib/atlas-orte";
import {useEffect, useRef, useState, type ReactNode} from "react";
import {useWidgetPresentation} from "../dashboard/WidgetPresentationContext";
import {ExportableWidgetFrame} from "../dashboard/ExportableWidgetFrame";
import {WIDGETS} from "../../lib/widget-registry";
import {dashboardDate} from "../../lib/dashboard/format";
import {BarRaceHeading,useBarRacePlayback} from "../charts/BarRaceHeading";
import racing from "../charts/RaceChart.module.css";
import foundation from "../social/atlas-foundations.module.css";
import "../dashboard/dashboard.css";
import "./district-race.css";

type RaceRow = {id:string;name:string;href:string|null;value:number;flagSrc?:string};
type RaceFrame = {year:number;rows:{id:string;value:number;segments?:number[]}[]};
declare global {
  interface Window {
    solarDistrictRace?: (options:{stage:HTMLElement;label?:string;clockHost:HTMLElement;rows:RaceRow[];history:RaceFrame[];format:(value:number,frameMaximum:number)=>string;unit?:(frameMaximum:number)=>string;animate:boolean;current:()=>boolean;skip:()=>boolean;stacked?:boolean;stackMaximum?:number;onProgress?:(progress:number)=>void})=>Promise<void>;
  }
}

/** Shared widget chrome; the race engine owns only its plot and clock. */
/** Wording per level; the district texts are the default. */
export type RaceWording = {title:string;members:string;leaders:string;unit:string};
export const DISTRICT_RACE_WORDING: RaceWording = {title:"Welche Gemeinde hat die meisten Solaranlagen?",members:"Alle Gemeinden im Landkreis",leaders:"Die zehn führenden Gemeinden",unit:"Orte"};

export type DistrictRaceWidgetProps = {regionId?:string;name:string;stand:string;rows:RaceRow[];history:RaceFrame[];wording?:RaceWording;settings?:RaceSettings;controls?:ReactNode;shareParams?:Record<string,string>;sharePath?:string};

export default function DistrictRaceWidget({regionId,name,stand,rows,history,wording=DISTRICT_RACE_WORDING,settings=defaultRaceSettings,controls,shareParams,sharePath}:DistrictRaceWidgetProps) {
  const autoplay=useWidgetPresentation().autoplay??true;
  const [stage,setStage]=useState<HTMLDivElement|null>(null);
  const clock=useRef<HTMLSpanElement>(null);
  const stageRef=useRef<HTMLDivElement|null>(null);
  stageRef.current=stage;
  const playback=useBarRacePlayback(stageRef,autoplay);
  useEffect(()=>{
    let active=true,started=false;
    function start(){
      if(!active||started||!stage||!clock.current||!window.solarDistrictRace)return;
      started=true;
      playback.reset();
      void window.solarDistrictRace({stage,label:`${Math.min(10,rows.length)} führende ${wording.unit} im Zeitverlauf`,clockHost:clock.current,rows,history,
        format:(value,max)=>formatRaceValue(value,settings.metric,max),unit:max=>raceValueUnit(settings.metric,max),animate:autoplay,current:()=>active,skip:()=>false,onProgress:playback.onProgress});
    }
    window.addEventListener("district-race-ready",start);
    start();
    return ()=>{active=false;window.removeEventListener("district-race-ready",start);stage?.replaceChildren();};
  },[rows,history,stage,wording.leaders,settings.metric,autoplay,playback.reset,playback.onProgress]);
  return <div className={`${foundation.foundation} sc-dashboard district-race-layout`} data-story-scheme="light">
    <ExportableWidgetFrame sharePath={sharePath} shareParams={shareParams} actions="primary" animated videoParams={regionId ? {widget:"regional-race",ags:regionId,period:racePeriod(settings)} : undefined} exportNote={null} widget={WIDGETS.regionalRace} place={name} exportUnit={settings.metric === "count" ? "Anlagen" : settings.metric === "kwp" ? "MWp" : "Wp je Einwohner"} stand={dashboardDate(stand)} filename={`solar-check-race-${name}`} className={`district-race-widget ${racing.racingFrame}`} data-story-scheme="light" title={wording.title} kind="time-series"
      subtitle={controls} exportDescription={controls?'':undefined} headingMeta={<BarRaceHeading clock={clock} year={history[0]?.year} playback={playback}/>} restartAction={false}
      context={<>Wir vergleichen {rows.length} {wording.unit} {ortPhrase({name})}. {raceSegments.find(item=>item.value===settings.segment)?.context}{settings.metric==='per-capita'&&' Je Einwohner, mit einheitlichem aktuellem Bevölkerungsstand.'}</>}>
      <div data-widget-artwork className="district-race-artwork" aria-hidden="true">
        <div className="district-race-splashes"/>
        <div className="district-race-panels"/>
      </div>
      <div ref={setStage} data-chart-animation="race" className="district-race-plot" data-highlight={settings.highlight} data-value-unit={settings.metric==='kwp'?'MWp':settings.metric==='per-capita'?'Wp':undefined}/>
    </ExportableWidgetFrame>
  </div>;
}
