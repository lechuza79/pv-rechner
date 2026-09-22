import {InstallationCountChart} from './InstallationCountChart';
import React,{useEffect,useRef,useState} from 'react';
import {formatStoryDate} from '../../lib/story-format';
import {SocialKarte,DonutTeil,SaeulenTeil,VerlaufsTeil} from './SocialKarte';
import type {PostBild} from '../../lib/social-posts';
import {brandAssets} from '../../lib/brand-assets';
import styles from './ApprovedStoryVisual.module.css';

/** Display-only abbreviation; chart geometry always uses the original values. */
export function compactStoryNumber(value:number):string {
 const scale=Math.abs(value)>=1e6?1e6:Math.abs(value)>=1e3?1e3:1;
 return Math.round(value/scale).toLocaleString('de-DE')+(scale===1e6?' M':scale===1e3?' k':'');
}

/** Keep magnitude suffixes and units subordinate to the numeric value. */
export function StoryNumber({text,unit}:{text:string;unit?:string}) {
 const match=text.match(/^(.*?)(?: ([kM]))?$/)!;
 return <>{match[1]}{match[2]&&<small className={styles.numberSuffix}> {match[2]}</small>}{unit&&<small className={styles.numberUnit}> {unit}</small>}</>;
}

function OriginalChart({bild,compact}:{bild:PostBild;compact:boolean}) {
 const ref=useRef<HTMLDivElement>(null),[width,setWidth]=useState(440);
 useEffect(()=>{if(!ref.current)return;const observer=new ResizeObserver(entries=>setWidth(entries[0].contentRect.width));observer.observe(ref.current);return()=>observer.disconnect();},[]);
 const scale=width/820;
 return <div ref={ref} className={styles.originalChart} style={{minHeight:compact?220:300}}>{bild.art==='verlauf'?<VerlaufsTeil bild={bild} skala={width/950} palette="seite" stufe="voll" responsive/>:bild.art==='donut'?<DonutTeil bild={bild} max={bild.ganzes??100} skala={scale} palette="seite" stufe="voll"/>:<SaeulenTeil bild={bild} skala={scale} palette="seite" stufe="quadrat" growthToRight comparisonFlag/>}</div>;
}

