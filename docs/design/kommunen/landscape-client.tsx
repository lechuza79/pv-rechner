/** Local host adapter: the scene remains owned by the landscape workspace. */
import React, {useEffect,useState} from 'react';
import editorial from '../../../components/EditorialContent.module.css';
import {RESULT_LOGO_COLORS} from '../../../lib/theme';
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
 return <><style>{`
 #municipal-landscape-hero .${styles.referenceControls}>label,
 #municipal-landscape-hero output[data-flight-metrics]{display:none}
 #municipal-landscape-hero{position:relative;--font-montserrat:Montserrat;--font-dm-sans:"DM Sans";--municipal-hero-inset:calc(max(0px,(100vw - 1600px)/2) + 5vw)}
 #municipal-landscape-hero .hero{isolation:auto}
 #municipal-landscape-hero .v3-scroll-indicator{display:none!important}
 #municipal-landscape-hero .${styles.referenceControls}{display:flex;flex-wrap:wrap;gap:12px;align-items:center;right:var(--municipal-hero-inset);left:auto;bottom:32px}
 #municipal-landscape-hero .${styles.referenceControls}>:is(button,a){display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:48px;padding:12px 24px;border-radius:999px;font:600 var(--sc-type-action-size)/1.4 var(--font-heading);white-space:nowrap}
 #municipal-landscape-hero .${styles.referenceControls}>button{order:2}
 #municipal-landscape-hero .municipal-discover{order:1;background:transparent;color:var(--color-text-primary);border:1px solid currentColor;text-decoration:none}
 #municipal-landscape-hero .municipal-discover:hover{background:var(--color-bg-muted)}
 @media(max-width:700px){#municipal-landscape-hero .${styles.referenceControls}{left:var(--municipal-hero-inset);right:var(--municipal-hero-inset);justify-content:center;gap:8px}#municipal-landscape-hero .${styles.referenceControls}>:is(button,a){flex:1;padding:12px}}

 #municipal-landscape-hero .site-header .brand svg{${Object.entries(RESULT_LOGO_COLORS).map(([key,value])=>`${key}:${value}`).join(";")}}
 #municipal-landscape-hero [aria-label="Kartennachweis"]{right:16px!important;opacity:.55}
 body[data-calculator-layout=scroll]>main{padding-top:0}
 #municipal-landscape-hero .site-header{max-width:none;margin:0;padding:24px var(--municipal-hero-inset);min-height:96px}
 #municipal-landscape-hero .hero-copy{left:var(--sc-hero-content-inset);top:calc(var(--municipal-header-height,96px) + var(--sc-hero-copy-gap))!important;bottom:auto!important;width:var(--sc-hero-copy-width)!important;max-width:calc(100% - 2 * var(--sc-hero-content-inset))!important;margin:0!important;padding:0!important;transform:none!important}
 #municipal-landscape-hero .hero-copy h1{max-width:none!important;width:100%;font-size:var(--sc-type-hero-size)!important;line-height:1.12!important;margin:0 0 24px;text-wrap:balance}
 #municipal-landscape-hero .hero-description{display:none}
 #municipal-landscape-hero .municipal-subline{font:400 var(--sc-type-body-size)/var(--sc-type-body-leading) var(--font-text);max-width:52ch;margin:0 0 28px}
 @media(min-width:1100px){#municipal-landscape-hero .hero-copy{width:min(var(--sc-hero-copy-width),600px)!important}#municipal-landscape-hero .municipal-subline{max-width:40ch}}
 #municipal-landscape-hero .v3-scroll-indicator{display:inline-flex;align-items:center;gap:12px;font:400 16px/1.5 var(--font-text)}
 #municipal-landscape-hero .v3-scroll-indicator svg{width:22px;height:22px}
 .municipal-hero-place{position:absolute;top:108px;right:var(--municipal-hero-inset);z-index:29;font-family:var(--font-text);font-size:var(--sc-type-body-size);--font-size-small:var(--sc-type-body-size)}
 #municipal-landscape-hero .hero-copy h1, #municipal-landscape-hero .hero-copy h1 span{font-family:var(--font-heading);font-weight:700;letter-spacing:normal}
 @media(max-width:700px){
 #municipal-landscape-hero{--municipal-hero-inset:6vw}
 #municipal-landscape-hero .site-header{padding:16px var(--municipal-hero-inset);min-height:80px}
 .municipal-hero-place{position:static;order:2;align-self:flex-start;margin:0 0 20px;pointer-events:auto}
 #municipal-landscape-hero .hero-copy .municipal-subline{order:1}
 #municipal-landscape-hero .hero-copy .v3-scroll-indicator{order:3;align-self:flex-start}
 #municipal-landscape-hero .hero-copy{left:var(--sc-page-inset);width:var(--sc-hero-copy-width)!important;max-width:var(--sc-hero-copy-width)!important;display:flex;flex-direction:column}
 #municipal-landscape-hero .hero-copy h1{font-size:var(--sc-type-hero-size)!important;margin-bottom:18px}
 #municipal-landscape-hero .municipal-subline{font-size:var(--sc-type-body-size);max-width:var(--sc-hero-mobile-description-width,285px);margin-bottom:20px}
 }
 `}</style><LandscapeHero placeId={placeId} sourcesHref="#landscape-sources"/>{document.getElementById("landscape-sources-content")&&createPortal(<LandscapeSources placeId={placeId}/>,document.getElementById("landscape-sources-content")!)}{heroCopy&&createPortal(<p className="municipal-subline">Lokale Energiedaten, verständliche Energie-Checks und Datenstories für Ihre Website, Social Media und die Menschen in Ihrer Kommune.</p>,heroCopy)}{mobileCopy?createPortal(picker,mobileCopy):picker}{ctaHost&&createPortal(<a className={`${editorial.ctaSecondary} municipal-discover`} href="#landscape-notes">Mehr entdecken</a>,ctaHost)}</>;
}
const host=document.getElementById('municipal-landscape-hero');
if(host)createRoot(host).render(<LandingLandscape/>);
