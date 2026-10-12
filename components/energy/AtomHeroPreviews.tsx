'use client';
import type {ReactNode} from 'react';
import type {StrommixYtd} from '../../lib/strommix-ytd';
import type {NuclearImportResponse} from '../../lib/nuclear-import';
import type {TradeResult} from '../../lib/electricity-trade';
import NuclearShareWidget from './NuclearShareWidget';
import NuclearDailyWidget from './NuclearDailyWidget';
import ElectricityTradeWidget from './ElectricityTradeWidget';
import styles from './AtomHeroPreviews.module.css';

/** Hosts arrange and link previews; each parent chart owns its reduced renderer. */
export const ATOM_PREVIEW_CONTRACT = {
 share:{title:'Atomstrom-Anteil',omits:'Category cards, legend and controls'},
 daily:{title:'Atomstrom-Import',omits:'Axes and detailed breakdown'},
 trade:{title:'Zukauf und Verkauf',omits:'Day labels, hover, gross totals and controls'},
} as const;
type Props={ytd:StrommixYtd|null;nuclear:NuclearImportResponse|null;trade:TradeResult|null;asOf:string;updatedAt?:{share?:string;daily?:string};targets:{share:string;daily:string;trade:string};renderTiles?:(tiles:ReactNode[])=>ReactNode};
export default function AtomHeroPreviews({ytd,nuclear,trade,asOf,updatedAt,targets,renderTiles}:Props){
 const charts={share:<NuclearShareWidget ytd={ytd} variant="teaser"/>,daily:<NuclearDailyWidget data={nuclear} variant="teaser" metric="energy" asOf={asOf} updatedAt={updatedAt?.daily}/>,trade:<ElectricityTradeWidget presentation="hero" initialData={trade} today={asOf.slice(0,10)}/>};
 const tiles=(Object.keys(charts) as (keyof typeof charts)[]).map(key=><div className={styles.tile} key={key}><div className={styles.chart} inert>{charts[key]}</div><a className={styles.link} href={targets[key]} aria-label={`${ATOM_PREVIEW_CONTRACT[key].title}: vollständigen Chart ansehen`}/></div>);
 return renderTiles?renderTiles(tiles):<div className={styles.grid}>{tiles}</div>;
}
