'use client';
import {useCallback,useLayoutEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {COMPOSITION_GAP,selectCompositionPlan,resolveComposition,compositionMinWidth,withMeasuredMinimumHeights,type CompositionPlan,type CompositionItem,type CompositionAllocation} from '../../lib/widget-composition';
import {WidgetMinimumHeightContext} from './WidgetMinimumHeight';
import styles from './WidgetComposition.module.css';

/** Host viewport only; iframe content reports must never become this budget. */
export function useWidgetHeightBudget(fixed?:number){
 const [height,setHeight]=useState(fixed??800);
 useLayoutEffect(()=>{if(fixed!==undefined){setHeight(fixed);return;}const measure=()=>setHeight(window.innerHeight);measure();window.addEventListener('resize',measure);return()=>window.removeEventListener('resize',measure);},[fixed]);
 return height;
}

/** Host-owned placement. Children retain chart, controls, theme and export ownership. */
export function WidgetComposition({plans,children,label,id}:{plans:readonly CompositionPlan[];children:ReactNode;label?:string;id?:string}){
 const ref=useRef<HTMLDivElement>(null);
 const [width,setWidth]=useState(0);
 useLayoutEffect(()=>{const node=ref.current;if(!node)return;const observer=new ResizeObserver(()=>setWidth(node.clientWidth));observer.observe(node);setWidth(node.clientWidth);return()=>observer.disconnect();},[]);
 const plan=selectCompositionPlan(plans,width);
 return <div ref={ref} className={styles.root} aria-label={label} data-example={id} style={{'--composition-gap':`${COMPOSITION_GAP}px`} as CSSProperties}>
  <div className={styles.grid} data-composition-grid style={{gridTemplateColumns:`repeat(${plan.columns},minmax(0,1fr))`,gridTemplateRows:plan.rows.join(' '),gridTemplateAreas:plan.areas.map(row=>`"${row.join(' ')}"`).join(' ')}}>{children}</div>
 </div>;
}

/** Constraint-driven flow shares the same composition layer as explicit legacy plans. */
export function ResponsiveWidgetComposition({item,heightBudget,render,label}:{
 item:CompositionItem;heightBudget:number;render:(id:string)=>ReactNode;label:string;
}){
 const ref=useRef<HTMLDivElement>(null);
 const [width,setWidth]=useState(0);
 const [minimums,setMinimums]=useState<Record<string,number>>({});
 const report=useCallback((id:string,height:number)=>setMinimums(previous=>previous[id]===height?previous:{...previous,[id]:height}),[]);
 useLayoutEffect(()=>{
  const element=ref.current;if(!element)return;
  const measure=()=>setWidth(element.clientWidth);
  const observer=new ResizeObserver(measure);observer.observe(element);measure();
  return()=>observer.disconnect();
 },[]);
 const draw=(allocation:CompositionAllocation):ReactNode=><div key={allocation.id}
  data-composition-item={allocation.id} data-composition-direction={allocation.direction}
  data-composition-sizing={allocation.height===undefined?'content':'allocated'}
  style={{minWidth:0,height:allocation.height,...(allocation.children?{
   display:'grid',gap:COMPOSITION_GAP,alignItems:'start',
   gridTemplateColumns:allocation.direction==='row'?allocation.children.map(child=>`${child.width}px`).join(' '):'minmax(0,1fr)',
  }:{})}}>
  {allocation.children?allocation.children.map(draw):<WidgetMinimumHeightContext.Provider value={{id:allocation.id,report}}>{render(allocation.id)}</WidgetMinimumHeightContext.Provider>}
 </div>;
 return <div ref={ref} aria-label={label} data-responsive-composition style={{minWidth:0,width:'100%'}}>
  {draw(resolveComposition(withMeasuredMinimumHeights(item,minimums),width||compositionMinWidth(item),heightBudget))}
 </div>;
}
