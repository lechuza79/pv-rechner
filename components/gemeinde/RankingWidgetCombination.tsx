"use client";

import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {RankingPodiumWithList, type RankingPodiumData} from './GemeindeRankingWidget';
import {useWidgetResource} from '../dashboard/WidgetData';
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

function CategoryPodium({category, onReveal, listHost, headingVariants}: {category:RankingCategory;onReveal:(rank?:number)=>void;listHost:HTMLElement|null;headingVariants:RankingPodiumData["headingVariants"]}) {
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
  return <RankingPodiumWithList data={{...data,headingVariants}} listHost={listHost}/>;
}

/** Full municipality composition: podium + discoverable category placements.
 * The standalone podium and its existing consumers remain independent. */
export default function RankingWidgetCombination({categories, initialCategory, label}: {
  categories:RankingCategory[];initialCategory?:string;label:string;
}) {
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
  const [ranks,setRanks]=useState<Record<string,number>>({});
  const reveal = useMemo(()=>(rank?:number)=>{
    if(!current)return;
    setSeen(previous=>previous.has(current.data.category)?previous:new Set([...previous,current.data.category]));
    if(rank!==undefined)setRanks(previous=>previous[current.data.category]===rank?previous:{...previous,[current.data.category]:rank});
  },[current?.data.category]);
  useLayoutEffect(()=>{
    const host=choices.current;
    if(!host)return;
    const alignSelection=()=>{
      clearTimeout(scrollTimer.current);
      const node=host.querySelector<HTMLElement>('[aria-pressed="true"]');
      if(node)host.scrollTo(isMobile() ? {left:node.offsetLeft-host.offsetLeft-4,top:0,behavior:'instant'} : {top:node.offsetTop-host.offsetTop,left:0,behavior:'instant'});
    };
    alignSelection();
    const observer=new ResizeObserver(alignSelection);
    observer.observe(host);
    return()=>observer.disconnect();
  },[selected]);
  if(!current)return <p>Für diesen Vergleich liegen noch keine Platzierungen vor.</p>;
  const select = (index:number) => { if(categories[index])setSelected(categories[index].data.category); };
  return <div data-ranking-combination className={styles.root}>
    <div className={`atlas-competition ${styles.composition}`}>
      <CategoryPodium key={current.data.category} category={current} onReveal={reveal} listHost={listHost} headingVariants={headingVariants}/>
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
            return <button type="button" key={category.data.category} className="ranking-choice" aria-pressed={index===active} onClick={()=>select(isMobile() && index===active ? (active+1)%categories.length : index)}>
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
          <button type="button" className="ranking-next" disabled={active===categories.length-1} onClick={()=>select(active+1)}>{seen.has(categories[active+1]?.data.category)?'Nächste Platzierung':'Nächste Platzierung entdecken'} <IconArrowRight/></button>
        </nav>
      </aside>
    </div>
    <footer className="ranking-footer" ref={setListHost}/>
  </div>;
}
