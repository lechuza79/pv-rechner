import React,{useId} from 'react';
import {brandAssets} from '../../lib/brand-assets';
import {storyCountGrid} from '../../lib/story-count-grid';
import styles from './InstallationCountChart.module.css';
export function InstallationCountChart({counts,powerShare,compact=false}:{counts:{total:number;selected:number;label:string};powerShare:number;compact?:boolean}){
 const gradientId=useId();
 const {cells,perCell}=storyCountGrid(counts.total,counts.selected);
 return <div className={`${styles.chart} ${compact?styles.compact:''}`}>{[0,1,2].map(layer=><div key={layer} className={styles.splash} data-layer={layer} aria-hidden="true" style={{maskImage:`url(${brandAssets.splashMask})`,WebkitMaskImage:`url(${brandAssets.splashMask})`}}/>)}
 <div className={styles.top}>
 <div className={styles.power}><svg viewBox="0 0 100 100" role="img" aria-label={`${powerShare.toLocaleString('de-DE')} Prozent der Solarleistung`}><circle cx="50" cy="50" r="40" fill="none" stroke="var(--atlas-border)" strokeWidth="10"/><circle cx="50" cy="50" r="40" fill="none" stroke="var(--atlas-action)" strokeWidth="10" strokeLinecap="round" pathLength="100" strokeDasharray={`${powerShare} ${100-powerShare}`} transform="rotate(-90 50 50)"/></svg><b>{Math.round(powerShare)}<small> %</small></b><span>der Solarleistung</span></div></div>
 <div className={styles.gridArea}><div className={styles.callout}><strong>{counts.selected.toLocaleString('de-DE')}</strong><span>{counts.label}</span></div><svg className={styles.grid} viewBox={`0 0 256 ${Math.ceil(cells.length/16)*10}`} role="img" aria-label={`${counts.selected} von ${counts.total} Anlagen. Ein Rechteck steht für ${perCell} Anlagen.`}><defs><linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={Math.ceil(cells.length/16)*10}><stop offset="0%" stopColor="var(--atlas-secondary)" stopOpacity=".38"/><stop offset="100%" stopColor="var(--atlas-secondary)" stopOpacity=".18"/></linearGradient></defs>{cells.map((cell,i)=><g key={i}><rect x={i%16*16} y={Math.floor(i/16)*10} width={13*cell.occupied} height="7" fill={`url(#${gradientId})`}/>{cell.selected>0&&<rect x={i%16*16} y={Math.floor(i/16)*10} width={13*cell.selected} height="7" fill="var(--atlas-action)"/>}</g>)}</svg><p className={styles.total}>{counts.total.toLocaleString('de-DE')} Solaranlagen insgesamt</p></div>

 </div>;
}
