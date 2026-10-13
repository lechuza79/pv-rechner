'use client';
import {useEffect,useRef,useState} from 'react';
import {WidgetIconButton} from '../dashboard/WidgetControls';
import {IconPlay,IconPause,IconRefresh,IconArrowLeft,IconArrowRight} from '../Icons';
import './chart-time-playback.css';
import {ChartTimeRange} from './ChartTimeRange';
/** Plays existing observations only; dragging pauses and reaching the end restores live following. */
export function ChartTimePlayback({timestamps,value,onChange,autoPlay=false,hideLabels=false}:{timestamps:string[];value:string|null;onChange:(timestamp:string|null)=>void;hideLabels?:boolean;autoPlay?:boolean}){
 const [playing,setPlaying]=useState(false);
 const selected=value===null?-1:timestamps.indexOf(value);
 const index=selected<0?timestamps.length-1:selected;
 const last=timestamps.length-1;
 const started=useRef(false);
 const controlsRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!autoPlay||started.current||last<1)return;
  const target=controlsRef.current?.closest('.sc-widget')?.querySelector('.sc-radar')??controlsRef.current;
  if(!target)return;
  let visible=false;
  const start=()=>{
   if(!visible||document.hidden||started.current||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
   started.current=true;onChange(timestamps[0]);setPlaying(true);
  };
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting&&entry.intersectionRatio>=.35;start();},{threshold:[0,.35]});
  observer.observe(target);document.addEventListener('visibilitychange',start);
  return()=>{observer.disconnect();document.removeEventListener('visibilitychange',start);};
 },[autoPlay,last,timestamps,onChange]);
 const hourStep=(direction:number)=>{
  setPlaying(false);
  const target=Date.parse(timestamps[index])+direction*3600000;
  const next=direction<0?timestamps.findLastIndex(ts=>Date.parse(ts)<=target):timestamps.findIndex(ts=>Date.parse(ts)>=target);
  const targetIndex=next<0?(direction<0?0:last):next;
  onChange(targetIndex===last?null:timestamps[targetIndex]);
 };
 useEffect(()=>{
  if(!playing)return;
  if(index>=last){setPlaying(false);return;}
  const timer=setTimeout(()=>{if(!document.hidden)onChange(index+1===last?null:timestamps[index+1]);else setPlaying(false);},240);
  return ()=>clearTimeout(timer);
 },[playing,index,last,timestamps,onChange]);
 const format=(ts:string)=>new Date(ts).toLocaleString('de-DE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'})+' Uhr';
 if(last<1)return null;
 return <div ref={controlsRef} className="sc-time-playback" data-sc-export-ignore="">
 <div className="sc-time-playback-controls">
 <WidgetIconButton label={playing?'Tagesverlauf pausieren':index===last?'Tagesverlauf wiederholen':'Tagesverlauf fortsetzen'} onClick={()=>{if(playing)setPlaying(false);else{if(index===last)onChange(timestamps[0]);setPlaying(true);}}}>{playing?<IconPause size={16}/>:index===last?<IconRefresh size={16}/>:<IconPlay size={16}/>}</WidgetIconButton>
 <WidgetIconButton label="Eine Stunde zurück" disabled={index===0} onClick={()=>hourStep(-1)}><IconArrowLeft size={16}/></WidgetIconButton>
 <ChartTimeRange min={0} max={last} step={1} value={index} aria-label="Zeitpunkt im Tagesverlauf" aria-valuetext={format(timestamps[index])} onChange={e=>{setPlaying(false);onChange(Number(e.target.value)===last?null:timestamps[Number(e.target.value)]);}}/>
 <WidgetIconButton label="Eine Stunde vor" disabled={index===last} onClick={()=>hourStep(1)}><IconArrowRight size={16}/></WidgetIconButton>
 </div>
 <div className="sc-time-playback-labels" hidden={hideLabels}><span>Letzte 24 Stunden</span><time dateTime={timestamps[index]}>{format(timestamps[index])}</time></div>
 </div>;
}
