"use client";
import {createPortal} from "react-dom";
import type {SolarFootprint} from "./solar-layer";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ProjectedRegion } from "../../lib/region-perspektive";
import type { MapValue } from "./RegionKarte";
import type { createRegionScene, Season } from "./region-scene";
import type { SceneTurbine } from "../../lib/wind-map";
import type { SceneBuilding, SceneLocation } from "../../lib/building-scene";
import type { SceneTerrain } from "../../lib/wind-terrain";
import type {WindConditions} from "../../lib/wind-animation";
import {useWidgetPresentation} from "../dashboard/WidgetPresentationContext";
import styles from "./landkreis.module.css";
export type SceneControls=Pick<ReturnType<typeof createRegionScene>,'flyTo'|'zoom'|'focus'|'reset'|'previewReference'|'leaveReferencePark'|'showReferencePath'>;

type Props = { standalone?:boolean; framingScale?:number; cardBottomSpace?:number; locationCard?:{id:string;content:ReactNode;visible?:boolean}; hiddenLocation?:string; onFlight?:(moving:boolean,arrived?:boolean)=>void; locations?:SceneLocation[]; solar?:SolarFootprint[]; buildings?:SceneBuilding[]; windConditions?:WindConditions|null; terrain?:SceneTerrain; windScale?:number; turbines?: SceneTurbine[]; onControls?: (controls:SceneControls)=>void; heightEnvelope: Record<string, number>; shapes: ProjectedRegion[]; values: MapValue[]; selected: string; hovered: string|null; season?: Season;
  onHover: (id:string|null)=>void; onSelect: (id:string,touch?:boolean)=>void; onReady: (ready:boolean)=>void };
