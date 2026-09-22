"use client";
import {IconChevronLeft,IconChevronRight} from '../Icons';
import SelectField from '../SelectField';
import {MunicipalChart} from './MunicipalChart';
import {storyVisualTemplate} from '../../lib/story-approved-visual';
import {approvedStoryVisual} from '../../lib/story-approved-visual';
import {YieldChart} from './YieldChart';
import { useEffect, useState } from "react";
import { STORY_CONCEPTS, type StoryConcept } from "../../lib/story-konzepte";
import {formatStoryValue,formatStoryDate} from "../../lib/story-format";
import {DEFAULT_STORY_TEXT,renderStoryText} from "../../lib/story-text-patterns";
import { conceptFromFinding } from "../../lib/story-finding-concept";
import type { DiscoveryReport } from "../../lib/story-discovery";
import type { StoryDesignSnapshot } from "../../lib/story-design-store";
import {buildStoryPool, type StoryTopic} from "../../lib/story-pool";
import {relatedStoryTopics,storyDataset} from "../../lib/story-related";
import styles from "./StoryConceptLab.module.css";
import { MONTH_PEAK_EXAMPLES } from "../../lib/story-monatspeak-examples";
import { monthLabel } from "../../lib/story-monatspeak";
import { FeedVorschau } from "./FeedVorschau";


import StoryIdeas from "./StoryIdeas";
import Modal, { ModalHeader } from "../Modal";

