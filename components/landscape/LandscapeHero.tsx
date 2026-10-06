"use client";
import HeroTownPicker from '../landkreis/HeroTownPicker';
import MunicipalityHeroPreview from '../landkreis/MunicipalityHeroPreview';
import BuildingPreviewMap from '../landkreis/BuildingPreviewMap';
import {getCssVariables,stageDefaults} from '../../lib/theme';
import {landscapePlaces,landscapeAttribution} from '../../lib/landscape-places';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import GemeindeHeroStage from '../gemeinde/GemeindeHeroStage';
import styles from '../landkreis/wind-map.module.css';

export type LandscapeHeroProps={placeId:string;showPlacePicker?:boolean;sourcesHref?:string};

/** Render the same location-specific credits inline or in the host's sources section. */
export function LandscapeSources({placeId:id}:{placeId:string}){
 const attribution=landscapeAttribution(id);
 return <>
  <p>3D-Landschaft: {landscapePlaces[id]??'unbekannter Ort'}. {attribution}. Daten bearbeitet.</p>
  <p>Solarflächen und Gewässer: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> (ODbL). Anlagen: <a href="https://www.marktstammdatenregister.de/">Marktstammdatenregister</a>.</p>
  {(id==='03458'||id==='09679')&&<p>Verwaltungsgrenzen: © BKG (2026), dl-de/by-2-0. <a href="https://sg.geodatenzentrum.de/web_public/Datenquellen_VG.pdf">Datenquellen</a>. Daten bearbeitet.</p>}
  {id==='09679'&&<p>Ergänzende Geländehöhen am Landesrand: Datenquelle: LGL, <a href="https://www.lgl-bw.de">www.lgl-bw.de</a>, dl-de/by-2-0. Daten bearbeitet.</p>}
  <p>Gebäudeausschnitte um die Ziele; Windbewegung aus Wetterdaten modelliert. Keine gemessenen Betriebsdaten, keine Strommengen.</p>
  <p>Lizenzen: <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · <a href="https://www.govdata.de/dl-de/by-2-0">Datenlizenz Deutschland – Namensnennung 2.0</a> · <a href="https://www.govdata.de/dl-de/zero-2-0">Datenlizenz Deutschland – Zero 2.0</a>.</p>
 </>;
}
/** Shared product hero entry point. Hosts select data, never copy the scene. */
export default function LandscapeHero({placeId:id,showPlacePicker=false,sourcesHref}:LandscapeHeroProps){
 const [attempt,setAttempt]=useState(0);
 const request=useRef({id,attempt,revision:0});
 if(request.current.id!==id||request.current.attempt!==attempt)request.current={id,attempt,revision:request.current.revision+1};
 const requestKey=`${id}:${request.current.revision}`;
 const latest=useRef(requestKey);latest.current=requestKey;
 const [shown,setShown]=useState<{id:string;key:string}|null>({id,key:requestKey});
 const [phase,setPhase]=useState<'leaving'|'loading'|'entering'|'ready'|'error'>('loading');
 useEffect(()=>{
  if(shown?.key===requestKey)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  setPhase('leaving');
  const timer=setTimeout(()=>{setShown({id,key:requestKey});setPhase('loading');},reduced?0:360);
  return()=>clearTimeout(timer);
 },[requestKey,id]);
 const ready=(key:string,ok:boolean)=>{
  if(latest.current!==key)return;
  if(ok)setPhase('entering');
  else {setShown(null);setPhase('error');}
 };
 useEffect(()=>{
  if(phase==='entering'){const timer=setTimeout(()=>setPhase('ready'),matchMedia('(prefers-reduced-motion: reduce)').matches?0:450);return()=>clearTimeout(timer);}
  if(phase!=='loading')return;
  const timer=setTimeout(()=>{if(latest.current===requestKey){setShown(null);setPhase('error');}},45000);
  return()=>clearTimeout(timer);
 },[phase,requestKey]);
 const name=landscapePlaces[id]??'Ort';
 return <div id="root" data-nidda-hero style={{position:"relative"}}>
  <style dangerouslySetInnerHTML={{__html:getCssVariables().replace(':root','[data-nidda-hero]')}}/>
  <div className={`solar-page ${styles.page} ${styles.municipalPage}`} data-mode="day" data-dark="false" style={stageDefaults(6) as CSSProperties}>
   {showPlacePicker&&<HeroTownPicker active={id} towns={landscapePlaces}/>}
   <section data-map-hero-band className={`${styles.band} ${styles.municipalBand} ${styles.referenceMode}`}>
    <GemeindeHeroStage productPreview name={name} parents={[]} description="Zeigen Sie, was sich in Ihrer Kommune bewegt." discoverHref="#landscape-notes" scene={
     <div className={styles.placeScene} data-place-phase={phase} inert={phase!=='ready'} aria-busy={phase==='loading'}>
      {shown&&(shown.id==='06440016'?<BuildingPreviewMap key={shown.key} source="/geo/nidda-preview/scene.json" municipalHero sceneOnly onReady={ok=>ready(shown.key,ok)}/>:<MunicipalityHeroPreview key={shown.key} municipality={shown.id} name={landscapePlaces[shown.id]??'Ort'} sceneOnly onReady={ok=>ready(shown.key,ok)}/>)}
     </div>
    }>
     {(phase==='loading'||phase==='error')&&<div className={styles.placeLoading} role={phase==='error'?'alert':'status'} aria-live="polite">
      {phase==='loading'?<><span className={styles.placeSpinner} aria-hidden="true"/>{name} wird geladen …</>:<>Die Ansicht konnte nicht geladen werden. <button type="button" onClick={()=>setAttempt(n=>n+1)}>Erneut versuchen</button></>}
     </div>}
    </GemeindeHeroStage>
   </section>
   <div style={{position:'absolute',right:4,top:'50dvh',transform:'translateY(-50%) rotate(180deg)',writingMode:'vertical-rl',whiteSpace:'nowrap',fontSize:"var(--font-size-caption)",lineHeight:1.4,letterSpacing:.2,color:'var(--color-text-muted)',zIndex:32}} aria-label="Kartennachweis">
    © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · <a href={sourcesHref??'#landscape-notes'}>Quellen und Daten</a>
   </div>
   {!sourcesHref&&<section className={styles.copy} id="landscape-notes" aria-label="Quellen und Daten"><LandscapeSources placeId={id}/></section>}
  </div>
 </div>;
}
