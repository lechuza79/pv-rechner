'use client';
import {useCallback,useEffect,useRef,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import OnsiteSearch, {type OnsiteSearchItem} from '../../../components/OnsiteSearch';
import AutoHeightIframe from '../../../components/AutoHeightIframe';
import DataSourcesSection from '../../../components/DataSourcesSection';
import {DataSourceNote} from '../../../components/PoweredBy';
import {allWidgets} from '../../../lib/widget-registry';
import SelectField from '../../../components/SelectField';
import {curatedGalleryEntries,GALLERY_CATEGORIES,type GalleryPlace,type GalleryEntry} from '../../../lib/widget-gallery';
import styles from './gallery.module.css';

async function places(query:string,signal:AbortSignal):Promise<OnsiteSearchItem[]> {
  const response=await fetch(`/api/atlas/search?q=${encodeURIComponent(query)}`,{signal});
  if(!response.ok)throw new Error('Place search failed');
  const {hits=[]}=await response.json() as {hits:{region_id:string;name:string;label:string}[]};
  return hits.filter(hit=>/^\d{8}$/.test(hit.region_id)).map(hit=>({id:hit.region_id,label:hit.name,description:hit.label}));
}
function Preview({src,title,height}:{src:string;title:string;height:number}) {
  const root=useRef<HTMLDivElement>(null);
  const [visible,setVisible]=useState(false);
  const [ready,setReady]=useState(false);
  const [slow,setSlow]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const loaded=useCallback(()=>{setReady(true);setSlow(false)},[]);
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}},{rootMargin:'350px'});
    if(root.current)observer.observe(root.current);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{if(!visible||ready)return;const timer=setTimeout(()=>setSlow(true),20000);return()=>clearTimeout(timer)},[visible,ready,attempt]);
  return <div ref={root} className={styles.preview} aria-busy={visible&&!ready}>
    {visible?<AutoHeightIframe key={attempt} src={src} title={title} fallbackHeight={height} framed={false} loading="eager" onReady={loaded}/>:<div style={{height}}/>}
    {!ready&&<div className={styles.loading} role="status">
      {slow?<><span>Das Widget lädt gerade nicht.</span><button onClick={()=>{setSlow(false);setAttempt(n=>n+1)}}>Erneut laden</button></>:<><span className={styles.spinner} aria-hidden="true"/><span>Widget wird geladen …</span></>}
    </div>}
  </div>;
}
function Card({entry}:{entry:GalleryEntry}) {
  const [selected,setSelected]=useState(0);
  const variant=entry.variants[selected]??entry.variants[0];
  if(!variant)return null;
  return <article className={styles.card}>
    <Preview key={variant.src} src={variant.src} title={entry.title} height={variant.height}/>
    <div className={styles.caption}><div><h2>{entry.title}</h2>{entry.placeLabel&&<p>{entry.placeLabel}</p>}</div>
      {entry.variants.length>1&&<SelectField size="sm" maxWidth={200} ariaLabel={`Variante für ${entry.title}`} value={selected} onChange={e=>setSelected(Number(e.target.value))}>{entry.variants.map((v,i)=><option key={v.src} value={i}>{v.label}</option>)}</SelectField>}
    </div>
  </article>;
}
export default function WidgetGallery({place}:{place:GalleryPlace}) {
  const router=useRouter();
  const [pending,startTransition]=useTransition();
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<string>('comparison');
  const all=curatedGalleryEntries(place);
  const fold=(s:string)=>s.toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const entries=all.filter(w=>filter===w.group&&fold(w.title+' '+w.id).includes(fold(query)));
  const sources=[...new Map(allWidgets().filter(widget=>entries.some(entry=>entry.id===widget.id)).flatMap(widget=>widget.sources).map(source=>[source.name,source])).values()];
  return <main className={styles.page}>
    <h1>Widgetgalerie</h1>
    <div className={styles.controls}>
      <div className={styles.place}><label>Ort für die regionalen Widgets</label><OnsiteSearch persistent ariaLabel="Ort für die Widgets suchen" placeholder="Ort suchen …" align="left" loadItems={places} onPick={item=>startTransition(()=>router.replace(`/widget-galerie?ort=${item.id}`,{scroll:false}))}/><span role="status">{pending?'Ort wird geladen …':place.name}</span></div>
      <label className={styles.search}>Widgets suchen<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Widget oder Thema"/></label>
    </div>
    <div className={styles.filters} aria-label="Widget-Themen">{GALLERY_CATEGORIES.map(({id,label})=><button key={id} aria-pressed={id===filter} onClick={()=>setFilter(id)}>{label}</button>)}<span>{entries.length} {entries.length===1?'Widget':'Widgets'}</span></div>
    <div className={styles.grid}>{entries.map(entry=><Card key={entry.id} entry={entry}/>)}</div>
    {!entries.length&&<p>Keine Widgets für diese Auswahl.</p>}
    {sources.length>0&&<DataSourcesSection><DataSourceNote source={sources}/></DataSourcesSection>}
  </main>;
}
