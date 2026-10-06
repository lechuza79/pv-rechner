'use client';

import {useEffect,useId,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {energieMwhTeile,anteilProzentTeile} from '../../lib/atlas-format';
import {CompositionArc} from '../charts/CompositionArc';
import OnsiteSearch from '../OnsiteSearch';
import {IconArrowRight,IconArrowLeft} from '../Icons';
import type {RegionNavigationEnergy} from '../../lib/region-navigation-energy';
import {checkedNavigationEnergy} from '../../lib/region-navigation-energy';
import shared from './landkreis.module.css';
import styles from './region-navigation.module.css';

type Place = {id:string;name:string;href:string|null};
type Outline = {id:string;path:string;viewBox:string};
const fold = (s:string) => s.toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');

/** Direct geographic children, alphabetical and searchable; never a second ranking. */
export default function RegionNavigation({places,title,parentName,locationPhrase,energy,outlines=[]}:{outlines?:Outline[];places:Place[];title:string;parentName:string;locationPhrase:string;energy?:RegionNavigationEnergy|null}) {
  const [query,setQuery]=useState('');
  const gridRef=useRef<HTMLUListElement>(null);
  useEffect(()=>{
    const grid=gridRef.current;
    grid?.scrollTo({left:0,behavior:'auto'});
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(!grid || reduced.matches)return;
    const animations:Animation[]=[];
    const observer=new IntersectionObserver(entries=>{
      entries.filter(entry=>entry.isIntersecting).forEach((entry,index)=>{
        animations.push(entry.target.animate(
          [{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],
          {duration:360,delay:Math.min(index,4)*45,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'},
        ));
        observer.unobserve(entry.target);
      });
    },{threshold:.15});
    Array.from(grid.children).forEach(card=>observer.observe(card));
    const stop=()=>{observer.disconnect();animations.forEach(animation=>animation.cancel());};
    reduced.addEventListener('change',stop);
    return ()=>{stop();reduced.removeEventListener('change',stop);};
  },[query]);
  const [bounds,setBounds]=useState({prev:false,next:false});
  useEffect(()=>{
    const grid=gridRef.current;
    if(!grid)return;
    const mobile=window.matchMedia('(max-width:760px)');
    const reduced=window.matchMedia('(prefers-reduced-motion:reduce)');
    let visible=false;
    let pauseUntil=0;
    const sync=()=>setBounds({prev:grid.scrollLeft>2,next:grid.scrollLeft+grid.clientWidth<grid.scrollWidth-2});
    const resize=new ResizeObserver(sync);
    resize.observe(grid);
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;},{threshold:.6});
    observer.observe(grid);
    const stop=()=>{pauseUntil=Date.now()+8000;};
    const section=grid.closest('section')!;
    section.addEventListener('pointerdown',stop,{passive:true});
    section.addEventListener('focusin',stop);
    section.addEventListener('wheel',stop,{passive:true});
    grid.addEventListener('scroll',sync,{passive:true});
    sync();
    // Resume after manual interaction; hovering the section must not disable autoplay forever.
    const timer=window.setInterval(()=>{
      if(!mobile.matches||reduced.matches||!visible||document.hidden||Date.now()<pauseUntil||query.trim()||section.contains(document.activeElement))return;
      if(grid.scrollWidth<=grid.clientWidth+2)return;
      if(grid.scrollLeft+grid.clientWidth>=grid.scrollWidth-2){
        grid.scrollTo({left:0,behavior:'smooth'});
        return;
      }
      const first=grid.firstElementChild;
      if(first)grid.scrollBy({left:first.getBoundingClientRect().width+(parseFloat(getComputedStyle(grid).columnGap)||0),behavior:'smooth'});
    },4500);
    return ()=>{
      window.clearInterval(timer);resize.disconnect();observer.disconnect();
      grid.removeEventListener('scroll',sync);
      section.removeEventListener('pointerdown',stop);
      section.removeEventListener('focusin',stop);
      section.removeEventListener('wheel',stop);
    };
  },[query,places.length]);
  const scrollPlaces=(direction:number)=>{
    const grid=gridRef.current;
    if(!grid)return;
    grid.scrollBy({left:direction*((grid.firstElementChild?.getBoundingClientRect().width??grid.clientWidth)+(parseFloat(getComputedStyle(grid).columnGap)||0)),behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
  };
  const resultsId=useId();
  const data=checkedNavigationEnergy(energy,places.map(p=>p.id));
  const values=new Map(data?.values.map(v=>[v.regionId,v.mwh]));
  const sorted=useMemo(()=>[...places].sort((a,b)=>a.name.localeCompare(b.name,'de')), [places]);
  const searchItems=useMemo(()=>sorted.map(p=>({id:p.id,label:p.name})),[sorted]);
  const shown=sorted.filter(p=>fold(p.name).includes(fold(query.trim())));
  const month=data?new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${data.month}-01T12:00:00Z`)):null;
  return <section id="atlas-places" className={`${shared.section} ${styles.overview}`} aria-label={title}>
    <div className={`${shared.sectionHeading} ${styles.heading}`}><div><h2>Energiedaten {locationPhrase}</h2>
      <p>{data?<>Modellierte Erzeugung im {month}. Entdecke Solaranlagen, Stromerzeugung und Ausbau {title==="Gemeindeübersicht"?"in deiner Gemeinde":title==="Kreisübersicht"?"in den Kreisen und kreisfreien Städten":"in deinem Bundesland"}.</>:<>Entdecke die Regionen im Detail. Die gemeinsame Monatsauswertung ist derzeit nicht verfügbar.</>}</p>
    </div>
    <div className={styles.search}><OnsiteSearch items={searchItems} onQueryChange={setQuery} ariaLabel={title==="Gemeindeübersicht"?"Gemeinde suchen":title==="Kreisübersicht"?"Kreis oder kreisfreie Stadt suchen":"Bundesland suchen"} placeholder={title==="Gemeindeübersicht"?"Gemeinde suchen …":title==="Kreisübersicht"?"Kreis oder Stadt suchen …":"Bundesland suchen …"}/></div></div>
    <p className={styles.srOnly} role="status">{shown.length} von {places.length} Gebieten · alphabetisch</p>
    <div className={styles.scrollFrame} data-scroll-prev={bounds.prev} data-scroll-next={bounds.next}>
    <ul ref={gridRef} id={resultsId} className={styles.grid}>{shown.map(place=>{
      const mwh=values.get(place.id), share=data&&data.totalMwh>0&&mwh!==undefined?Math.min(1,mwh/data.totalMwh):null;
      const reading=mwh===undefined?null:energieMwhTeile(mwh),percent=share===null?null:anteilProzentTeile(share,1);
      const outline=outlines.find(shape=>shape.id===place.id);
      const ring=<span className={styles.ring}><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45" fill="var(--color-bg)"/><circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-border)" strokeWidth="10"/><CompositionArc value={(share??0)*100}/></svg><span className={`${styles.value} ${percent?styles.energyValue:""}`} aria-hidden="true">{reading?<><b data-compact={reading.value.length >= 5 || undefined}>{reading.value}</b><small>{reading.unit}</small></>:<small>Keine Daten</small>}</span>{percent&&<span className={`${styles.value} ${styles.percentValue}`} aria-hidden="true"><b data-compact={percent.value.length >= 5 || undefined}>{percent.value}</b><small>{percent.unit}</small></span>}</span>;
      return <li key={place.id} className={`${shared.card} ${styles.card}`}
        onPointerMove={event=>{
          if(event.pointerType==='touch'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
          const card=event.currentTarget,rect=card.getBoundingClientRect();
          card.style.setProperty('--pointer-x',`${((event.clientX-rect.left)/rect.width-.5)*6}px`);
          card.style.setProperty('--pointer-y',`${((event.clientY-rect.top)/rect.height-.5)*6}px`);
        }}
        onPointerLeave={event=>{
          event.currentTarget.style.removeProperty('--pointer-x');
          event.currentTarget.style.removeProperty('--pointer-y');
        }}>

        {outline&&<svg className={styles.outline} viewBox={outline.viewBox} aria-hidden="true" focusable="false"><path d={outline.path} fillRule="evenodd"/></svg>}
        <span className={styles.metric}>{ring}</span>
        {place.href?<Link prefetch={false} className={styles.copy} href={place.href}><strong>{place.name}</strong><IconArrowRight size={18}/><span className={styles.srOnly}>{reading?`: ${reading.value} ${reading.unit}`:': Keine Erzeugungsdaten'}{percent?`, ${percent.value} ${percent.unit} des Solarstroms in ${parentName}`:''}</span></Link>:<span className={styles.copy}><strong>{place.name}</strong><small>Gebietsseite nicht verfügbar</small></span>}

      </li>;
    })}</ul>
    {(bounds.prev||bounds.next)&&<nav className={styles.scrollControls} aria-label="Gebiete durchblättern">
      <button type="button" aria-label="Vorherige Gebiete" aria-controls={resultsId} disabled={!bounds.prev} onClick={()=>scrollPlaces(-1)}><IconArrowLeft size={24}/></button>
      <button type="button" aria-label="Weitere Gebiete" aria-controls={resultsId} disabled={!bounds.next} onClick={()=>scrollPlaces(1)}><IconArrowRight size={24}/></button>
    </nav>}
    </div>
    {!shown.length&&<p>Kein Gebiet gefunden. <button type="button" onClick={()=>setQuery('')}>Suche zurücksetzen</button></p>}
  </section>;
}
