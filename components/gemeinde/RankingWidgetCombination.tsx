"use client";

import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {RankingPodiumWithList, type RankingPodiumData} from './GemeindeRankingWidget';
import {useWidgetResource} from '../dashboard/WidgetData';
import {useWidgetMinimumHeight} from '../dashboard/WidgetMinimumHeight';
import Script from 'next/script';
import {IconArrowLeft, IconArrowRight} from '../Icons';
import {stufeFuer} from '../../lib/atlas-format';
import '../../public/atlas-design-preview/ranking.css';
import styles from './RankingWidgetCombination.module.css';

/** Hosts provide the same prepared comparisons used on the municipality page.
 * Geography, category selection and rank calculation never belong to this UI. */
export type RankingCategory = {
  data: RankingPodiumData;
  rank?: number;
  distinction?: string | null;
  rowsUrl?: string;
  format?: string;
  selectedPlaceId?: string;
};
type RemoteRow = {id:string;name:string;rank:number;value:number;href?:string;change?:number|null};
type Neighbours = {total:number;zeilen:{regionId:string;name:string;platz:number;wert:number;href?:string}[]};

function CategoryPodium({category, onReveal, listHost, headingVariants, discovered, finishReveal}: {finishReveal:boolean;discovered:boolean;category:RankingCategory;onReveal:(rank?:number)=>void;listHost:HTMLElement|null;headingVariants:RankingPodiumData["headingVariants"]}) {
  const [alreadyRevealed] = useState(discovered);
  const resource = useWidgetResource<RemoteRow[] | Neighbours | null>(category.rowsUrl ?? null, null, 86_400_000);
  const data = useMemo(() => {
    if (!category.rowsUrl) return {...category.data,onReveal:()=>onReveal(category.data.rows.find(row=>row.own)?.rank)};
    if (!resource.data) return {...category.data,rows:[],missing:resource.error ? 'Diese Rangliste konnte gerade nicht geladen werden.' : 'Die Platzierung wird geladen …'};
    const rows:RemoteRow[]=Array.isArray(resource.data)?resource.data:resource.data.zeilen.map(row=>({id:row.regionId,name:row.name,rank:row.platz,value:row.wert,href:row.href}));
    const total=Array.isArray(resource.data)?rows.length:resource.data.total;
    const scale = stufeFuer(category.format ?? '', Math.max(0,...rows.map(row=>row.value)));
    return {...category.data,onReveal:()=>onReveal(rows.find(row=>row.id===category.selectedPlaceId)?.rank),missing:null,unit:scale.unit || category.data.unit,listUnit:category.data.unit,listTotal:total,
      rows:rows.map(row=>({...row,listFormatted:row.value.toLocaleString('de-DE',{maximumFractionDigits:1}),own:row.id===category.selectedPlaceId,
        formatted:(row.value/scale.teiler).toLocaleString('de-DE',{maximumFractionDigits:category.format==='countPer1000'?1:scale.stellen})}))};
  },[category,resource.data,resource.error,onReveal]);
  return <RankingPodiumWithList data={{...data,headingVariants,revealed:alreadyRevealed||finishReveal}} listHost={listHost}/>;
}

/** Full municipality composition: podium + discoverable category placements.
 * The standalone podium and its existing consumers remain independent. */
