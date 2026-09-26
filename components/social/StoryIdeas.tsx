"use client";
import {IconArrowRight,IconChevronDown,IconClose} from '../Icons';
import SelectField from '../SelectField';
import {Pill} from './Pill';
import {readableComparison} from '../../lib/story-related';
import rankMonths from '../../lib/story-ranking-month-data.json';
import {appendRankingMonth,type RankMonthSnapshot} from '../../lib/story-ranking-month';
import {RankStoryChart} from './RankStoryChart';
import {MonthlySolarChart} from './MonthlySolarChart';
import {AnnualEnergyChart} from './AnnualEnergyChart';
import {appendAnnualEnergy,appendMonthlySolar} from '../../lib/story-monthly-candidate';
import {useEffect,useMemo,useState,useRef} from 'react';
import {formatStoryDate} from '../../lib/story-format';
import reports from '../../lib/story-discovery-reports.json';
import type {DiscoveryReport,Candidate} from '../../lib/story-discovery';
import {buildStoryPool,CONTENT_LABELS,TIME_LABELS,type TimeAspect,type StoryTopic} from '../../lib/story-pool';
import {approvedStoryVisual,storyVisualTemplate,STORY_VISUAL_TEMPLATES} from '../../lib/story-approved-visual';
import {conceptFromFinding} from '../../lib/story-finding-concept';
import {ApprovedStoryVisual} from './ApprovedStoryVisual';
import styles from './StoryIdeas.module.css';
import chartStyles from './StoryConceptLab.module.css';
import {YieldChart} from './YieldChart';
const coverageLabels:Record<string,string>={steckersolar:'Balkonkraftwerke',gebaeude:'Gebäudeanlagen',freiflaeche:'Freiflächenanlagen',sonstige:'Sonstige Solaranlagen',batterie:'Batteriespeicher',pumpspeicher:'Pumpspeicher','sonstiger-speicher':'Andere Speicher'};
const contentName=(label:string)=>(({Puls:'Aktuelle Entwicklung',Anomalie:'Auffälligkeiten',Balkon:'Balkonkraftwerke',Fläche:'Freiflächenanlagen',Kohorte:'Anlagenjahrgänge',Erzeugungsmodell:'Stromerzeugung'} as Record<string,string>)[label]??label);
const n=(value:number)=>value.toLocaleString('de-DE',{maximumFractionDigits:2});

