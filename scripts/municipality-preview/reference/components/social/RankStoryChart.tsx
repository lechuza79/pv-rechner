import type {StoryConcept} from '../../lib/story-konzepte';
import {formatStoryDate} from '../../lib/story-format';
import {rankingHighlights,rankingHighlight} from '../../lib/story-ranking-month';
import styles from './RankStoryChart.module.css';
const stateLabel={initial:'Ausgangsstand',up:'aufgestiegen',down:'abgestiegen',held:'gehalten','changed-basis':'Vergleichsgruppe geändert'};
/** One monthly story, with the same ranked rows in detail and compact previews. */
export function RankStoryChart({story,compact=false}:{story:StoryConcept;compact?:boolean}){
 const all=story.rankSummary??[];
 const highlights=rankingHighlights(all);
 const rows=compact?highlights.slice(0,3):highlights;
 return <div className={styles.chart} data-compact={compact}>
  {!compact&&<header><h2>{story.title}</h2><p>{formatStoryDate(story.period)} · Rangstand {formatStoryDate(story.sourceDate??story.period)}</p></header>}
  <div className={styles.rows}>{rows.map(row=><div className={styles.row} key={row.key}>
   <div><strong className={styles.category}>{!compact&&row.href?<a href={row.href}>{row.label}</a>:row.label}</strong><span className={styles.scope}>{row.scope}</span></div>
   <div className={styles.position} data-winner={row.rank===1}><strong>{row.rank.toLocaleString('de-DE')}</strong><span>von {row.size.toLocaleString('de-DE')}</span></div>
   <div className={styles.change} data-state={row.state}>{row.delta!==undefined&&row.delta!==0&&<strong>{row.delta>0?'↑':'↓'} {Math.abs(row.delta)}</strong>}<span>{rankingHighlight(row)??stateLabel[row.state]}</span>{row.previousRank!==undefined&&row.delta!==0&&<small>zuvor Platz {row.previousRank.toLocaleString('de-DE')}</small>}</div>
  </div>)}</div>
  {compact&&highlights.length>rows.length&&<p className={styles.more}>+ {highlights.length-rows.length} weitere Spitzenplatzierungen</p>}
  {!compact&&<details className={styles.allRanks}><summary>Alle {all.length} Platzierungen und Ranglisten</summary>{all.map(row=><p key={row.key}>{row.href?<a href={row.href}>{row.label} · {row.scope} — Platz {row.rank} von {row.size.toLocaleString('de-DE')} ↗</a>:<span>{row.label} · {row.scope} — Platz {row.rank} von {row.size.toLocaleString('de-DE')}</span>}</p>)}</details>}
  {!compact&&<footer>Quelle: Solar-Atlas · Marktstammdatenregister</footer>}
 </div>;
}
