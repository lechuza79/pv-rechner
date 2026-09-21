import {InstallationCountChart} from './InstallationCountChart';
import React,{useEffect,useRef,useState} from 'react';
import {formatStoryDate} from '../../lib/story-format';
import {SocialKarte,DonutTeil,SaeulenTeil} from './SocialKarte';
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
 return <div ref={ref} className={styles.originalChart} style={{minHeight:compact?220:300}}>{bild.art==='donut'?<DonutTeil bild={bild} max={bild.ganzes??100} skala={scale} palette="seite" stufe="voll"/>:<SaeulenTeil bild={bild} skala={scale} palette="seite" stufe="quadrat" growthToRight comparisonFlag/>}</div>;
}

export function ApprovedStoryVisual({bild,compact=false,date,provisional=false}:{bild:PostBild;compact?:boolean;date?:string;provisional?:boolean}) {
 const total=bild.serien.reduce((sum,s)=>sum+s.wert,0);
 const tones=[100,60,28,12].map(value=>`color-mix(in srgb, var(--atlas-action) ${value}%, var(--atlas-card))`);
 const format=(value:number)=>bild.art==='donut'?value.toLocaleString('de-DE',{maximumFractionDigits:1}):compactStoryNumber(value);
 let offset=0;
 return <div className={`${styles.visual} ${compact?styles.compact:''}`} data-approved-template={bild.art}>
 {!compact&&<header className={styles.header}><h2>{bild.countComparison?bild.aussage.split(/(\d+(?:[.,]\d+)?\s*%)/g).map((part,index)=>/%$/.test(part)?<span key={index} className={styles.headlineValue}>{part}</span>:part):bild.aussage}</h2>{date&&<p>Stand {formatStoryDate(date)}{provisional?" · vorläufig":""}</p>}</header>}
 {bild.countComparison?<InstallationCountChart counts={bild.countComparison} powerShare={bild.serien[1].wert} compact={compact}/>: (bild.art==='saeule'||bild.art==='donut')?<OriginalChart bild={bild} compact={compact}/>:bild.art==='anteilsdonut'?<>
 <div className={styles.ring}><svg viewBox="0 0 220 220" role="img" aria-label={bild.serien.map(s=>`${s.label}: ${s.wert} ${s.einheit}`).join(', ')}>
 {bild.serien.map((s,i)=>{const start=offset;const share=s.wert/total*100;offset+=share;return <circle key={s.label} cx="110" cy="110" r="85" fill="none" stroke={tones[i]} strokeWidth="30" pathLength="100" strokeDasharray={`${Math.max(0,share-.25)} ${100-Math.max(0,share-.25)}`} strokeDashoffset={-start} transform="rotate(-90 110 110)"/>})}
 </svg>{bild.art==='anteilsdonut'&&<div className={styles.center}><strong><StoryNumber text={format(total)}/></strong><span>{bild.serien[0]?.einheit}<br/>installiert</span></div>}</div>
 {!compact&&<div className={styles.legend}>{bild.serien.map((s,i)=><div key={s.label}><i style={{background:tones[i]}}/><span>{s.label}</span><strong><StoryNumber text={format(s.wert)} unit={s.einheit}/></strong></div>)}</div>}
 {bild.art==='anteilsdonut'&&!compact&&<div className={styles.artwork} aria-hidden="true" style={{maskImage:`url(${brandAssets.splashMask})`,WebkitMaskImage:`url(${brandAssets.splashMask})`}}/>}
 </>:<SocialKarte bild={bild} skala={.5} palette="seite" branding={false} source={false}/>}
 </div>;
}
