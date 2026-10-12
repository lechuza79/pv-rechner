'use client';
import PreviewDataNotice from '../../../components/dashboard/PreviewDataNotice';
import {useEffect,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import OnsiteSearch, {type OnsiteSearchItem} from '../../../components/OnsiteSearch';
import WidgetPreviewCard from '../../../components/dashboard/WidgetPreviewCard';
import PersonBox from '../../../components/PersonBox';
import SiteFuss from '../../../components/SiteFuss';
import '../../../public/shared-person/person.css';
import '../../../public/shared-person/person-box.css';
import DataSourcesSection from '../../../components/DataSourcesSection';
import {DataSourceNote} from '../../../components/PoweredBy';
import {allWidgets} from '../../../lib/widget-registry';
import WidgetConfigurationGroup from '../../../components/dashboard/WidgetConfigurationGroup';
import SectionFilter from '../../../components/SectionFilter';
import {curatedGalleryEntries,combinationGalleryEntries,GALLERY_CATEGORIES,RACING_WIDGET_IDS,type GalleryPlace} from '../../../lib/widget-gallery';
import RacingPreviewCard from '../../../components/dashboard/RacingPreviewCard';
import styles from './gallery.module.css';
import {GalleryIntroduction,GalleryExamples,GALLERY_EXAMPLES} from './GalleryIntroduction';
import {EmbeddedModalHost} from '../../../components/Modal';
import '../../../components/WidgetVideoDialog.module.css';

async function places(query:string,signal:AbortSignal):Promise<OnsiteSearchItem[]> {
  const response=await fetch(`/api/atlas/search?q=${encodeURIComponent(query)}`,{signal});
  if(!response.ok)throw new Error('Place search failed');
  const {hits=[]}=await response.json() as {hits:{region_id:string;name:string;label:string}[]};
  return hits.filter(hit=>/^\d{8}$/.test(hit.region_id)).map(hit=>({id:hit.region_id,label:hit.name,description:hit.label}));
}
export default function WidgetGallery({place,initialFilter,racePreset,snapshotAt}:{place:GalleryPlace;snapshotAt:string;initialFilter?:string;racePreset?:boolean}) {
  const router=useRouter();
  const [pending,startTransition]=useTransition();
  const [query,setQuery]=useState('');
  const [clearedPlace,setClearedPlace]=useState(false);
  const [filter,setFilter]=useState<string>(initialFilter??'combination');
  useEffect(()=>setFilter(initialFilter??'combination'),[initialFilter]);
  const home=filter==='combination';
  const all=curatedGalleryEntries(place).map(entry=>entry.group==='microcharts'?{...entry,variants:entry.variants.map(variant=>({...variant,src:variant.src+'&at='+encodeURIComponent(snapshotAt)}))}:entry);
  const combination=combinationGalleryEntries(all);
  const fold=(s:string)=>s.toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const entries=all.filter(w=>(filter==='racing'?RACING_WIDGET_IDS.has(w.id):filter===w.group)&&fold(w.title+' '+w.id).includes(fold(query)));
  const matchingCombination=combination.filter(w=>fold(w.title+' '+w.id).includes(fold(query)));
  const sourceEntries=filter==='combination'?matchingCombination:entries;
  const attributedEntries=home?[...sourceEntries,...all.filter(entry=>GALLERY_EXAMPLES.some(example=>example.id===entry.id))]:sourceEntries;
  const sources=[...new Map(allWidgets().filter(widget=>attributedEntries.some(entry=>entry.id===widget.id)).flatMap(widget=>widget.sources).map(source=>[source.name,source])).values()];
  return <><main className={styles.page}><EmbeddedModalHost/><PreviewDataNotice/>
    <h1>{home?'Energie-Widgets für deine Website':'Widgetgalerie'}</h1>
    {home&&<GalleryIntroduction/>}
    <div className={styles.controls}>
      <div className={styles.place}><label>Ort für die regionalen Widgets</label><OnsiteSearch persistent ariaLabel="Ort für die Widgets suchen" placeholder="Ort suchen …" align="left" loadItems={places} selectedItem={clearedPlace?null:{id:place.ags,label:place.name}} onClear={()=>setClearedPlace(true)} onPick={item=>{setClearedPlace(false);startTransition(()=>router.replace(`/widget-galerie?ort=${item.id}&gruppe=${filter}`,{scroll:false}));}}/>{pending&&<span role="status">Ort wird geladen …</span>}</div>
      <div className={styles.search}><label>Widgets suchen</label><OnsiteSearch persistent suggestions={false} ariaLabel="Widgets suchen" placeholder="Widget oder Thema …" onQueryChange={setQuery}/></div>
    </div>
    <div className={styles.filters}><SectionFilter links={[{href:"#kontakt",label:"Kontakt"}]} label="Widget-Themen" items={[{id:'combination',label:'Startseite'},...GALLERY_CATEGORIES,{id:'microcharts',label:'Mikrocharts'}]} value={filter} onChange={value=>{setFilter(value);startTransition(()=>router.push(`/widget-galerie?ort=${place.ags}&gruppe=${value}`,{scroll:false}));}}/><span>{sourceEntries.length} {sourceEntries.length===1?'Widget':'Widgets'}</span></div>
    {home&&<WidgetConfigurationGroup title="Energie vor Ort: drei Charts, ein Überblick" description="Wo stehen die Anlagen, wie entwickelt sich die Solarenergie und wie schneidet dein Ort im Vergleich ab? Diese Kombination verbindet Karte, Entwicklung und Ranking. Wähle oben deinen Ort und passe die Darstellung gemeinsam an." entries={matchingCombination} surfaceScheme="light"/>}
    <div className={styles.grid}>{entries.map(entry=>entry.id==='regional-race'?<RacingPreviewCard key={entry.id+place.ags} entry={entry} place={place} preset={racePreset}/>:<WidgetPreviewCard key={entry.id+place.ags} entry={entry}/>)}</div>
    {home&&<GalleryExamples entries={all} placeId={place.ags}/>}
    {!sourceEntries.length&&<p>Keine Widgets für diese Auswahl.</p>}
    <div id="kontakt" className={styles.contact}><PersonBox text={<>Du möchtest Charts auf deiner Website nutzen? <strong>Lass uns gemeinsam schauen, was passt.</strong> Schreib mir, welche Daten und Darstellungen du brauchst.</>} knopf="Kontakt aufnehmen"/></div>
  </main><div data-page-footer><SiteFuss zwischen={sources.length>0?<DataSourcesSection><DataSourceNote source={sources}/></DataSourcesSection>:undefined}/></div></>;
}
