"use client";
import {Auswahl} from '../Auswahl';
import styles from './wind-map.module.css';

/** Keep preview settings in the URL so every prepared town has a direct link. */
export default function HeroTownPicker({active,towns}:{active:string;towns:Record<string,string>}){
 const entries=Object.entries(towns).map(([schluessel,name])=>({schluessel,name}));
 const choose=(id:string)=>{
  const url=new URL(window.location.href);
  url.searchParams.set('gemeinde',id);
  url.searchParams.delete('relief');
  window.location.assign(url.href);
 };
 return <div className={styles.heroTownPicker} aria-label="Ort der Vorschau">
  <Auswahl titel={towns[active]??'Ort wählen'} eintraege={entries} aktiv={active} onWahl={choose} pfeile={false} suchbar={false} breite={180}/>
 </div>;
}
