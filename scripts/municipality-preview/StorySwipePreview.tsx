'use client';
import {IconArrowRight,IconChevronLeft,IconChevronRight,IconShare,IconPlay,IconPause,IconCopy,IconDownload,IconClose} from '@solar-check/story-source/components/Icons';
import {useState,useEffect,useRef} from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from './vendor/embla-auto-scroll.mjs';
import './story-swipe.css';
import type {StoryConcept} from '@solar-check/story-source/lib/story-konzepte';
import {formatStoryDate} from '@solar-check/story-source/lib/story-format';
import {MunicipalChart} from '@solar-check/story-source/components/social/MunicipalChart';
import Modal,{ModalHeader} from '@solar-check/story-source/components/Modal';
import foundation from '@solar-check/story-source/components/social/atlas-foundations.module.css';
import chart from '@solar-check/story-source/components/social/StoryConceptLab.module.css';
import styles from '@solar-check/story-source/components/social/MunicipalStoryPreview.module.css';

const storyVisual=(story:StoryConcept,compact:boolean,autoPlay=false,scheme='dark')=><div className={`${chart.visualTheme} ${compact?styles.visual:chart.figure} ${story.kind==='yield'&&compact?chart.preview:''}`} data-story-scheme={scheme}><MunicipalChart story={story} compact={compact} autoPlay={autoPlay}/></div>;
const ignoreStorySelection=(_index:number)=>{};

export type MunicipalStoryModalProps={
 stories:StoryConcept[];
 name:string;
 initial?:number;
 onClose:()=>void;
 surfaceScheme?:string;
 open?:boolean;
 onSelect?:(index:number)=>void;
};

/** The same reader shell is shared by the municipality and homepage hosts. */
export function MunicipalStoryModal({stories,name,initial=0,onClose,surfaceScheme='light',open=true,onSelect=ignoreStorySelection}:MunicipalStoryModalProps){
 if(!stories.length)return null;
 const start=Math.max(0,Math.min(stories.length-1,Math.trunc(initial)||0));
 return <Modal scheme={surfaceScheme} open={open} onClose={onClose} title={name} maxWidth={900} className={`${foundation.foundation} story-reader-dialog`}>
  <StoryReader name={name} stories={stories} initial={start} visual={storyVisual} styles={styles} onSelect={onSelect} isOpen={open} onClose={onClose}/>
 </Modal>;
}

export type MunicipalStoryPreviewProps={
 stories:(StoryConcept & {thumbLabel?:string})[];
 name:string;
 embedded?:boolean;
 surfaceScheme?:string;
 visualScheme?:string;
 onStoryOpen?:(story:StoryConcept)=>void;
 showHeader?:boolean;
 showDate?:boolean;
 showTown?:boolean;
 paused?:boolean;
};