type View = "teaser" | "feed" | "detail" | "social";
export default function StoryConceptLab() {
  const [findingStories, setFindingStories] = useState<StoryConcept[]>([]);
  const [findingTopics, setFindingTopics] = useState<StoryTopic[]>([]);
  const [savedSnapshot,setSavedSnapshot]=useState<StoryDesignSnapshot|null>(null);
  const [findingReport, setFindingReport] = useState<DiscoveryReport | null>(null);
  const [observation, setObservation] = useState(0);
  const [textTemplates,setTextTemplates]=useState<Record<string,string>>({});
  const [templateEdits,setTemplateEdits]=useState<Record<string,string>>({});
  useEffect(()=>{fetch("/api/admin/story-text-pattern").then(r=>{if(!r.ok)throw new Error();return r.json();}).then(setTextTemplates).catch(()=>setFeedback("Gespeicherte Textvorlagen konnten nicht geladen werden."));},[]);

  const [city, setCity] = useState("Trier");
  const stories = findingStories.length ? findingStories : STORY_CONCEPTS;
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const skip = (direction: number) => { setSelected(index => (index + direction + stories.length) % stories.length); setFeedback(""); setObservation(0); };
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable=true]") || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); skip(event.key === "ArrowLeft" ? -1 : 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, city, stories]);
  const [view, setView] = useState<View>("detail");
  const [example, setExample] = useState(0);
  const peakExample = MONTH_PEAK_EXAMPLES[example];
  const isPeak = !findingStories.length && stories[selected].id === "zubaupeak";
  const baseStory = findingReport && findingTopics[selected] ? conceptFromFinding(findingReport, findingTopics[selected], observation) : isPeak ? peakExample.preview : stories[selected];
  const story = findingReport ? {...baseStory,social:renderStoryText(baseStory,textTemplates[baseStory.label]??DEFAULT_STORY_TEXT)} : baseStory;
  const previewStories = [story, ...stories.filter(item => item.id !== story.id && approvedStoryVisual(item))].filter((item,index,all) => index === 0 || all.findIndex(candidate => (approvedStoryVisual(candidate)?.art??candidate.kind) === (approvedStoryVisual(item)?.art??item.kind)) === index).slice(0,3);
  const openPreviewStory = (item: StoryConcept) => { const index=stories.findIndex(candidate=>candidate.id===item.id); if(index>=0){setSelected(index);setObservation(0);} setView('detail'); };
  const [storyTrail,setStoryTrail]=useState<{topics:StoryTopic[];selected:number;observation:number}[]>([]);
  const currentClaim=findingTopics[selected]?.observations[observation]??findingTopics[selected]?.observations[0];
  const related=findingReport&&currentClaim?relatedStoryTopics(buildStoryPool(findingReport).topics,currentClaim):[];
  const relatedLabel=currentClaim?({steckersolar:'Balkonkraftwerken',gebaeude:'Gebäudeanlagen',freiflaeche:'Freiflächenanlagen',batterie:'Speichern',sonstige:'Solaranlagen'}[storyDataset(currentClaim)??'']??'diesem Thema'):'diesem Thema';
  const openRelated=(topic:StoryTopic)=>{
    if(!findingReport)return;
    setStoryTrail(trail=>[...trail,{topics:findingTopics,selected,observation}]);
    const topics=buildStoryPool(findingReport).topics;
    setFindingTopics(topics);setFindingStories(topics.map(t=>conceptFromFinding(findingReport,t)));
    setSelected(topics.findIndex(t=>t.id===topic.id));setObservation(0);setFeedback('');
  };
  const rejected = isPeak && !peakExample.decision.accepted;
  const [feedback, setFeedback] = useState("");
  const openFinding = (report: DiscoveryReport, topics: StoryTopic[], index: number, initialObservation = 0) => {
    setStoryTrail([]); setSavedSnapshot(null); setFindingReport(report); setFindingTopics(topics); setObservation(initialObservation);
    setFindingStories(topics.map(topic => conceptFromFinding(report, topic)));
    setCity(report.name); setSelected(index); setFeedback(""); setOpen(true);
  };
  const saveDesign = async () => {
    const snapshot: StoryDesignSnapshot = {schemaVersion:1, sourceReportReference:savedSnapshot?.sourceReportReference ?? (findingReport ? `${findingReport.version}/${findingReport.sourceDate}/${findingReport.inputKey}/${findingReport.regionId}` : story.id), sourceDate:savedSnapshot?.sourceDate ?? story.sourceDate ?? findingReport?.sourceDate ?? '', concept:story, scheme:scheme as StoryDesignSnapshot['scheme'],familyTemplate:savedSnapshot ? savedSnapshot.familyTemplate : textTemplates[story.label]??DEFAULT_STORY_TEXT};
    const response=await fetch('/api/admin/story-design',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot)});
    if(!response.ok)throw new Error('Der Entwurf konnte nicht gesichert werden.');
    const result=await response.json();const url=new URL(window.location.href);url.search='';url.searchParams.set('design',result.id);return url.href;
  };
  const copyLink=async()=>{try{const url=await saveDesign();await navigator.clipboard.writeText(url);setFeedback('Entwurf gesichert und Vorschau-Link kopiert.');}catch{setFeedback('Sichern oder Kopieren nicht möglich. Bitte erneut versuchen.');}};
  const choose = (v: View) => { setView(v); setFeedback(""); };
  const [schemes,setSchemes]=useState<Record<string,string>>({});
  const scheme=schemes[story.id]??"dark";
  const setScheme=(value:string)=>setSchemes(current=>({...current,[story.id]:value}));
  useEffect(()=>{const id=new URLSearchParams(window.location.search).get('design');if(!id)return;const controller=new AbortController();fetch('/api/admin/story-design?id='+encodeURIComponent(id),{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();return response.json() as Promise<StoryDesignSnapshot>;}).then(snapshot=>{setSavedSnapshot(snapshot);setFindingReport(null);setFindingTopics([]);setFindingStories([snapshot.concept]);setSelected(0);setSchemes(current=>({...current,[snapshot.concept.id]:snapshot.scheme}));setOpen(true);}).catch(error=>{if(error.name!=='AbortError')setFeedback('Gesicherter Entwurf konnte nicht geladen werden.');});return()=>controller.abort();},[]);

  return <main className={styles.lab} data-story-scheme="dark">
    {!open && feedback && <p role="alert">{feedback}</p>}
    <StoryIdeas onOpen={openFinding}/>
    <Modal open={open} onClose={()=>setOpen(false)} title={story.label} maxWidth={1480} className={styles.dialog}>
    {storyTrail.length>0&&<button className={styles.textLink} onClick={()=>{const previous=storyTrail[storyTrail.length-1];setFindingTopics(previous.topics);setFindingStories(previous.topics.map(t=>conceptFromFinding(findingReport!,t)));setSelected(previous.selected);setObservation(previous.observation);setStoryTrail(trail=>trail.slice(0,-1));}}>← Zur vorherigen Story</button>}
    <div className={styles.schemePicker} role="group" aria-label="Farbschema">{[["light","Hell"],["dark","Dunkel"],["highlight","Highlight"]].map(([value,label])=><button key={value} aria-pressed={scheme===value} onClick={()=>setScheme(value)}>{label}</button>)}</div>
    <ModalHeader><div className={styles.skipControls}><button onClick={()=>skip(-1)} aria-label="Vorherige Story"><IconChevronLeft size={16}/></button><span aria-live="polite">{selected+1} / {stories.length}</span><button onClick={()=>skip(1)} aria-label="Nächste Story"><IconChevronRight size={16}/></button></div></ModalHeader>

    {findingTopics[selected]?.observations.length > 1 && <label className={styles.observationPicker}>Aussage <SelectField ariaLabel="Aussage" value={observation} onChange={e=>setObservation(Number(e.target.value))}>{findingTopics[selected].observations.map((claim,index)=><option key={claim.id} value={index}>{claim.title} · {claim.evidence[0]?.unit}</option>)}</SelectField></label>}
    {isPeak && <div className={styles.pattern}><span className={styles.exampleLabel}>Beispielort</span><div role="group" aria-label="Beispielort wählen">{MONTH_PEAK_EXAMPLES.map((e,i)=><button key={e.preview.town} aria-pressed={example===i} onClick={()=>{setExample(i);setFeedback("");}}>{e.preview.town} · {e.decision.accepted?"passt":"kein Treffer"}</button>)}</div><details><summary>Auswahlregel ansehen</summary><p>Mindestens zwölf ausreichend alte Monate; mindestens zehn Anlagen im Spitzenmonat; mindestens doppelt so viele wie im nächsthöchsten Monat. Gleiche Spitzenwerte werden abgelehnt. Das ist eine redaktionelle Schwelle, kein statistischer Signifikanztest. Alte Ereignisse erscheinen als Rückblick. Fehlt das Exportdatum, bleibt die Veröffentlichung gesperrt.</p></details></div>}
    <div className={styles.tools}>
      <div role="group" aria-label="Ansicht">{([["teaser","Gemeindeteaser"],["feed","Feed-Beitrag"],["detail","Story-Detail"],["social","Social-Post"]] as [View,string][]).map(([key,label]) => <button key={key} aria-pressed={!rejected && view === key} onClick={() => choose(key)}>{label}</button>)}</div>
    </div>

    <section className={`${styles.preview} ${styles.atlas} ${view === "teaser" || view === "feed" ? styles.formatPreview : ""}`} aria-label="Designvorschau">
      {!rejected && (view === "teaser" || view === "feed") && <section className={styles.municipalStories} aria-label={`Geschichten aus ${story.town}`}><header><div><p>{story.town}</p><h2>{view==='teaser'?'Was sich hier tut.':'Geschichten aus '+story.town}</h2></div>{view==='teaser'&&<button onClick={()=>choose('feed')}>Alle Geschichten →</button>}{view==='feed'&&<button onClick={()=>choose('teaser')}>← Zur Gemeinde</button>}</header><div className={view==='teaser'?styles.municipalStoryGrid:styles.municipalStoryFeed}>{previewStories.map((item,index)=><StoryCard key={item.id} scheme={schemes[item.id]??(index===0?scheme:index===1?'light':'highlight')} story={item} open={()=>openPreviewStory(item)}/>)}</div></section>}
      {!rejected && view === "detail" && <article className={styles.article}>
        
        {!["yield","radial","rank"].includes(story.kind)&&!approvedStoryVisual(story)&&<header className={styles.storyHeader}><p>{story.town.toUpperCase()} · SOLARENERGIE</p><h2>{story.title}</h2><div>{story.sourceDate ? `Stand ${formatStoryDate(story.sourceDate)}` : story.period}</div>{story.teaser&&<p className={styles.lede}>{story.teaser}</p>}</header>}
        <div className={`${styles.detailGrid} ${!story.copy.length?styles.chartOnly:""}`}><div><div data-story-scheme={scheme} className={`${styles.figure} ${styles.visualTheme}`}><ConceptChart story={story} /></div>{!["yield","radial","rank"].includes(story.kind)&&<SourceLine story={story}/>}{!approvedStoryVisual(story)&&<ComparisonDetails story={story}/>}</div><div className={styles.copy}>{story.copy.map(p => <section key={p.heading}><h3>{p.heading}</h3><p>{p.text}</p></section>)}{story.widgetCta && <button className={styles.textLink} onClick={() => setFeedback(story.widget)}>{story.widgetCta} →</button>}</div></div>
        {(["yield","radial","rank"].includes(story.kind)||approvedStoryVisual(story))&&story.teaser&&<p className={styles.yieldCopy}>{story.teaser}</p>}<footer className={styles.articleFooter}><div><button onClick={async()=>{try{const url=await saveDesign();if(navigator.share)await navigator.share({title:story.title,url});else{await navigator.clipboard.writeText(url);setFeedback('Entwurf gesichert und Vorschau-Link kopiert.');}}catch{setFeedback('Teilen wurde abgebrochen oder der Entwurf konnte nicht gesichert werden.');}}}>Vorschau teilen ↗</button><button onClick={copyLink}>Link kopieren</button><button onClick={async()=>{try{await saveDesign();setFeedback('Entwurf mit diesem Datenstand gesichert.');}catch{setFeedback('Entwurf konnte nicht gesichert werden.');}}}>Entwurf sichern</button></div></footer>
        {related.length>0&&findingReport&&<section className={styles.relatedStories} aria-label="Passende Stories"><h3>Mehr zu {relatedLabel} in {story.town}</h3><div>{related.map(topic=>{const item=conceptFromFinding(findingReport,topic);return <button key={topic.id} className={styles.card} onClick={()=>openRelated(topic)}>{approvedStoryVisual(item)&&<div data-story-scheme={scheme} className={`${styles.thumb} ${styles.visualTheme}`}><ConceptChart story={item} compact/></div>}<div className={styles.cardCopy}><small>{item.period}</small><h3>{item.title}</h3><span>Story öffnen →</span></div></button>;})}</div></section>}
      </article>}
      {!rejected && view === "social" && <div className={styles.social}><FeedVorschau key={story.id} text={story.social} breite={560} responsive visual={<div data-story-scheme={scheme} className={`${styles.socialImage} ${styles.visualTheme}`}>{!["yield","radial","rank"].includes(story.kind)&&!approvedStoryVisual(story)&&<><p>{story.town.toUpperCase()} · {formatStoryDate(story.period)}</p><h2>{story.title}</h2></>}<ConceptChart story={story}/>{!["yield","radial","rank"].includes(story.kind)&&<p className={styles.source}>{story.sourceCaption ?? "Marktstammdatenregister (Bundesnetzagentur) · dl-de/by-2-0 · eigene Auswertung"}</p>}</div>}/><p className={styles.previewNote}></p></div>}
      {rejected && <div className={styles.intro}><h2>Keine Story für dieses Muster.</h2><p>{peakExample.decision.reason}</p><div className={styles.figure}><ConceptChart story={story}/></div><p>Kein erzwungener Titel, kein Social-Post. Der Verlauf bleibt als Bestandsinformation nutzbar.</p></div>}
      {feedback && <p className={styles.feedback} role="status">{feedback}</p>}
    </section>
    {findingReport&&<details className={styles.reasoning}><summary>Textvorlage bearbeiten</summary><p>Gilt für „{story.label}“ in allen Orten. Zahlen, Vergleich und Quellen setzt das System ein.</p><textarea aria-label="Textvorlage" rows={8} value={templateEdits[story.label]??textTemplates[story.label]??DEFAULT_STORY_TEXT} onChange={e=>setTemplateEdits(current=>({...current,[story.label]:e.target.value}))}/><p>Platzhalter: {'{ort}, {titel}, {werte}, {vergleich}, {einordnung}, {quelle}'}</p><button onClick={async()=>{const template=templateEdits[story.label]??textTemplates[story.label]??DEFAULT_STORY_TEXT;try{const response=await fetch('/api/admin/story-text-pattern',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({family:story.label,template})});const result=await response.json();if(!response.ok){setFeedback(result.error);return;}setTextTemplates(current=>({...current,[story.label]:template}));setFeedback('Textvorlage für diesen Storytyp gespeichert.');}catch{setFeedback('Textvorlage konnte nicht gespeichert werden.');}}}>Vorlage speichern</button></details>}
    <details className={styles.reasoning}><summary>Daten und Verwendung</summary><p>{story.evidence}</p><section className={styles.notes} aria-label="Redaktionelle Einordnung"><div><h2>Mehrwert & SEO</h2><p>{story.seo}</p></div><div><h2>Passendes Widget?</h2><p>{story.widget}</p></div><div><h2>Datengrundlage</h2><p>{story.beforeRelease}</p></div></section></details>
    </Modal>
  </main>;
}
function StoryCard({story,open,scheme}:{story:StoryConcept;open:()=>void;scheme:string}) {
  return <button className={styles.card} onClick={open}><div data-story-scheme={scheme} className={`${styles.thumb} ${styles.visualTheme}`}><ConceptChart story={story} compact /></div><div className={styles.cardCopy}><small>{formatStoryDate(story.period)}</small><h3>{story.title}</h3><p>{story.teaser}</p><span>Story lesen →</span></div></button>;
}
function ConceptChart({story,compact=false}:{story:StoryConcept;compact?:boolean}) {
  if(storyVisualTemplate(story))return <MunicipalChart story={story} compact={compact}/>;
  const max = Math.max(1,...story.values.map(v=>v.value));
  if(story.kind==='yield')return <YieldChart story={story} compact={compact}/>;
  if (story.kind === "facts" && !story.values.length) return <p className={styles.factChart}>{story.comparisonLabel}</p>;
  if (story.kind === "facts") return <div className={styles.factChart} aria-label={story.title}>{story.values.map((value,index)=><div key={`${value.label}-${index}`}><span>{value.label}</span><strong>{formatStoryValue(value.value)}<small> {value.unit}</small></strong></div>)}</div>;
  if(story.kind === "columns" && story.values.length>8) return <div className={styles.timeline}><p>{story.unit}</p><svg viewBox="0 0 440 230" role="img" aria-label={`${story.title}. ${story.comparisonLabel}`}><line x1="18" y1="188" x2="430" y2="188" stroke="var(--story-line)"/>{story.values.map((v,i)=>{const step=410/story.values.length,h=v.value/max*140;return <g key={v.label}><title>{`${v.label}: ${v.value} ${v.unit??story.unit}`}</title><rect x={20+i*step} y={188-h} width={step*.7} height={h} fill="var(--story-accent)" opacity={v.value===max?1:.3} rx="2"/>{v.value===max&&<text x={20+i*step} y={178-h} fontSize="18" fill="var(--story-ink)" fontWeight="700">{v.value}</text>}{i%5===0&&<text x={20+i*step} y="213" fontSize="14" textAnchor={i===story.values.length-1?'end':'start'} fill="var(--story-muted)">{v.label}</text>}</g>})}</svg></div>;
  if(story.kind === "columns") return <div className={styles.yearChart}><p>{story.unit}</p><div className={styles.yearColumns}>{story.values.map(v=><div key={v.label}><strong>{formatStoryValue(v.value)}</strong><i style={{height:`${Math.max(2,v.value/Math.max(max,1)*(compact?100:150))}px`,opacity:story.id.endsWith("-gebaeude")?(v===story.values.at(-1)?1:v===story.values.at(-2)?0.65:0.25):(v.value===max?1:0.4)}}/><span>{v.label}</span></div>)}</div></div>;
  if(story.kind === "shares") return <div className={styles.shareChart}><p>Balkonkraftwerke · {story.town}</p>{story.values.map(v=><div key={v.label}><div><strong>{formatStoryValue(v.value)}<small> %</small></strong><span>{v.label}</span></div><div className={styles.shareTrack}><i style={{width:`${v.value}%`}}/></div></div>)}<small>Rest: Gebäudeanlagen · ohne Freiflächen</small></div>;
  if(story.kind === "project") return <div className={styles.projectChart}><p>{story.values[0].label} · {story.town}</p><strong>{story.values[0].value.toLocaleString("de-DE", {maximumFractionDigits:1})} <small>MWp</small></strong><p>{story.period}</p><hr/><p>{story.values[1].label}</p><b>{story.values[1].value.toLocaleString("de-DE", {maximumFractionDigits:2})} MWp zusammen</b></div>;
  if(story.kind === "timeline") return <div className={styles.timeline}><p>{story.unit}</p><svg viewBox="0 0 440 230" role="img" aria-label={`${story.town}: ${story.chartSummary}. ${story.values.length} Monatswerte.`}>{story.eventEnd && story.event && <rect x={20+story.values.findIndex(v=>v.label===story.event!.month)*410/story.values.length} y="10" width={(story.values.findIndex(v=>v.label===story.eventEnd)-story.values.findIndex(v=>v.label===story.event!.month)+1)*410/story.values.length} height="178" fill="var(--story-accent)" opacity="0.08"/>}{story.event && <line x1={20+story.values.findIndex(v=>v.label===story.event!.month)*410/story.values.length} x2={20+story.values.findIndex(v=>v.label===story.event!.month)*410/story.values.length} y1="12" y2="188" stroke="var(--story-accent)" strokeDasharray="4 4"><title>{story.event.label}</title></line>}<line x1="18" y1="188" x2="430" y2="188" stroke="var(--story-line)"/>{story.values.map((v,i)=>{const selected=story.highlightedMonths?.includes(v.label);const step=410/Math.max(story.values.length,1);const h=v.value/Math.max(max,1)*140;return <g key={v.label}><title>{`${monthLabel(v.label)}: ${v.value} ${v.unit??story.unit}`}</title><rect x={20+i*step} y={188-h} width={step*0.65} height={h} rx="2" fill="var(--story-accent)" opacity={selected?1:0.3}/>{selected&&<text x={20+i*step+step*0.325} y={179-h} textAnchor="middle" fill="var(--story-ink)" fontSize="18" fontWeight="700">{v.value}</text>}</g>})}<text x="18" y="213" fontSize="18" fill="var(--story-muted)">{story.values[0] ? monthLabel(story.values[0].label) : ""}</text><text x="430" y="213" textAnchor="end" fontSize="18" fill="var(--story-muted)">{story.values.at(-1) ? monthLabel(story.values.at(-1)!.label) : ""}</text></svg><p><strong>{story.chartSummary}</strong></p>{story.eventEnd && <p>Markierte Fläche: {story.event?.label} · {story.event?.month}–{story.eventEnd}</p>}</div>;
  if(story.kind === "rank") return <div className={`${styles.rankChart} ${compact?styles.compact:""}`} aria-label="Layoutbeispiel: Platz 5 zu Platz 3"><div><span>{story.values[0].label}</span><strong>{story.values[0].value}</strong></div><span>→</span><div><span>{story.values[1].label}</span><strong>{story.values[1].value}</strong></div><small>Layoutbeispiel · keine echten Ränge</small></div>;
  if(story.kind === "donut") {
    const total=story.values.reduce((sum,v)=>sum+v.value,0),circle=2*Math.PI*70;
    let offset=0;
    const unit=story.values[0]?.unit??story.unit;
    const scaled=unit==='kWp'&&total>=1000;
    return <div className={`${styles.donutChart} ${compact?styles.compact:""}`}><svg viewBox="0 0 200 200" role="img" aria-label={story.values.map(v=>`${v.label}: ${v.value} ${v.unit??unit}`).join(', ')}>{story.values.map((v,i)=>{const length=total?v.value/total*circle:0;const start=offset;offset+=length;return <circle key={v.label} cx="100" cy="100" r="70" fill="none" stroke="var(--story-accent)" opacity={1-i/Math.max(story.values.length,1)*.65} strokeWidth="26" strokeDasharray={`${Math.max(0,length-3)} ${circle}`} strokeDashoffset={-start} transform="rotate(-90 100 100)"/>;})}<text x="100" y="99" textAnchor="middle" fill="var(--story-ink)" fontSize="27" fontWeight="700">{(scaled?total/1000:total).toLocaleString('de-DE',{maximumFractionDigits:1})}</text><text x="100" y="121" textAnchor="middle" fill="var(--story-muted)" fontSize="13">{scaled?'MWp':unit}</text><text x="100" y="137" textAnchor="middle" fill="var(--story-muted)" fontSize="13">installiert</text></svg>{!compact&&<div className={styles.legend}>{story.values.map((v,i)=><p key={v.label}><i style={{opacity:1-i/Math.max(story.values.length,1)*.65}}/>{v.label}<b>{(total?v.value/total*100:0).toLocaleString('de-DE',{maximumFractionDigits:1})} %</b></p>)}</div>}</div>;
  }
  return <div className={`${styles.bars} ${compact?styles.compact:""}`}><p>{story.unit}</p>{story.values.map((v,i)=><div className={styles.barRow} key={v.label}><div><span>{v.label}</span><strong>{formatStoryValue(v.value)}</strong></div><div className={styles.track}><i style={{width:`${v.value/max*100}%`,opacity:i?0.35:1}}/></div></div>)}</div>;
}
function SourceLine({story}:{story:StoryConcept}) {
 const caption=story.sourceCaption??'Marktstammdatenregister · eigene Auswertung';
 return <p className={styles.source}>Quelle: {story.sources?.length===1?<a href={story.sources[0].url} target="_blank" rel="noreferrer">{caption} ↗</a>:<>{caption}{story.sources?.map((s,i)=><a key={s.url} href={s.url} target="_blank" rel="noreferrer" aria-label={s.label}> [{i+1}]</a>)}</>}</p>;
}
function ComparisonDetails({story}:{story:StoryConcept}) {
  if(story.marginalia)return <div className={styles.yieldNotes}><details><summary>Zur Berechnung</summary>{story.marginalia.map(p=><p key={p}>{p}</p>)}</details></div>;
  const label = story.comparisonLabel ?? (story.comparison && story.values.length ? `Vergleich: ${monthLabel(story.values[0].label)}–${monthLabel(story.values.at(-1)!.label)}` : null);
  return label ? <p className={styles.source}>{label}</p> : null;
}
