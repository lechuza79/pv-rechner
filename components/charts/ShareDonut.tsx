"use client";
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {arc} from "d3-shape";
import ActionButton from '../ActionButton';
import {ChartDetailHeading} from './ChartDetailHeading';
import './share-donut.css';
import {solarCategoryVisual} from "../../lib/solar-category-visual";
import {DONUT_INACTIVE_OPACITY,donutNeutralColor,donutOverviewColor} from '../../lib/donut-style';
import {pvLeistungTeile} from "../../lib/atlas-format";
export {solarCategoryVisual} from "../../lib/solar-category-visual";
export type DonutValue={label:string;value:number;children?:DonutValue[];color?:string;visual?:string;visualCrop?:{width:number;left:number;top:number}};
/**
 * The same active segment drives the ring, central value and visual legend.
 * The preset selects a category, not its permanent color. Every active category
 * uses the theme accent; inactive segments share the neutral treatment.
 * Values default to installed kWp; other variants supply their own formatter.
 */
export function ShareDonut({values:rootValues,formatValue=pvLeistungTeile,defaultIndex,label="Solarleistung nach Anlagentyp",hideDefaultCard=false,centerVisual,centerVisualFocus=50,palette="neutral",showLegend=true,showCenter=true,overview=false,totalCenter,legendColumns,neutralOverview=false,title,onHighlight,highlightLabel,onSelection,onColorsChange,slim=false,showCenterLabel=true,detailLayout=false}:{values:DonutValue[];formatValue?:(value:number)=>{value:string;unit:string};defaultIndex?:number;label?:string;hideDefaultCard?:boolean;centerVisual?:string;centerVisualFocus?:number;palette?:"accent"|"neutral"|"accent-monochrome";showLegend?:boolean;showCenter?:boolean;overview?:boolean;totalCenter?:{value:string;unit:string;label:string};legendColumns?:3|4;neutralOverview?:boolean;title?:string;onHighlight?:(row:DonutValue|null)=>void;highlightLabel?:string|null;onSelection?:(row:DonutValue|null)=>void;onColorsChange?:(colors:Record<string,string>)=>void;slim?:boolean;showCenterLabel?:boolean;detailLayout?:boolean}){
 const segmentPath=(start:number,share:number,outerRadius=95)=>{
  if(share<=0)return '';
  if(share>=99.999)return arc()({innerRadius:77,outerRadius,startAngle:0,endAngle:Math.PI*2,padAngle:0})??'';
  const a=start/100*Math.PI*2-Math.PI/2,b=(start+share+.65)/100*Math.PI*2-Math.PI/2;
  const r=Math.min(5,(b-a)*77/4),outerEnd=b-r/outerRadius,innerEnd=b-r/77;
  const point=(radius:number,angle:number)=>`${radius*Math.cos(angle)},${radius*Math.sin(angle)}`;
  return `M${point(outerRadius,a)} A${outerRadius},${outerRadius} 0 ${outerEnd-a>Math.PI?1:0},1 ${point(outerRadius,outerEnd)} Q${point(outerRadius,b)} ${point(outerRadius-r,b)} L${point(77+r,b)} Q${point(77,b)} ${point(77,innerEnd)} A77,77 0 ${innerEnd-a>Math.PI?1:0},0 ${point(77,a)} Z`;
 };
 const Segment=slim?'path':'circle';
 const [active,setActive]=useState<number|null>(null);
 const [pinned,setPinned]=useState<string|null>(null);
 const [path,setPath]=useState<string[]>([]);
 let parent:DonutValue|undefined;
 let values=rootValues;
 for(const key of path){const found=values.find(row=>row.label===key);if(!found?.children?.length)break;parent=found;values=found.children;}
 const [switching,setSwitching]=useState(false);
 const container=useRef<HTMLDivElement>(null);
 const previousHeight=useRef<number|null>(null);
 useLayoutEffect(()=>{
  const node=container.current;
  if(!slim&&node&&previousHeight.current!==null&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   const animation=node.animate([{height:`${previousHeight.current}px`},{height:`${node.getBoundingClientRect().height}px`}],{duration:320,easing:'cubic-bezier(.2,.7,.2,1)'});
   previousHeight.current=null;
   return()=>animation.cancel();
  }
  return undefined;
 },[path]);
 const switchTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(switchTimer.current)clearTimeout(switchTimer.current);},[]);
 const arcOrigin=useRef<{start:number;share:number}[]|null>(null);
 useLayoutEffect(()=>{
  if(!arcOrigin.current||!container.current)return;
  if(slim){arcOrigin.current=null;return;}
  const circles=container.current.querySelectorAll<SVGCircleElement>('.sc-share-ring svg>circle[role="button"]');
  circles.forEach((circle,index)=>{
   const from=arcOrigin.current![Math.min(index,arcOrigin.current!.length-1)];if(!from)return;
   circle.animate([{strokeDasharray:`${Math.max(0,from.share-.3)} ${100-Math.max(0,from.share-.3)}`,strokeDashoffset:String(-from.start)},{strokeDasharray:circle.getAttribute('stroke-dasharray')!,strokeDashoffset:circle.getAttribute('stroke-dashoffset')!}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'});
  });arcOrigin.current=null;
 },[path]);
 const navigate=(next:string[])=>{
  setPinned(null);
  let nextRows=rootValues,nextParent:DonutValue|undefined;
  for(const key of next){nextParent=nextRows.find(row=>row.label===key);nextRows=nextParent?.children??[];}
  onSelection?.(nextParent??null);onHighlight?.(nextParent??null);
  if(switchTimer.current)clearTimeout(switchTimer.current);
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setPath(next);setActive(null);return;}
  previousHeight.current=container.current?.getBoundingClientRect().height??null;
  const sum=values.reduce((total,row)=>total+row.value,0)||1;
  if(next.length>path.length){
   const index=values.findIndex(row=>row.label===next.at(-1));const row=values[index];
   const start=values.slice(0,index).reduce((n,item)=>n+item.value,0)/sum*100;
   let offset=start;
   arcOrigin.current=row.children!.map(child=>{const share=child.value/sum*100;const arc={start:offset,share};offset+=share;return arc;});
  }else{let offset=0;arcOrigin.current=values.map(row=>{const share=row.value/sum*100;const arc={start:offset,share};offset+=share;return arc;});}
  setPath(next);setActive(null);setSwitching(false);
 };
 const levels:{path:string[];values:DonutValue[]}[]=[];
 const collect=(rows:DonutValue[],keys:string[])=>{levels.push({path:keys,values:rows});for(const row of rows)if(row.children?.length)collect(row.children,[...keys,row.label]);};
 collect(rootValues,[]);
 const activate=(index:number)=>{const row=values[index];if(row.children?.length){navigate([...path,row.label]);}else {setPinned(row.label);setActive(index);onSelection?.(row);onHighlight?.(row);}};
 const back=()=>{if(pinned){setPinned(null);setActive(null);onSelection?.(parent??null);onHighlight?.(parent??null);}else navigate(path.slice(0,-1));};

 const total=values.reduce((sum,row)=>sum+row.value,0);
 const hover=(index:number|null)=>{setActive(index);onHighlight?.(index===null?(values.find(row=>row.label===pinned)??parent??null):values[index]);};
 const externalIndex=highlightLabel?values.findIndex(row=>row.label===highlightLabel||row.children?.some(child=>child.label===highlightLabel)):-1;
 const selectedIndex=(active??(externalIndex>=0?externalIndex:null))??(pinned?values.findIndex(row=>row.label===pinned):undefined)??(overview?undefined:defaultIndex);
 const selected=values[selectedIndex??-1];

 const baseColor=(row:DonutValue,index:number)=>!slim&&selectedIndex!==undefined&&index!==selectedIndex?donutOverviewColor(index):(row.color??(palette==='accent-monochrome'?`color-mix(in srgb,var(--widget-accent) ${Math.round(100-index/Math.max(1,values.length-1)*65)}%,var(--widget-surface))`:palette==='neutral'?(neutralOverview?donutOverviewColor(index):donutNeutralColor(index)):'var(--widget-accent)'));
 // Publish the visible level's exact palette so linked plots never infer colors.
 const linkedColors:Record<string,string>={};
 const assignColor=(row:DonutValue,color:string)=>{linkedColors[row.label]=color;row.children?.forEach(child=>assignColor(child,color));};
 rootValues.forEach(row=>assignColor(row,'color-mix(in srgb,var(--widget-ink) 20%,var(--widget-surface))'));
 values.forEach((row,index)=>assignColor(row,index===selectedIndex?(neutralOverview?'var(--widget-ink)':'var(--widget-accent)'):baseColor(row,index)));
 const colorsKey=JSON.stringify(linkedColors);
 useEffect(()=>{onColorsChange?.(JSON.parse(colorsKey));},[colorsKey,onColorsChange]);
 const shown=selected?.value??total;
 const center=!selected&&!parent&&totalCenter?totalCenter:formatValue(shown);
 const highlightedIndex=selectedIndex;
 // Keep each arc at its real data extent; selection crossfades instead of sweeping through unrelated values.
 const arcs=values.map((row,index)=>({row,index,start:values.slice(0,index).reduce((sum,item)=>sum+item.value,0)/(total||1)*100,share:row.value/(total||1)*100}));
 return <div ref={container} className="sc-share-donut" data-detail-layout={detailLayout||undefined} data-slim={slim||undefined} data-overview={overview||undefined} data-neutral-overview={neutralOverview||undefined} data-switching={switching||undefined}>
 {title&&<ChartDetailHeading breadcrumb={detailLayout} root={title} title={pinned??parent?.label??title} onBack={parent||pinned?back:undefined}/>}
 <div className="sc-share-level" key={slim?path.join("/"):undefined}>
  {parent&&!title&&<ActionButton onClick={back} aria-label="Zurück zur übergeordneten Übersicht">Zurück · {parent.label}</ActionButton>}
  <div className="sc-share-ring"><svg viewBox="0 0 220 220" aria-label={label}>
   {arcs.slice().reverse().map(({row,index,start,share})=>{return <Segment d={slim?segmentPath(start,share):undefined} data-start={start} data-share={share} data-index={index} data-hovered={selectedIndex===index&&(active!==null||externalIndex>=0)||undefined} key={row.label} cx="110" cy="110" r="86" pathLength="100" fill={slim?baseColor(row,index):"none"} stroke={slim?"var(--donut-background,var(--widget-surface))":baseColor(row,index)} opacity={slim&&index===selectedIndex?0:palette==="accent-monochrome"?1:palette==="neutral"?(neutralOverview ? 1 :DONUT_INACTIVE_OPACITY):Math.max(.2,1-index*.3)*(selectedIndex===undefined?1:DONUT_INACTIVE_OPACITY)} strokeWidth={slim?1.25:28} strokeDasharray={slim?undefined:`${Math.max(0,share-.3)} ${100-Math.max(0,share-.3)}`} strokeDashoffset={slim?undefined:-start} transform={slim?"translate(110 110)":"rotate(-90 110 110)"} tabIndex={0} role="button" aria-label={`${row.label}: ${formatValue(row.value).value} ${formatValue(row.value).unit}`} onMouseEnter={()=>hover(index)} onMouseLeave={()=>hover(null)} onFocus={()=>hover(index)} onBlur={()=>hover(null)} onClick={()=>activate(index)} onKeyDown={event=>{if(event.key==='Escape'){setActive(null);if(parent)back();}if(event.key==='Enter'||event.key===' '){event.preventDefault();activate(index);}}}/>;})}
  {!slim&&<circle cx="110" cy="110" r={72} fill="none" stroke="black" strokeOpacity=".16" strokeWidth="2" pointerEvents="none"/>}
   {arcs.filter(item=>!slim||item.index===selectedIndex).slice().sort((a,b)=>Number(a.index===selectedIndex)-Number(b.index===selectedIndex)).map(({row,index,start,share})=><Segment d={slim?segmentPath(start,share,active!==null||externalIndex>=0?101:95):undefined} data-start={start} data-share={share} data-index={index} data-hovered={selectedIndex===index&&(active!==null||externalIndex>=0)||undefined} key={row.label} className="sc-share-highlight" cx="110" cy="110" r="86" pathLength="100" fill={slim?(neutralOverview?"var(--widget-ink)":"var(--widget-accent)"):"none"} stroke={slim?"var(--donut-background,var(--widget-surface))":neutralOverview?"var(--widget-ink)":"var(--widget-accent)"} strokeWidth={slim?1.25:!overview&&index===selectedIndex?36:28} opacity={index===selectedIndex?1:0} strokeDasharray={slim?undefined:`${Math.max(0,share-.3)} ${100-Math.max(0,share-.3)}`} strokeDashoffset={slim?undefined:-start} transform={slim?"translate(110 110)":"rotate(-90 110 110)"} pointerEvents="none" aria-hidden="true"/>)}
   </svg>
   {showCenter&&<div className="sc-share-center" aria-live="polite">
    {values.map((row,index)=>{
     const artwork=index===defaultIndex?(centerVisual??row.visual):row.visual;
     const crop=row.visualCrop;
     return artwork?<div key={row.label} className="sc-share-center-artwork" data-active={index===selectedIndex} aria-hidden="true"><img src={artwork} alt="" style={crop?{width:`${crop.width}%`,height:'auto',left:`${crop.left}%`,top:`${crop.top}%`}:{left:`${50-Math.max(0,Math.min(100,centerVisualFocus))*1.5}%`}}/></div>:null;
    })}
    <div className="sc-share-value" key={selectedIndex??'total'}><strong style={{color:selected&&!neutralOverview?"var(--widget-accent)":undefined}}>{center.value}</strong><span>{center.unit}</span>{showCenterLabel&&<small>{selected?.label??parent?.label??totalCenter?.label??'Gesamt'}</small>}</div>
   </div>}
  </div>
  {showLegend&&levels.map(level=><div key={level.path.join("/")} hidden={level.path.join("/")!==path.join("/")} className="sc-share-legend" data-columns={legendColumns}>{level.values.map((row,index)=>hideDefaultCard&&index===defaultIndex?null:<button key={row.label} type="button" onMouseEnter={()=>hover(index)} onMouseLeave={()=>hover(null)} onFocus={()=>hover(index)} onBlur={()=>hover(null)} onClick={()=>activate(index)} aria-pressed={highlightedIndex===index}>{(row.visual??solarCategoryVisual(row.label))&&<img src={row.visual??solarCategoryVisual(row.label)} alt="" loading="lazy"/>}<span>{row.label}</span><div className="sc-share-metric"><strong>{formatValue(row.value).value}</strong><small>{formatValue(row.value).unit}</small></div></button>)}</div>)}
 </div></div>;
}
