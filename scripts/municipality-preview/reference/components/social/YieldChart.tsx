import React, {useEffect,useRef,useState} from 'react';
import type {StoryConcept} from '../../lib/story-konzepte';
import {formatStoryDate,formatStoryValue} from '../../lib/story-format';
import styles from './StoryConceptLab.module.css';

function AverageIcon({x,y}:{x:number;y:number}) {
  return <g transform={`translate(${x} ${y})`} stroke="var(--story-peer)" strokeWidth="1.2" fill="none" opacity=".55" aria-label="Durchschnitt"><circle r="3.5"/><path d="M -4.5 4.5 L 4.5 -4.5"/></g>;
}

/** Measure visible glyphs so one- and two-digit labels share the same gaps. */
function PercentageFlag({x,at,percentage,primary}:{x:number;at:number;percentage:number;primary:boolean}) {
  const glyphs=useRef<SVGGElement>(null);
  const [boxes,setBoxes]=useState([{x:0,y:-5,width:7,height:7},{x:0,y:-14,width:primary?23:16,height:primary?15:10},{x:0,y:-7,width:8,height:8}]);
  useEffect(()=>{
    let active=true;
    const measure=()=>{if(active&&glyphs.current)setBoxes(Array.from(glyphs.current.querySelectorAll('text')).map(node=>{const b=node.getBBox();return {x:b.x,y:b.y,width:b.width,height:b.height};}));};
    measure();void document.fonts.ready.then(measure);
    return()=>{active=false;};
  },[percentage,primary]);
  const gap=2,padding=8,height=primary?32:22,distance=primary?12:9;
  const contentWidth=boxes.reduce((sum,b)=>sum+b.width,0)+gap*2;
  const width=contentWidth+padding*2,top=at-distance-height;
  const numberBaseline=-(boxes[1].y+boxes[1].height/2);
  const offsets=[0,boxes[0].width+gap,boxes[0].width+boxes[1].width+gap*2];
  const color=primary?'var(--atlas-action-ink)':'var(--story-peer)';
  return <g className={styles.yieldFlag}>
    <rect x={x-width/2} y={top} width={width} height={height} rx={primary?8:5} fill={primary?'var(--story-accent)':'var(--story-picker-bg)'}/>
    <path d={`M ${x-5} ${at-distance} L ${x} ${at-distance+5} L ${x+5} ${at-distance}`} fill={primary?'var(--story-accent)':'var(--story-picker-bg)'}/>
    <g className={styles.yieldFlagText} fill={color} transform={`translate(${x-contentWidth/2} ${top+height/2})`}>
      {['+',String(Math.round(percentage)),'%'].map((text,i)=><text key={i} x={offsets[i]-boxes[i].x} y={i===0?-(boxes[0].y+boxes[0].height/2):numberBaseline} opacity={i===2?.55:1} style={{fontSize:i===1?(primary?20:13):(primary?11:9)}}>{text}</text>)}
    </g>
    <g ref={glyphs} className={styles.yieldFlagText} visibility="hidden" aria-hidden="true">{['+',String(Math.round(percentage)),'%'].map((text,i)=><text key={i} x="0" y="0" style={{fontSize:i===1?(primary?20:13):(primary?11:9)}}>{text}</text>)}</g>
  </g>;
}