export default function RegionScene(props:Props) {
  const presentation=useWidgetPresentation();
  const presentationRef=useRef(presentation);presentationRef.current=presentation;
  const host=useRef<HTMLDivElement>(null), current=useRef(props);
  current.current=props;
  const scene=useRef<ReturnType<typeof createRegionScene>|null>(null);
  const copyBounds=useRef<{left:number;right:number;top:number;bottom:number}|null>(null);
  const locationElements=useRef(new Map<string,HTMLElement>());
  const [pin,setPin]=useState<{x:number;y:number}|null>(null);
  const [failed,setFailed]=useState(false);
  const [framed,setFramed]=useState(false);
  const [cardShown,setCardShown]=useState(false);
  useEffect(()=>{
    setCardShown(false);
    if(props.locationCard?.visible===false)return;
    let second=0;
    const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>setCardShown(true));});
    return()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);};
  },[props.locationCard?.id,props.locationCard?.visible]);
  const [overlayRoot,setOverlayRoot]=useState<HTMLElement|null>(null);
  const city=props.shapes.find(s=>s.kind==="Kreisfreie Stadt");
  useEffect(()=>{
    const stage=host.current?.closest<HTMLElement>("[data-map-hero-stage]");
    const band=stage?.closest<HTMLElement>("[data-map-hero-band]");
    if(current.current.standalone){setFramed(true);return;}
    if(!stage||!band)return;
    setOverlayRoot(stage);
    const measure=()=>{
      const rect=stage.getBoundingClientRect();
      stage.style.setProperty("--map-headroom",`${Math.max(0,rect.top-band.getBoundingClientRect().top)}px`);
      const text=Array.from(band.querySelectorAll('.hero-copy h1,.hero-copy p,.hero-copy a')).map(el=>{const range=document.createRange();range.selectNodeContents(el);return range.getBoundingClientRect();}).filter(r=>r.width&&r.height);
      copyBounds.current=text.length?{left:Math.min(...text.map(r=>r.left))-rect.left,right:Math.max(...text.map(r=>r.right))-rect.left,top:Math.min(...text.map(r=>r.top))-rect.top,bottom:Math.max(...text.map(r=>r.bottom))-rect.top}:null;
      setFramed(true);
    };
    const observer=new ResizeObserver(measure);observer.observe(band);measure();
    void document.fonts.ready.then(()=>{if(stage.isConnected)measure();});
    window.addEventListener("resize",measure);
    return()=>{observer.disconnect();window.removeEventListener("resize",measure);};
  },[]);
  useEffect(()=>{
    let disposed=false;
    for(const element of locationElements.current.values())element.hidden=true;
    import("./region-scene").then(({createRegionScene})=>{
      if(disposed||!host.current)return;
      const instance=createRegionScene(host.current,current.current.shapes,{
        hover:id=>current.current.onHover(id),select:(id,touch)=>current.current.onSelect(id,touch),pin:setPin,
        locationFocus:()=>current.current.locationCard?.id,
        locationClearance:()=>copyBounds.current?(copyBounds.current.bottom+12):0,
        locationSize:()=>{
          const card=current.current.locationCard;
          const element=card&&locationElements.current.get(card.id);
          return element?{width:element.offsetWidth||250,height:element.offsetHeight||140}:null;
        },
        locationSurface:()=>{
          const card=current.current.locationCard;
          const element=card&&locationElements.current.get(card.id);
          if(!card||card.visible===false||!element||element.hidden)return null;
          const bounds=element.getBoundingClientRect(),stem=element.querySelector('[data-sign-stem]')?.getBoundingClientRect(),stage=host.current!.getBoundingClientRect();
          const left=Math.min(bounds.left,stem?.left??bounds.left),right=Math.max(bounds.right,stem?.right??bounds.right);
          const top=Math.min(bounds.top,stem?.top??bounds.top),bottom=Math.max(bounds.bottom,stem?.bottom??bounds.bottom);
          return {id:card.id,x:left-stage.left,y:top-stage.top,width:right-left,height:bottom-top};
        },
        locations:points=>{
          for(const [id,element] of locationElements.current){
            const active=id===current.current.locationCard?.id;
            const point=id===current.current.hiddenLocation?undefined:points.find(p=>p.id===id);
            element.hidden=!point;
            if(point){
              // Match the upright sign's full perspective, including its depth plane.
              element.style.translate=active&&point.signTransform?'none':`${point.screenX}px ${point.screenY}px`;
              element.style.transform=active&&point.signTransform?point.signTransform:'';
              // Keep raised town cards above roofs, but connect their stem to terrain.
              const stemHeight=`${point.stemPixels??18}px`;
              if(element.style.getPropertyValue('--scene-sign-stem')!==stemHeight)element.style.setProperty('--scene-sign-stem',stemHeight);
              // Quantize tiny optical changes to avoid repainting the widget every frame.
              const strokeScale=String(Math.max(1,Math.round((point.strokeScale??1)*20)/20));
              if(element.style.getPropertyValue('--chart-projection-scale')!==strokeScale)element.style.setProperty('--chart-projection-scale',strokeScale);
              // Only the hit target remains in HTML; the visible pin is in the 3D lens pass.
              element.style.filter='none';
            }
          }
        },flight:(moving,arrived)=>current.current.onFlight?.(moving,arrived),
        failed:()=>{setFailed(true);current.current.onReady(false);},
      }, current.current.heightEnvelope,current.current.turbines,current.current.terrain,current.current.windScale,current.current.windConditions,current.current.buildings,current.current.solar,current.current.locations,current.current.framingScale,current.current.standalone);
      current.current.onControls?.(instance);
      scene.current=instance;
      instance.autoplay(presentationRef.current.autoplay??true);
      instance.update(current.current.values,current.current.selected,current.current.hovered);
      void instance.season(current.current.season??"summer");
      current.current.onReady(true);
    }).catch(()=>{if(!disposed){setFailed(true);current.current.onReady(false);}});
    return()=>{disposed=true;scene.current?.dispose();scene.current=null;};
  },[props.shapes]);
  useEffect(()=>{scene.current?.autoplay(presentation.autoplay??true);},[presentation.autoplay]);
  useEffect(()=>{scene.current?.palette();},[presentation.theme]);
  useEffect(()=>{scene.current?.setWind(props.windConditions??null);},[props.windConditions]);
  useEffect(()=>{scene.current?.setWindScale(props.windScale??1);},[props.windScale]);
  useEffect(()=>{scene.current?.update(props.values,props.selected,props.hovered);},[props.values,props.selected,props.hovered]);
  useEffect(()=>{void scene.current?.season(props.season??"summer");},[props.season]);
  const locationMarkers=props.locations?.map(p=>props.locationCard?<div
      ref={element=>{if(element)locationElements.current.set(p.id,element);else locationElements.current.delete(p.id);}}
      key={p.id} className={`${styles.sceneLocationMarker} ${props.locationCard.id===p.id?styles.sceneLocationCard:styles.sceneLocationPin}`}
      data-location={p.id} data-scene-sign={Boolean(props.buildings)&&props.locationCard.id===p.id} data-scene-pin={Boolean(props.buildings)&&props.locationCard.id!==p.id} data-location-active={props.locationCard.id===p.id} data-card-visible={cardShown} aria-hidden={props.locationCard.id===p.id&&props.locationCard.visible===false?true:undefined} hidden>
      {props.locationCard.id===p.id?<div key={p.id} className={styles.sceneCardReveal}>{props.locationCard.content}<span aria-hidden="true" data-sign-stem className={styles.sceneSignStem}/></div>:<button type="button" aria-label={`${p.name}: hinfliegen`} title={p.name} onClick={()=>props.onSelect(p.id)}>
       <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 23C10 20 3 14 3 9A9 9 0 0 1 21 9C21 14 14 20 12 23Z"/><circle cx="12" cy="9" r="3" fill="var(--color-bg-raised)"/></svg>
      </button>}
    </div>:<button ref={element=>{if(element)locationElements.current.set(p.id,element);else locationElements.current.delete(p.id);}} key={p.id} type="button" className={styles.sceneLocation} data-location={p.id} aria-label={`${p.name}: hinfliegen`} hidden onClick={()=>props.onSelect(p.id)}>{p.name}</button>);
  return <div className={styles.sceneLayer} hidden={failed} style={{visibility:framed?"visible":"hidden"}}>
    <div ref={host} className={styles.sceneHost} data-region-scene />
    {overlayRoot?createPortal(<div className={styles.sceneLocationOverlay} hidden={failed||!framed}>{locationMarkers}</div>,overlayRoot):locationMarkers}
    {pin&&city&&<button type="button" className={styles.scenePin} data-city-pin={city.id}
      style={{left:pin.x,top:pin.y}} aria-label={`${city.name}: kreisfreie Stadt`}
      onPointerEnter={()=>props.onHover(city.id)} onPointerLeave={e=>{if(e.pointerType!=="touch")props.onHover(null);}}
      onFocus={()=>props.onHover(city.id)} onBlur={()=>props.onHover(null)} onClick={e=>props.onSelect(city.id,(e.nativeEvent as PointerEvent).pointerType==="touch")}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 23C10 20 3 14 3 9A9 9 0 0 1 21 9C21 14 14 20 12 23Z"/><text x="12" y="11.5" textAnchor="middle" fill="#163338" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="7">{city.name.replace(/^Kreisfreie Stadt\s+/, "").slice(0, 2).toLocaleUpperCase("de-DE")}</text></svg>
    </button>}
  </div>;
}