export default function MunicipalStoryPreview({stories,name,embedded=false,surfaceScheme='light',visualScheme='dark',onStoryOpen,showHeader=true,showDate=true,showTown=false,paused=false}:MunicipalStoryPreviewProps) {
 const sectionRef=useRef<HTMLElement>(null);
 const autoplay=useRef(AutoScroll({speed:.55,startDelay:700,playOnInit:false,stopOnInteraction:false,stopOnMouseEnter:true,stopOnFocusIn:true}));
 const [stripRef,stripApi]=useEmblaCarousel({loop:true,align:'start',duration:35,dragFree:true},[autoplay.current]);
 const [openId,setOpenId]=useState(0);
 const lastSelected=useRef(0);
 const [feed,setFeed]=useState(false),[selected,setSelected]=useState<number|null>(null);
 useEffect(()=>{if(onStoryOpen)return;const id=new URLSearchParams(window.location.search).get('story');const index=stories.findIndex(story=>story.id===id);if(index>=0){lastSelected.current=index;setSelected(index);}},[stories,onStoryOpen]);
 useEffect(()=>{
  if(!embedded||!sectionRef.current)return;
  const notify=()=>window.parent.postMessage({type:'story-preview-layout',modal:feed||selected!==null,height:sectionRef.current?.scrollHeight},window.location.origin);
  const observer=new ResizeObserver(notify);observer.observe(sectionRef.current);notify();
  return()=>observer.disconnect();
 },[embedded,feed,selected!==null]);
 useEffect(()=>{if(!stripApi||!sectionRef.current)return;const reduced=matchMedia('(prefers-reduced-motion: reduce)');let visible=false;const update=()=>{if(visible&&!document.hidden&&!feed&&selected===null&&!paused&&!reduced.matches)autoplay.current.play();else autoplay.current.stop();};const guard=()=>{if(!visible||document.hidden||feed||selected!==null||paused||reduced.matches)autoplay.current.stop();};stripApi.on('autoScroll:play' as any,guard);const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();},{threshold:.3});observer.observe(sectionRef.current);document.addEventListener('visibilitychange',update);reduced.addEventListener('change',update);return()=>{stripApi.off('autoScroll:play' as any,guard);observer.disconnect();document.removeEventListener('visibilitychange',update);reduced.removeEventListener('change',update);autoplay.current.stop();};},[stripApi,feed,selected!==null,paused]);
 useEffect(()=>{if(!stripApi)return;const root=stripApi.rootNode();root.dataset.loop=String(stripApi.internalEngine().options.loop);const reset=()=>{root.dataset.reinitializations=String(Number(root.dataset.reinitializations||0)+1);};stripApi.on('reInit',reset);return()=>{stripApi.off('reInit',reset);};},[stripApi]);
 if(!stories.length)return null;
 const open=(index:number)=>{if(onStoryOpen){setFeed(false);onStoryOpen(stories[index]);return;}lastSelected.current=index;setOpenId(id=>id+1);setSelected(index);};
 const previewVisual=(story:StoryConcept,compact:boolean,autoPlay=false)=>storyVisual(story,compact,autoPlay,visualScheme);
 const cards=(all:boolean)=><div className={all?styles.feed:'story-strip'} ref={all?undefined:stripRef}><div className={all?'story-feed-grid':'story-strip-track'}>{(all?stories:[...stories,...stories,...stories]).map((story,index)=><div className={all?'story-feed-cell':'story-strip-slide'} key={`${story.id}-${index}`}><button className={`${styles.card} story-preview-card`} data-preview-scheme={surfaceScheme} onClick={()=>{open(index%stories.length);}}>{<VisibleWidget enabled={selected===null&&!paused} story={story} visual={previewVisual}/>}<div className={styles.copy}>{showTown&&<small>{story.town}</small>}{showDate&&<small>{formatStoryDate(story.period)}</small>}<h3>{story.thumbLabel??story.title}</h3></div></button></div>)}</div></div>;
 return <section ref={sectionRef} data-story-scheme={surfaceScheme} id="geschichten" className={`${foundation.foundation} ${styles.section} ${embedded?styles.embedded:''}`}>
 {showHeader&&<header><h2>{name} im Fokus</h2><div className="story-strip-actions"><button onClick={()=>setFeed(true)} className="story-all-link">Alle {stories.length} Stories <IconArrowRight size={18}/></button></div></header>}
 {cards(false)}
 <Modal scheme={surfaceScheme} open={feed&&selected===null} onClose={()=>setFeed(false)} title={`Geschichten aus ${name}`} maxWidth={1040} className={foundation.foundation}>{cards(true)}</Modal>
 {!onStoryOpen&&<MunicipalStoryModal key={openId} stories={stories} name={name} initial={lastSelected.current} surfaceScheme={surfaceScheme} open={selected!==null} onSelect={setSelected} onClose={()=>setSelected(null)}/>}
 </section>;
}