/** Paint annotations last so later periods and reference lines cannot cover them. */
export function YieldChart({story,compact=false}:{story:StoryConcept;compact?:boolean}){
    const averageContent=useRef<SVGGElement>(null);
    const [averageWidth,setAverageWidth]=useState(80);
    useEffect(()=>{
      let active=true;
      const measure=()=>{if(active&&averageContent.current)setAverageWidth(Math.ceil(averageContent.current.getBBox().width)+20);};
      measure();void document.fonts.ready.then(measure);
      return()=>{active=false;};
    },[story,compact]);
    const container=useRef<HTMLDivElement>(null);
    const [width,setWidth]=useState(640);
    useEffect(()=>{if(!container.current)return;const observer=new ResizeObserver(entries=>{const next=entries[0]?.contentRect.width;if(next>0)setWidth(next);});observer.observe(container.current);return()=>observer.disconnect();},[]);
    const height=compact?230:width<400?310:390;
    const baseline=height-36,left=compact?12:32,right=width-(compact?12:30),plotWidth=right-left;

    const peak=story.values[0],reference=story.values.find(v=>v.label.startsWith('Mittel'));
    const fullSeries=story.yieldSeries??[{period:story.period,value:peak.value,highlight:true}];
    const monthly=fullSeries.length>24;
    const winnerPeriod=fullSeries.find(v=>v.highlight)?.period??'';
    const series=compact?fullSeries.filter(v=>v.period.slice(5)===winnerPeriod.slice(5)):fullSeries;
    const monthName=story.period.replace(/\d{4}/g,'').trim();
    const peers=series.filter(v=>v.period.slice(5)===winnerPeriod.slice(5));
    const zoomMin=Math.max(0,Math.floor(Math.min(...peers.map(v=>v.value))/10)*10-10);
    const zoomMax=Math.ceil(Math.max(...series.map(v=>v.value))/10)*10+10;
    const roughStep=(zoomMax-zoomMin)/4;
    const magnitude=10**Math.floor(Math.log10(roughStep));
    const tickStep=[1,2,5,10].map(n=>n*magnitude).find(n=>n>=roughStep)??magnitude*10;
    const ticks=Array.from({length:Math.floor((zoomMax-zoomMin)/tickStep)+1},(_,i)=>zoomMin+i*tickStep);
    const y=(value:number)=>baseline-(Math.max(zoomMin,value)-zoomMin)/(zoomMax-zoomMin)*(height-105);
    const roundedBar=(x:number,top:number,w:number,bottom:number)=>{
      const r=Math.min(3,w/2,Math.max(0,bottom-top));
      return `M ${x} ${bottom} V ${top+r} Q ${x} ${top} ${x+r} ${top} H ${x+w-r} Q ${x+w} ${top} ${x+w} ${top+r} V ${bottom} Z`;
    };
    return <div ref={container} className={styles.yieldChart}>{!compact&&<header className={styles.yieldHeader}><p>{story.town} · Solarenergie</p><h2>{story.title}</h2><p>{story.sourceDate&&<>Stand {formatStoryDate(story.sourceDate)} · </>}Modellrechnung · kWh je kWp</p></header>}<svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${story.title}. Vergrößerte Skala ab ${zoomMin} kWh je kWp; niedrigere Werte liegen außerhalb des Ausschnitts. ${series.map(v=>`${formatStoryDate(v.period)}: ${formatStoryValue(v.value)} kWh je kWp`).join('; ')}`}>
      {!compact&&ticks.map((t,i)=><g key={t}>{t!==zoomMin&&<line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke="var(--story-peer)" opacity={i%2===0?.22:.09}/>}{i%2===0&&<text x={right+8} y={y(t)+5} textAnchor="start" fill="var(--story-muted)" className={styles.yieldAxis}>{formatStoryValue(t)}</text>}</g>)}
      {series.map((v,i)=>{const step=plotWidth/series.length,x=left+i*step,isPeer=v.period.slice(5)===winnerPeriod.slice(5);return <g key={v.period}><title>{`${formatStoryDate(v.period)}: ${formatStoryValue(v.value)} kWh je kWp`}</title><path d={roundedBar(x,y(v.value),step*(compact?.5:.65),baseline)} fill={isPeer?'var(--story-peer)':'var(--story-muted)'} opacity={isPeer?1:.2}/>{isPeer&&reference&&v.value>reference.value&&<path d={roundedBar(x,y(v.value),step*(compact?.5:.65),y(reference.value))} fill={v.highlight?"var(--story-accent)":"var(--story-peer)"}/>}{(compact?v.highlight:((!monthly||v.period.endsWith("-01"))&&(Number(v.period.slice(0,4))-Number(series[0].period.slice(0,4)))%2===0))&&<text x={monthly&&!compact?x+step*6:x+step*(compact?.25:.325)} y={height-12} textAnchor="middle" fill="var(--story-muted)" className={styles.yieldAxis}>{v.period.slice(0,4)}</text>}</g>})}
      <rect data-chart-layer="baseline" x={left} y={baseline-2} width={plotWidth} height="2" fill="color-mix(in srgb, var(--story-picker-bg) 65%, black)"/>
      {reference&&<g><line x1={left} x2={right} y1={y(reference.value)} y2={y(reference.value)} stroke="var(--story-paper)" strokeWidth="2"/><line x1={left} x2={right} y1={y(reference.value)} y2={y(reference.value)} stroke="var(--story-peer)" strokeDasharray="3 5"/></g>}
      <g data-chart-layer="callouts">{reference&&<g className={styles.yieldAverageFlag}><path d={`M 6 ${y(reference.value)-26} H ${averageWidth-6} Q ${averageWidth} ${y(reference.value)-26} ${averageWidth} ${y(reference.value)-20} V ${y(reference.value)-5} L ${averageWidth+6} ${y(reference.value)} L ${averageWidth} ${y(reference.value)+5} V ${y(reference.value)+20} Q ${averageWidth} ${y(reference.value)+26} ${averageWidth-6} ${y(reference.value)+26} H 6 Q 0 ${y(reference.value)+26} 0 ${y(reference.value)+20} V ${y(reference.value)-20} Q 0 ${y(reference.value)-26} 6 ${y(reference.value)-26} Z`} fill="var(--story-picker-bg)" stroke="var(--story-paper)" strokeWidth="1"/><path d={`M 10 ${y(reference.value)} H ${averageWidth-10}`} stroke="var(--story-peer)" strokeOpacity=".16" strokeWidth="1"/><g ref={averageContent}><AverageIcon x={14} y={y(reference.value)-12}/><text x="24" y={y(reference.value)-7} fill="var(--story-muted)" className={styles.yieldAxis}>{monthly?monthName:'Jahre'}</text><g className={styles.yieldFlagText}><text x="10" y={y(reference.value)+17} fill="var(--story-peer)" style={{fontSize:13}}>{formatStoryValue(Math.round(reference.value))}</text></g></g></g>}{series.map((v,i)=>{if((compact&&!v.highlight)||v.period.slice(5)!==winnerPeriod.slice(5)||!reference||reference.value<=0||v.value<=reference.value)return null;const step=plotWidth/series.length,x=left+i*step;return <g key={v.period}><PercentageFlag x={x+step*(compact?.25:.325)} at={y(v.value)} percentage={(v.value/reference.value-1)*100} primary={v.highlight}/></g>})}</g>
    </svg>{!compact&&<footer className={styles.yieldFooter}><p>Quelle: {story.sources?.[0]?<a href={story.sources[0].url} target="_blank" rel="noreferrer">{story.sourceCaption} ↗</a>:story.sourceCaption}</p></footer>}</div>;
}
