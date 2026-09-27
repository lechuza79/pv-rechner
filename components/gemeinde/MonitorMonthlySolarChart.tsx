'use client';
import {useEffect,useState,useRef} from 'react';
import {IconChevronLeft,IconChevronRight,IconPause,IconPlay,IconRefresh} from '../Icons';
import type {SolarMonth} from '../../lib/story-monthly-solar';
import {MonthlySolarRadial} from '../charts/MonthlySolarRadial';
import {EXPORT_IGNORE_ATTR,EXPORT_ONLY_ATTR} from '../../lib/export-markers';
import {formatStoryDate} from '../../lib/story-format';
import {WidgetSetting} from '../dashboard/WidgetSetting';
import styles from './MonitorMonthlySolarChart.module.css';

function MonthlySolarProfile({data,months,onMonthChange,compact=false,autoPlay=false,paused=false,startDelayMs=0,onFinished,onTag}:{data:SolarMonth;months:SolarMonth[];onMonthChange:(value:string)=>void;compact?:boolean;autoPlay?:boolean;paused?:boolean;startDelayMs?:number;onFinished?:()=>void;onTag?:(datum:string|null)=>void}) {
 const [selected,setSelected]=useState(data.peakDay),[focused,setFocused]=useState(false),[hovered,setHovered]=useState<string|null>(null),[playing,setPlaying]=useState(false),[frame,setFrame]=useState<number|null>(null);
 const exportHost=useRef<HTMLDivElement>(null);
 const savedExport=useRef<{selected:string;focused:boolean;hovered:string|null;playing:boolean;frame:number|null}|null>(null);
 useEffect(()=>{
  const host=exportHost.current;if(!host)return;
  const control=(event:Event)=>{
   const command=(event as CustomEvent<{mode:string;progress?:number}>).detail;
   if(command.mode==='restore'){
    const saved=savedExport.current;if(!saved)return;
    setSelected(saved.selected);setFocused(saved.focused);setHovered(saved.hovered);setPlaying(saved.playing);setFrame(saved.frame);savedExport.current=null;
   }else{
    savedExport.current??={selected,focused,hovered,playing,frame};
    setPlaying(false);
    if(command.mode==='seek'){
     const progress=command.progress??0,index=Math.min(data.days.length-1,Math.floor(progress*data.days.length));
     setHovered(null);setSelected(data.days[index]?.date??selected);
     setFocused(progress<1);setFrame(progress<1?index:null);
    }
   }
  };
  host.addEventListener('chart-export-animation',control);
  return()=>host.removeEventListener('chart-export-animation',control);
 },[data.days,selected,focused,hovered,playing,frame]);
 const firstDate=data.days[0]?.date;
 // Der Lauf beginnt mit einer kurzen Ruhe: Ohne sie steht die Kachel im
 // Moment des Wechsels schon mitten in der Bewegung, und der Leser sieht den
 // Anfang nie (Betreiber, 23.09.2026). Meldet sich am Ende zurück, damit die
 // Kachel erst danach weiterschaltet.
 useEffect(()=>{if(!autoPlay||!firstDate){setPlaying(false);return;}const motion=window.matchMedia('(prefers-reduced-motion: reduce)');if(motion.matches){setPlaying(false);onFinished?.();return;}setHovered(null);setFrame(null);setSelected(firstDate);setFocused(true);const start=window.setTimeout(()=>{setFrame(0);setPlaying(true)},startDelayMs);const stop=()=>{if(motion.matches)setPlaying(false)};motion.addEventListener('change',stop);return()=>{window.clearTimeout(start);motion.removeEventListener('change',stop)}},[autoPlay,firstDate,startDelayMs,onFinished]);
 const displayDate=focused?selected:hovered,active=data.days.find(day=>day.date===displayDate)??data.days[0],hasActive=displayDate!==null;
 const gezeigterTag=hasActive?active:null;
 // Der Kopf der Kachel nennt den Tag, der gerade gezeichnet wird.
 useEffect(()=>{onTag?.(gezeigterTag?.date??null)},[gezeigterTag?.date,onTag]);
 const chooseDay=(date:string)=>{setPlaying(false);setFrame(null);setHovered(null);setSelected(date);setFocused(true)};
 const clearDay=()=>{setPlaying(false);setFrame(null);setHovered(null);setFocused(false)};
 useEffect(()=>{if(!playing||paused||frame===null)return;const timer=window.setTimeout(()=>{if(frame>=data.days.length-1){setPlaying(false);setFrame(null);setFocused(false);onFinished?.();return;}setFrame(frame+1);setSelected(data.days[frame+1].date)},650);return()=>window.clearTimeout(timer)},[playing,paused,frame,data.days,onFinished]);
 const togglePlayback=()=>{if(playing){setPlaying(false);return;}const nextFrame=frame??0;setHovered(null);setFrame(nextFrame);setSelected(data.days[nextFrame].date);setFocused(true);setPlaying(true)};
 const selectedIndex=data.days.findIndex(day=>day.date===selected);
 const shiftDay=(direction:number)=>{const index=selectedIndex>=0?selectedIndex:data.days.findIndex(day=>day.date===data.peakDay);const next=Math.max(0,Math.min(data.days.length-1,index+direction));if(data.days[next])chooseDay(data.days[next].date)};
 const controls=<div className={styles.settings} {...{[EXPORT_IGNORE_ATTR]:''}}><WidgetSetting hideLabel label="Monat" value={data.month} onChange={onMonthChange} stepper options={months.map(item=>({value:item.month,label:formatStoryDate(item.month)}))}/></div>;
 const footer=<div className={styles.footer} {...{[EXPORT_IGNORE_ATTR]:''}}><div className={styles.dayControls}><button type="button" aria-label="Vorheriger Tag" onClick={()=>shiftDay(-1)} disabled={selectedIndex<=0}><IconChevronLeft size={16}/></button><button type="button" className={styles.bestDay} data-selected={focused||undefined} onClick={()=>chooseDay(data.peakDay)}>{focused&&active?<><span>Bester Tag</span><small>{formatStoryDate(active.date)}</small></>:<span>Bester Tag</span>}</button><button type="button" aria-label="Nächster Tag" onClick={()=>shiftDay(1)} disabled={selectedIndex<0||selectedIndex>=data.days.length-1}><IconChevronRight size={16}/></button></div><div className={styles.transport}><button type="button" aria-label={playing?'Wiedergabe pausieren':'Monat abspielen'} aria-pressed={playing} onClick={togglePlayback}>{playing?<IconPause size={14}/>:<IconPlay size={14}/>}</button><button type="button" aria-label="Zurücksetzen" onClick={clearDay}><IconRefresh size={14}/></button></div></div>;
 return <div ref={exportHost} data-chart-animation="month" data-solar-month-preview={compact?true:undefined} className={`${styles.chart} ${compact?styles.compact:''}`}>{!compact&&<>{controls}<p className={styles.exportState} {...{[EXPORT_ONLY_ATTR]:'block'}} style={{display:'none'}}>{formatStoryDate(data.month)}{focused&&gezeigterTag?` · ${formatStoryDate(gezeigterTag.date)}`:''}</p></>}
  <MonthlySolarRadial data={data} layout="monitor" compact={compact} displayDate={displayDate} frame={frame} playing={playing} focused={focused} onHover={setHovered} onChoose={chooseDay} classes={styles}/>
  {!compact&&footer}
 </div>;
}

export function MonitorMonthlySolarChart({data,datasets=[data],compact=false,autoPlay=false,paused=false,startDelayMs=0,onFinished,onTag}:{data:SolarMonth;datasets?:SolarMonth[];compact?:boolean;autoPlay?:boolean;paused?:boolean;startDelayMs?:number;onFinished?:()=>void;onTag?:(datum:string|null)=>void}){
 const [month,setMonth]=useState(data.month);
 const selected=datasets.find(item=>item.month===month)??data;
 return <MonthlySolarProfile key={selected.month} data={selected} months={datasets} onMonthChange={setMonth} compact={compact} autoPlay={autoPlay} paused={paused} startDelayMs={startDelayMs} onFinished={onFinished} onTag={onTag}/>;
}
export default MonitorMonthlySolarChart;
