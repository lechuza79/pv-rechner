"use client";
import SelectField from '../SelectField';
import {useState,useEffect} from 'react';
import reports from '../../lib/story-discovery-reports.json';
import styles from './StoryDiscoveryPool.module.css';
export default function StoryDiscoveryPool({onOpenStory}:{onOpenStory?:(id:string)=>void}){
 const [city,setCity]=useState('Trier');const [filter,setFilter]=useState('all');
 const [loaded,setLoaded]=useState<(typeof reports)[number]|null>(null);
 const [index,setIndex]=useState<{name:string;regionId:string;total:number}[]>([]);
 const [query,setQuery]=useState('');const [error,setError]=useState('');const [loading,setLoading]=useState(false);
 useEffect(()=>{fetch('/api/admin/story-discovery').then(r=>{if(!r.ok)throw new Error('Verzeichnis fehlt');return r.json();}).then(setIndex).catch(()=>setError('Stadtverzeichnis konnte nicht geladen werden.'));},[]);
 async function selectCity(id:string){setLoading(true);setError('');try{const response=await fetch('/api/admin/story-discovery?city='+id);if(!response.ok)throw new Error('Auswertung konnte nicht geladen werden.');const next=await response.json();setLoaded(next);setCity(next.name);setFilter('all');setQuery('');}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
 const report=loaded??reports.find(r=>r.name===city)??reports[0];
 const visible=report.candidates.filter(c=>filter==='all'||c.status===filter);
 return <section className={styles.pool}>
 <header><label>Stadt <SelectField size="sm" ariaLabel="Stadt" value={reports.some(r=>r.name===city)?city:"custom"} onChange={e=>{setCity(e.target.value);setLoaded(null);setFilter('all');}}>{!reports.some(r=>r.name===city)&&<option value="custom">{city}</option>}{reports.map(r=><option key={r.regionId}>{r.name}</option>)}</SelectField></label><span>Stand {report.sourceDate}</span></header>
 <div className={styles.search}><input aria-label="Weitere Stadt suchen" placeholder="Weitere Stadt suchen …" value={query} onChange={e=>setQuery(e.target.value)}/>{query.length>=2&&<div>{index.filter(r=>r.name.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de'))).slice(0,12).map(r=><button key={r.regionId} onClick={()=>selectCity(r.regionId)}>{r.name} · {r.total} Befunde</button>)}</div>}{loading&&<p role="status">Auswertung wird geladen …</p>}{error&&<p role="alert">{error}</p>}</div>
 <div className={styles.summary}><strong>{report.candidates.length} Befunde</strong><span>{report.candidates.filter(c=>c.status==='ready').length} auswahlbereit</span><span>{report.candidates.filter(c=>c.status==='review').length} mit Prüfbedarf</span><span>{report.merged} verwandte Befunde zusammengeführt</span></div>
 <nav aria-label="Befunde filtern">{[['all','Alle'],['ready','Auswahlbereit'],['review','Prüfbedarf']].map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</nav>
 <div className={styles.list}>{visible.map(c=><details key={c.id}><summary><span className={c.status==='ready'?styles.ready:styles.review}>{c.status==='ready'?'● Auswahlbereit':'◷ Prüfen'}</span><strong>{c.title}</strong><small>{c.period} · {c.family}</small></summary><div className={styles.body}><p>{c.comparison}</p><dl>{c.evidence.map((e,i)=><div key={i}><dt>{e.label}</dt><dd>{e.value.toLocaleString('de-DE',{maximumFractionDigits:2})} {e.unit}</dd></div>)}</dl><p><b>Auswahlgrund:</b> {c.reason}</p>{c.limitations.map((l,i)=><p className={styles.caution} key={i}>{l}</p>)}{c.related.length>0&&<section><b>Gehört zum selben Zeitraum</b><ul>{c.related.map((r,i)=><li key={i}>{r}</li>)}</ul></section>}<p>Passendes Visual: {c.visual}</p>{report.name==='Trier'&&c.eventKey==='gebaeude-2025'&&<button onClick={()=>onOpenStory?.('Trier-gebaeude')}>Story mit Chart und Text öffnen →</button>}</div></details>)}</div>
 {visible.length===0&&<p>Keine Befunde in diesem Status.</p>}
 <details className={styles.audit}><summary>Alle {report.checks.length} Prüfungen und Datenlücken</summary>{report.checks.map((c,i)=><div key={i}><b>{c.family}</b><span>{c.status==='found'?'Befund':c.status==='missing'?'Daten fehlen':'Kein Treffer'}</span><p>{c.reason}</p></div>)}</details>
 <details className={styles.audit}><summary>Datenbasis und Grenzen</summary><p>{report.source} · {report.scannedRows.toLocaleString('de-DE')} Monatszeilen für {report.name}</p>{report.warnings.map(w=><p key={w}>{w}</p>)}<p>„Auswahlbereit“ bedeutet: Die beschreibende Aussage erfüllt die Auswahlregeln. Es ist keine Veröffentlichungsfreigabe. Die Gestaltung folgt anschließend.</p></details>
 </section>;
}