function StoryReader({name,stories,initial,visual,styles,onSelect,isOpen,onClose}:any){
 const startIndex=useRef(initial);
 const [viewport,api]=useEmblaCarousel({loop:true,startIndex:startIndex.current,duration:25,watchDrag:(_api,event)=>!(event.target as HTMLElement).closest('button,a,input,select,textarea,[role=slider],.story-reader-context')});
 useEffect(()=>{if(!api)return;const preference=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>api.reInit({duration:preference.matches?0:25});update();preference.addEventListener('change',update);return()=>preference.removeEventListener('change',update);},[api]);
 const [index,setIndex]=useState(initial),[feedback,setFeedback]=useState('');
 const bodyRef=useRef<HTMLDivElement>(null);
 const [paused,setPaused]=useState(false),[held,setHeld]=useState(false),[busy,setBusy]=useState(false),[textOpen,setTextOpen]=useState(false),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false);
 const readUntil=useRef(0),progressRef=useRef<HTMLSpanElement>(null),pauseRef=useRef(false);
 pauseRef.current=paused||held||hovered||focused||textOpen||busy||!isOpen;
 useEffect(()=>{
  if(!api)return;
  let elapsed=0,last=performance.now(),frame=0;
  const tick=(now:number)=>{const delta=now-last;last=now;if(!pauseRef.current&&!document.hidden&&now>readUntil.current)elapsed+=Math.min(delta,100);const progress=Math.min(1,elapsed/10000);if(progressRef.current){progressRef.current.style.transform=`scaleX(${progress})`;progressRef.current.parentElement?.setAttribute('aria-valuenow',String(Math.round(progress*100)));}if(progress>=1){api.scrollNext();return;}frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[api,index]);
 useEffect(()=>{if(!api)return;const down=()=>setHeld(true),up=()=>setHeld(false);api.on('pointerDown',down);api.on('pointerUp',up);return()=>{api.off('pointerDown',down);api.off('pointerUp',up);};},[api]);
 useEffect(()=>{
  if(!api)return;
  const select=()=>{const next=api.selectedScrollSnap();setIndex(next);onSelect(next);setFeedback('');setTextOpen(false);};
  api.on('select',select);
  const keys=(event:KeyboardEvent)=>{if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||/INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement)?.tagName))return;if(event.key==='ArrowRight'){event.preventDefault();api.scrollNext();}if(event.key==='ArrowLeft'){event.preventDefault();api.scrollPrev();}};
  window.addEventListener('keydown',keys);
  return()=>{api.off('select',select);window.removeEventListener('keydown',keys);};
 },[api,onSelect]);
 const storyUrl=()=>{const url=new URL(window.parent.location.href);url.searchParams.set('story',stories[index].id);url.hash='atlas-stories';return url.href;};
 const copy=async()=>{try{await navigator.clipboard.writeText(storyUrl());setFeedback('Link kopiert.');}catch{setFeedback('Link konnte nicht kopiert werden.');}};
 const share=async()=>{setBusy(true);try{if(navigator.share){await navigator.share({title:stories[index].title,url:storyUrl()});}else await copy();}catch(error){if((error as Error).name!=='AbortError')await copy();}finally{setBusy(false);}};
 const download=async()=>{
  const node=bodyRef.current?.querySelector<HTMLElement>('.story-reader-slide[aria-hidden="false"] .story-export-card');if(!node)return;
  setBusy(true);setFeedback('Bild wird erstellt …');
  try{await document.fonts.ready;const {captureNodeToBlob,downloadBlob}=await import('@solar-check/story-source/lib/chart-export');const exportHost=document.createElement('div');
   exportHost.style.cssText='position:fixed;left:-100000px;top:0;pointer-events:none;';
   const exportCard=node.cloneNode(true) as HTMLElement;
   exportCard.style.cssText=`${node.getAttribute('data-sc-export-css')};width:${node.getBoundingClientRect().width}px;box-sizing:border-box;`;
   exportHost.appendChild(exportCard);document.body.appendChild(exportHost);
   try{const blob=await captureNodeToBlob(exportCard,3);downloadBlob(blob,`solar-check-story-${index+1}.png`);}finally{exportHost.remove();}setFeedback('Bild heruntergeladen.');}catch{setFeedback('Download fehlgeschlagen. Bitte erneut versuchen.');}finally{setBusy(false);}
 };
 return <>

 <ModalHeader><div className="story-progress-row"><div className="story-reader-segments" aria-label="Story auswählen">{stories.map((story:any,i:number)=><button key={story.id} aria-label={`Story ${i+1}: ${story.title}`} aria-current={index===i?'step':undefined} onClick={()=>api?.scrollTo(i)}><span className="story-segment-track" role={index===i?'progressbar':undefined} aria-label={index===i?'Story-Fortschritt':undefined} aria-valuemin={0} aria-valuemax={100}><span className="story-segment-fill" key={`${i}-${index}`} ref={index===i?progressRef:undefined} style={{transform:`scaleX(${i<index?1:0})`}}/></span></button>)}</div><button className="story-timer-toggle" aria-label={paused?'Story fortsetzen':'Story pausieren'} onClick={()=>setPaused(value=>!value)}>{paused?<IconPlay/>:<IconPause/>}</button><button className="story-close" aria-label="Schließen" onClick={onClose}><IconClose/></button></div></ModalHeader><div ref={bodyRef} className="story-reader-body"><div className="story-reader-viewport" ref={viewport}><div className="story-reader-track">{stories.map((story:any,i:number)=><article key={story.id} className="story-reader-slide" aria-label={story.title} aria-hidden={i!==index} inert={i!==index} >
 
 <div className="story-widget-area" onPointerEnter={event=>{if(event.pointerType==='mouse')setHovered(true);}} onPointerLeave={()=>setHovered(false)} onPointerDownCapture={()=>{readUntil.current=performance.now()+1500;}} onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}><StoryArtwork story={story} visual={visual} name={name} active={i===index&&isOpen}/></div><div className={`story-caption-overlay ${textOpen?'is-open':''}`}>
 <button className="story-caption-toggle" aria-expanded={textOpen} onClick={()=>{setTextOpen(value=>!value);setHeld(false);setFocused(false);readUntil.current=0;}} aria-label={textOpen?'Beschreibung schließen':'Beschreibung öffnen'}>{textOpen?'Schließen':null}</button>
 <div className="story-reader-context" inert={!textOpen} aria-label="Story-Beschreibung und Quellen">
 {story.teaser&&<p className={styles.text}>{story.teaser}</p>}
 {story.rankComparisonCopy?.map((text:string)=><p className={styles.text} key={text}>{text}</p>)}
 {story.kind!=='yield'&&<p className={styles.source}>Quelle: {!story.sources?.length&&(story.sourceCaption??'Marktstammdatenregister · eigene Auswertung')}{story.sources?.map((source:any,j:number)=><span key={source.url}>{j>0?' · ':''}<a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></span>)}</p>}
 </div>
 </div></article>)}</div></div></div><footer className="story-reader-bottom"><nav className="story-reader-controls" aria-label="Story wechseln"><div className="story-reader-pagination"><button aria-label="Vorherige Story" onClick={()=>api?.scrollPrev()}><IconChevronLeft size={16}/></button><span aria-live="polite" aria-atomic="true">{index+1} von {stories.length}</span><button aria-label="Nächste Story" onClick={()=>api?.scrollNext()}><IconChevronRight size={16}/></button></div><div className="story-reader-actions"><button className="story-reader-share" aria-label="Story teilen" disabled={busy} onClick={share}><IconShare/>Teilen</button><button aria-label="Link kopieren" title="Link kopieren" onClick={copy}><IconCopy/></button><button aria-label="Story als Bild herunterladen" title="Bild herunterladen" disabled={busy} onClick={download}><IconDownload/></button></div></nav>{feedback&&<p className="story-share-status" role="status">{feedback}</p>}</footer>
 </>;
}

