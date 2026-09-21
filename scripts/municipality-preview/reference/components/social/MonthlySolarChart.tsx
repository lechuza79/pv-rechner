'use client';
import {IconChevronLeft,IconChevronRight,IconRefresh,IconPlay,IconPause} from '../Icons';
import {useEffect,useId,useState} from 'react';
import type {SolarMonth} from '../../lib/story-monthly-solar';
import {formatStoryDate} from '../../lib/story-format';
import styles from './MonthlySolarChart.module.css';
export function MonthlySolarChart({data,compact=false}:{data:SolarMonth;compact?:boolean}){
 const gradientId=useId();
 const [selected,setSelected]=useState(data.peakDay);
 const [focused,setFocused]=useState(false);
 const [hovered,setHovered]=useState<string|null>(null);
 const [playing,setPlaying]=useState(false);
 const [frame,setFrame]=useState<number|null>(null);
 const displayDate=focused?selected:hovered;
 const active=data.days.find(d=>d.date===displayDate)??data.days[0];
 const hasActive=displayDate!==null;
 const chooseDay=(date:string)=>{setPlaying(false);setFrame(null);setHovered(null);setSelected(date);setFocused(true);};
 const clearDay=()=>{setPlaying(false);setFrame(null);setHovered(null);setFocused(false);};
 const shiftDay=(direction:number)=>{if(!focused){chooseDay(data.days[0].date);return;}const index=data.days.findIndex(day=>day.date===selected);chooseDay(data.days[(index+direction+data.days.length)%data.days.length].date);};
 useEffect(()=>{
  if(!playing||frame===null)return;
  const timer=window.setTimeout(()=>{
   if(frame>=data.days.length-1){setPlaying(false);setFrame(null);setFocused(false);return;}
   setFrame(frame+1);setSelected(data.days[frame+1].date);
  },650);
  return ()=>window.clearTimeout(timer);
 },[playing,frame,data.days]);
 const togglePlayback=()=>{
  if(playing){setPlaying(false);return;}
  const nextFrame=frame??0;
  setHovered(null);setFrame(nextFrame);setSelected(data.days[nextFrame].date);setFocused(true);setPlaying(true);
 };
 const max=Math.ceil(data.peakMw/10)*10;
 const point=(hour:number,value:number)=>{const angle=hour/24*Math.PI*2-Math.PI/2,r=90+value/max*150;return [280+Math.cos(angle)*r,280+Math.sin(angle)*r];};
 const path=(values:number[])=>{
  const points=values.map((value,i)=>point(i+.5,value));
  const coordinate=(p:number[])=>`${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  // Round the geometry itself, not only the stroke join. Keep rounding local
  // to each sample so the hourly profile cannot gain spline overshoots.
  const corners=points.map((current,i)=>{
   const previous=points[(i+points.length-1)%points.length];
   const next=points[(i+1)%points.length];
   const toward=(neighbor:number[])=>{
    const distance=Math.hypot(neighbor[0]-current[0],neighbor[1]-current[1]);
    const fraction=distance===0?0:Math.min(2/distance,.25);
    return current.map((value,axis)=>value+(neighbor[axis]-value)*fraction);
   };
   return {current,entry:toward(previous),exit:toward(next)};
  });
  return corners.map((corner,i)=>`${i?'L':'M'}${coordinate(corner.entry)} Q${coordinate(corner.current)} ${coordinate(corner.exit)}`).join(' ')+' Z';
 };
 return <div className={styles.chart}>
 {!compact&&<header><h2>So verlief der Solar-{new Intl.DateTimeFormat('de-DE',{month:'long',timeZone:'UTC'}).format(new Date(data.month+'-15T12:00:00Z'))} in {data.town??'Trier'}</h2><p>{formatStoryDate(data.month)} · Modellrechnung · Stand {formatStoryDate(data.sourceDate)}</p></header>}
 <svg viewBox="0 0 560 560" role={compact?"img":"group"} aria-label={`Solarleistung in ${data.town??'Trier'}, ${formatStoryDate(data.month)}. ${data.days.length} Tageslinien, 24 Stunden. Modellierter Monatsertrag ${(data.totalMwh/1000).toFixed(2)} GWh.`}>
 <defs><radialGradient id={gradientId} gradientUnits="userSpaceOnUse" cx="280" cy="280" r="240"><stop offset="37.5%" stopColor={hasActive?'var(--atlas-text)':'var(--atlas-action)'} stopOpacity={hasActive?.06:.12}/><stop offset="100%" stopColor={hasActive?'var(--atlas-text)':'var(--atlas-action)'} stopOpacity={hasActive?.3:.75}/></radialGradient></defs>
 {[0,max/3,max*2/3,max].map((value,i)=><g key={i}><circle cx="280" cy="280" r={90+value/max*150} fill="none" stroke="var(--atlas-text)" strokeOpacity={i===0?.22:.1} strokeDasharray={i%2===0?'2 6':undefined}/>{!compact&&i===2&&<g transform={`translate(280,${280-90-value/max*150})`}><rect x="-22" y="-15" width="44" height="40" rx="2" fill="var(--atlas-card)"/><text textAnchor="middle" dominantBaseline="middle" className={styles.scale}><tspan x="0" y="-3">{Math.round(value)}</tspan><tspan x="0" y="15">MW</tspan></text></g>}</g>)}
 {[0,6,12,18].map(hour=>{const a=hour/24*Math.PI*2-Math.PI/2;return <text key={hour} x={280+Math.cos(a)*260} y={280+Math.sin(a)*260+5} textAnchor="middle" className={styles.hour}>{String(hour).padStart(2,'0')}{!compact&&hour===0?' Uhr':''}</text>;})}
 {data.days.map((day,index)=>{
  const isActive=hasActive&&day.date===displayDate;
  const hidden=frame!==null&&index>frame;
  return <g key={day.date} opacity={hidden?0:1} className={styles.dayLine}>
   <path d={path(day.mw)} fill="none" stroke={`url(#${gradientId})`} strokeOpacity={playing&&index===frame?0:1} strokeWidth="1" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/>
   <path d={path(day.mw)} pathLength="1" className={`${styles.activeLine} ${playing&&index===frame?styles.drawing:''}`} fill="none" stroke="var(--atlas-action)" strokeOpacity={isActive?1:0} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/>
   {!compact&&!hidden&&!playing&&<path d={path(day.mw)} fill="none" stroke="transparent" strokeWidth="10" className={styles.hitLine} onPointerEnter={()=>{if(!focused&&!playing)setHovered(day.date);}} onPointerLeave={()=>setHovered(null)} onClick={()=>chooseDay(day.date)}><title>{formatStoryDate(day.date)}: {Math.round(day.mwh)} MWh</title></path>}
  </g>;
 })}
 <text x="280" y="275" textAnchor="middle" className={styles.total}>{(data.totalMwh/1000).toLocaleString('de-DE',{maximumFractionDigits:1})}</text>
 <text x="280" y="300" textAnchor="middle" className={styles.unit}>GWh</text>
 </svg>
 {!compact&&<><div className={styles.legend}><div className={styles.dateNavigation}>
 <div className={styles.transport}>
 <button type="button" aria-label="Vorheriger Tag" onClick={()=>shiftDay(-1)}><IconChevronLeft size={12}/></button>
 <div className={styles.dateSlot}>{hasActive?<label className={styles.dateField}><span className={styles.dateValue}><span>{formatStoryDate(active.date)}</span><span className={styles.dayYield}>{Math.round(active.mwh).toLocaleString('de-DE')} <small>MWh</small></span></span><select aria-label="Tag auswählen" value={displayDate??selected} onChange={event=>chooseDay(event.target.value)}>{data.days.map(day=><option key={day.date} value={day.date}>{formatStoryDate(day.date)}</option>)}</select></label>:<button type="button" className={styles.bestDay} onClick={()=>chooseDay(data.peakDay)}>Bester Tag</button>}</div>
 <button type="button" aria-label="Nächster Tag" onClick={()=>shiftDay(1)}><IconChevronRight size={12}/></button>
 </div>
 <div className={styles.playback}><button className={styles.playButton} type="button" aria-label={playing?"Wiedergabe pausieren":"Monat abspielen"} aria-pressed={playing} onClick={togglePlayback}>{playing?<IconPause size={14}/>:<IconPlay size={14}/>}<span>{playing?'Pause':'Abspielen'}</span></button><button type="button" aria-label="Zurücksetzen und Tagesauswahl aufheben" style={{visibility:hasActive||frame!==null?'visible':'hidden'}} onClick={clearDay}><IconRefresh size={14}/></button></div> </div></div><footer>Quelle: <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noreferrer">Open-Meteo · ERA5</a> und Marktstammdatenregister</footer></>}
 </div>;
}