function Evidence({claim}:{claim:Candidate}){return <><p className={styles.figures}>{claim.evidence.map(e=>`${e.label}: ${n(e.value)} ${e.unit}`).join(' · ')}</p><p className={styles.comparison}>{formatStoryDate(readableComparison(claim.comparison))}</p>{claim.limitations.map(l=><p className={styles.comparison} key={l}>{l}</p>)}</>;}
function CityPicker({directory,value,onChange}:{directory:{name:string;regionId:string}[];value:string;onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(-1);
 const input=useRef<HTMLInputElement>(null);
 const selected=directory.find(place=>place.regionId===value);
 const matches=useMemo(()=>directory.filter(place=>place.name.toLocaleLowerCase('de').includes(query.trim().toLocaleLowerCase('de'))).sort((a,b)=>a.name.localeCompare(b.name,'de')||a.regionId.localeCompare(b.regionId)),[directory,query]);
 const options=matches.slice(0,100);
 const select=(id:string)=>{onChange(id);setOpen(false);setQuery('');setActive(-1);};
 return <div className={styles.cityPicker} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)){setOpen(false);setQuery('');setActive(-1);}}}>
  <label htmlFor="story-city">Ort</label>
  <div className={styles.cityInput}>
   <input ref={input} id="story-city" role="combobox" aria-label="Ort" aria-autocomplete="list" aria-expanded={open} aria-controls="story-city-options" aria-activedescendant={active>=0?`story-city-${options[active]?.regionId}`:undefined} placeholder="Alle Orte" value={open?query:selected?.name??''}
    onFocus={()=>{setOpen(true);setQuery('');setActive(-1);}}
    onChange={event=>{setQuery(event.target.value);setOpen(true);setActive(-1);if(!event.target.value)onChange('all');}}
    onKeyDown={event=>{
     if(event.key==='Escape'){setOpen(false);setQuery('');setActive(-1);}
     if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setOpen(true);const next=Math.max(0,Math.min(options.length-1,active+(event.key==='ArrowDown'?1:-1)));setActive(next);document.getElementById(`story-city-${options[next]?.regionId}`)?.scrollIntoView({block:'nearest'});}
     if(event.key==='Enter'&&open&&options[active<0?0:active]){event.preventDefault();select(options[active<0?0:active].regionId);}
    }}/>
   {value!=='all'?<button type="button" aria-label="Ortsauswahl löschen" onClick={()=>select('all')}><IconClose size={16}/></button>:<button type="button" aria-label="Orte anzeigen" onClick={()=>{input.current?.focus();setOpen(true);}}><IconChevronDown size={16}/></button>}
  </div>
  {open&&<div className={styles.cityDropdown}><ul id="story-city-options" role="listbox" aria-label="Orte">{options.map((place,index)=><li id={`story-city-${place.regionId}`} key={place.regionId} role="option" aria-selected={value===place.regionId} className={index===active?styles.cityActive:undefined} onMouseDown={event=>event.preventDefault()} onClick={()=>select(place.regionId)}>{place.name}</li>)}</ul>{!options.length&&<p>Kein Ort gefunden.</p>}{matches.length>100&&<p>Weitere Orte über die Suche finden.</p>}</div>}
 </div>;
}
export default function StoryIdeas({onOpen}:{onOpen:(report:DiscoveryReport,topics:StoryTopic[],index:number,observation?:number)=>void}){
 const [city,setCity]=useState(()=>typeof window==='undefined'?'all':new URLSearchParams(window.location.search).get('city')??'all'),[category,setCategory]=useState<string>('all'),[time,setTime]=useState<TimeAspect|'all'>('all');
 const [preparation,setPreparation]=useState<{monthly:number;annual:number;values:number;completedAt:string;resumeAt?:string}|null>(null);
 useEffect(()=>{let active=true;const read=()=>fetch('/api/admin/story-discovery?coverage=1').then(r=>r.ok?r.json():null).then(data=>{if(active&&data)setPreparation(data);}).catch(()=>{});void read();const timer=setInterval(read,30000);return()=>{active=false;clearInterval(timer);};},[]);
 const [allReports,setAllReports]=useState<DiscoveryReport[]>([]),[nextPage,setNextPage]=useState<number|null>(0),[allLoading,setAllLoading]=useState(false);
 const loadMore=async(offset:number,reveal=false)=>{setAllLoading(true);setError('');try{const response=await fetch('/api/admin/story-discovery?city=all&offset='+offset);if(!response.ok)throw Error();const result=await response.json();setAllReports(previous=>[...new Map([...previous,...result.reports].map((r:DiscoveryReport)=>[r.regionId,r])).values()]);setNextPage(result.next);if(reveal)setExamplesOnly(false);}catch{setError('Weitere Orte konnten nicht geladen werden.');}finally{setAllLoading(false);}};
 const chooseCity=(value:string)=>{setCity(value);const url=new URL(window.location.href);if(value==='all')url.searchParams.delete('city');else url.searchParams.set('city',value);url.searchParams.delete('story');window.history.replaceState(null,'',url);};
 const [templateFilter,setTemplateFilter]=useState<'ready'|'all'>('ready');
 const [templateKind,setTemplateKind]=useState('all'),[examplesOnly,setExamplesOnly]=useState(true);
 const [directory,setDirectory]=useState(reports.map(r=>({name:r.name,regionId:r.regionId}))),[loaded,setLoaded]=useState<DiscoveryReport|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{fetch('/api/admin/story-discovery').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(setDirectory).catch(()=>setError('Ortsliste konnte nicht geladen werden. Die Beispielorte bleiben verfügbar.'));},[]);
 useEffect(()=>{if(city==='all'){setLoaded(null);setLoading(false);setError('');return;}const bundled=reports.find(r=>r.regionId===city);if(bundled){setLoaded(null);setLoading(false);setError('');}const place=directory.find(r=>r.regionId===city);if(!place)return;const controller=new AbortController();setLoaded(null);setLoading(true);setError('');fetch('/api/admin/story-discovery?city='+place.regionId,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(r=>{setLoaded(r);setLoading(false);}).catch(e=>{if(e.name!=='AbortError'){setError('Auswertung konnte nicht geladen werden.');setLoading(false);}});return()=>controller.abort();},[city,directory]);
 const initialPageRequested=useRef(false);
 useEffect(()=>{if(city==='all'&&!initialPageRequested.current){initialPageRequested.current=true;void loadMore(0);}},[city]);
 const selectedReport=(loaded??reports.find(r=>r.regionId===city)) as DiscoveryReport|undefined;
 const activeReports=useMemo(()=>{
  const sources=city==='all'?[...new Map([...(reports as DiscoveryReport[]),...allReports].map(r=>[r.regionId,r])).values()]:selectedReport?[selectedReport]:[];
  return sources.map(source=>{const r=structuredClone(source);appendMonthlySolar(r);appendAnnualEnergy(r);const month=(rankMonths as Record<string,{current:RankMonthSnapshot;previous?:RankMonthSnapshot}>)[r.regionId];if(month&&source!==loaded)appendRankingMonth(r,month.current,month.previous);return r;});
 },[city,selectedReport,loaded,allReports]);
 const report=(activeReports[0]??{version:'',name:'',regionId:'',sourceDate:'',source:'',candidates:[],checks:[],warnings:[],scannedRows:0,merged:0}) as DiscoveryReport;
 const pools=useMemo(()=>activeReports.map(r=>{const p=buildStoryPool(r);return {report:r,pool:{...p,topics:p.topics.map(t=>({...t,id:r.regionId+':'+t.id}))}};}),[activeReports]);
 const pool=useMemo(()=>({...buildStoryPool(report),topics:pools.flatMap(p=>p.pool.topics),observationCount:pools.reduce((s,p)=>s+p.pool.observationCount,0)}),[pools,report]);
 const reportsByCity=useMemo(()=>new Map(activeReports.map(r=>[r.regionId,r])),[activeReports]);
 const owner=(topic:StoryTopic)=>reportsByCity.get(topic.id.split(':',1)[0])??report;

 const openedLink=useRef('');
 useEffect(()=>{const id=new URLSearchParams(window.location.search).get('story');if(!id||!report.regionId||openedLink.current===id)return;const index=pool.topics.findIndex(t=>t.observations.some(c=>c.id===id));if(index>=0){openedLink.current=id;onOpen(report,pool.topics,index,pool.topics[index].observations.findIndex(c=>c.id===id));}},[report,pool,onOpen]);
 const readyTopics=useMemo(()=>pool.topics.map(topic=>({...topic,observations:topic.observations.filter((_,index)=>storyVisualTemplate(conceptFromFinding(owner(topic),topic,index)))})).filter(topic=>topic.observations.length>0),[pool,report]);
 const matching=(templateFilter==='ready'?readyTopics:pool.topics).filter(t=>(category==='all'||t.categories.includes(category))&&(time==='all'||t.timeAspects.includes(time))).flatMap(topic=>{
  const groups=new Map<string,typeof topic.observations>();
  topic.observations.forEach((observation,index)=>{
   const kind=storyVisualTemplate(conceptFromFinding(owner(topic),topic,index))??'none';
   if(templateKind!=='all'&&kind!==templateKind)return;
   groups.set(kind,[...(groups.get(kind)??[]),observation]);
  });
  return Array.from(groups,([kind,observations])=>({kind,topic:{...topic,id:topic.id+'-'+kind,observations}}));
 });
 // Prefer the designed monthly example when collapsing the yield family.
 matching.sort((a,b)=>{
  const monthly=(entry:typeof a)=>Number(entry.kind==='yield'&&(conceptFromFinding(owner(entry.topic),entry.topic).yieldSeries?.length??0)>24);
  return monthly(b)-monthly(a);
 });
 // Distribute template examples across municipalities instead of taking every
 // example from whichever bundled report happens to be first.
 const exampleCities=new Map<string,number>();
 const examples=Array.from(new Set(matching.map(item=>item.kind)),kind=>{
  const candidates=matching.filter(item=>item.kind===kind);
  const selected=candidates.reduce((best,item)=>(exampleCities.get(owner(item.topic).regionId)??0)<(exampleCities.get(owner(best.topic).regionId)??0)?item:best);
  const cityId=owner(selected.topic).regionId;
  exampleCities.set(cityId,(exampleCities.get(cityId)??0)+1);
  return selected;
 });
 const shown=(examplesOnly?examples:matching).map(({topic})=>examplesOnly?{...topic,observations:topic.observations.slice(0,1)}:topic);
 return <section className={styles.ideas}>
 <div className={styles.intro}><h1>Stories entdecken</h1><p>Gestaltete Datenstories für unsere Kommunen. Ort und Thema wählen oder die Chart-Templates vergleichen.</p></div>
 {preparation&&<details><summary>Datenabdeckung: {preparation.monthly.toLocaleString('de-DE')} Monatsprofile · {preparation.annual.toLocaleString('de-DE')} Jahresprofile · {preparation.values.toLocaleString('de-DE')} Orte mit Stromkennzahlen</summary><p>Diese Zahlen zeigen, für wie viele Orte die jeweiligen Daten bereits vorbereitet sind. Sie sind unabhängig von den unten geladenen Stories.{preparation.resumeAt?` Der Wetterabruf wird nach dem Anbieterlimit am ${new Date(preparation.resumeAt).toLocaleString('de-DE')} automatisch fortgesetzt.`:''}</p></details>}
 {city!=='all'&&report.prepared&&<details><summary>Datenverfügbarkeit</summary><ul>{report.prepared.availability.map(item=><li key={item.topic}><strong>{item.topic}: {item.status==='ready'?'bereit':'noch nicht verfügbar'}</strong> — {item.reason}</li>)}</ul></details>}
 {city==='07211000'&&<p><a href="/atlas-design-preview/index.html#atlas-stories">Auf der Kommunenseite ansehen →</a></p>}
 <header className={styles.filters}><CityPicker directory={directory} value={city} onChange={chooseCity}/><label>Stories <SelectField block ariaLabel="Vorlagen" value={templateFilter} onChange={e=>setTemplateFilter(e.target.value as 'ready'|'all')}><option value="ready">Mit gestaltetem Chart</option><option value="all">Alle Stories</option></SelectField></label><label>Chart-Template <SelectField block ariaLabel="Chart-Template" value={templateKind} onChange={e=>setTemplateKind(e.target.value)}><option value="all">Alle Templates</option>{STORY_VISUAL_TEMPLATES.map(template=><option key={template.id} value={template.id}>{template.name}{readyTopics.some(topic=>topic.observations.some((_,index)=>storyVisualTemplate(conceptFromFinding(owner(topic),topic,index))===template.id))?'':' · noch ohne Story'}</option>)}</SelectField></label><label>Anzeige <SelectField block ariaLabel="Anzeige" value={examplesOnly?'examples':'all'} onChange={e=>setExamplesOnly(e.target.value==='examples')}><option value="examples">Ein Beispiel je Template</option><option value="all">Alle passenden Stories</option></SelectField></label><label>Inhalt <SelectField block ariaLabel="Inhalt" value={category} onChange={e=>setCategory(e.target.value as typeof category)}><option value="all">Alle Inhalte</option>{Object.entries(CONTENT_LABELS).map(([value,label])=><option key={value} value={value}>{contentName(label)} ({pool.topics.filter(t=>t.categories.includes(value)).length})</option>)}</SelectField></label><label>Zeitbezug <SelectField block ariaLabel="Zeitbezug" value={time} onChange={e=>setTime(e.target.value as typeof time)}><option value="all">Alle</option>{Object.entries(TIME_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</SelectField></label></header><div className={styles.results}><Pill ton="ruhig">{shown.length.toLocaleString('de-DE')} Stories</Pill><Pill ton="ruhig">{city==='all'?`${activeReports.length.toLocaleString('de-DE')} Orte geladen`:report.name}</Pill>{examplesOnly&&<Pill ton="leise">Ein Beispiel je Template</Pill>}{(category!=='all'||time!=='all'||templateKind!=='all')&&<button type="button" className={styles.action} onClick={()=>{setCategory('all');setTime('all');setTemplateKind('all');}}>Filter zurücksetzen <IconClose size={16}/></button>}</div>
 {error&&<p role="alert">{error}</p>}{loading?<p role="status">Auswertung wird geladen …</p>:error&&!reports.some(r=>r.regionId===city)?null:<div className={styles.list}>{!shown.length&&<p>Keine Stories mit dieser Auswahl.</p>}{shown.map((topic)=>{const concept=conceptFromFinding(owner(topic),topic);const visual=approvedStoryVisual(concept);return <article key={topic.id}><button className={styles.openStory} onClick={()=>{const r=owner(topic);const local=shown.filter(t=>owner(t).regionId===r.regionId);onOpen(r,local,local.findIndex(t=>t.id===topic.id));}} aria-label={`${concept.title} gestalten`}>{concept.kind==='rank'?<div className={`${styles.templateVisual} ${chartStyles.visualTheme}`} data-story-scheme="dark"><RankStoryChart story={concept} compact/></div>:concept.energyYear?<div className={`${styles.templateVisual} ${chartStyles.visualTheme}`} data-story-scheme="dark"><AnnualEnergyChart data={concept.energyYear} compact/></div>:concept.solarMonth?<div className={`${styles.templateVisual} ${chartStyles.visualTheme}`} data-story-scheme="dark"><MonthlySolarChart data={concept.solarMonth} compact/></div>:visual?<div className={`${styles.templateVisual} ${chartStyles.visualTheme}`} data-story-scheme="dark"><ApprovedStoryVisual bild={visual} compact date={concept.sourceDate}/></div>:storyVisualTemplate(concept)==='yield'?<div className={`${styles.templateVisual} ${styles.yieldPreview} ${chartStyles.preview}`}><div className={`${chartStyles.thumb} ${chartStyles.visualTheme}`} data-story-scheme="dark"><YieldChart story={concept} compact/></div></div>:<div className={styles.miniChart}>{topic.observations[0].evidence.slice(0,3).map((e,i)=><div key={`${e.label}-${i}`}><small>{e.label}</small><strong>{n(e.value)} <span>{e.unit}</span></strong></div>)}</div>}<small>{city==='all'?owner(topic).name+' · ':''}{formatStoryDate(concept.period)}</small><h3>{concept.title}</h3><span className={styles.storyCta}>Story öffnen <IconArrowRight size={16}/></span></button><details><summary>Zahlen und Einordnung{topic.observations.length>1?` · ${topic.observations.length} Aussagen`:''}</summary>{topic.observations.map(claim=><section key={claim.id}><h4>{claim.title}</h4><Evidence claim={claim}/></section>)}</details></article>;})}</div>}
 {city==='all'&&examplesOnly&&<p>Ein Beispiel je Template aus den geladenen Orten. <button type="button" className={styles.action} onClick={()=>setExamplesOnly(false)}>Alle passenden Stories anzeigen <IconArrowRight size={16}/></button></p>}
 {city==='all'&&<p className={styles.loadMore} role="status" aria-live="polite">{activeReports.length.toLocaleString('de-DE')} von {directory.length.toLocaleString('de-DE')} Orten geladen{nextPage!==null&&<> · <button type="button" className={styles.action} onClick={()=>loadMore(nextPage,true)} disabled={allLoading}>{allLoading?'Lädt …':'Weitere Orte laden'}</button></>}</p>}
 <details><summary>Kategorien und Zeitbezug</summary><p>Ein Befund kann zu mehreren Kategorien gehören. Der Zeitbezug unterscheidet aktuellen Stand, neue Ereignisse und Rückblicke. „Wiederverwendbar“ ist eine zusätzliche Eigenschaft.</p><table className={styles.matrix}><thead><tr><th>Kategorie</th>{Object.values(TIME_LABELS).map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{Object.entries(CONTENT_LABELS).map(([key,label])=><tr key={key}><th>{contentName(label)}</th>{(Object.keys(TIME_LABELS) as TimeAspect[]).map(aspect=>{const count=pool.topics.filter(t=>t.categories.includes(key)&&t.timeAspects.includes(aspect)).length;return <td key={aspect}><button disabled={!count} onClick={()=>{setCategory(key);setTime(aspect);}} aria-label={`${label}, ${TIME_LABELS[aspect]}: ${count} Themen`}>{count}</button></td>;})}</tr>)}</tbody></table><p>Die Zahlen zeigen Befunde der angeschlossenen Muster, keine Vollständigkeit aller denkbaren Geschichten. Ertrags- und Stromwert-Stories erscheinen nur, wenn die erforderlichen Wetter- und Anlagendaten vorliegen.</p></details>
 {city!=='all'&&<details><summary>Datengrundlage und Abdeckung</summary><p>Marktstammdatenregister · Export {report.sourceDate}. Aktive Solar- und Batterieeinheiten nach Inbetriebnahme. Ein früherer Jahrgang enthält nur heute noch aktive Einheiten. Monatsrückblicke reichen bis zum letzten abgeschlossenen Monat. Jüngste Registerdaten sind vorläufig; Nachmeldungen und Korrekturen sind möglich.</p><p>{pool.observationCount} belegte Beobachtungen sind vollständig in {pool.topics.length} Themen enthalten. Anlagenzahl, Leistung und Höchstwerte desselben Zeitraums stehen zusammen; verschiedene Ereignismonate bleiben getrennt. Der erste Lauf ist eine Bestandsaufnahme und erzeugt keine behaupteten neuen Nachrichten.</p><table className={styles.matrix}><thead><tr><th>Registerbereich</th><th>Inbetriebnahmezeitraum</th><th>Aktive Einheiten</th></tr></thead><tbody>{report.coverage?.map(c=><tr key={c.topic}><th>{coverageLabels[c.topic]??c.topic}</th><td>{c.first} bis {c.last}</td><td>{n(c.count)}</td></tr>)}</tbody></table><ul>{report.checks.map((check,i)=><li key={i}><strong>{check.family}: </strong>{check.status==='found'?'Ausgewertet, Befunde vorhanden.':check.status==='none'?'Ausgewertet, kein Treffer nach der Regel.':'Datengrundlage fehlt.'} <span>{check.reason}</span></li>)}</ul><p>Solar- und Speicherexport, Anlagengrößen sowie Tages- und Wochenreihen sind angeschlossen. Historische Rangwechsel benötigen zwei vergleichbare gespeicherte Stände. Die Verfügbarkeit von Ertrags- und Stromwert-Stories steht oben unter „Datenverfügbarkeit“. Die örtliche Förderhistorie ist noch nicht vollständig angeschlossen. Ungeklärte Projektzuordnungen gelangen nicht in die Themenliste. {pool.internalCount} interne Hinweise bleiben außerhalb des Pools.</p></details>}
 </section>;
}