// Fit the whole original widget uniformly; its internal proportions stay untouched.
function StoryArtwork({story,visual,name,active}:any){
 const stage=useRef<HTMLDivElement>(null),canvas=useRef<HTMLDivElement>(null);
 const [foreground,setForeground]=useState(true);
 useEffect(()=>{const update=()=>setForeground(!document.hidden);update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 useEffect(()=>{const outer=stage.current,inner=canvas.current;if(!outer||!inner)return;
 const fit=()=>{const stages=Array.from(outer.closest('.story-reader-track')!.querySelectorAll<HTMLElement>('.story-artwork-stage'));const height=Math.max(...stages.map(stage=>(stage.querySelector('.story-export-card')?.firstElementChild as HTMLElement)?.offsetHeight||0));for(const stage of stages){const card=stage.firstElementChild as HTMLElement;card.style.height=height+'px';card.style.transform=`translate(-50%,-50%) scale(${Math.min(1,stage.clientHeight/height)})`;}};
 const observer=new ResizeObserver(fit);observer.observe(outer);if(inner.firstElementChild)observer.observe(inner.firstElementChild);fit();return()=>observer.disconnect();},[]);
 return <div className="story-artwork-stage" ref={stage}><div ref={canvas} className="story-export-card" data-sc-export-css="position:static;transform:none;height:auto;min-height:0;background:#08191c;border-radius:12px;display:block;">
 {visual(story,false,active&&foreground)}<div className="story-export-credit" data-sc-export-only="block">Solar Check · {name} · {formatStoryDate(story.sourceDate??story.period)}<br/>{story.sourceCaption??'Marktstammdatenregister · eigene Auswertung'}</div>
 </div></div>;
}
function VisibleWidget({story,visual,enabled}:any){
 const ref=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false),[foreground,setForeground]=useState(true);
 useEffect(()=>{if(!ref.current)return;const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting&&entry.intersectionRatio>=.6),{threshold:[0,.6]});observer.observe(ref.current);const update=()=>setForeground(!document.hidden);document.addEventListener('visibilitychange',update);return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);};},[]);
 return <div ref={ref} className="story-visible-widget">{visual(story,true,enabled&&visible&&foreground)}</div>;
}
