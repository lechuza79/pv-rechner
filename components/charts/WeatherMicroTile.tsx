'use client';
import type {ComponentProps} from 'react';
import {SolarMicroRadial,type SolarMicroPoint} from './MonthlySolarRadial';
import {WindMicroCompass} from './WindMicroCompass';
import {powerDisplay} from '../../lib/microchart-power';
import styles from './WeatherMicroTile.module.css';

type Props = {place?:string;validAt?:string;layout?:'horizontal'|'stacked'|'separate'} & (
 | {kind:'solar'; label?:string; chart:ComponentProps<typeof SolarMicroRadial>}
 | {kind:'wind'; label?:string; chart:ComponentProps<typeof WindMicroCompass>;day?:SolarMicroPoint[]|null});
const timeLabel=(time?:string)=>time&&Number.isFinite(Date.parse(time))?new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit'}).format(new Date(time))+' Uhr':'Zeitpunkt nicht verfügbar';

/** Complete tile shared by the gallery and map consumers. */
export function WeatherMicroTile(props:Props){
 const time=props.validAt??(props.kind==='solar'?props.chart.currentTime:undefined);
 const value=props.kind==='solar'?props.chart.points?.find(p=>p.time===props.chart.currentTime)?.value:props.chart.speedMs;
 const power=powerDisplay(value);
 const unit=props.kind==='solar'?power.unit:'m/s';
 const direction=props.kind==='wind'&&props.chart.directionDeg!=null?['N','NO','O','SO','S','SW','W','NW'][Math.round(((props.chart.directionDeg%360+360)%360)/45)%8]:null;
 // Power samples carry their own model timestamp.
 const dayCurrent=props.kind==='wind'?props.day?.filter(p=>Date.parse(p.time)<=Date.parse(time??'')).at(-1):undefined;
 const dayPoints=props.kind==='wind'?props.day:null;
 const dayPower=powerDisplay(dayCurrent?.value);
 const header=(title:string,at?:string)=><header className={styles.header}><h2 className={styles.label}>{title}</h2><time className={styles.detail} dateTime={at}>{timeLabel(at)}</time></header>;
 return <article className={styles.tile} data-layout={props.layout??'separate'} data-combined={props.kind==='wind'}>
  <section className={styles.panel}>
   {header(props.label??(props.kind==='solar'?'Tagesverlauf':'Windstärke'),time)}
   <div className={styles.row}>
    <div className={styles.chart}>{props.kind==='solar'?<SolarMicroRadial {...props.chart} size={80} showValue={false}/>:<WindMicroCompass {...props.chart} size={80} showValue={false}/>}</div>
    <div className={styles.info}>
     <span className={styles.detail}>{props.kind==='solar'?'Modellierte Leistung':'Aktuell'}</span>
     <div className={styles.value}>{value==null?'–':(props.kind==='solar'?power.value!:value).toLocaleString('de-DE',{maximumFractionDigits:props.kind==='wind'?2:1})} <small>{unit}</small></div>
     <span className={styles.detail}>{props.kind==='solar'?props.place??'Solar':value===0?'Windstille':direction?`aus ${direction}`:'Richtung fehlt'}</span>
    </div>
   </div>
  </section>
  {props.kind==='wind'&&<section className={styles.panel}>
   {header('Tagesverlauf',dayCurrent?.time)}
   <div className={styles.row}>
    <div className={styles.chart}><SolarMicroRadial kind="wind" power points={dayPoints??null} currentTime={dayCurrent?.time} size={80} showValue={false}/></div>
    <div className={styles.info}><span className={styles.detail}>Modellierte Leistung</span><div className={styles.value}>{dayCurrent?dayPower.value!.toLocaleString('de-DE',{maximumFractionDigits:1}):'–'} <small>{dayPower.unit}</small></div><span className={styles.detail}>{dayCurrent?props.place??'Wind':'Höhenwind fehlt'}</span></div>
   </div>
  </section>}
 </article>;
}
