'use client';
import {chartAnnotationCorner} from '../../lib/chart-annotation-placement';
import {useState,useRef,useEffect} from 'react';
import {useWidgetPresentation} from '../dashboard/WidgetPresentationContext';
import type {TradeDay} from '../../lib/electricity-trade';
import {tradeDisplay} from '../../lib/electricity-trade';
import {formatStoryDate} from '../../lib/story-format';
import MetricValue from '../MetricValue';
import InfoTooltip from '../InfoTooltip';
import MetricShareCard from './MetricShareCard';
import styles from './ElectricityTradeRadial.module.css';

/** One signed net value per day: exports minus imports, around a shared zero ring. */
export default function ElectricityTradeRadial({days,money,importValue,exportValue,variant='radial',preview=false,summaryPlacement='center'}:{summaryPlacement?:'center'|'beside'|'auto';preview?:boolean;variant?:'radial'|'bars';days:TradeDay[];money:boolean;importValue:number|null;exportValue:number|null}){
 const [activeBar,setActiveBar]=useState<number|null>(null);
 const [active,setActive]=useState<number|null>(null);
 const allocated=useWidgetPresentation().layout==='allocated';
 const svgRef=useRef<SVGSVGElement>(null);
 const rootRef=useRef<HTMLDivElement>(null);
 const [landscape,setLandscape]=useState(false);
 // Use the whole card's proportions; a square card has a shorter content area.
 useEffect(()=>{
  const card=rootRef.current?.closest('article');
  if(summaryPlacement!=='auto'||!card)return;
  const measure=()=>{const {width,height}=card.getBoundingClientRect();setLandscape(width>=height*1.4);};
  const observer=new ResizeObserver(measure);observer.observe(card);measure();return()=>observer.disconnect();
 },[summaryPlacement]);
 const placement=summaryPlacement==='auto'?(landscape?'beside':'center'):summaryPlacement;
 const compactCenter=preview&&summaryPlacement==='auto'&&placement==='center';
 const separateCaption=placement==='center'&&!preview;
 const metricOverlay=variant==='bars'&&preview&&summaryPlacement!=='center';
 const tileRef=useRef<HTMLDivElement>(null);
 const [tileSize,setTileSize]=useState({width:170,height:74});
 useEffect(()=>{
  const tile=tileRef.current;if(!tile)return;
  const measure=()=>{const r=tile.getBoundingClientRect();setTileSize({width:r.width,height:r.height});};
  const observer=new ResizeObserver(measure);observer.observe(tile);measure();return()=>observer.disconnect();
 },[metricOverlay]);
 const [size,setSize]=useState({width:520,height:400});
 useEffect(()=>{
  const svg=svgRef.current;if(!allocated||variant!=='bars'||!svg)return;
  const measure=()=>{const r=svg.getBoundingClientRect();if(r.width>0&&r.height>0)setSize({width:r.width,height:r.height});};
  const observer=new ResizeObserver(measure);observer.observe(svg);measure();return()=>observer.disconnect();
 },[allocated,variant]);
 const bw=allocated?size.width:520,bh=allocated?size.height:400;
 const left=20,right=bw-20,bottom=bh-30;
 const imports=days.map(d=>money?d.importEuro:d.importMwh),exports=days.map(d=>money?d.exportEuro:d.exportMwh);
 const net=days.map((_,i)=>imports[i]===null||exports[i]===null?null:exports[i]!-imports[i]!);
 const max=Math.max(1,...net.filter((v):v is number=>v!==null).map(Math.abs));
 const baseZero=(20+bottom)/2,baseAmplitude=Math.max(1,(bottom-20)/2-8);
 const step=(right-left)/Math.max(1,days.length);
 const marks=net.flatMap((value,i)=>value===null?[]:[{x:left+(i+.15)*step,y:value>=0?baseZero-Math.abs(value)/max*baseAmplitude:baseZero,width:step*.7,height:Math.max(1,Math.abs(value)/max*baseAmplitude)}]);
 const annotation=metricOverlay?chartAnnotationCorner(bw,bh,tileSize,marks):'top-right';
 const top=annotation==='above'?tileSize.height+12:20,zero=(top+bottom)/2,amplitude=Math.max(1,(bottom-top)/2-8);
 const point=(i:number,value:number)=>{const angle=i/days.length*Math.PI*2-Math.PI/2,r=165+value/max*80;return [260+Math.cos(angle)*r,260+Math.sin(angle)*r];};
 const selected=active===null?null:days[active];
 const imp=active===null?importValue:imports[active],exp=active===null?exportValue:exports[active];
 const saldo=imp===null||exp===null?null:exp-imp;
 // Negative-price totals can make a share misleading; do not invent a percentage.
 const share=imp!==null&&exp!==null&&imp>=0&&exp>=0&&imp+exp>0?Math.abs(exp-imp)/(imp+exp)*100:null;
 const shareLabel=share===null?null:`${share.toLocaleString('de-DE',{maximumFractionDigits:1})} % ${money?'des gesamten Handelswerts':'der gesamten Handelsmenge'}`;
 const unitReference=active===null?Math.max(Math.abs(importValue??0),Math.abs(exportValue??0)):Math.max(0,...imports.map(value=>Math.abs(value??0)),...exports.map(value=>Math.abs(value??0)));
 const centre=tradeDisplay(saldo===null?null:Math.abs(saldo),money,unitReference);
 const description=(i:number)=>{const a=tradeDisplay(imports[i],money,unitReference),b=tradeDisplay(exports[i],money,unitReference),n=tradeDisplay(net[i],money,unitReference);const value=(v:ReturnType<typeof tradeDisplay>)=>v.value===null?'Daten fehlen':`${v.value.toLocaleString('de-DE',{maximumFractionDigits:2})} ${v.unit}`;return `${formatStoryDate(days[i].date)}: Tagessaldo ${net[i]!==null&&net[i]!>0?'+':''}${value(n)}, Zukauf ${value(a)}, Verkauf ${value(b)}`;};
 const formatTrade=(value:number|null)=>{const shown=tradeDisplay(value,money,unitReference);return shown.value===null?'Daten fehlen':`${shown.value.toLocaleString('de-DE',{maximumFractionDigits:2})} ${shown.unit}`;};
 if(variant==='bars')return <div className={`${styles.root} ${allocated?styles.allocatedBars:''}`} data-metric-overlay={metricOverlay||undefined}>
  {metricOverlay?<div ref={tileRef} className={styles.metricOverlay} data-corner={annotation}><MetricShareCard tone={saldo!==null&&saldo>0?'accent':'neutral'} label={saldo!==null&&saldo!==0?<>Mehr<br/>{saldo>0?'verkauft':'zugekauft'}</>:undefined} density="small" explanation="tooltip" ringColor="var(--widget-surface)" name={saldo===null?'Daten fehlen':saldo===0?'Ausgeglichen':saldo>0?'Mehr verkauft':'Mehr zugekauft'} value={centre.value===null?'–':centre.value.toLocaleString('de-DE',{maximumFractionDigits:2})} unit={centre.unit} share={share} context={money?'des gesamten Handelswerts':'der gesamten Handelsmenge'}/></div>:
  <div className={styles.barMetric} data-direction={saldo!==null&&saldo<0?'import':'export'}>{selected&&<small>{formatStoryDate(selected.date)}</small>}<span>{saldo===null?'Daten fehlen':saldo===0?'Ausgeglichen':saldo>0?'Mehr verkauft':'Mehr zugekauft'}</span><MetricValue stacked {...centre} maximumFractionDigits={centre.unit==='TWh'||centre.unit==='Mrd. €'?2:1}/>{(!preview||summaryPlacement!=='center')&&shareLabel&&<small className={styles.share}>{shareLabel}</small>}</div>}
  <div className={styles.barPlot}>
  <svg ref={svgRef} viewBox={`0 0 ${bw} ${bh}`} role="img" aria-label="Verkauf minus Zukauf: positive Werte oberhalb, negative unterhalb der Nulllinie">
   {[-1,-.5,.5,1].map(f=>zero+f*amplitude).map(y=><line key={y} x1={left} x2={right} y1={y} y2={y} stroke="var(--widget-muted)" strokeOpacity=".12"/>)}
   <line x1={left} x2={right} y1={zero} y2={zero} stroke="var(--widget-muted)" strokeOpacity=".5"/>
   <text x="6" y={zero+4} className={styles.axis}>0</text>
   {net.map((value,i)=>{const step=(right-left)/days.length,x=left+(i+.5)*step,h=value===null?0:Math.abs(value)/max*amplitude;const label=days.length<=31?String(Number(days[i].date.slice(8))):new Intl.DateTimeFormat('de-DE',{month:'short',timeZone:'UTC'}).format(new Date(days[i].date+'T12:00:00Z'));const show=days.length<=7||(days.length<=31?i%5===0:days[i].date.endsWith('-01'));return <g key={days[i].date}>
    {value!==null?<path data-trade-bar={i} d={(()=>{const l=x-step*.35,r=x+step*.35,tip=zero+(value>=0?-1:1)*Math.max(1,h),radius=Math.min(2,h/2,step*.15),dir=value>=0?-1:1;return `M${l},${zero} V${tip-dir*radius} Q${l},${tip} ${l+radius},${tip} H${r-radius} Q${r},${tip} ${r},${tip-dir*radius} V${zero} Z`;})()} fill={value>=0?'var(--trade-export-color,var(--widget-ink))':'var(--widget-accent)'} opacity={activeBar!==null&&activeBar!==i?.45:1}/>:<circle cx={x} cy={zero} r="2" fill="none" stroke="var(--widget-muted)"/>}
    {!preview&&show&&<text x={x} y={bh-8} textAnchor="middle" className={styles.axis}>{label}</text>}

   </g>;})}
  </svg>
  <div className={styles.barTargets}>
   {net.map((value,i)=>{
    const h=value===null?0:Math.abs(value)/max*amplitude;
    const y=value!==null&&value>=0?zero-h:zero;
    return <div key={days[i].date} style={{left:`${(left+(i+.15)*step)/bw*100}%`,top:`${y/bh*100}%`,width:`${step*.7/bw*100}%`,height:`${Math.max(16,h)/bh*100}%`}}>
     <InfoTooltip maxWidth={220} onOpenChange={open=>setActiveBar(current=>open?i:current===i?null:current)} ariaLabel={description(i)} exportNote={false} trigger={<span className={styles.barTarget}/>} title={formatStoryDate(days[i].date)}>{<div className={styles.dayCalculation}>
      <span>Verkauf</span><span>{formatTrade(exports[i])}</span>
      <span>− Zukauf</span><span>{formatTrade(imports[i])}</span>
      <strong>Saldo</strong><strong>{net[i]!==null&&net[i]!>0?'+':''}{formatTrade(net[i])}</strong>
     </div>}</InfoTooltip>
    </div>;
   })}
  </div>
  </div>
 </div>;
 return <div ref={rootRef} className={styles.root} data-summary-placement={placement} data-compact-center={compactCenter||undefined} data-separate-caption={separateCaption||undefined}>
  <div className={styles.radialPlot}>
  <svg viewBox="0 0 520 520" role="img" aria-label={`Kommerzieller Stromhandel: Tagessaldo Export minus Import: positiv nach außen, negativ nach innen, gleiche Skala. ${money?'Börsenwert in Euro.':'Strommenge.'}`}>
   {[85,125,205,245].map(r=><circle key={r} cx="260" cy="260" r={r} fill="none" stroke="var(--widget-muted)" strokeOpacity=".12" strokeWidth="1"/>)}
   <circle cx="260" cy="260" r="165" fill="none" stroke="var(--widget-muted)" strokeOpacity=".5" strokeWidth="1" vectorEffect="non-scaling-stroke" aria-label="Gemeinsame Nulllinie"/>
   {net.map((value,i)=>value===null?null:<path key={days[i].date} d={`M${point(i,0).join(',')} L${point(i,value===0?max*.002:value).join(',')}`} fill="none" stroke={value>=0?'var(--trade-export-color,var(--widget-ink))':'var(--widget-accent)'} strokeWidth={Math.min(18,2*Math.PI*125/days.length*.72)} strokeLinecap="round"/>)}
   {days.map((day,i)=>{const label=days.length<=31?String(Number(day.date.slice(8))):new Intl.DateTimeFormat('de-DE',{month:'short',timeZone:'UTC'}).format(new Date(day.date+'T12:00:00Z'));const show=days.length<=7|| (days.length<=31?i%5===0:day.date.endsWith('-01'));const p=point(i,max*1.08),hit=point(i,0);return <g key={day.date}>
    {!preview&&show&&<text x={p[0]} y={p[1]+4} textAnchor="middle" className={styles.axis}>{label}</text>}
    {day.expected>0&&(imports[i]===null||exports[i]===null)&&<circle cx={hit[0]} cy={hit[1]} r="2" fill="none" stroke="var(--widget-muted)"/>}
    {!preview&&<path d={`M${point(i,-max).join(',')} L${point(i,max).join(',')}`} stroke="transparent" strokeWidth={days.length<32?16:5} tabIndex={0} role="button" aria-label={description(i)} onFocus={()=>setActive(i)} onBlur={()=>setActive(null)} onPointerEnter={()=>setActive(i)} onPointerLeave={()=>setActive(null)} onClick={()=>setActive(active===i?null:i)} onKeyDown={e=>{if(e.key==='Escape')setActive(null);if(e.key==='Enter'||e.key===' '){e.preventDefault();setActive(active===i?null:i);}}}><title>{description(i)}</title></path>}
   </g>;})}
  </svg>
  {<div className={styles.center} data-direction={saldo!==null&&saldo<0?'import':'export'} aria-live="polite">{!separateCaption&&selected&&<small>{formatStoryDate(selected.date)}</small>}{!separateCaption&&!compactCenter&&<span>{saldo===null?'Daten fehlen':saldo===0?'Ausgeglichen':saldo>0?'Mehr verkauft':'Mehr zugekauft'}</span>}{compactCenter?<InfoTooltip ariaLabel="Einordnung des Handelssaldos" trigger={<MetricValue stacked {...centre} maximumFractionDigits={centre.unit==='TWh'||centre.unit==='Mrd. €'?2:1}/>}><strong>{saldo===null?'Daten fehlen':saldo===0?'Ausgeglichen':saldo>0?'Mehr verkauft':'Mehr zugekauft'}</strong>{shareLabel&&<><br/>{shareLabel}</>}</InfoTooltip>:<MetricValue stacked {...centre} maximumFractionDigits={centre.unit==='TWh'||centre.unit==='Mrd. €'?2:1}/>}{!separateCaption&&!compactCenter&&(!preview||summaryPlacement!=='center')&&shareLabel&&<small className={styles.share}>{shareLabel}</small>}</div>}
  </div>
  {separateCaption&&<div className={styles.compactCaption}>{selected&&<small>{formatStoryDate(selected.date)}</small>}<span>{saldo===null?'Daten fehlen':saldo===0?'Ausgeglichen':saldo>0?'Mehr verkauft':'Mehr zugekauft'}</span>{shareLabel&&<small>{shareLabel}</small>}</div>}
 </div>;
}
