import React from 'react';
import type {StoryConcept} from '../../lib/story-konzepte';
import {formatStoryDate} from '../../lib/story-format';
import {rankingHighlights,rankingDistinction,type RankMonthRow} from '../../lib/story-ranking-month';
import {IconArrowRight,IconArrowUp,IconArrowDown} from '../Icons';
import styles from './RankStoryChart.module.css';

function badge(row:RankMonthRow){
 const distinction=rankingDistinction(row.rank,row.size);
 const top=distinction?.match(/^Top (10|25|50|100)$/)?.[1];
 if(top)return `/atlas-design-preview/rank-badges/top-${top}.svg`;
 if(row.rank>3)return null;
 const theme=/Balkon/i.test(row.label)?'balcony':/Speicher/i.test(row.label)?'battery':/privat|Dach/i.test(row.label)?'roof':null;
 // 256-px WebP (≈20 KB) instead of the 512-px PNG (≈300 KB): shown at card size.
 return theme?`/gemeinde/rank-badges/${theme}-${row.rank}-small.webp`:null;
}
function movement(row:RankMonthRow){
 if(row.state==='initial')return 'Erstmals erfasst';
 if(row.state==='changed-basis')return 'Vergleichsgruppe geändert';
 if(row.state==='held')return 'Platz gehalten';
 const count=Math.abs(row.delta??0).toLocaleString('de-DE');
 return `${count} ${Math.abs(row.delta??0)===1?'Platz':'Plätze'} ${row.state==='up'?'verbessert':'zurückgefallen'}`;
}
/** Shared ranking visual: scope, metric and movement always stay attached to the rank. */
export function RankStoryChart({story,compact=false}:{story:StoryConcept;compact?:boolean}){
 const all=story.rankSummary??[];
 const highlights=rankingHighlights(all);
 const rows=highlights.slice(0,compact?1:3);
 const lead=rows[0];
 const artwork=lead?(/Speicher/i.test(lead.label)?'battery':/Balkon/i.test(lead.label)?'balcony-modern':/Dach|privat|Solar/i.test(lead.label)?'house':null):null;
 const rankingHref=rows.find(row=>row.href)?.href??'/solar-atlas/ranking';
 return <div className={styles.chart} data-compact={compact}>
  {artwork&&<img className={styles.backdrop} src={`/brand/rank-${artwork}.webp`} alt="" aria-hidden="true"/>}
  {!compact&&<header><h2>{highlights.length===1?`Top-Platzierung im ${formatStoryDate(story.period).replace(/^(Jan\.|Feb\.|März|Apr\.|Mai|Juni|Juli|Aug\.|Sept\.|Okt\.|Nov\.|Dez\.)/,month=>({ 'Jan.':'Januar','Feb.':'Februar','März':'März','Apr.':'April','Mai':'Mai','Juni':'Juni','Juli':'Juli','Aug.':'August','Sept.':'September','Okt.':'Oktober','Nov.':'November','Dez.':'Dezember'}[month]??month))}`:story.title}</h2><p>{formatStoryDate(story.period)} · Stand {formatStoryDate(story.sourceDate??story.period)}</p></header>}
  <div className={styles.rows}>{rows.map(row=>{
   const image=badge(row),distinction=rankingDistinction(row.rank,row.size);
   return <div className={styles.row} key={row.key}>
    <div className={styles.emblem}>{image?<img src={image} width="128" height="128" alt=""/>:<><span className={styles.rankCaption}>{distinction?.startsWith('Top')?'Top':'Platz'}</span><strong>{distinction?.startsWith('Top')?distinction.slice(4):row.rank.toLocaleString('de-DE')}</strong></>}</div>
    <div className={styles.description}>
     <h3 className={styles.category}>{row.label}</h3>
     <p className={styles.scope}>{row.scope}</p>
     <p className={styles.position}>Platz {row.rank.toLocaleString('de-DE')} von {row.size.toLocaleString('de-DE')} Kommunen</p>
     {row.state!=='initial'&&<div className={styles.change}>{row.state==='up'?<IconArrowUp size={14}/>:row.state==='down'?<IconArrowDown size={14}/>:null}{movement(row)}</div>}
    </div>
   </div>;
  })}</div>
  {highlights.length>rows.length&&<p className={styles.more}>{highlights.length-rows.length} weitere bemerkenswerte Platzierungen</p>}
  {!compact&&<a className={styles.rankLink} href={rankingHref}>Alle Platzierungen <IconArrowRight size={16}/></a>}
  {!compact&&<footer>Quelle: Energie-Atlas · Marktstammdatenregister</footer>}
 </div>;
}
