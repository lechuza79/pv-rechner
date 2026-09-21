'use client';
import {useState,useEffect,useRef} from 'react';
import type {StoryConcept} from '../../lib/story-konzepte';
import {approvedStoryVisual} from '../../lib/story-approved-visual';
import {formatStoryDate} from '../../lib/story-format';
import {ApprovedStoryVisual} from './ApprovedStoryVisual';
import {YieldChart} from './YieldChart';
import {RankStoryChart} from './RankStoryChart';
import {MonthlySolarChart} from './MonthlySolarChart';
import {AnnualEnergyChart} from './AnnualEnergyChart';
import Modal from '../Modal';
import foundation from './atlas-foundations.module.css';
import chart from './StoryConceptLab.module.css';
import styles from './MunicipalStoryPreview.module.css';

export default function MunicipalStoryPreview({stories,name,embedded=false,surfaceScheme='light'}:{stories:StoryConcept[];name:string;embedded?:boolean;surfaceScheme?:string}) {
 const sectionRef=useRef<HTMLElement>(null);
 const [feed,setFeed]=useState(false),[selected,setSelected]=useState<number|null>(null),[feedback,setFeedback]=useState('');
 useEffect(()=>{const id=new URLSearchParams(window.location.search).get('story');const index=stories.findIndex(story=>story.id===id);if(index>=0)setSelected(index);},[stories]);
 useEffect(()=>{
  if(!embedded||!sectionRef.current)return;
  const notify=()=>window.parent.postMessage({type:'story-preview-layout',modal:feed||selected!==null,height:sectionRef.current?.scrollHeight},window.location.origin);
  const observer=new ResizeObserver(notify);observer.observe(sectionRef.current);notify();
  return()=>observer.disconnect();
 },[embedded,feed,selected]);
 if(!stories.length)return null;
 const open=(index:number)=>{setSelected(index);setFeedback('');};
 const visual=(story:StoryConcept,compact:boolean)=>{const approved=approvedStoryVisual(story);return <div className={`${chart.visualTheme} ${styles.visual} ${story.kind==='yield'?chart.preview:''}`} data-story-scheme="dark">{story.energyYear?<AnnualEnergyChart key={story.id} data={story.energyYear} compact={compact}/>:story.solarMonth?<MonthlySolarChart key={story.id} data={story.solarMonth} compact={compact}/>:story.kind==='rank'&&story.rankSummary?.length?<RankStoryChart story={story} compact={compact}/>:approved?<ApprovedStoryVisual bild={approved} compact={compact} date={story.sourceDate} provisional={story.label==='Vorjahreszeitraum'}/>:story.kind==='yield'&&story.yieldSeries?.length?<YieldChart story={story} compact={compact}/>:null}</div>;};
 const cards=(all:boolean)=><div className={all?styles.feed:styles.grid}>{(all?stories:stories.slice(0,3)).map((story,index)=><button className={styles.card} key={story.id} onClick={()=>open(index)}>{visual(story,true)}<div className={styles.copy}><small>{formatStoryDate(story.period)}</small><h3>{story.title}</h3><span>Story ansehen →</span></div></button>)}</div>;
 const active=selected===null?null:stories[selected];
 const share=async()=>{const url=new URL(window.location.href);url.hash='geschichten';url.searchParams.set('story',active!.id);try{await navigator.clipboard.writeText(url.href);setFeedback('Vorschaulink kopiert.');}catch{setFeedback('Link konnte nicht kopiert werden.');}};
 return <section ref={sectionRef} data-story-scheme={surfaceScheme} id="geschichten" className={`${foundation.foundation} ${styles.section} ${embedded?styles.embedded:''}`}>
 <header><h2>Geschichten aus {name}</h2><button onClick={()=>setFeed(true)}>Alle {stories.length} Geschichten →</button></header>
 {cards(false)}
 <Modal scheme={surfaceScheme} open={feed&&selected===null} onClose={()=>setFeed(false)} title={`Geschichten aus ${name}`} maxWidth={1040} className={foundation.foundation}>{cards(true)}</Modal>
 <Modal scheme={surfaceScheme} open={active!==null} onClose={()=>setSelected(null)} title={name} maxWidth={900} className={foundation.foundation}>{active&&<>
 <nav className={styles.navigation}><button onClick={()=>open((selected!+stories.length-1)%stories.length)}>← Vorherige</button><span>{selected!+1} / {stories.length}</span><button onClick={()=>open((selected!+1)%stories.length)}>Nächste →</button></nav>
 {visual(active,false)}
 {active.kind!=='yield'&&<p className={styles.source}>Quelle: {!active.sources?.length&&(active.sourceCaption??"Marktstammdatenregister · eigene Auswertung")}{active.sources?.map((source,index)=><span key={source.url}>{index>0?' · ':''}<a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></span>)}</p>}
 {active.teaser&&<p className={styles.text}>{active.teaser}</p>}
 <button className={styles.share} onClick={share}>Vorschaulink kopieren</button><p role="status">{feedback}</p>
 </>}</Modal>
 </section>;
}
