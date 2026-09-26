'use client';
import SelectField from '../SelectField';
import {storyWeatherAttribution} from '../../lib/story-weather-attribution';
import {IconChevronLeft,IconChevronRight,IconRefresh,IconPlay,IconPause} from '../Icons';
import {useEffect,useState} from 'react';
import type {SolarMonth} from '../../lib/story-monthly-solar';
import {formatStoryDate} from '../../lib/story-format';
import {MonthlySolarRadial} from '../charts/MonthlySolarRadial';
import styles from './MonthlySolarChart.module.css';
export function MonthlySolarChart({data,compact=false,autoPlay=false,ohneBedienung=false}:{data:SolarMonth;compact?:boolean;autoPlay?:boolean;
 /** Ohne Tagesauswahl, Abspiel-Knöpfe und Quellenzeile — für die geöffnete
  *  Geschichte: Das bedienbare Widget steht auf derselben Seite weiter unten,
  *  und die Quelle steht im Text darunter (Betreiber, 23.09.2026). */
 ohneBedienung?:boolean}){
 const [selected,setSelected]=useState(data.peakDay);
 const [focused,setFocused]=useState(false);
 const [hovered,setHovered]=useState<string|null>(null);
 const [playing,setPlaying]=useState(false);
 const [frame,setFrame]=useState<number|null>(null);
 const firstDate=data.days[0]?.date;
 // Start only when visibility or the displayed month changes. Manual pause,
 // reset and day selection must not be undone by ordinary parent renders.
 useEffect(()=>{
  if(!autoPlay||!firstDate){setPlaying(false);return;}
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(motion.matches){setPlaying(false);return;}
  setHovered(null);setFrame(0);setSelected(firstDate);setFocused(true);setPlaying(true);
  const stopForReducedMotion=()=>{if(motion.matches)setPlaying(false);};
  motion.addEventListener('change',stopForReducedMotion);
  return()=>motion.removeEventListener('change',stopForReducedMotion);
 },[autoPlay,firstDate]);
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
 return <div data-solar-month-preview={compact?true:undefined} className={`${styles.chart} ${compact?styles.compact:''}`}>
 {!compact&&<header><h2>So verlief der Solar-{new Intl.DateTimeFormat('de-DE',{month:'long',timeZone:'UTC'}).format(new Date(data.month+'-15T12:00:00Z'))} in {data.town??'Trier'}</h2><p>{formatStoryDate(data.month)} · Modellrechnung · Stand {formatStoryDate(data.sourceDate)}</p></header>}
 <MonthlySolarRadial data={data} layout="story" compact={compact} displayDate={displayDate} frame={frame} playing={playing} focused={focused} onHover={setHovered} onChoose={chooseDay} classes={styles}/>
 {!compact&&!ohneBedienung&&<><div className={styles.legend}><div className={styles.dateNavigation}>
 <div className={styles.transport}>
 <button type="button" aria-label="Vorheriger Tag" onClick={()=>shiftDay(-1)}><IconChevronLeft size={12}/></button>
 <div className={styles.dateSlot}>{hasActive?<label className={styles.dateField}><span className={styles.dateValue}><span>{formatStoryDate(active.date)}</span><span className={styles.dayYield}>{Math.round(active.mwh).toLocaleString('de-DE')} <small>MWh</small></span></span><SelectField size="sm" ariaLabel="Tag auswählen" value={displayDate??selected} onChange={event=>chooseDay(event.target.value)}>{data.days.map(day=><option key={day.date} value={day.date}>{formatStoryDate(day.date)}</option>)}</SelectField></label>:<button type="button" className={styles.bestDay} onClick={()=>chooseDay(data.peakDay)}>Bester Tag</button>}</div>
 <button type="button" aria-label="Nächster Tag" onClick={()=>shiftDay(1)}><IconChevronRight size={12}/></button>
 </div>
 <div className={styles.playback}><button className={styles.playButton} type="button" aria-label={playing?"Wiedergabe pausieren":"Monat abspielen"} aria-pressed={playing} onClick={togglePlayback}>{playing?<IconPause size={14}/>:<IconPlay size={14}/>}<span>{playing?'Pause':'Abspielen'}</span></button><button type="button" aria-label="Zurücksetzen und Tagesauswahl aufheben" style={{visibility:hasActive||frame!==null?'visible':'hidden'}} onClick={clearDay}><IconRefresh size={14}/></button></div> </div></div><footer>Datenbasis: <a href={storyWeatherAttribution(data.sourceUrl).url} target="_blank" rel="noreferrer">{storyWeatherAttribution(data.sourceUrl).label}</a> und Marktstammdatenregister</footer></>}
 </div>;
}
