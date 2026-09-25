import React,{useId} from 'react';
import {CompositionArc} from '../charts/CompositionArc';
import {CompositionBackdrop} from './CompositionBackdrop';
import {storyCountGrid} from '../../lib/story-count-grid';
import styles from './InstallationCountChart.module.css';
export function InstallationCountChart({counts,powerShare,compact=false}:{counts:{total:number;selected:number;label:string};powerShare:number;compact?:boolean}){
 const gradientId=useId();
 const {cells,perCell}=storyCountGrid(counts.total,counts.selected);
 return <div className={`${styles.chart} ${compact?styles.compact:''}`}><CompositionBackdrop label={counts.label} compact={compact}/>
 <div className={styles.top}>
 <div className={styles.power}><svg viewBox="0 0 100 100" role="img" aria-label={`${powerShare.toLocaleString('de-DE')} Prozent der Solarleistung`}><circle cx="50" cy="50" r="40" fill="none" stroke="var(--atlas-border)" strokeWidth="10"/><CompositionArc value={powerShare}/><text className={styles.shareValue} x="50" y="48" textAnchor="middle" dominantBaseline="middle">{Math.round(powerShare)}</text><text className={styles.shareUnit} x="50" y="65" textAnchor="middle" dominantBaseline="middle">%</text></svg><span>der Solarleistung</span></div></div>
 <div className={styles.gridArea}><div className={styles.callout}><strong>{counts.selected.toLocaleString('de-DE')}</strong><span>{counts.label}</span></div><svg className={styles.grid} viewBox={`0 0 256 ${Math.ceil(cells.length/16)*10}`} role="img" aria-label={`${counts.selected} von ${counts.total} Anlagen. Ein Rechteck steht für ${perCell} Anlagen.`}><defs><linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={Math.ceil(cells.length/16)*10}><stop offset="0%" stopColor="var(--atlas-secondary)" stopOpacity=".38"/><stop offset="100%" stopColor="var(--atlas-secondary)" stopOpacity=".18"/></linearGradient></defs>{cells.map((cell,i)=><g key={i}><rect x={i%16*16} y={Math.floor(i/16)*10} width={13*cell.occupied} height="7" fill={`url(#${gradientId})`}/>{cell.selected>0&&<rect x={i%16*16} y={Math.floor(i/16)*10} width={13*cell.selected} height="7" fill="var(--atlas-action)"/>}</g>)}</svg><p className={styles.total}>{counts.total.toLocaleString('de-DE')} Solaranlagen insgesamt</p></div>

 </div>;
}
