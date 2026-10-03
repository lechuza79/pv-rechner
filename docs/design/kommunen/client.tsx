import '../../../components/data-sources-section.css';
import StorySlider from '../../../components/StorySlider';
/** Compose existing interactive pieces; no copied search or teaser implementation. */
import React, {useState,useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import { createRoot } from 'react-dom/client';
import {MunicipalStoryModal} from '../../../components/gemeinde/GemeindeInsights';
import type {StoryConcept} from '../../../lib/story-konzepte';
import '../../../components/dashboard/dashboard.css';
import GemeindeWidgetGroup from '../../../components/gemeinde/GemeindeWidgetGroup';
import type {GalleryPlace} from '../../../lib/widget-gallery';
import CalculatorShowcase from './CalculatorShowcase';
import '../../../components/gemeinde/section-nav.css';
import '../../../components/tool-teaser.css';
import CalculatorScrollShowcase from './CalculatorScrollShowcase';
import DeviceStage from './DeviceStage';
import '../../../components/calculator/tap-pointer.css';
import ChartFlag from '../../../components/charts/ChartFlag';
import {IconExternal} from '../../../components/Icons';
import RegionSearch from '../../../components/atlas/RegionSearch';

function TabletScreen({ags,name}:{ags:string;name:string}) {
 const screen=useRef<HTMLDivElement>(null);
 const [viewport,setViewport]=useState({scale:.5,height:960});
 useEffect(()=>{
  const node=screen.current;if(!node)return;
  const resize=()=>{
   const scale=node.clientWidth/1280;
   if(scale>0)setViewport({scale,height:node.clientHeight/scale});
  };
  const observer=new ResizeObserver(resize);observer.observe(node);resize();
  return()=>observer.disconnect();
 },[]);
 // The embedded document owns scrolling. Its scaled viewport must fit the screen,
 // rather than clipping a tall, non-interactive document behind the device rim.
 return <div className="device-screen"><div className="dashboard-viewport" ref={screen}><iframe key={ags} title={`Energiemonitor ${name}`} src={`/embed/gemeinde/${ags}/monitor`} loading="eager" className="municipal-dashboard-frame" style={{width:1280,height:viewport.height,transform:`scale(${viewport.scale})`,transformOrigin:'top left'}}/></div></div>;
}
function PlaceLink({place}:{place:{ags:string;name:string}}) {
 return <a className="municipal-place-link" target="_blank" rel="noopener noreferrer" href={`https://solar-check.io/api/atlas/goto?ags=${place.ags}`} aria-label={`${place.name}: Gemeindeseite in neuem Tab öffnen`}><strong>{place.name}</strong><IconExternal size={16}/></a>;
}
function StandaloneWidget({ags}:{ags:string}) {
 const [place,setPlace]=useState<GalleryPlace|null>(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{const controller=new AbortController();setPlace(null);setFailed(false);
 fetch(`/api/kommunen/vorschau?ags=${ags}`,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Widget data unavailable');return r.json();}).then(p=>setPlace(p.widgetPlace)).catch(e=>{if(e.name!=='AbortError')setFailed(true)});return()=>controller.abort();},[ags]);
 return place?<GemeindeWidgetGroup surfaceScheme="dark" key={ags} place={place} title="Ihre Daten. Ihre Auswahl." description="Stellen Sie Ihre Website aus einzelnen Widgets zusammen: Karte, Monatsverlauf und Ortsvergleich lassen sich separat einbetten und passend zu Ihrem Auftritt gestalten. Nutzen Sie gemeinsame Einstellungen oder passen Sie einzelne Widgets gezielt an."/>:<p role="status">{failed?'Die Widgets konnten nicht geladen werden.':'Widgets werden geladen …'}</p>;
}
function DashboardPreview() {
 const [place,setPlace]=useState({ags:'06440016',name:'Nidda'});
 return <><div className="municipal-place-picker"><span>Energiemonitor</span><div className="municipal-place-controls"><PlaceLink place={place}/><RegionSearch align="left" onPick={(ags,name,kreisfrei)=>setPlace({ags:kreisfrei?ags.padEnd(8,'0'):ags,name})}/></div></div><DeviceStage tablet><div className="device-shell device-tablet"><TabletScreen ags={place.ags} name={place.name}/></div></DeviceStage>{createPortal(<StandaloneWidget ags={place.ags}/>,document.getElementById('municipal-widget-gallery')!)}</>;
}
createRoot(document.getElementById('municipal-dashboard')!).render(<DashboardPreview/>);
function StoryPreview() {
 const demo=useRef<HTMLDivElement>(null);

 const [place,setPlace]=useState({ags:'06440016',name:'Nidda'});
 const [data,setData]=useState<StoryConcept[]|null>(null),[error,setError]=useState(false);
 useEffect(()=>{
  const node=demo.current;if(!node)return;
  let started=false;const timers:ReturnType<typeof setTimeout>[]=[];let pointer:HTMLElement|null=null;
  const observer=new IntersectionObserver(([entry])=>{
   if(!entry.isIntersecting||started||!node.querySelector('.story-caption-toggle'))return;
   started=true;
   timers.push(setTimeout(()=>{
    node.querySelector<HTMLButtonElement>('[aria-label="Story pausieren"]')?.click();
    const button=node.querySelector<HTMLButtonElement>('.story-reader-slide[aria-hidden="false"] .story-caption-toggle');
    if(!button||button.getAttribute('aria-expanded')==='true')return;
    pointer=document.createElement('span');pointer.className='wp-solar-pointer';pointer.style.left='60%';pointer.style.setProperty('--result-accent','#b59aee');button.append(pointer);
    timers.push(setTimeout(()=>button.click(),440));
    timers.push(setTimeout(()=>pointer?.remove(),1350));
    timers.push(setTimeout(()=>{if(button.getAttribute('aria-expanded')==='true')button.click();node.querySelector<HTMLButtonElement>('[aria-label="Story fortsetzen"]')?.click()},16000));
   },3000));
  },{threshold:.55});observer.observe(node);
  return()=>{observer.disconnect();timers.forEach(clearTimeout);pointer?.remove()};
 },[data]);
 useEffect(()=>{const controller=new AbortController();setData(null);setError(false);
 fetch(`/api/kommunen/vorschau?ags=${place.ags}`,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Story load failed');return r.json();}).then(p=>setData(p.stories.filter((s:StoryConcept)=>s.kind!=='rank'))).catch(e=>{if(e.name!=='AbortError')setError(true);});return()=>controller.abort();},[place.ags]);
 return <><div className="municipal-place-picker"><span>Datenstories aus</span><div className="municipal-place-controls"><PlaceLink place={place}/><RegionSearch align="left" onPick={(ags,name,kreisfrei)=>setPlace({ags:kreisfrei?ags.padEnd(8,'0'):ags,name})}/></div></div><DeviceStage><div ref={demo} className="municipal-story-demo"><ChartFlag className="municipal-story-flag municipal-story-flag-visual" edge="end" placement="left"><strong>Zahlen sichtbar machen.</strong><span>Lokale Entwicklungen auf einen Blick.</span></ChartFlag><ChartFlag className="municipal-story-flag municipal-story-flag-copy" edge="end" placement="left"><strong>Mehr erfahren.</strong><span>Ein Tap öffnet Einordnung und Quellen.</span></ChartFlag><div className="device-shell device-phone"><div className="device-notch" aria-hidden="true"/><div className="device-screen">{error?<p role="status">Die Stories konnten nicht geladen werden. Bitte wählen Sie einen anderen Ort.</p>:data===null?<p role="status">Stories werden geladen …</p>:data.length?<MunicipalStoryModal key={place.ags} stories={data} name={place.name} initial={Math.max(0,data.findIndex(s=>s.kind==='facts'))} surfaceScheme="dark" inline onClose={()=>{}}/>:<p role="status">Für diesen Ort liegen noch keine Stories vor.</p>}</div></div></div></DeviceStage></>;
}
createRoot(document.getElementById('municipal-story-detail')!).render(<StoryPreview/>);


createRoot(document.getElementById('municipal-calculator-demo')!).render(document.body.dataset.calculatorLayout === "scroll" ? <CalculatorScrollShowcase/> : <CalculatorShowcase/>);

// Keep the reused section navigation out of the hero, including restored scroll positions.
const sectionNav=document.querySelector<HTMLElement>('.v3-section-nav');
const heroStage=document.querySelector<HTMLElement>('#municipal-landscape-hero,main>.sc-waitlist-preview');
if(sectionNav&&heroStage){
 const updateNav=()=>{sectionNav.dataset.afterHero=String(heroStage.getBoundingClientRect().bottom<=80)};
 window.addEventListener('scroll',updateNav,{passive:true});
 window.addEventListener('resize',updateNav);
 updateNav();
}

// Enhance the existing shared teaser markup only on small screens.
const teaserTrack=document.querySelector<HTMLElement>('[data-calculator-layout="scroll"] .homepage-tool-teasers');
if(teaserTrack){
 const viewport=document.createElement('div');viewport.className='municipal-tools-viewport';
 teaserTrack.before(viewport);
 const cards=Array.from(teaserTrack.children).map(card=>card.outerHTML);
 const mobile=window.matchMedia('(max-width: 700px)');
 let sliderRoot:ReturnType<typeof createRoot>|undefined;
 const sync=()=>{
  if(mobile.matches){
   teaserTrack.remove();
   sliderRoot??=createRoot(viewport);
   sliderRoot.render(<StorySlider ariaLabel="Energie-Checks ausprobieren" itemLabel="Energie-Check" fullWidth arrows={false} autoplay>{cards.map((html,i)=><div key={i} className="municipal-tool-slide" dangerouslySetInnerHTML={{__html:html}}/>)}</StorySlider>);
  }else{
   sliderRoot?.unmount();sliderRoot=undefined;viewport.append(teaserTrack);
  }
 };
 mobile.addEventListener('change',sync);sync();
}