export default function RankingWidgetCombination({categories, initialCategory, label}: {
  categories:RankingCategory[];initialCategory?:string;label:string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const reportMinimumHeight = useWidgetMinimumHeight();
  // This composition retains intrinsic height: category controls and the footer
  // are additional content, not part of the standalone podium allocation.
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const measure = () => reportMinimumHeight(node.getBoundingClientRect().height);
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, [reportMinimumHeight]);
  const [selected,setSelected] = useState(initialCategory ?? categories[0]?.data.category);
  const [seen,setSeen] = useState<Set<string>>(()=>new Set());
  const active = Math.max(0,categories.findIndex(item=>item.data.category===selected));
  const current = categories[active];
  const choices = useRef<HTMLDivElement>(null);
  const [listHost,setListHost] = useState<HTMLElement|null>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const headingVariants = useMemo(()=>categories.map(({data})=>({title:data.title,unit:data.unit})),[categories]);
  const isMobile = () => (choices.current?.closest('[data-ranking-combination]')?.clientWidth ?? Infinity) <= 600;
  useEffect(()=>()=>clearTimeout(scrollTimer.current),[]);
  const discovered = useRef(new Set<string>());
  const [finishedCategory,setFinishedCategory] = useState<string|null>(null);
  const [inviteDismissed,setInviteDismissed] = useState(false);
  const [inviteReady,setInviteReady] = useState(false);
  const [listInvitations,setListInvitations] = useState<Set<string>>(()=>new Set());
  const celebrationTarget = useRef<HTMLElement|null>(null);
  const celebrate = () => {
    const target=celebrationTarget.current;
    if(target?.isConnected && (window as Window & {__atlasRankingConfetti?:unknown}).__atlasRankingConfetti){
      celebrationTarget.current=null;
      window.dispatchEvent(new CustomEvent('atlas-ranking-celebrate',{detail:{target}}));
    }
  };
  const [ranks,setRanks]=useState<Record<string,number>>({});
  const reveal = useMemo(()=>(rank?:number)=>{
    if(!current)return;
    if(!discovered.current.has(current.data.category)){
      discovered.current.add(current.data.category);
      if(rank!==undefined && rank<=3){
        celebrationTarget.current=root.current?.querySelector<HTMLElement>('[data-ranking-celebration-origin]') ?? null;
        celebrate();
      }
      const button=choices.current?.querySelector('[aria-pressed="true"]');
      if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        button?.querySelector('.ranking-choice-position')?.animate([{opacity:0,transform:'translateY(10px) scale(.9)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:500,easing:'cubic-bezier(.16,1,.3,1)'});
        button?.querySelector('.ranking-choice-caption')?.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:400,delay:100,fill:'backwards',easing:'ease-out'});
      }
    }
    setSeen(previous=>previous.has(current.data.category)?previous:new Set([...previous,current.data.category]));
    if(rank!==undefined)setRanks(previous=>previous[current.data.category]===rank?previous:{...previous,[current.data.category]:rank});
  },[current?.data.category]);
  useLayoutEffect(()=>{
    const host=choices.current;
    if(!host)return;
    const alignSelection=()=>{
      clearTimeout(scrollTimer.current);
      const node=host.querySelector<HTMLElement>('[aria-pressed="true"]');
      if(!node)return;
      const box=node.getBoundingClientRect(),view=host.getBoundingClientRect();
      if(isMobile()){
        host.scrollTo({left:host.scrollLeft+box.left-view.left-4,behavior:'instant'});
        return;
      }
      // Keep the original list position unless the selection is outside its viewport.
      let top=host.scrollTop;
      if(box.bottom>view.bottom)top+=box.bottom-view.bottom;
      else if(box.top<view.top)top-=view.top-box.top;
      else return;
      host.scrollTo({top,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    };
    alignSelection();
    const observer=new ResizeObserver(alignSelection);
    observer.observe(host);
    return()=>observer.disconnect();
  },[selected]);
  useEffect(()=>{
    if(inviteDismissed || !seen.has(selected))return;
    const timer=setTimeout(()=>setInviteReady(true),window.matchMedia('(prefers-reduced-motion: reduce)').matches?500:1000);
    return()=>clearTimeout(timer);
  },[inviteDismissed,seen,selected]);
  useEffect(()=>{
    if(inviteDismissed||!inviteReady||!seen.has(selected))return;
    const target=choices.current?.querySelector('.ranking-undiscovered:not([aria-pressed="true"]):not(:disabled)');
    if(!target)return;
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)entry.target.classList.toggle('ranking-invite-visible',entry.isIntersecting&&entry.intersectionRatio>=.6);
    },{threshold:[0,.6],rootMargin:'-65px 0px -90px 0px'});
    observer.observe(target);
    return()=>{observer.disconnect();target.classList.remove('ranking-invite-visible');};
  },[inviteDismissed,inviteReady,seen,selected]);
  useEffect(()=>{
    const button=listHost?.querySelector('button');
    if(!button||!current)return;
    const rank=ranks[current.data.category];
    button.classList.toggle('ranking-list-invite',seen.has(selected)&&!!rank&&rank>3&&!listInvitations.has(selected));
    const dismiss=()=>setListInvitations(previous=>new Set([...previous,selected]));
    button.addEventListener('click',dismiss);
    return()=>{button.classList.remove('ranking-list-invite');button.removeEventListener('click',dismiss);};
  },[listHost,current,ranks,seen,selected,listInvitations]);
  if(!current)return <p>Für diesen Vergleich liegen noch keine Platzierungen vor.</p>;
  const select = (index:number) => {
    if(!categories[index]||index===active)return;
    setInviteDismissed(true);
    celebrationTarget.current=null;
    setFinishedCategory(null);
    setSelected(categories[index].data.category);
  };
  const next = () => {
    setInviteDismissed(true);
    // The original next button first completes a running discovery.
    if(!seen.has(selected) && root.current?.querySelector('[data-podium-layout]')) { setFinishedCategory(selected); return; }
    select(active+1);
  };
  return <div ref={root} data-ranking-combination className={styles.root}>
    <Script src="/gemeinde/konfetti.js" data-ranking-only="true" onReady={celebrate}/>
    <div className={`atlas-competition ${styles.composition}`}>
      <CategoryPodium key={current.data.category} category={current} discovered={seen.has(current.data.category)} finishReveal={finishedCategory===selected} onReveal={reveal} listHost={listHost} headingVariants={headingVariants}/>
      <aside className={`ranking-category-panel ${styles.panel}`} aria-label={label}>
        <p className="atlas-kicker">{label}</p>
        <div ref={choices} className={`ranking-choices ${styles.choices}`}
          onKeyDown={event=>{if(isMobile() && (event.key==='ArrowRight'||event.key==='ArrowLeft')){event.preventDefault();select(Math.max(0,Math.min(categories.length-1,active+(event.key==='ArrowRight'?1:-1))));}}}
          onScroll={()=>{if(!isMobile())return;clearTimeout(scrollTimer.current);scrollTimer.current=setTimeout(()=>{
            const host=choices.current;if(!host)return;
            const nodes=Array.from(host.querySelectorAll<HTMLElement>('.ranking-choice'));
            const nearest=nodes.reduce((best,node,index)=>Math.abs(node.offsetLeft-host.offsetLeft-host.scrollLeft-4)<Math.abs(nodes[best].offsetLeft-host.offsetLeft-host.scrollLeft-4)?index:best,0);
            select(nearest);
          },180);}}>
          {categories.map((category,index)=>{
            const known=seen.has(category.data.category);
            const rank=ranks[category.data.category] ?? category.rank ?? category.data.rows.find(row=>row.own)?.rank;
            const top=category.distinction?.match(/^Top (10|25|50|100)$/)?.[1];
            const badge=!known?'rank-mystery.png':rank && rank<=3?`rank-${rank}.svg`:top?`top-${top}.svg`:null;
            const split=category.data.title.indexOf(' je ');
            return <button type="button" key={category.data.category} className={`ranking-choice${known?'':' ranking-undiscovered'}`} aria-pressed={index===active} onClick={()=>{setInviteDismissed(true);if(isMobile()&&index===active){if(active===categories.length-1&&seen.has(selected))select(0);else next();}else select(index);}}>
              <span className={`ranking-choice-position ${badge?'has-badge':''}`}>
                {badge?<img className="ranking-list-badge" src={`/atlas-design-preview/rank-badges/${badge}`} alt={known?`Platz ${rank ?? top}`:'Platzierung noch nicht entdeckt'} width={80} height={80}/>:<strong className="ranking-choice-rank">{rank ?? '—'}</strong>}
              </span>
              <span><strong className="ranking-choice-title">{split<0?category.data.title:category.data.title.slice(0,split)}</strong>
                {split>=0 && <span className="ranking-choice-subline">{category.data.title.slice(split+1)}</span>}
                <span className="ranking-choice-caption">{known?category.data.scope.split(' · ')[0]:'Platzierung entdecken'}</span>
              </span><span className="ranking-choice-arrow" aria-hidden="true"><IconArrowRight/></span>
            </button>;
          })}
        </div>
        <nav className="ranking-navigation" aria-label="Platzierungen durchblättern">
          <button type="button" aria-label="Vorherige Platzierung" disabled={active===0} onClick={()=>select(active-1)}><IconArrowLeft/></button>
          <button type="button" className="ranking-next" disabled={active===categories.length-1} onClick={next}>{seen.has(categories[active+1]?.data.category)?'Nächste Platzierung':'Nächste Platzierung entdecken'} <IconArrowRight/></button>
        </nav>
      </aside>
    </div>
    <footer className="ranking-footer" ref={setListHost}/>
  </div>;
}
