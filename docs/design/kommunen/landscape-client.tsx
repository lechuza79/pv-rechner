/** Local host adapter: the scene remains owned by the landscape workspace. */
import React, {useEffect,useState} from 'react';
import editorial from '../../../components/EditorialContent.module.css';
import {municipalHeroCss,municipalSubline} from './hero-presentation';
import {createPortal} from 'react-dom';
import {createRoot} from 'react-dom/client';
import LandscapeHero, {LandscapeSources} from 'shared-landscape-hero';
import styles from 'shared-landscape-styles';
import {landscapePlaces} from 'shared-landscape-places';
import {Auswahl} from '../../../components/Auswahl';
function LandingLandscape(){
 const readPlace=()=>new URLSearchParams(location.search).get('gemeinde')||'03458009';
 const [placeId,setPlaceId]=useState(readPlace);
 useEffect(()=>{const sync=()=>setPlaceId(readPlace());window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync);},[]);
 const [ctaHost,setCtaHost]=useState<Element|null>(null);
 useEffect(()=>{const observer=new MutationObserver(()=>update());const update=()=>{const host=document.querySelector(`#municipal-landscape-hero .${styles.referenceControls}`);setCtaHost(host);};observer.observe(document.getElementById("municipal-landscape-hero")!,{childList:true,subtree:true});update();return()=>observer.disconnect();},[]);
 const [heroCopy,setHeroCopy]=useState<Element|null>(null);
 const [mobileCopy,setMobileCopy]=useState<Element|null>(null);
 useEffect(()=>{const media=matchMedia('(max-width:700px)');const observer=new MutationObserver(()=>update());const update=()=>{const copy=document.querySelector('#municipal-landscape-hero .hero-copy');setHeroCopy(copy);setMobileCopy(media.matches?copy:null);};observer.observe(document.getElementById('municipal-landscape-hero')!,{childList:true,subtree:true});update();media.addEventListener('change',update);return()=>{observer.disconnect();media.removeEventListener('change',update);};},[]);
 useEffect(()=>{const root=document.getElementById('municipal-landscape-hero')!;let resize:ResizeObserver|undefined;const update=()=>{const header=root.querySelector('.site-header');if(!header)return;resize=new ResizeObserver(()=>root.style.setProperty('--municipal-header-height',`${header.getBoundingClientRect().height}px`));resize.observe(header);observer.disconnect();};const observer=new MutationObserver(update);observer.observe(root,{childList:true,subtree:true});update();return()=>{observer.disconnect();resize?.disconnect();};},[]);
 const choosePlace=(id:string)=>{if(id===placeId)return;const url=new URL(location.href);url.searchParams.set('gemeinde',id);history.pushState(null,'',url.href);setPlaceId(id);};
 const picker=<div className="municipal-hero-place" aria-label="Ort der Vorschau"><Auswahl titel={landscapePlaces[placeId]??'Ort wählen'} eintraege={Object.entries(landscapePlaces).map(([schluessel,name])=>({schluessel,name}))} aktiv={placeId} onWahl={choosePlace} variant="quiet" pfeile={false} suchbar={false} breite={160} menuAlign={mobileCopy?"start":"end"}/></div>;
 return <><style>{municipalHeroCss({referenceControls:styles.referenceControls})}</style><LandscapeHero placeId={placeId} sourcesHref="#landscape-sources"/>{document.getElementById("landscape-sources-content")&&createPortal(<LandscapeSources placeId={placeId}/>,document.getElementById("landscape-sources-content")!)}{heroCopy&&createPortal(<p className="municipal-subline">{municipalSubline}</p>,heroCopy)}{mobileCopy?createPortal(picker,mobileCopy):picker}{ctaHost&&createPortal(<a className={`${editorial.ctaSecondary} municipal-discover`} href="#landscape-notes">Mehr entdecken</a>,ctaHost)}</>;
}
const host=document.getElementById('municipal-landscape-hero');
if(host)createRoot(host).render(<LandingLandscape/>);
