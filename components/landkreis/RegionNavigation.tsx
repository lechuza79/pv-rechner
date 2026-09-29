'use client';

import {useId,useMemo,useState} from 'react';
import Link from 'next/link';
import {energieMwhTeile,anteilProzentTeile} from '../../lib/atlas-format';
import DonutChart from '../charts/DonutChart';
import {IconArrowRight} from '../Icons';
import type {RegionNavigationEnergy} from '../../lib/region-navigation-energy';
import {checkedNavigationEnergy} from '../../lib/region-navigation-energy';
import shared from './landkreis.module.css';
import styles from './region-navigation.module.css';

type Place = {id:string;name:string;href:string|null};
const fold = (s:string) => s.toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');

/** Direct geographic children, alphabetical and searchable; never a second ranking. */
export default function RegionNavigation({places,title,parentName,energy}:{places:Place[];title:string;parentName:string;energy?:RegionNavigationEnergy|null}) {
  const [query,setQuery]=useState('');
  const inputId=useId(),resultsId=useId();
  const data=checkedNavigationEnergy(energy,places.map(p=>p.id));
  const values=new Map(data?.values.map(v=>[v.regionId,v.mwh]));
  const sorted=useMemo(()=>[...places].sort((a,b)=>a.name.localeCompare(b.name,'de')), [places]);
  const shown=sorted.filter(p=>fold(p.name).includes(fold(query.trim())));
  const month=data?new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${data.month}-01T12:00:00Z`)):null;
  return <section id="atlas-places" className={`${shared.section} ${styles.overview}`} aria-label={title}>
    <div className={shared.sectionHeading}><div><h2>{title}</h2>
      <p>{data?<>Modellierter Solarstrom · {month}. Der Ring zeigt den Anteil am Gesamtwert für {parentName}.</>:<>Die gemeinsame Monatsauswertung ist derzeit nicht verfügbar. Alle Gebietsseiten bleiben erreichbar.</>}</p>
    </div></div>
    <div className={styles.search}><label htmlFor={inputId}>Gebiet suchen</label><div><input id={inputId} type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Name eingeben" aria-controls={resultsId}/></div></div>
    <p className={styles.count} role="status">{shown.length} von {places.length} Gebieten · alphabetisch</p>
    <ul id={resultsId} className={styles.grid}>{shown.map(place=>{
      const mwh=values.get(place.id), share=data&&data.totalMwh>0&&mwh!==undefined?Math.min(1,mwh/data.totalMwh):null;
      const reading=mwh===undefined?null:energieMwhTeile(mwh),percent=share===null?null:anteilProzentTeile(share,1);
      const content=<><span className={styles.ring} aria-hidden="true"><DonutChart size={64} segments={[
        {key:'place',label:place.name,value:share??0,color:'var(--color-accent)'},
        {key:'rest',label:'Übriges Gebiet',value:1-(share??0),color:'var(--color-border)'},
      ]}/></span><span className={styles.copy}><strong>{place.name}</strong><span>{reading?<><b>{reading.value}</b> {reading.unit}</>:'Energiedaten nicht verfügbar'}</span>{percent&&<small>{percent.value} {percent.unit} · {month}</small>}</span><IconArrowRight size={18}/></>;
      return <li key={place.id}>{place.href?<Link prefetch={false} className={`${shared.card} ${styles.card}`} href={place.href}>{content}</Link>:<div className={`${shared.card} ${styles.card}`}>{content}<small>Gebietsseite nicht verfügbar</small></div>}</li>;
    })}</ul>
    {!shown.length&&<p>Kein Gebiet gefunden. <button type="button" onClick={()=>setQuery('')}>Suche zurücksetzen</button></p>}
  </section>;
}