function MonthlyAdditionsVisual({bild,compact}:{bild:PostBild;compact:boolean}){
 const [metric,setMetric]=useState(0);
 return <div className={styles.additions}>{!compact&&<div className={styles.metricButtons} role="group" aria-label="Zubau anzeigen">{['Anlagen','Leistung'].map((label,i)=><button key={label} type="button" aria-pressed={metric===i} onClick={()=>setMetric(i)}>{label}</button>)}</div>}<OriginalChart bild={{...bild,serien:[bild.serien[compact?0:metric]]}} compact={compact}/></div>;
}
export function ApprovedStoryVisual({bild,compact=false,date,provisional=false}:{bild:PostBild;compact?:boolean;date?:string;provisional?:boolean}) {
 const moneyRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const box=moneyRef.current, value=box?.querySelector('strong');
  if(!box||!value)return;
  const measure=()=>{box.style.setProperty('--value-right',`${value.offsetLeft+value.offsetWidth}px`);box.style.setProperty('--value-top',`${value.offsetTop}px`);box.style.setProperty('--value-bottom',`${value.offsetTop+value.offsetHeight}px`);};
  const observer=new ResizeObserver(measure);observer.observe(box);observer.observe(value);measure();return()=>observer.disconnect();
 },[bild]);
 const moveMoney=(event:React.PointerEvent<HTMLDivElement>)=>{
  if(event.pointerType==='touch'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const box=event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--money-x',`${(event.clientX-box.left)/box.width*2-1}`);
  event.currentTarget.style.setProperty('--money-y',`${(event.clientY-box.top)/box.height*2-1}`);
 };
 const resetMoney=(event:React.PointerEvent<HTMLDivElement>)=>{event.currentTarget.style.setProperty('--money-x','0');event.currentTarget.style.setProperty('--money-y','0');};
 const total=bild.serien.reduce((sum,s)=>sum+s.wert,0);
 const tones=[100,60,28,12].map(value=>`color-mix(in srgb, var(--atlas-action) ${value}%, var(--atlas-card))`);
 const format=(value:number)=>bild.art==='donut'?value.toLocaleString('de-DE',{maximumFractionDigits:1}):compactStoryNumber(value);
 const totalScale=bild.serien[0]?.einheit==='kWp'?(total>=1e6?1e6:total>=1e3?1e3:1):1;
 const totalUnit=bild.serien[0]?.einheit==='kWp'?(totalScale===1e6?'GWp':totalScale===1e3?'MWp':'kWp'):bild.serien[0]?.einheit;
 let offset=0;
 return <div className={`${styles.visual} ${compact?styles.compact:''}`} data-approved-template={bild.art}>
 {!compact&&<header className={styles.header}><h2>{bild.countComparison?bild.aussage.split(/(\d+(?:[.,]\d+)?\s*%)/g).map((part,index)=>/%$/.test(part)?<span key={index} className={styles.headlineValue}>{part}</span>:part):bild.aussage}</h2>{date&&<p>Stand {formatStoryDate(date)}{provisional?" · vorläufig":""}{bild.art==='kennzahl'?" · Modellrechnung":""}</p>}</header>}
 {bild.art==='verlauf'?<MonthlyAdditionsVisual bild={bild} compact={compact}/>:bild.art==='kennzahl'?<div ref={moneyRef} className={styles.singleValue} onPointerMove={moveMoney} onPointerLeave={resetMoney}>{bild.serien[0]?.label==='Einspeisevergütung'?<><img className={styles.valueIllustration} src="/brand/feed-in-v4-back.svg" alt="" aria-hidden="true"/><img className={`${styles.valueIllustration} ${styles.valueCoins}`} src="/brand/feed-in-v4-coins-cropped.svg" alt="" aria-hidden="true"/></>:<div aria-hidden="true" className={styles.valueSplash} style={{maskImage:`url(${brandAssets.splashMask})`,WebkitMaskImage:`url(${brandAssets.splashMask})`}}/>}<strong>{(total/(total>=1e6?1e6:total>=1e3?1e3:1)).toLocaleString('de-DE',{maximumFractionDigits:1})}</strong><span>{total>=1e6?'Mio. €':total>=1e3?'Tsd. €':'€'}</span></div>:bild.countComparison?<InstallationCountChart counts={bild.countComparison} powerShare={bild.serien[1].wert} compact={compact}/>: (bild.art==='saeule'||bild.art==='donut')?<OriginalChart bild={bild} compact={compact}/>:bild.art==='anteilsdonut'?<>
 <div className={styles.ring}><svg viewBox="0 0 220 220" role="img" aria-label={bild.serien.map(s=>`${s.label}: ${s.wert} ${s.einheit}`).join(', ')}>
 {bild.serien.map((s,i)=>{const start=offset;const share=s.wert/total*100;offset+=share;return <circle key={s.label} cx="110" cy="110" r="85" fill="none" stroke={tones[i]} strokeWidth="30" pathLength="100" strokeDasharray={`${Math.max(0,share-.25)} ${100-Math.max(0,share-.25)}`} strokeDashoffset={-start} transform="rotate(-90 110 110)"/>})}
 </svg>{bild.art==='anteilsdonut'&&<div className={styles.center}><strong><StoryNumber text={(total/totalScale).toLocaleString('de-DE',{maximumFractionDigits:totalScale>1?1:0})}/></strong><span>{totalUnit}</span></div>}</div>
 {!compact&&<div className={styles.legend}>{bild.serien.map((s,i)=><div key={s.label}><i style={{background:tones[i]}}/><span>{s.label}</span><strong><StoryNumber text={format(s.wert)} unit={s.einheit}/></strong></div>)}</div>}
 {bild.art==='anteilsdonut'&&!compact&&<div className={styles.artwork} aria-hidden="true" style={{maskImage:`url(${brandAssets.splashMask})`,WebkitMaskImage:`url(${brandAssets.splashMask})`}}/>}
 </>:<SocialKarte bild={bild} skala={.5} palette="seite" branding={false} source={false}/>}
 </div>;
}
